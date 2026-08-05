import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Haptics from 'expo-haptics';

// Mirror the guard pattern in src/utils/liveActivity.ts: conditional require so
// the native module is never loaded on Android (named exports throw when called there).
let startActivity: any = null;
let updateActivity: any = null;
let stopActivity: any = null;
if (Platform.OS === 'ios') {
  try {
    const la = require('expo-live-activity');
    startActivity = la.startActivity;
    updateActivity = la.updateActivity;
    stopActivity = la.stopActivity;
  } catch (e) {
    console.log('expo-live-activity not available');
  }
}
import { DebugLogger } from '../components/DebugOverlay';
import type { RestPace, RestTriple } from '../utils/restResolver';

/**
 * The audio mode the countdown alert needs. Applied in two places: loadCountdownSound at
 * setup, and the top of playCountdownSound before every playback. Always spread, never
 * passed directly — see the bottom of this comment.
 *
 * FIRST, A CORRECTION, because the original reason for re-applying this mode was wrong and
 * the wrong version is more persuasive than the right one.
 *
 * The claim was: the setIsEnabledAsync(false)/(true) cycle at the end of playCountdownSound
 * brings the audio session back with expo-av's defaults, so a mode set once at load only
 * survives one playback. That is false. The mode and the enabled flag are different stores,
 * and nothing on the enable/disable path touches the mode. Traced in expo-av 16.0.8:
 *
 *   iOS      _playsInSilentMode, _audioInterruptionMode, _allowsAudioRecording and
 *            _staysActiveInBackground are each written in exactly two places — the
 *            initialisers in -init (EXAV.m:96-99) and _setAudioMode: (EXAV.m:281-284).
 *            Every other mention is a read. setAudioIsEnabled: (EXAV.m:674) writes only
 *            _audioIsEnabled; _deactivateAudioSession (EXAV.m:387) writes only
 *            _currentAudioSessionMode. Neither writes any of the four.
 *   Android  mShouldDuckAudio (AVManager.java:101), mAudioInterruptionMode (:100),
 *            mStaysActiveInBackground (:103) and mShouldRouteThroughEarpiece (:81) are
 *            written only by their initialisers and by setAudioMode (:407, :421/:425,
 *            :428, :414). setAudioIsEnabled (:398) writes only mEnabled; abandonAudioFocus
 *            (:362) writes only mAcquiredAudioFocus. Neither writes any of the four.
 *
 * Nor does any OS-level event reach them: handleAudioSessionInterruption: (EXAV.m:433)
 * writes only _currentAudioSessionMode, and handleMediaServicesReset: (EXAV.m:449) only
 * _mediaServicesDidReset. A phone call, a route change or another app taking the session
 * changes the live AVAudioSession category, which expo-av recomputes from these very fields
 * at the next activation. So an interruption cannot leave the mode stale either.
 *
 * SO WHY IS IT STILL APPLIED BEFORE EVERY PLAY? Because there is a real writer, just not
 * the one originally blamed: this app sets the audio mode from two other places, and the
 * store is global and last-writer-wins.
 *
 *   src/screens/CookScreen.tsx      setAudioModeAsync({ playsInSilentModeIOS: true })
 *   src/contexts/CookTimerContext.tsx  setAudioModeAsync({ playsInSilentModeIOS: true,
 *                                        shouldDuckAndroid: true })
 *
 * Both pass PARTIAL modes, and setAudioModeAsync fills the gaps from the last full mode it
 * saw (_populateMissingKeys against getCurrentAudioMode(), src/Audio.ts:9-20 and :47), not
 * from expo-av's defaults. Today that is benign by coincidence: their explicit values match
 * ours, and the keys they omit are inherited from whatever we set last, so the four stores
 * come out unchanged. That coincidence is undeclared and unenforced. If a Cook call site
 * runs while the cached mode is expo-av's defaultMode rather than ours, iOS
 * _audioInterruptionMode (EXAV.m:282) lands on MixWithOthers instead of DuckOthers and the
 * beeps stop ducking; the same happens the day someone edits a value in either Cook file.
 *
 * Writing the full mode immediately before replayAsync makes the countdown independent of
 * all of that, and it is also where the native side reads it: on iOS the category and its
 * options are computed from these fields inside
 * _updateAudioSessionCategoryForAudioSessionMode:, reached from
 * promoteAudioSessionIfNecessary when a sound starts; on Android the focus request type
 * (AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK, what actually ducks other apps) is computed from
 * mAudioInterruptionMode inside acquireAudioFocus, also at play time. The write belongs
 * next to the read.
 *
 * WHAT IT COSTS — both sides, because the cheap side is the one that gets quoted:
 *
 *   iOS      One bridge hop. With no session active _setAudioMode: is a plain field write
 *            and returns without touching AVAudioSession, so this is nearly free.
 *   Android  One bridge hop AND a pair of global AudioManager writes. Because the object
 *            reaches native with playThroughEarpieceAndroid present, the containsKey guard
 *            at AVManager.java:413 passes and updatePlaySoundThroughEarpiece(false) runs,
 *            which calls mAudioManager.setMode(AudioManager.MODE_NORMAL) and
 *            mAudioManager.setSpeakerphoneOn(true) at AVManager.java:392-394. Moving this
 *            call to the play path moved that pair from once per app launch to once per
 *            rest. setSpeakerphoneOn is deprecated from API 31, and what these two do on a
 *            device with Bluetooth or wired headphones connected is UNVERIFIED — nobody has
 *            put this on real Android hardware with headphones and listened.
 *
 * That is the ledger. Anyone reconsidering this call should weigh the Android column, not
 * just the iOS one.
 *
 * All seven keys are listed even though playThroughEarpieceAndroid: false is already the
 * Android default. Omitting it would not avoid the AVManager.java:413 branch above —
 * _populateMissingKeys would fill the key in before it crossed the bridge, so the branch
 * fires either way — and a complete object is the only way to know what native receives.
 *
 * THE ALTERNATIVE THAT WOULD REMOVE THIS CALL, recorded as an option and not as a
 * recommendation: unify TimerContext, CookScreen and CookTimerContext onto one shared full
 * mode constant. The reason this call exists is that those two write the same global with
 * partial objects, so the countdown's mode is only correct by value coincidence; a single
 * shared constant would make the invariant true at the source instead of defending it
 * before every beep, and the per-rest Android writes above would go away with it. The cost
 * is that it reaches into two other features' files and makes one audio mode serve three
 * callers with different needs — Cook's requirements have not been analysed here, and it is
 * not this file's call to make. Whoever picks it up should read the Q on whether the
 * didJustFinish cycle can go at the same time; the two decisions interact.
 *
 * ALWAYS SPREAD THIS AT THE CALL SITE. _populateMissingKeys fills gaps by MUTATING the
 * object it is handed (src/Audio.ts:16), and `as const` is compile-time only. It cannot
 * bite while this lists every key, but an expo-av version that adds an eighth would
 * silently write into shared module state. A spread costs nothing.
 *
 * All of the above is a reading of expo-av 16.0.8 internals, not of a documented contract.
 * Re-check it on the next expo-av upgrade.
 */
const COUNTDOWN_AUDIO_MODE = {
  allowsRecordingIOS: false,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.DuckOthers,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
} as const;

/**
 * Applied AFTER playback to hand background music its volume back on iOS. Identical to
 * COUNTDOWN_AUDIO_MODE except interruptionModeIOS, and that one difference is the whole
 * mechanism: in expo-av 16.0.8 nothing JS-reachable ever issues [session setActive:NO]
 * (dead code upstream, expo/expo#15873), so ducking cannot end by releasing the session
 * — confirmed by a full node_modules trace (4 Aug 2026): every "deactivate" path,
 * including expo-av's own demoteAudioSessionIfPossible on didJustFinish, bottoms out in
 * EXAudioSessionManager.m's flag-only branch. What IS reachable is a category re-issue
 * on the still-active session: _setAudioMode re-runs setCategory:withOptions: whenever
 * the settings differ, and re-issuing WITHOUT the duck option is what restores other
 * apps' volume. The play path re-applies COUNTDOWN_AUDIO_MODE before every playback, so
 * the next alert ducks again.
 *
 * Android keys are identical to COUNTDOWN_AUDIO_MODE (the un-duck there is the focus
 * abandon in the post-playback cycle, not a mode write), and the only call site is
 * iOS-gated so Android never pays an extra per-rest setMode/setSpeakerphoneOn poke.
 * Known side effect: the Cook contexts' PARTIAL mode writes now inherit MixWithOthers
 * between alerts instead of DuckOthers, so the cook ding plays over music without
 * ducking it — a different cosmetic, arguably the right one for a kitchen ding.
 * All seven keys present, and spread at the call site, for the _populateMissingKeys
 * mutation reasons above.
 */
const RESTORE_AUDIO_MODE = {
  allowsRecordingIOS: false,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
} as const;

/**
 * How far before the end of a rest the alert must START.
 *
 * json_fit_timer_v3.wav is ONE fixed ~3s asset containing four beeps laid out at 3/2/1/0,
 * so its beeps only land on their seconds if playback begins exactly 3000ms before the
 * countdown reaches zero. This is a property of the asset, not a preference: change the
 * asset's length or beep layout and this number has to change with it.
 *
 * It is also why the alert is scheduled against a wall-clock deadline rather than triggered
 * off the 1s interval. The interval ticks every 1000ms from whenever it happened to be
 * created, with no relationship to the second boundary, so the tick that first observed
 * `remaining <= 3` could land anywhere from the true 3.000s mark to a full second late —
 * and a late start pushes the final beep past zero.
 */
export const COUNTDOWN_ALERT_LEAD_MS = 3000;

/**
 * How long a finished rest's Live Activity is held open past its deadline before the
 * widget is torn down. Mirrors the in-app overtime counter's cap so the Dynamic Island
 * and the workout screen stop agreeing to disagree: previously the widget was killed the
 * instant `isFinished` flipped, which is exactly when overtime becomes worth reading.
 * Keep this in step with the cap in useRestTimerDisplay.
 */
export const LIVE_ACTIVITY_OVERTIME_HOLD_MS = 3 * 60 * 1000;

/**
 * A timer is in exactly one of four states. Read them from the flags; never infer
 * "finished" from `targetTime <= 0`, which cannot tell a completed countdown apart
 * from one that never started.
 *
 *   no timer   timer === null
 *   active     isRunning (or isPaused), isFinished === false
 *   finished   !isRunning && !isPaused && isFinished, timeElapsed === targetTime
 *              (targetTime is PRESERVED, so the finished duration is still known;
 *               remaining = targetTime - timeElapsed = 0, so it displays "0:00")
 *   idle       !isRunning && !isPaused && !isFinished, timeElapsed === 0
 *              (never started, or reset)
 */
export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  /** The countdown ran all the way out. Distinguishes "finished" from "never started". */
  isFinished?: boolean;
  timeElapsed: number; // seconds elapsed
  targetTime: number; // target time in seconds (for countdown mode)
  startTime: Date | null;
  pausedAt: Date | null;
  isCountUp: boolean;
  /**
   * The pace this timer is currently targeting. Retargeted in place by setTimerSettings
   * when the user switches pace mid-rest, so it tracks the live target rather than
   * recording what the pace happened to be at the moment the rest started.
   */
  pace: RestPace;
  /**
   * The three resolved durations for the rest this timer represents. Present only for
   * timers started from a resolved rest (i.e. by set completion); absent for the manual
   * timer in TimerModal, which has no exercise behind it. Its presence is what makes a
   * running timer retargetable at all — without it there is nothing to retarget TO.
   */
  restOptions?: RestTriple;
  exerciseIndex?: number;
  setIndex?: number;
  /**
   * VESTIGIAL as of the move to deadline-scheduled alerts. Nothing reads it any more.
   *
   * It used to be the one-shot latch for the old interval-based trigger
   * (`!countdownSoundPlayed && remaining <= 3`), and addTime/subtractTime reset it so the
   * alert could fire again after the window moved. The scheduling effect replaced both jobs:
   * a timeout is inherently one-shot, and rescheduling on any change of startTime/targetTime
   * is what re-arms it. It could not do the new job anyway — it is a bare boolean with no
   * notion of WHICH deadline it refers to, and being persisted, a stale `true` from a
   * previous app run would have suppressed a legitimate alert.
   *
   * Left in place, still written by the existing mutators, because it is a persisted field
   * with values already on users' devices: removing it is a storage-schema change that
   * belongs with a migration (see migrationFramework.ts / SCHEMA_VERSION), not with a timing
   * fix. Delete it there, together with its writes, and nothing needs to read it in between.
   */
  countdownSoundPlayed?: boolean;
  liveActivityId?: string; // Track native Live Activity ID
  themeColor?: string; // Theme color for Live Activity
  fixedEndTime?: number; // Fixed end timestamp to prevent Live Activity jumping
  lastSentRemaining?: number; // Track last remaining seconds sent to Live Activity to avoid excessive updates
}

interface ExerciseContext {
  currentExercise?: string;
  nextExercise?: string;
  currentSet?: number;
  totalSets?: number;
  weight?: string;
  reps?: string;
}

export interface TimerSettings {
  countUp: boolean;
  /**
   * The three alert channels for the last three seconds of a rest. All default ON.
   *
   * They are independent on purpose. Someone training in a quiet room mutes the sound and
   * keeps the screen; someone with the phone in a pocket keeps the vibration and does not
   * care about either of the others; someone who finds the whole thing intrusive turns all
   * three off and still has the badge counting down.
   */
  sound: boolean;
  haptics: boolean;
  visualCountdown: boolean;
  pace: RestPace;
  /**
   * Has the user ever picked a pace themselves?
   *
   * Exists so an imported plan can set the pace it was designed for WITHOUT overwriting a
   * choice the user made deliberately. Someone who answered "optimal for muscle growth" in
   * the questionnaire and has never touched the control should get that pace when their plan
   * lands. Someone who switched to Quick on purpose should keep Quick, even when they import
   * the next block of the same program months later.
   *
   * Set true by the pace control in TimerModal, never by applyPlanDefaultPace.
   */
  paceTouched: boolean;
}


interface TimerContextType {
  // Timer state
  timer: TimerState | null;
  isMinimized: boolean;
  
  // Settings
  timerSettings: TimerSettings;
  setTimerSettings: (settings: TimerSettings) => void;

  /**
   * The three durations for the exercise the user is CURRENTLY LOOKING AT, whether or not a
   * rest is running. Published by WorkoutLogScreenAdapter as the pager moves, and cleared
   * when it unmounts — TimerModal is rendered globally, so without that it would keep
   * showing numbers belonging to a screen the user has left.
   *
   * Display only. Nothing schedules off it, nothing retargets to it, and it is deliberately
   * NOT persisted: it describes where the user is standing right now, which is not a fact
   * that should survive a relaunch. A live timer's own restOptions always take precedence
   * over this — see TimerModal.
   */
  previewRestOptions: RestTriple | null;
  setPreviewRestOptions: (options: RestTriple | null) => void;

  /**
   * Adopt the rest pace a freshly imported plan was designed around.
   *
   * Call this on a successful routine import, passing the plan's root `default_pace`. It is
   * a no-op when the user has already chosen a pace themselves (settings.paceTouched), so an
   * import can never silently undo a deliberate choice — which matters most for cumulative
   * multi-block programs, where the same user imports the same program repeatedly.
   */
  applyPlanDefaultPace: (pace?: RestPace | null) => void;

  // Timer controls
  startTimer: (targetSeconds?: number, exerciseIndex?: number, setIndex?: number, themeColor?: string, restOptions?: RestTriple) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => Promise<void>;
  /** Stops the timer only if it was started by this exact (exerciseIndex, setIndex). */
  stopTimerForSet: (exerciseIndex: number, setIndex: number) => void;
  resetTimer: () => Promise<void>;
  addTime: (seconds: number) => void;
  subtractTime: (seconds: number) => void;
  
  // UI controls
  showModal: () => void;
  hideModal: () => void;
  minimize: () => void;

  // Exercise context for Live Activities
  setExerciseContext: (getContext: ((exerciseIndex?: number, setIndex?: number) => ExerciseContext) | null) => void;
  
  // Test function for audio
  testAudio: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const STORAGE_KEY = '@timer_state';
const SETTINGS_KEY = '@timer_settings';

/** The paces a stored settings blob may legitimately name. Anything else is not trusted. */
const REST_PACES: readonly string[] = ['optimal', 'moderate', 'minimal'];

/**
 * Read `@timer_settings` written by ANY version of the app.
 *
 * Settings written before the three-pace switch carry a boolean `quickMode` and no
 * `pace`. Quick rest was the shortest of the available rests, so it maps to 'minimal';
 * its off state was the app default, which is 'moderate'. The `quickMode` key is not
 * carried forward — this returns a fresh object with only the two current fields, and
 * the next setTimerSettings write persists the legacy key out of existence.
 *
 * Anything unreadable — no pace, a pace this build does not know, a blob from a newer
 * version — falls back to 'moderate' rather than discarding the whole object, so a bad
 * pace cannot cost the user their countUp preference or vice versa.
 */
const migrateTimerSettings = (raw: any): TimerSettings => {
  const countUp = !!raw?.countUp;

  // `!== false`, NOT `!!`. These three landed after the settings object shipped, so every
  // existing user has a stored blob with no such keys. Coercing with `!!` would read
  // undefined as false and silently ship the alert, the vibration and the countdown
  // overlay turned OFF to everyone who has ever opened the timer — the exact failure this
  // migrate function exists to prevent. Absent means "never chose", and the default is on.
  const alerts = {
    sound: raw?.sound !== false,
    haptics: raw?.haptics !== false,
    visualCountdown: raw?.visualCountdown !== false,
  };

  if (typeof raw?.pace === 'string' && REST_PACES.includes(raw.pace)) {
    return { countUp, ...alerts, pace: raw.pace as RestPace, paceTouched: !!raw?.paceTouched };
  }

  if (typeof raw?.quickMode === 'boolean') {
    // quickMode true means the user went and switched the old toggle on, which is a
    // deliberate choice and carries forward as one. quickMode false was the shipped
    // default, so it tells us nothing and does not count as touched.
    return {
      countUp,
      ...alerts,
      pace: raw.quickMode ? 'minimal' : 'moderate',
      paceTouched: raw.quickMode === true,
    };
  }

  return { countUp, ...alerts, pace: 'moderate', paceTouched: false };
};

export const TimerProvider = ({ children }: { children: React.ReactNode }) => {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const [timerSettings, setTimerSettingsState] = useState<TimerSettings>({
    countUp: false,
    pace: 'moderate',
    paceTouched: false,
    sound: true,
    haptics: true,
    visualCountdown: true,
  });
  // Ephemeral, not persisted. Owned by whichever screen is showing an exercise; see the
  // doc on previewRestOptions in TimerContextType.
  const [previewRestOptions, setPreviewRestOptions] = useState<RestTriple | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // The pending countdown-alert timeout. A ref, not TimerState: TimerState is JSON.stringified
  // into AsyncStorage on every change, and a timer handle is neither serialisable nor
  // meaningful after a reload.
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // The `endTime - LEAD` instant we have already dispatched an alert for. Guards the
  // catch-up branch only; see scheduleCountdownAlert.
  const dispatchedAlertFireAtRef = useRef<number | null>(null);
  // Pending haptic pulses for the current alert. An array because the pattern is four
  // separate beats, not one buzz; see fireCountdownHaptics.
  const hapticTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const appStateRef = useRef(AppState.currentState);
  const soundRef = useRef<Audio.Sound | null>(null);
  const getExerciseContextRef = useRef<((exerciseIndex?: number, setIndex?: number) => ExerciseContext) | null>(null);
  const backgroundLiveActivityId = useRef<string | null>(null); // Store Live Activity ID when going to background
  // Pending teardown of a finished rest's Live Activity. A ref for the same reason as
  // countdownTimeoutRef: a timer handle is not serialisable into TimerState.
  const overtimeStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTimerRef = useRef<TimerState | null>(null); // Track previous timer state to avoid excessive Live Activity updates
  // Always-current timer, so control functions never read a stale render closure.
  // startTimer/stopTimer previously read `timer` from the closure, which meant two
  // rapid calls saw the same liveActivityId and could leak or double-stop an activity.
  const timerRef = useRef<TimerState | null>(null);
  // Same idea for settings. applyPlanDefaultPace is called from the import path, which is
  // not this component, so it cannot rely on a fresh render closure — and it must not read
  // state through an updater either, because React double-invokes those in development and
  // this function persists to AsyncStorage.
  const timerSettingsRef = useRef<TimerSettings>(timerSettings);

  // Load persisted state on mount
  useEffect(() => {
    loadPersistedState();
    loadSettings();
    loadCountdownSound();
  }, []);

  // Load countdown sound
  const loadCountdownSound = async () => {
    try {
      console.log('Loading countdown sound...');

      // This is not only mount-time code: playCountdownSound's recovery path calls it too,
      // so a reload has to hand over from a live sound to a live sound. The ordering below
      // is load-bearing — soundRef must only ever hold a USABLE sound.
      //
      // Detach the old sound's status handler first. That handler is the audio-session
      // cycler, and it reads soundRef.current rather than the sound it was attached to, so
      // one firing across the swap would cycle the session out from under the NEW sound.
      const previous = soundRef.current;
      previous?.setOnPlaybackStatusUpdate(null);

      // Set audio mode to duck background music for better timer alerts.
      // Spread, never the constant itself — see COUNTDOWN_AUDIO_MODE.
      await Audio.setAudioModeAsync({ ...COUNTDOWN_AUDIO_MODE });

      // Load the sound with proper initial settings.
      //
      // Create BEFORE swapping and unload AFTER. If this throws, the error propagates to
      // the handler below with soundRef still pointing at the previous, working sound —
      // the alert keeps firing on the old copy instead of going quiet. Nulling the ref up
      // front (or unloading first) would leave it null or dead on exactly the failure it
      // is supposed to survive. Two loaded copies for the few ms between create and unload
      // is a fair price; a null or dead ref is not.
      const { sound } = await Audio.Sound.createAsync(
        require('../../json_fit_timer_v3.wav'),
        {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        }
      );

      soundRef.current = sound;

      if (previous) {
        try {
          await previous.unloadAsync();
        } catch (unloadError) {
          console.warn('Failed to unload previous countdown sound:', unloadError);
        }
      }

      console.log('Countdown sound loaded successfully');

      // Test play to ensure it's working (optional)
      // await sound.setPositionAsync(0);

    } catch (error) {
      console.error('Failed to load countdown sound:', error);
    }
  };

  // Handle app state changes for background persistence
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Start/stop interval based on timer state
  useEffect(() => {
    if (timer?.isRunning && !timer.isPaused) {
      startInterval();
    } else {
      stopInterval();
    }
    
    return () => stopInterval();
  }, [timer?.isRunning, timer?.isPaused]);

  // Keep the always-current mirror in sync with committed state
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    timerSettingsRef.current = timerSettings;
  }, [timerSettings]);

  // Persist state changes
  useEffect(() => {
    if (timer) {
      persistState();
    }
  }, [timer]);

  // Sync Live Activity only for significant timer state changes (not every second)
  useEffect(() => {
    // Only sync for significant changes, not every timeElapsed update
    const shouldSync = !timer || // Timer cleared
                      !prevTimerRef.current || // First timer
                      timer.isRunning !== prevTimerRef.current.isRunning || // Start/stop
                      timer.isPaused !== prevTimerRef.current.isPaused || // Pause/resume
                      timer.targetTime !== prevTimerRef.current.targetTime || // Time adjusted
                      !timer.liveActivityId; // No Live Activity exists
                      
    if (shouldSync) {
      DebugLogger.log(`🔄 Syncing Live Activity for significant change: running=${timer?.isRunning}, paused=${timer?.isPaused}, hasId=${!!timer?.liveActivityId}`);
      syncLiveActivity();
    } else {
      DebugLogger.log(`⏭️ Skipping Live Activity sync - only timeElapsed changed`);
    }
    
    // Store previous timer state for comparison
    prevTimerRef.current = timer;
  }, [timer]);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadPersistedState = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime) {
          parsed.startTime = new Date(parsed.startTime);
        }
        if (parsed.pausedAt) {
          parsed.pausedAt = new Date(parsed.pausedAt);
        }
        
        // Timers persisted before isFinished existed have no such field. Default it to
        // false: a legacy "zombie" (targetTime 0, elapsed 0) rehydrates as an idle timer
        // and still displays 0:00, exactly as it did before.
        parsed.isFinished = !!parsed.isFinished;

        // If timer was running, calculate elapsed time from background
        if (parsed.isRunning && !parsed.isPaused && parsed.startTime) {
          const now = new Date();
          const backgroundElapsed = Math.floor((now.getTime() - new Date(parsed.startTime).getTime()) / 1000);

          // A countdown that ran out while backgrounded comes back FINISHED, not running
          // past its target. Without this it would rehydrate as running with an elapsed
          // beyond targetTime, and the interval would have to re-discover the finish.
          if (!parsed.isCountUp && parsed.targetTime > 0 && backgroundElapsed >= parsed.targetTime) {
            parsed.timeElapsed = parsed.targetTime;
            parsed.isRunning = false;
            parsed.isPaused = false;
            parsed.isFinished = true;
          } else {
            parsed.timeElapsed = backgroundElapsed;
          }
        }

        setTimer(parsed);
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setTimerSettingsState(migrateTimerSettings(JSON.parse(saved)));
      }
    } catch (error) {
      console.error('Error loading timer settings:', error);
    }
  };

  const persistState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    } catch (error) {
      console.error('Error persisting timer state:', error);
    }
  };

  /**
   * Move a rest already under way onto a different pace.
   *
   * The rest is NOT restarted. timeElapsed is wall-clock, derived from startTime, so the
   * only honest way to say "this rest is now 120s instead of 165s" is to move the target
   * and leave the clock alone — startTime is never touched here. Rewriting it would either
   * teleport the countdown or hand the user back time they had already served.
   *
   * fixedEndTime moves with the target so the Live Activity agrees with the on-screen
   * countdown; syncLiveActivity only honours it while it is within 2s of the deadline it
   * computes, so leaving it stale would silently demote the widget to the calculated path.
   *
   * Reads timerRef rather than the render closure, and does its one side effect out here
   * rather than inside the updater — see the note on scheduleCountdownAlert about React
   * double-invoking updaters in development.
   */
  const retargetLiveRest = (nextPace: RestPace) => {
    const current = timerRef.current;

    // Only a running or paused countdown with resolved options can be retargeted. A
    // finished or idle timer represents a rest that is over; switching pace must not
    // resurrect it. A manual timer has no restOptions and nothing to retarget to.
    if (!current || !current.restOptions || current.isCountUp) return;
    if (!current.isRunning && !current.isPaused) return;
    if (nextPace === current.pace) return;

    const newTarget = current.restOptions[nextPace];
    if (!newTarget || newTarget === current.targetTime) {
      // Two paces can resolve to the same number of seconds (a deload flattens all three).
      // Nothing to retarget, but the timer still now belongs to the new pace.
      const unchanged: TimerState = { ...current, pace: nextPace };
      setTimer(unchanged);
      timerRef.current = unchanged;
      return;
    }

    const fixedEndTime = current.startTime
      ? current.startTime.getTime() + newTarget * 1000
      : current.fixedEndTime;

    // The deadline moved, so any alert already playing belongs to the old one. Silence it;
    // the effect re-arms against the new deadline off the targetTime change below.
    stopCountdownSound();
    stopCountdownHaptics();

    const next: TimerState =
      current.timeElapsed >= newTarget
        ? {
            // The shorter rest is already spent. The documented finished shape: elapsed
            // driven to target so remaining renders a clean 0:00, targetTime PRESERVED so
            // the finished duration is still known.
            ...current,
            pace: nextPace,
            targetTime: newTarget,
            timeElapsed: newTarget,
            isRunning: false,
            isPaused: false,
            isFinished: true,
            fixedEndTime,
            countdownSoundPlayed: false,
          }
        : {
            ...current,
            pace: nextPace,
            targetTime: newTarget,
            fixedEndTime,
            countdownSoundPlayed: false,
          };

    DebugLogger.log(
      `🎚️ [PACE] retargeted ${current.pace}→${nextPace}: ${current.targetTime}s→${newTarget}s ` +
        `(elapsed=${current.timeElapsed}s, finished=${!!next.isFinished})`,
      'log',
    );

    setTimer(next);
    timerRef.current = next;
  };

  const setTimerSettings = async (settings: TimerSettings) => {
    setTimerSettingsState(settings);
    retargetLiveRest(settings.pace);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  };

  /**
   * Adopt an imported plan's rest pace, if and only if the user has not chosen one.
   *
   * Deliberately does NOT set paceTouched. The pace came from the plan, not from the user
   * putting their finger on the control, so a later import of a differently-paced program is
   * still allowed to move it. The moment they touch the control themselves, that stops.
   *
   * Reads timerSettingsRef rather than a state updater or the render closure. An updater
   * would be the obvious way to see current settings, but React double-invokes updaters in
   * development and this function writes to AsyncStorage — the same trap the countdown alert
   * was moved out of the interval to avoid. The closure is no good either, because the caller
   * lives in the import screen, not in this component.
   *
   * Takes a pace rather than a whole settings object so a caller in the import path cannot
   * accidentally clobber countUp on its way past.
   */
  const applyPlanDefaultPace = (pace?: RestPace | null) => {
    if (!pace || !REST_PACES.includes(pace)) return;

    const current = timerSettingsRef.current;
    if (current.paceTouched || current.pace === pace) return;

    DebugLogger.log(`🎚️ [PACE] adopted plan default: ${current.pace}→${pace}`, 'log');

    // Route through setTimerSettings so persistence and live-rest retargeting stay in one
    // place. paceTouched is carried through unchanged — this is not the user choosing.
    setTimerSettings({ ...current, pace });
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground, update timer if running
      if (timer?.isRunning && !timer.isPaused && timer.startTime) {
        DebugLogger.log(`📱 App activated - refreshing Live Activity timer to sync accurate time`, 'log');
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - timer.startTime.getTime()) / 1000);
        setTimer(prev => prev ? {
          ...prev,
          timeElapsed: elapsed,
          // Force Live Activity refresh by clearing lastSentRemaining
          lastSentRemaining: undefined
        } : null);
      }

      // Re-arm the alert against the real wall clock. On iOS the JS runtime is suspended
      // while backgrounded, so a setTimeout scheduled before we went away resumes with its
      // remaining delay intact and therefore fires at the wrong absolute moment — late by
      // however long the app spent in the background. Recomputing from endTime fixes it.
      //
      // Android's background timer behaviour is NOT the same and I could not settle it from
      // source in this repo (react-native ships only prebuilt Android artifacts here, no
      // JavaTimerManager to read), so this is deliberately unconditional rather than
      // iOS-gated: if Android's timers did keep running on real wall-clock time, this
      // recomputes an identical schedule and changes nothing; if they were throttled or
      // suspended, it repairs them. Correct either way, and it costs one arithmetic
      // comparison per foreground.
      //
      // The setTimer above only moves timeElapsed, which is not a scheduling dependency, so
      // the effect will not re-run on its own — hence the explicit call, from the ref rather
      // than the render closure so it sees the committed timer.
      scheduleCountdownAlert(timerRef.current);
    }
    appStateRef.current = nextAppState;
  };

  /**
   * Fire the countdown alert (one asset, four beeps at 3/2/1/0).
   *
   * Deliberately ONE native round trip on the happy path. This used to await
   * getStatusAsync, then stopAsync, then setPositionAsync(0), then playAsync — four
   * awaited bridge crossings before a single sample reached the speaker, with the beep
   * arriving whenever they happened to finish. replayAsync is the API for precisely this
   * (rewind to 0 and play) and does it in one call. That does not make the alert louder;
   * it makes it land ON the second it is announcing, which the on-screen countdown added
   * later has to line up against.
   *
   * The getStatusAsync isLoaded gate went with them. It existed only to choose between
   * playing and reloading, and replayAsync rejecting when the sound is not loaded answers
   * that same question without paying for a round trip on every rest. So the reload lives
   * in the catch now.
   *
   * `isRetry` bounds that recovery to a single attempt. Recovery reloads and then plays —
   * the old code reloaded and returned, so an alert that arrived before the asset finished
   * loading was dropped silently instead of being delayed by the load.
   *
   * `fromPositionMs` exists for the catch-up case in scheduleCountdownAlert: when the alert
   * is already overdue, starting the asset at 0 would put its beeps on the wrong seconds, so
   * it starts partway in instead. playFromPositionAsync is one setStatusAsync round trip
   * that seeks and plays together, so the seek costs the same one bridge hop the ordinary
   * path pays — this is the only place the extra positioning is worth it.
   *
   * One interleaving is worth knowing about. If a rest is short enough — or the user taps
   * ±time in the final seconds, which reschedules the alert — this can be re-entered
   * while the PREVIOUS playback's session cycle is still in flight, inside the brief window
   * where Audio is disabled. replayAsync throws there ('audio is not enabled'), with no
   * .code, so it falls through to the reload-and-retry. That retry is a wasted load attempt
   * but it is harmless: loadCountdownSound only publishes a sound it successfully created,
   * so a reload that fails for the same reason leaves the working sound in place and the
   * next rest plays normally. At worst one beep is lost to a window a few milliseconds
   * wide. The fix for that would be to stop disabling Audio, not to add a flag here.
   */
  /**
   * iOS-only duck release. See RESTORE_AUDIO_MODE for the mechanism and why session
   * deactivation is not an option in this expo-av version. Fire and forget: the failure
   * mode of a lost write is "music stays quiet until the next alert", and the next
   * alert's own mode write corrects it.
   */
  const restoreDuckedAudio = () => {
    if (Platform.OS !== 'ios') return;
    // Spread, never the constant itself — see COUNTDOWN_AUDIO_MODE.
    Audio.setAudioModeAsync({ ...RESTORE_AUDIO_MODE })
      .then(() => console.log('🔊 iOS duck released (MixWithOthers re-issued)'))
      .catch((error) => console.error('Failed to release iOS duck:', error));
  };

  const playCountdownSound = async (isRetry = false, fromPositionMs = 0) => {
    // Reload once, then play. Never more than once: loadCountdownSound swallows its own
    // failures, so without this latch a permanently unloadable asset would recurse.
    const reloadAndPlayOnce = async (reason: string) => {
      if (isRetry) {
        console.error(`Countdown sound still unavailable after reload (${reason}) - giving up`);
        return;
      }
      console.warn(`Countdown sound not ready (${reason}) - reloading, then playing`);
      await loadCountdownSound();
      await playCountdownSound(true, fromPositionMs);
    };

    try {
      console.log('Attempting to play countdown sound...');

      // Do not even ATTEMPT playback from the background. iOS refuses to activate the
      // session and the play call throws — but the sound object has already been told to
      // play by then, and nothing unsets that. The OS honours it the moment the app
      // foregrounds and the session activates, which is how a rest that ended while you
      // were in another app beeps at you the instant you come back. The catch below
      // logged "skipping sound" and returned, so JS believed it had skipped; it had only
      // deferred. 'inactive' is deliberately still attempted — that state covers the
      // notification shade and the app switcher, where playback usually succeeds.
      if (AppState.currentState === 'background') {
        console.log('\u23ed\ufe0f App backgrounded - not attempting countdown sound');
        return;
      }

      if (!soundRef.current) {
        await reloadAndPlayOnce('soundRef.current is null');
        return;
      }

      // Apply the mode immediately before playing. NOT because the session cycle below
      // resets it — traced, it does not, and COUNTDOWN_AUDIO_MODE records that trace — but
      // because CookScreen and CookTimerContext write the same global mode with partial
      // objects, and because this is the instant the native side reads it. Do not delete
      // this on the grounds that loadCountdownSound already set the mode: that is true and
      // is not sufficient.
      //
      // Spread, never the constant itself. Also note this call is NOT gated by Audio's
      // enabled flag, so it is not the call that fails when the previous playback's session
      // cycle is still in flight; replayAsync is.
      await Audio.setAudioModeAsync({ ...COUNTDOWN_AUDIO_MODE });

      // Set up cleanup handler for when sound finishes
      soundRef.current.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (playbackStatus.isLoaded && !playbackStatus.isPlaying && playbackStatus.didJustFinish) {
          // Clear the status update handler to prevent repeated calls
          soundRef.current?.setOnPlaybackStatusUpdate(null);

          // Give the music its volume back — one mechanism per platform.
          //
          // Android: the setIsEnabledAsync(false/true) cycle below is the real lever.
          // setAudioIsEnabled(false) abandons audio focus, and abandoning focus is what
          // un-ducks other apps. Kept exactly as it was.
          //
          // iOS: the cycle is a no-op at the OS level — previously marked UNVERIFIED,
          // now CONFIRMED by a full node_modules trace (4 Aug 2026) plus device
          // evidence (music stayed ducked indefinitely). Every "deactivate" path,
          // including the demoteAudioSessionIfPossible expo-av itself runs on
          // didJustFinish, bottoms out in EXAudioSessionManager.m's flag-only branch
          // ([session setActive:NO] is dead code upstream, expo/expo#15873). The one
          // JS-reachable lever is the category re-issue in restoreDuckedAudio(),
          // called independently of the cycle so a cycle failure cannot strand iOS.
          restoreDuckedAudio();
          Audio.setIsEnabledAsync(false)
            .then(() => Audio.setIsEnabledAsync(true))
            .then(() => {
              console.log('Audio session cycled to restore background music');
            })
            .catch((error) => {
              console.error('Failed to cycle audio session:', error);
            });
        }
      });

      if (fromPositionMs > 0) {
        await soundRef.current.playFromPositionAsync(fromPositionMs);
      } else {
        await soundRef.current.replayAsync();
      }
      console.log('Countdown sound played successfully');
    } catch (error) {
      // Handle background audio session errors gracefully. This one is NOT a reload
      // candidate — the sound is fine, the app just is not allowed to make noise right
      // now, and reloading would not change that.
      if (error.code === 'E_AV_PLAY' && error.message?.includes('audio session not activated')) {
        console.log('⚠️ Audio session not active (app in background) - skipping sound');
        // Belt and braces for the same deferral the pre-check above prevents: the throw
        // does not unset shouldPlay, so without an explicit stop the queued playback still
        // fires when the session activates. Detach the status handler FIRST, or the stop
        // reads as a natural finish and runs the unduck/session cycle for a beep that
        // never sounded.
        soundRef.current?.setOnPlaybackStatusUpdate(null);
        soundRef.current?.stopAsync().catch(() => {});
        return;
      }

      // Anything else is treated as "the sound was not playable", which is the case the
      // dropped isLoaded gate used to catch. One reload, one retry.
      console.error('Failed to play countdown sound:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      await reloadAndPlayOnce('replayAsync threw');
    }
  };

  /**
   * Silence an alert that is still audible. Called when one rest replaces another: finishing
   * a set with two seconds left on the previous rest used to play the tail of the old
   * countdown over the start of the new one, because nothing ever stopped an in-flight
   * playback.
   *
   * Uses the existing sound handle and adds no lifecycle of its own. Note one consequence:
   * stopAsync does not produce didJustFinish, so the audio-session cycle in
   * playCountdownSound's status handler does not run for a playback that was cut short. On
   * Android that means focus stays held until the next alert plays to its natural end, which
   * then cycles it. Self-healing, and fixing it properly belongs with the open question about
   * that cycle rather than here.
   */
  const stopCountdownSound = () => {
    const sound = soundRef.current;
    if (!sound) return;
    // Fire and forget, and swallow: a sound that is not playing, or not loaded, throws here
    // and there is nothing to do about it — the goal is silence and silence is what we have.
    sound.stopAsync().catch(() => undefined);
    // A cut-short playback never reaches didJustFinish, so nothing above will un-duck.
    // Android self-heals at the next natural finish (focus stays held until then, as
    // documented below); iOS would stay ducked until the next alert — e.g. stopping a
    // timer during the beeps — so release it here too. Harmless when already released:
    // expo-av no-ops a mode write whose category and options match the current ones.
    restoreDuckedAudio();
  };

  /**
   * Where the haptic pulses land, as offsets into the alert.
   *
   * The alert is ONE ~3s asset with four beeps at 3/2/1/0, so haptics cannot ride on its
   * playback events — there are none between start and finish. They are scheduled instead,
   * against the same instant the asset starts, which keeps buzz and beep on the same beat
   * without either knowing about the other.
   */
  const HAPTIC_BEATS_MS = [0, 1000, 2000, 3000];

  /** Cancel any pending pulses. Silence is the goal; a failed cancel has nothing to undo. */
  const stopCountdownHaptics = () => {
    hapticTimeoutsRef.current.forEach(clearTimeout);
    hapticTimeoutsRef.current = [];
  };

  /**
   * Fire the haptic half of the alert, skipping any beat already behind us — `seekMs` is the
   * same catch-up offset the audio seeks by, so the two stay aligned when a rest is joined
   * mid-window.
   *
   * Zero gets Heavy where 3/2/1 get Medium. The point of the last three seconds is knowing
   * when they END, and a pocket cannot tell four identical buzzes apart.
   */
  const fireCountdownHaptics = (seekMs: number) => {
    stopCountdownHaptics();

    HAPTIC_BEATS_MS.forEach((beat, index) => {
      if (beat < seekMs) return;
      const isZero = index === HAPTIC_BEATS_MS.length - 1;
      const delay = beat - seekMs;

      const fire = () => {
        // Fire and forget. A device with no haptic motor, or one in a low-power state,
        // rejects these — that is not a reason to interrupt anything.
        Haptics.impactAsync(
          isZero ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium,
        ).catch(() => undefined);
      };

      if (delay <= 0) {
        fire();
      } else {
        hapticTimeoutsRef.current.push(setTimeout(fire, delay));
      }
    });
  };

  /**
   * Arm (or re-arm) the countdown alert for a timer state.
   *
   * Everything derives from one value:
   *
   *   endTime = startTime.getTime() + targetTime * 1000
   *
   * startTime is shifted forward by the pause duration in resumeTimer, so that expression is
   * correct for a live countdown at any moment, including after pause/resume cycles and after
   * rehydration. Deliberately NOT fixedEndTime: that is written once in startTimer and never
   * updated by addTime, subtractTime or resumeTimer, so it goes stale the first time a user
   * taps ±30s. It is fine for its own purpose (keeping the Live Activity from jumping) and
   * wrong for this one.
   *
   * This function is the single owner of countdownTimeoutRef. It is called from one
   * declarative effect keyed on the values that define the schedule, so startTimer,
   * pauseTimer, resumeTimer, addTime, subtractTime, stopTimer, resetTimer and stopTimerForSet
   * all get correct rescheduling without any of them knowing this exists — and no call site
   * added later can forget to. It always clears before it schedules, so calling it twice is
   * harmless.
   */
  const scheduleCountdownAlert = (t: TimerState | null) => {
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
    // Pending pulses belong to the schedule being replaced. Leaving them would buzz on the
    // OLD deadline's beats after the timer has been retargeted, stopped or restarted.
    stopCountdownHaptics();

    // Nothing to schedule: no timer, not running, paused, or counting up (count-up mode has
    // no deadline to count down to). A timer with no target has no end either.
    if (!t || !t.isRunning || t.isPaused || t.isCountUp || !t.startTime || t.targetTime <= 0) {
      if (!t) dispatchedAlertFireAtRef.current = null;
      return;
    }

    const endTime = t.startTime.getTime() + t.targetTime * 1000;
    const now = Date.now();

    const fireAt = endTime - COUNTDOWN_ALERT_LEAD_MS;
    const delay = fireAt - now;

    const dispatch = (seekMs: number) => {
      dispatchedAlertFireAtRef.current = fireAt;
      if (__DEV__) {
        // The whole point of this step, in one number. `drift` is how far the alert actually
        // started from where it was supposed to: positive is late, negative is early, and the
        // old interval-driven trigger could be anywhere up to +1000. Step 4's on-screen
        // countdown is measured against the same fireAt, so this is also how to tell whether
        // the two agree. Dev-only: it is one line per rest, but it is noise in production.
        console.log(
          `⏱️ [COUNTDOWN-ALERT] dispatched drift=${Date.now() - fireAt}ms seek=${seekMs}ms ` +
            `fireAt=${fireAt} endTime=${endTime}`,
        );
      }
      // Each channel is independent and each is read from the ref, so a toggle flipped
      // mid-rest applies to this very alert. A user with all three off still gets the
      // badge counting down; nothing here is load-bearing for the timer itself.
      const settings = timerSettingsRef.current;
      if (settings.sound) playCountdownSound(false, seekMs);
      if (settings.haptics) fireCountdownHaptics(seekMs);
    };

    // Overdue: a rest shorter than the lead, ±time landing the deadline inside the window,
    // or a pace switch shortening the rest to within three seconds of where it already is.
    // Starting the asset at 0 now would put its 3/2/1/0 beeps on 2/1/0/-1, so start it
    // partway in by exactly how late we are.
    if (delay <= 0) {
      const overdue = -delay;

      // The lead IS the asset's length (see COUNTDOWN_ALERT_LEAD_MS), so `overdue` doubles
      // as the seek offset, and overdue > LEAD means the entire asset would land after zero
      // — nothing of the 3-2-1-0 is still ahead, so there is nothing worth playing. Being
      // overdue by LESS than that leaves a real tail (overdue of 2000ms still plays the
      // "1" and the "0"), which is why this is the only case that skips.
      if (overdue > COUNTDOWN_ALERT_LEAD_MS) return;

      // The ref guard is what stops this being re-triggered for the SAME deadline. This
      // branch can be re-entered without the deadline moving — foregrounding forces a
      // reschedule, and so does any pause/resume — and without it, resuming with a second
      // left would stack a fresh tail on top of the one already playing.
      if (dispatchedAlertFireAtRef.current === fireAt) return;
      dispatch(overdue);
      return;
    }

    countdownTimeoutRef.current = setTimeout(() => {
      countdownTimeoutRef.current = null;
      // Re-derive lateness at fire time. An iOS timeout suspended with the app resumes
      // with its REMAINING delay intact, so it can fire arbitrarily late — and it can win
      // the race against the foreground handler's reschedule, because elapsed timers are
      // flushed on resume and AppState's 'active' event has no ordering guarantee against
      // them. Dispatching 0 blindly here is how a set that finished half a minute ago
      // still beeped on re-entry. Same rules as the overdue branch above: past the lead
      // there is nothing worth playing; inside it, seek by exactly how late we are; and
      // the ref guard stops a double-fire when the foreground reschedule got there first.
      const lateness = Date.now() - fireAt;
      if (lateness > COUNTDOWN_ALERT_LEAD_MS) return;
      if (lateness > 0 && dispatchedAlertFireAtRef.current === fireAt) return;
      dispatch(Math.max(0, lateness));
    }, delay);
  };

  /**
   * The one place the alert schedule is owned.
   *
   * Depends on the values that DEFINE the schedule and deliberately not on timeElapsed —
   * including it would tear down and rebuild the timeout every single tick, which is both
   * wasteful and a way to reintroduce exactly the second-boundary drift this replaced. The
   * same partial-dependency shape as the interval effect above.
   *
   * Rehydration needs no special case: loadPersistedState calls setTimer with the restored
   * startTime and targetTime, which changes these deps from undefined, so this runs and
   * schedules from the restored deadline like any other change. A countdown restored with
   * less than three seconds left lands in the catch-up branch and gets a seeked alert; one
   * restored already past zero is turned into a finished timer by loadPersistedState before
   * it ever reaches here.
   */
  useEffect(() => {
    scheduleCountdownAlert(timer);
    return () => {
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
        countdownTimeoutRef.current = null;
      }
    };
  }, [
    timer?.isRunning,
    timer?.isPaused,
    timer?.isCountUp,
    timer?.startTime?.getTime(),
    timer?.targetTime,
  ]);

  // Mount-scoped. The overtime hold is the only timeout that deliberately outlives the
  // timer that created it, so it needs a teardown that is not keyed to timer state.
  useEffect(() => {
    return () => {
      if (overtimeStopTimeoutRef.current) {
        clearTimeout(overtimeStopTimeoutRef.current);
        overtimeStopTimeoutRef.current = null;
      }
    };
  }, []);

  const startInterval = () => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (!prev || !prev.isRunning || prev.isPaused || !prev.startTime) return prev;
        
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - prev.startTime.getTime()) / 1000);
        
        // Check for countdown completion. The alert is NOT triggered here any more — see
        // scheduleCountdownAlert. Two reasons it moved out:
        //
        //   Timing.  This interval ticks every 1000ms from whenever it was created, with no
        //            relationship to the second boundary, so the tick that first saw
        //            `remaining <= 3` could be up to a full second late and push the asset's
        //            last beep past zero.
        //   Purity.  playCountdownSound() was a side effect inside a state updater. React can
        //            double-invoke updaters in development, so the beep could double in Expo
        //            Go. Scheduling it outside the updater fixes that by construction rather
        //            than by guarding.
        if (!prev.isCountUp) {
          const remaining = prev.targetTime - elapsed;
          console.log(`Countdown check: remaining=${remaining}, elapsed=${elapsed}, targetTime=${prev.targetTime}`);

          // Stop timer when countdown reaches 0
          if (remaining <= 0) {
            console.log('Countdown finished! Stopping timer.');

            // The finished shape: targetTime is PRESERVED (so we still know what rest
            // just elapsed, and TimerModal's restart button has a duration to reuse),
            // and timeElapsed is driven to targetTime so every consumer's
            // `max(0, targetTime - timeElapsed)` still renders a clean "0:00".
            // Keep Live Activity ID for proper cleanup by syncLiveActivity.
            return {
              ...prev,
              timeElapsed: prev.targetTime,
              isRunning: false,
              isPaused: false,
              isFinished: true,
              // Don't clear liveActivityId here - let syncLiveActivity handle cleanup
            };
          }
        }
        
        return { ...prev, timeElapsed: elapsed };
      });
    }, 1000);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Tear down a Live Activity without blocking anything. The widget is a cosmetic
  // side-channel; it must never delay, gate or strand timer state.
  const disposeLiveActivity = (activityId?: string, title = 'Timer Stopped') => {
    if (!activityId || !stopActivity) return;
    Promise.resolve()
      .then(() => stopActivity(activityId, { title }))
      .then(() => DebugLogger.log(`✅ Live Activity ${activityId} stopped`, 'log'))
      .catch((error: any) => {
        const message = error?.message ?? String(error);
        if (message.includes('not found') || message.includes('ActivityNotFoundException')) {
          DebugLogger.log(`🧹 Live Activity ${activityId} not found (likely expired)`, 'warn');
        } else {
          DebugLogger.log(`⚠️ [LIVE-ACTIVITY] Failed to stop ${activityId}, continuing: ${message}`, 'warn');
        }
      });
  };

  /**
   * Hold a finished rest's Live Activity open through the overtime window, then dispose it.
   *
   * The instant is ABSOLUTE (deadline + hold), so the repeated syncs a finished timer
   * produces all converge on the same teardown rather than pushing it further out.
   *
   * The captured id is re-checked when the timeout fires. Every other path that ends an
   * activity — startTimer claiming a new one, resetTimer, stopTimer — already disposes by
   * id, so a stale hold simply finds the slot reassigned and does nothing. That is the
   * whole guard: no bookkeeping in the other paths, no double-dispose.
   */
  const scheduleLiveActivityOvertimeStop = (activityId: string, deadlineMs: number) => {
    if (overtimeStopTimeoutRef.current) {
      clearTimeout(overtimeStopTimeoutRef.current);
      overtimeStopTimeoutRef.current = null;
    }

    const delay = Math.max(0, deadlineMs + LIVE_ACTIVITY_OVERTIME_HOLD_MS - Date.now());
    DebugLogger.log(
      `\u23f3 [LIVE-ACTIVITY] holding ${activityId} through overtime, teardown in ${Math.round(delay / 1000)}s`,
      'log',
    );

    overtimeStopTimeoutRef.current = setTimeout(() => {
      overtimeStopTimeoutRef.current = null;
      if (timerRef.current?.liveActivityId !== activityId) {
        DebugLogger.log(`\u23ed\ufe0f [LIVE-ACTIVITY] overtime hold expired but ${activityId} was already replaced`, 'log');
        return;
      }
      disposeLiveActivity(activityId, 'Rest Over');
      setTimer(prev => (prev?.liveActivityId === activityId ? { ...prev, liveActivityId: undefined } : prev));
    }, delay);
  };

  const startTimer = (targetSeconds = 0, exerciseIndex?: number, setIndex?: number, themeColor?: string, restOptions?: RestTriple) => {
    DebugLogger.log(`🚀 startTimer called: targetSeconds=${targetSeconds}, exerciseIndex=${exerciseIndex}, setIndex=${setIndex}`, 'log');

    // Read the outgoing activity id from the ref, not the render closure, and claim
    // it immediately so a second rapid startTimer cannot tear down the same id twice.
    const previousActivityId = timerRef.current?.liveActivityId;

    // Silence any alert still playing from the rest this one replaces. Completing a set with
    // two seconds left on the previous rest otherwise plays the tail of the old countdown
    // over the start of the new one. The new schedule is armed by the effect, not here.
    stopCountdownSound();
    stopCountdownHaptics();

    const now = new Date();
    const fixedEndTime = now.getTime() + (targetSeconds * 1000); // Calculate stable end time once
    const newTimer: TimerState = {
      isRunning: true,
      isPaused: false,
      isFinished: false,
      timeElapsed: 0,
      targetTime: targetSeconds,
      startTime: now,
      pausedAt: null,
      isCountUp: timerSettings.countUp,
      pace: timerSettings.pace,
      restOptions,
      exerciseIndex,
      setIndex,
      countdownSoundPlayed: false,
      liveActivityId: undefined, // Always start fresh - syncLiveActivity will create new one
      themeColor, // Store theme color for Live Activity
      fixedEndTime, // Store stable end time to prevent Live Activity jumping
    };

    // Commit the timer FIRST and synchronously. Nothing cosmetic runs before this.
    DebugLogger.log(`📊 New timer created: targetTime=${targetSeconds}s, countUp=${timerSettings.countUp}`, 'log');
    setTimer(newTimer);
    timerRef.current = newTimer;

    // ...then dispose the old widget in the background.
    disposeLiveActivity(previousActivityId);
  };

  const pauseTimer = () => {
    setTimer(prev => {
      // Only a running timer can be paused. Without this, pausing a finished timer
      // would set isPaused while isFinished stayed true — a contradictory state that
      // reads as "active" to every isRunning||isPaused consumer.
      if (!prev || !prev.isRunning) return prev;

      return {
        ...prev,
        isRunning: false,
        isPaused: true,
        pausedAt: new Date(),
      };
    });
  };

  const resumeTimer = () => {
    setTimer(prev => {
      if (!prev || !prev.isPaused || !prev.pausedAt || !prev.startTime) return prev;

      // Calculate how long we were paused
      const now = new Date();
      const pauseDuration = now.getTime() - prev.pausedAt.getTime();

      // Adjust the start time to account for the pause duration
      const newStartTime = new Date(prev.startTime.getTime() + pauseDuration);

      return {
        ...prev,
        isRunning: true,
        isPaused: false,
        isFinished: false, // running again — cannot be finished
        startTime: newStartTime,
        pausedAt: null,
      };
    });
  };

  const stopTimer = async () => {
    // Read from the ref, not the render closure, so a rapid stop/start pair cannot
    // tear down the wrong activity.
    const activityId = timerRef.current?.liveActivityId;

    // A rest that is dismissed should not keep beeping at the user. Clearing the pending
    // timeout is the effect's job (setTimer(null) below re-runs it); this is for a playback
    // that has already started.
    stopCountdownSound();
    stopCountdownHaptics();

    // Clear timer state and storage FIRST — the widget teardown must not gate it.
    setTimer(null);
    timerRef.current = null;
    AsyncStorage.removeItem(STORAGE_KEY);

    disposeLiveActivity(activityId);
  };

  /**
   * Stop the rest timer only if it belongs to this exact set.
   *
   * `exerciseIndex`/`setIndex` have always been written by startTimer but never
   * read — so nothing could tell which set owned the running timer. Un-completing
   * set 2 must not kill a timer started by set 3, and it must not kill the superset
   * transition timer (which is owned by the *next* exercise, index+1).
   */
  const stopTimerForSet = (exerciseIndex: number, setIndex: number) => {
    const current = timerRef.current;
    if (!current) return;

    if (current.exerciseIndex !== exerciseIndex || current.setIndex !== setIndex) {
      DebugLogger.log(
        `⏭️ stopTimerForSet(${exerciseIndex},${setIndex}) ignored - timer is owned by (${current.exerciseIndex},${current.setIndex})`,
        'log',
      );
      return;
    }

    DebugLogger.log(`🛑 stopTimerForSet(${exerciseIndex},${setIndex}) - stopping owned timer`, 'log');
    stopTimer();
  };

  const resetTimer = async () => {
    if (!timer) return;
    
    // Explicitly stop Live Activity before resetting
    if (timer?.liveActivityId && stopActivity) {
      DebugLogger.log(`🔄 Explicitly stopping Live Activity in resetTimer: ${timer.liveActivityId}`, 'log');
      try {
        await stopActivity(timer.liveActivityId, { title: 'Timer Reset' });
        DebugLogger.log(`✅ Live Activity stopped successfully in resetTimer`, 'log');
      } catch (error) {
        // Handle "not found" errors gracefully - activity may have already expired
        if (error.message?.includes('not found') || error.message?.includes('ActivityNotFoundException')) {
          DebugLogger.log(`🧹 Live Activity ${timer.liveActivityId} not found (likely expired) in resetTimer`, 'warn');
        } else {
          DebugLogger.log(`❌ Failed to stop Live Activity in resetTimer: ${error}`, 'error');
        }
      }
    }
    
    const now = new Date();
    // The idle shape: not running, not paused, NOT finished, elapsed back to 0.
    // targetTime is kept so the timer can simply be started again.
    setTimer(prev => prev ? {
      ...prev,
      timeElapsed: 0,
      startTime: now,
      pausedAt: null,
      isRunning: false,
      isPaused: false,
      isFinished: false, // reset clears "finished" — this is idle, not completed
      countdownSoundPlayed: false, // Reset countdown sound flag
      liveActivityId: undefined, // Clear Live Activity ID
    } : null);
  };

  const addTime = (seconds: number) => {
    console.log(`🔧 addTime called with ${seconds} seconds. Timer exists: ${!!timer}`);
    
    // If no timer exists, create one with the added time
    if (!timer) {
      console.log('⚡ No timer found, creating new one with added time');
      setTimer({
        isRunning: false,
        isPaused: false,
        isFinished: false,
        timeElapsed: 0,
        targetTime: timerSettings.countUp ? 0 : seconds,
        startTime: null,
        pausedAt: null,
        isCountUp: timerSettings.countUp,
        pace: timerSettings.pace,
        countdownSoundPlayed: false,
      });
      return;
    }

    console.log(`Timer mode: ${timerSettings.countUp ? 'Count Up' : 'Countdown'}, Target: ${timer.targetTime}`);

    if (timerSettings.countUp) {
      // In count up mode, adjust the start time to appear as if more time has elapsed
      setTimer(prev => prev ? {
        ...prev,
        isFinished: false,
        startTime: prev.startTime ? new Date(prev.startTime.getTime() - seconds * 1000) : prev.startTime,
        timeElapsed: Math.min(3600, prev.timeElapsed + seconds), // Max 1 hour
      } : null);
    } else {
      // Read the state explicitly. "finished" and "idle" both satisfy
      // !isRunning && !isPaused, but they are different states and want different maths.
      const isFinished = !!timer.isFinished;
      const isIdle = !timer.isRunning && !timer.isPaused && !isFinished;

      // Adding time to a FINISHED rest means "give me `seconds` more", not
      // targetTime + seconds — that rest is over. So the new countdown is exactly
      // `seconds` long. (The old code did this by accident: finishing zeroed
      // targetTime, so 0 + 30 = 30. Preserving targetTime would have silently turned
      // a +30s tap on a finished 90s rest into a 120s countdown.)
      const newTargetTime = isFinished ? seconds : timer.targetTime + seconds;

      // Finished and idle both start their countdown from zero elapsed.
      const shouldResetElapsed = isFinished || isIdle;

      setTimer(prev => prev ? {
        ...prev,
        targetTime: newTargetTime,
        timeElapsed: shouldResetElapsed ? 0 : prev.timeElapsed,
        isFinished: false, // there is time on the clock again
        countdownSoundPlayed: false, // Reset so sound can play again if we go back under 3s
      } : null);
    }
  };

  const subtractTime = (seconds: number) => {
    // If no timer exists, create one with zero time (can't subtract from nothing)
    if (!timer) {
      console.log('⚡ No timer found for subtraction, creating new timer at 0:00');
      setTimer({
        isRunning: false,
        isPaused: false,
        isFinished: false,
        timeElapsed: 0,
        targetTime: 0,
        startTime: null,
        pausedAt: null,
        isCountUp: timerSettings.countUp,
        pace: timerSettings.pace,
        countdownSoundPlayed: false,
      });
      return;
    }

    if (timerSettings.countUp) {
      // In count up mode, adjust the start time to appear as if less time has elapsed
      setTimer(prev => prev ? {
        ...prev,
        isFinished: false,
        startTime: prev.startTime ? new Date(prev.startTime.getTime() + seconds * 1000) : prev.startTime,
        timeElapsed: Math.max(0, prev.timeElapsed - seconds),
      } : null);
    } else {
      // A finished countdown has nothing left to take away. Check the flag rather than
      // inferring it from the arithmetic, which is what timeElapsed === targetTime
      // would amount to.
      if (timer.isFinished) {
        console.log('Timer already finished, cannot subtract more time');
        return;
      }

      // In countdown mode, check current remaining time first
      const currentRemaining = timer.targetTime - timer.timeElapsed;

      // If already at or below 0, don't allow further reduction
      if (currentRemaining <= 0) {
        console.log('Timer already at 0:00, cannot subtract more time');
        return;
      }

      // Calculate new target time, but don't let it go below current elapsed time
      const newTargetTime = Math.max(timer.timeElapsed, timer.targetTime - seconds);

      setTimer(prev => prev ? {
        ...prev,
        targetTime: newTargetTime,
        isFinished: false,
        countdownSoundPlayed: false, // Reset so sound can play again
      } : null);
    }
  };

  const showModal = () => {
    setIsMinimized(false);
  };

  const hideModal = () => {
    setIsMinimized(true);
  };

  const minimize = () => {
    setIsMinimized(true);
  };

  const testAudio = () => {
    console.log('🔊 Testing audio manually...');
    playCountdownSound();
  };

  const setExerciseContext = (getContext: ((exerciseIndex?: number, setIndex?: number) => ExerciseContext) | null) => {
    getExerciseContextRef.current = getContext;
  };

  // Simple Live Activity - mirrors timer state
  // Track last sync time to detect rapid consecutive calls that could cause jumping
  const lastSyncTimeRef = useRef<number>(0);

  const syncLiveActivity = async () => {
    if (Platform.OS !== 'ios') return;
    try {
      const syncStartTime = Date.now();
      const timeSinceLastSync = syncStartTime - lastSyncTimeRef.current;
      
      const debugInfo = {
        hasTimer: !!timer,
        isCountUp: timer?.isCountUp,
        isRunning: timer?.isRunning,
        isPaused: timer?.isPaused,
        hasStartTime: !!timer?.startTime,
        targetTime: timer?.targetTime,
        liveActivityId: timer?.liveActivityId
      };
      
      console.log('🔄 syncLiveActivity called', debugInfo);
      DebugLogger.log(`syncLiveActivity called: ${JSON.stringify(debugInfo)}`);
      
      // Detect rapid consecutive syncs that could cause timer jumping
      if (timeSinceLastSync < 100 && lastSyncTimeRef.current > 0) {
        DebugLogger.log(`⚠️ RAPID SYNC: Only ${timeSinceLastSync}ms since last sync - potential race condition!`, 'warn');
      }
      lastSyncTimeRef.current = syncStartTime;

      // Only sync Live Activity for running countdown timers. `isFinished` is now the
      // explicit signal — `targetTime <= 0` is kept only to catch a zero-length target,
      // no longer to infer completion (a finished timer preserves its targetTime).
      if (!timer || timer.isCountUp || timer.isFinished || !timer.isRunning || timer.isPaused || !timer.startTime || timer.targetTime <= 0) {
        const reason = !timer ? 'no timer' :
                     timer.isCountUp ? 'count up mode' :
                     timer.isFinished ? 'countdown finished' :
                     !timer.isRunning ? 'timer not running' :
                     timer.isPaused ? 'timer paused' :
                     !timer.startTime ? 'no start time' :
                     timer.targetTime <= 0 ? 'target time <= 0' : 'unknown';

        // A finished countdown is NOT a reason to tear the widget down. The workout screen
        // keeps counting past 0:00 (useRestTimerDisplay); the Dynamic Island going blank at
        // that exact moment is the inconsistency, not the overtime. Hold, then dispose.
        // No state push happens while held, so the widget keeps its last-sent end date.
        if (reason === 'countdown finished' && timer?.liveActivityId && timer.startTime) {
          scheduleLiveActivityOvertimeStop(
            timer.liveActivityId,
            timer.startTime.getTime() + timer.targetTime * 1000,
          );
          return;
        }

        console.log('⚠️ Stopping Live Activity - conditions not met');
        DebugLogger.log(`Stopping Live Activity - reason: ${reason}`);
        
        // No active countdown timer, stop any existing Live Activity
        if (timer?.liveActivityId) {
          DebugLogger.log(`Stopping existing Live Activity: ${timer.liveActivityId}`);
          try {
            await stopActivity(timer.liveActivityId, { title: 'Timer Complete' });
            DebugLogger.log('Live Activity stopped successfully');
          } catch (error) {
            // Handle "not found" errors gracefully - activity may have already expired
            if (error.message?.includes('not found') || error.message?.includes('ActivityNotFoundException')) {
              DebugLogger.log(`🧹 Live Activity ${timer.liveActivityId} not found (likely expired) in syncLiveActivity`, 'warn');
            } else {
              DebugLogger.log(`❌ Failed to stop Live Activity in syncLiveActivity: ${error}`, 'error');
            }
          }
          setTimer(prev => prev ? { ...prev, liveActivityId: undefined } : null);
        }
        return;
      }

      const exerciseContext = getExerciseContextRef.current?.(timer.exerciseIndex, timer.setIndex);
      // Use the stable fixedEndTime to prevent jumping, fallback to calculation if not available
      const now = new Date().getTime();
      const elapsed = Math.floor((now - timer.startTime.getTime()) / 1000);
      const remaining = Math.max(0, timer.targetTime - elapsed);
      
      // CRITICAL: Always align endTime perfectly with remaining seconds to prevent lock screen jumping
      // Don't use fixedEndTime if it would create inconsistency with remaining seconds
      const calculatedEndTime = now + (remaining * 1000);
      const endTime = timer.fixedEndTime && Math.abs((timer.fixedEndTime - calculatedEndTime) / 1000) < 2 
        ? timer.fixedEndTime 
        : calculatedEndTime;
      
      // Debug log if we're using stable vs calculated endTime
      if (!timer.fixedEndTime) {
        DebugLogger.log(`⚠️ Using calculated endTime (timer missing fixedEndTime)`, 'warn');
      }

      const timingInfo = {
        now: new Date(now).toISOString(),
        startTime: timer.startTime.toISOString(),
        elapsed,
        targetTime: timer.targetTime,
        remaining,
        endTime: new Date(endTime).toISOString()
      };

      console.log('📊 Live Activity timing calculation', timingInfo);
      DebugLogger.log(`Timing calculation: elapsed=${elapsed}s, remaining=${remaining}s, endTime=${new Date(endTime).toISOString()}`);
      
      // Check for timing inconsistencies that could cause jumping
      const timeDiffFromNow = Math.abs((endTime - now) / 1000 - remaining);
      if (timeDiffFromNow > 1) {
        const usedFixed = timer.fixedEndTime && Math.abs((timer.fixedEndTime - calculatedEndTime) / 1000) < 2;
        DebugLogger.log(`⚠️ TIMING INCONSISTENCY: endTime-now=${Math.round((endTime-now)/1000)}s but remaining=${remaining}s (diff=${Math.round(timeDiffFromNow)}s) usedFixed=${usedFixed}`, 'warn');
      }
      
      const state = {
        title: 'REST',
        subtitle: exerciseContext?.nextExercise ? `Next: ${exerciseContext.nextExercise}` : undefined,
        timerEndDateInMilliseconds: endTime,
        // Remove remainingSeconds - let iOS calculate natively to prevent jumping
        progressBar: { date: endTime },
        // iOS does NOT supply a default app icon for the Dynamic Island. The widget's
        // compactLeading closure is `if let dynamicIslandImageName` — nil renders nothing.
        // Both names resolve against the widget target's own ios/LiveActivity/Assets.xcassets.
        imageName: 'icon_transparent',
        dynamicIslandImageName: 'icon_transparent',
      };

      // Log the exact state being sent to Live Activity for lock screen debugging
      DebugLogger.log(`📱 Live Activity State: title="${state.title}", endTime=${new Date(endTime).toISOString()}, timerEndMs=${endTime}, remainingSeconds=${remaining}`, 'log');

      const config = {
        backgroundColor: '#1a1a1a',
        titleColor: '#ffffff',
        subtitleColor: '#cccccc',
        progressViewTint: timer.themeColor || '#007AFF',
        timerType: 'digital' as const,
      };

      if (!timer.liveActivityId) {
        // Start new Live Activity - set once and let iOS handle native countdown
        console.log('🚀 Starting new Live Activity', { state, config });
        DebugLogger.log(`🆕 Starting new Live Activity with endTime: ${new Date(endTime).toISOString()} - will use native iOS countdown`);

        // The truthiness check covers Android (binding is null there); the try/catch
        // covers iOS binaries where expo-live-activity's JS is present but its native
        // module is not — requireOptionalNativeModule returns null and the package
        // dereferences it, so the call itself throws. Live Activities are a
        // side-channel: failing here must never stop the rest timer.
        if (startActivity) {
          try {
            const activityId = await startActivity(state, config);
            console.log('✅ Live Activity started with ID:', activityId);
            DebugLogger.log(`✅ Live Activity started successfully with ID: ${activityId}`);

            if (activityId) {
              // Seed lastSentRemaining here, not just on updates. The update gate below
              // compares against it, and an unseeded value made that comparison compare
              // `remaining` with itself — a guaranteed zero difference, so the widget was
              // written once at start and never updated again.
              setTimer(prev => prev ? { ...prev, liveActivityId: activityId, lastSentRemaining: remaining } : null);
            }
          } catch (error) {
            DebugLogger.log(`⚠️ [LIVE-ACTIVITY] startActivity unavailable, continuing without it: ${error?.message ?? error}`, 'warn');
          }
        } else {
          DebugLogger.log('⏭️ [LIVE-ACTIVITY] startActivity binding unavailable - skipping', 'warn');
        }
      } else {
        // Don't update every second - let iOS handle native countdown for accuracy.
        // Only push when the remaining time has drifted from what iOS last received.
        // An unknown last-sent value means the widget's end date is unverified, so push.
        // The old form was `remaining - (lastSentRemaining || remaining)`, which on an
        // undefined value substituted `remaining` and compared it to itself: always 0,
        // never above the threshold, so the only line that assigns lastSentRemaining sat
        // inside a branch that could not be entered. Self-locking, and the reason a
        // +15s tap never reached the Dynamic Island.
        const lastSent = timer.lastSentRemaining;
        const hasSignificantChange =
          lastSent === undefined || Math.abs(remaining - lastSent) > 5;


        if (hasSignificantChange) {
          console.log('🔄 Updating Live Activity for significant change', timer.liveActivityId, { state });
          DebugLogger.log(`🔄 Updating Live Activity for significant change: remaining=${remaining}, lastSent=${timer.lastSentRemaining}`);

          // Same two-layer guard as startActivity above. lastSentRemaining is only
          // advanced on a successful send, so a failed update retries next sync.
          if (updateActivity) {
            try {
              await updateActivity(timer.liveActivityId, state);
              setTimer(prev => prev ? { ...prev, lastSentRemaining: remaining } : null);
              DebugLogger.log('✅ Live Activity updated successfully');
            } catch (error) {
              DebugLogger.log(`⚠️ [LIVE-ACTIVITY] updateActivity unavailable, continuing without it: ${error?.message ?? error}`, 'warn');
            }
          } else {
            DebugLogger.log('⏭️ [LIVE-ACTIVITY] updateActivity binding unavailable - skipping', 'warn');
          }
        } else {
          DebugLogger.log(`⏭️ Skipping Live Activity update - no significant change (remaining=${remaining})`);
        }
      }
    } catch (error) {
      console.error('Live Activity sync error:', error);
      DebugLogger.log(`ERROR: Live Activity sync failed: ${error.message}`, 'error');
      
      if (timer?.liveActivityId && error.message?.includes('not found')) {
        DebugLogger.log(`Live Activity ${timer.liveActivityId} not found, clearing ID`);
        setTimer(prev => prev ? { ...prev, liveActivityId: undefined } : null);
      }
    }
  };



  const contextValue: TimerContextType = {
    timer,
    isMinimized,
    timerSettings,
    setTimerSettings,
    previewRestOptions,
    setPreviewRestOptions,
    applyPlanDefaultPace,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    stopTimerForSet,
    resetTimer,
    addTime,
    subtractTime,
    showModal,
    hideModal,
    minimize,
    setExerciseContext,
    testAudio,
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};