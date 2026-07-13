import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useWeightUnit } from '../contexts/WeightUnitContext';
import { WorkoutStorage } from '../utils/storage';
import { loadGoalsProfile } from '../utils/goalsProfileStorage';
import type { GoalsProfile } from '../utils/goalsProfile';
import WeightEntrySheet from '../components/nutrition/WeightEntrySheet';
import GoalEntrySheet from '../components/nutrition/GoalEntrySheet';

/**
 * WeightTrackerScreen — v3.
 *
 * v3: goal-centric hero.
 *   1. Goal moved into the hero card. Current + goal read as a pair, with
 *      a start → goal progress track between them: % complete rides the
 *      marker, remaining distance sits on the right (reuses goalGap).
 *   2. Pace / ETA / 7-day avg folded into the hero as a mini-stat row.
 *      The standalone stats row is gone. Entries count only shows in the
 *      no-goal state (the Recent list already communicates it).
 *   3. The goal block (and the "Set a goal" pill) opens GoalEntrySheet:
 *      goal weight + BF% get edited in place — no bounce out to the
 *      questionnaire. The sheet writes GoalsProfile, the same store the
 *      questionnaire reads, so the two stay in sync with zero extra
 *      plumbing.
 *   4. The track's start anchor prefers goalProfile.startWeightKg, which
 *      GoalEntrySheet snapshots whenever the goal weight is set or
 *      changed. Falls back to the oldest logged entry for goals that
 *      predate the snapshot.
 *   5. Recomp-style targets (start ≈ goal) get the gap pill instead of a
 *      meaningless track.
 *   6. Sparkline gained a small "GOAL <x>" label on the dashed line.
 *
 * What changed vs. v1 (the v2 pass):
 *   1. Hero number replaced with current weight + delta + sparkline chart
 *      and three stat cards (7-day avg / weekly pace / change since start).
 *   2. Entry flow extracted into WeightEntrySheet — same component used
 *      by N3 during the questionnaire. One UI to maintain.
 *   3. Macro recalc on weight save now goes through finalizeNutrition()
 *      inside the sheet — kills the duplicate BMR/TDEE formula that lived
 *      inline in the old WeightTracker (~120 lines of bug-prone math).
 *   4. Testimonial flow REMOVED. It was ~700 lines that conflated daily
 *      weigh-ins with one-time transformation sharing. If/when we add
 *      sharing back it'll be triggered contextually on milestones, not
 *      buried behind a star icon in the tracker.
 *   5. Photos demoted from "five empty slots on every weigh-in" to an
 *      optional add-on on the history detail screen. Existing photos
 *      from old entries still render. Users can still add photos to any
 *      historical entry.
 *   6. AI info banner removed from the always-visible screen. The text
 *      "Your weight helps the AI..." doesn't need to be on a screen the
 *      user opens repeatedly.
 *
 * What stayed:
 *   - Centralized storage via WorkoutStorage (`saveWeightHistory` etc.)
 *   - The shape of a WeightEntry (id, weight, unit, date, notes?, photos?)
 *   - Empty state when no entries
 *   - The screen as a route destination (Profile still navigates here)
 */

// ---------- Types ----------

interface ProgressPhoto {
  uri: string;
  type: 'front' | 'side_left' | 'back' | 'side_right' | 'extra';
  timestamp: string;
}

interface WeightEntry {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  date: string;
  notes?: string;
  photos?: ProgressPhoto[];
}

// GoalsProfile doesn't declare startWeightKg yet (add it to the type when
// convenient). GoalEntrySheet snapshots it whenever the goal weight is
// set or changed; the questionnaire should do the same where it writes
// goalWeightKg. This screen reads the field defensively and falls back
// to the oldest logged entry for goals that predate the snapshot.
type GoalsProfileMaybeStart = GoalsProfile & { startWeightKg?: number | null };

// ---------- Helpers ----------

// Convert any weight to kg for cross-unit math. Storage allows users
// to flip kg/lbs over time, so all aggregation goes through this.
function toKg(weight: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? weight * 0.453592 : weight;
}

// Within this margin, "current" and "goal" read as the same weight —
// avoids showing "0.1 kg to go" as if it were a meaningful gap.
const AT_GOAL_THRESHOLD_KG = 0.5;

function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatRelative(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

function hexToRgba(hex: string, alpha: number): string {
  const stripped = hex.replace('#', '');
  const r = parseInt(stripped.substring(0, 2), 16);
  const g = parseInt(stripped.substring(2, 4), 16);
  const b = parseInt(stripped.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// RN's DimensionValue is a `${number}%` template-literal type, which a
// computed template string doesn't satisfy on its own. Keeps call sites
// tidy for the progress track's percentage positioning.
function pctString(n: number): `${number}%` {
  return `${n}%` as `${number}%`;
}

// ---------- Range selector ----------

type Range = '1M' | '3M' | '6M' | 'ALL';

function filterByRange(entries: WeightEntry[], range: Range): WeightEntry[] {
  if (range === 'ALL') return entries;
  const days = range === '1M' ? 30 : range === '3M' ? 90 : 180;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return entries.filter((e) => new Date(e.date).getTime() >= cutoff);
}

// ---------- Sparkline ----------

interface SparklineProps {
  entries: WeightEntry[];
  color: string;
  width: number;
  height: number;
  /** Goal weight in kg, if GoalsProfile has one set. Extends the chart's
   * y-range so the dashed goal line is always visible, even when the
   * goal sits outside the plotted data's min/max. */
  goalWeightKg?: number | null;
  /** Display-unit goal value (already converted), rendered as a small
   * label on the dashed goal line so the line reads as the goal. */
  goalLabel?: string | null;
}

/**
 * Tiny inline sparkline. Plots oldest-first, padded to the chart area.
 * Uses linear interpolation between points — entries are typically
 * weekly-ish so a smooth curve would over-promise on precision.
 */
function Sparkline({ entries, color, width, height, goalWeightKg, goalLabel }: SparklineProps) {
  if (entries.length < 2) return null;

  // Sort oldest-first for chronological plotting
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const values = sorted.map((e) => toKg(e.weight, e.unit));
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (goalWeightKg != null) {
    min = Math.min(min, goalWeightKg);
    max = Math.max(max, goalWeightKg);
  }
  const range = max - min || 1;

  const padX = 4;
  const padY = 6;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * chartW;
    const y = padY + ((max - v) / range) * chartH;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    height - padY
  } L ${points[0].x} ${height - padY} Z`;

  const last = points[points.length - 1];

  // Goal reference line — y is derived the same way as data points, off
  // the (possibly goal-extended) min/max, so it's always on-chart.
  const goalY =
    goalWeightKg != null ? padY + ((max - goalWeightKg) / range) * chartH : null;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgLinearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>

      {/* Gridlines */}
      {[0.25, 0.5, 0.75].map((frac) => (
        <Line
          key={frac}
          x1={0}
          y1={padY + frac * chartH}
          x2={width}
          y2={padY + frac * chartH}
          stroke="#27272a"
          strokeWidth={0.5}
          strokeDasharray="2 3"
        />
      ))}

      {/* Goal reference line */}
      {goalY != null && (
        <Line
          x1={0}
          y1={goalY}
          x2={width}
          y2={goalY}
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.55}
          strokeDasharray="5 4"
        />
      )}

      {/* Goal label — flips below the line when the line hugs the top edge */}
      {goalY != null && goalLabel != null && (
        <SvgText
          x={width - 4}
          y={goalY < 16 ? goalY + 11 : goalY - 4}
          textAnchor="end"
          fontSize={8}
          fontWeight="600"
          fill={color}
          fillOpacity={0.8}
        >
          {`GOAL ${goalLabel}`}
        </SvgText>
      )}

      <Path d={areaPath} fill="url(#weightGrad)" />
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* End marker */}
      <Circle cx={last.x} cy={last.y} r={5} fill={color} fillOpacity={0.3} />
      <Circle cx={last.x} cy={last.y} r={3} fill={color} />
    </Svg>
  );
}

// ---------- Photo viewer modal ----------

interface PhotoViewerProps {
  visible: boolean;
  photos: ProgressPhoto[];
  startIndex: number;
  onClose: () => void;
}

function PhotoViewer({ visible, photos, startIndex, onClose }: PhotoViewerProps) {
  const [index, setIndex] = useState(startIndex);
  const { themeColor } = useTheme();

  useEffect(() => {
    if (visible) setIndex(startIndex);
  }, [visible, startIndex]);

  if (!visible || photos.length === 0) return null;
  const photo = photos[index];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.viewerContainer}>
        <View style={styles.viewerHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.viewerTitle}>
            {photo.type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </Text>
          <Text style={styles.viewerCount}>
            {index + 1} / {photos.length}
          </Text>
        </View>

        <View style={styles.viewerContent}>
          <Image source={{ uri: photo.uri }} style={styles.viewerImage} resizeMode="contain" />
        </View>

        {photos.length > 1 && (
          <View style={styles.viewerNav}>
            <TouchableOpacity
              onPress={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
              style={styles.viewerNavBtn}
            >
              <Ionicons name="chevron-back" size={32} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.viewerDots}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.viewerDot,
                    {
                      backgroundColor:
                        i === index ? themeColor : 'rgba(255, 255, 255, 0.3)',
                    },
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setIndex((i) => (i + 1) % photos.length)}
              style={styles.viewerNavBtn}
            >
              <Ionicons name="chevron-forward" size={32} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ---------- Main screen ----------

export default function WeightTrackerScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { themeColor } = useTheme();
  const { globalUnit } = useWeightUnit();

  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('1M');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [goalProfile, setGoalProfile] = useState<GoalsProfile | null>(null);

  // History detail view (replaces the old standalone history screen)
  const [detailEntry, setDetailEntry] = useState<WeightEntry | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Photo viewer
  const [viewerPhotos, setViewerPhotos] = useState<ProgressPhoto[]>([]);
  const [viewerStart, setViewerStart] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await WorkoutStorage.loadWeightHistory();
      const sorted = (data || []).sort(
        (a: WeightEntry, b: WeightEntry) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setHistory(sorted);
    } catch (e) {
      console.error('WeightTracker load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // GoalsProfile is the single source of truth for the goal. This screen
  // reads it for display; edits go through GoalEntrySheet below, which
  // writes the same store the questionnaire reads — that IS the sync.
  const loadGoal = useCallback(async () => {
    try {
      const profile = await loadGoalsProfile();
      setGoalProfile(profile);
    } catch (e) {
      console.error('WeightTracker loadGoal failed', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
      loadGoal();
    }, [loadHistory, loadGoal])
  );

  // ---------- Derived stats ----------

  const latest = history[0];
  const displayUnit: 'kg' | 'lbs' = latest?.unit ?? 'kg';

  // A missing or zero goalWeightKg means "no goal set", not a real target.
  const goalWeightKg =
    goalProfile?.goalWeightKg != null && goalProfile.goalWeightKg > 0
      ? goalProfile.goalWeightKg
      : null;
  const hasGoal = goalWeightKg != null;

  const goalDisplay = useMemo(() => {
    if (goalWeightKg == null) return null;
    return displayUnit === 'lbs' ? goalWeightKg / 0.453592 : goalWeightKg;
  }, [goalWeightKg, displayUnit]);

  // Start anchor for the progress track. Prefers the snapshot that
  // GoalEntrySheet writes when a goal is set/changed; falls back to the
  // first-ever entry for goals that predate the snapshot.
  const startWeightKg = useMemo(() => {
    const snap = (goalProfile as GoalsProfileMaybeStart | null)?.startWeightKg;
    if (snap != null && snap > 0) return snap;
    if (history.length > 0) {
      const first = history[history.length - 1];
      return toKg(first.weight, first.unit);
    }
    return null;
  }, [goalProfile, history]);

  const startDisplay = useMemo(() => {
    if (startWeightKg == null) return null;
    return displayUnit === 'lbs' ? startWeightKg / 0.453592 : startWeightKg;
  }, [startWeightKg, displayUnit]);

  // 0..1 progress along start → goal, clamped so overshoot and pre-start
  // noise don't break the bar. Null when there's no goal, no start, or
  // start ≈ goal (recomp-style targets render the gap pill instead of a
  // meaningless track).
  const goalProgress = useMemo(() => {
    if (!latest || goalWeightKg == null || startWeightKg == null) return null;
    const total = goalWeightKg - startWeightKg;
    if (Math.abs(total) < 0.25) return null;
    const done = toKg(latest.weight, latest.unit) - startWeightKg;
    return Math.max(0, Math.min(1, done / total));
  }, [latest, goalWeightKg, startWeightKg]);

  // Direction-aware gap to goal — mirrors totalDelta's unit-conversion
  // pattern. "At goal" within a small threshold rather than a precise
  // zero, since scale noise makes exact matches unrealistic. Doubles as
  // the progress track's right-hand label.
  const goalGap = useMemo(() => {
    if (!latest || goalWeightKg == null) return null;
    const currentKg = toKg(latest.weight, latest.unit);
    const diffKg = currentKg - goalWeightKg; // > 0 above goal, < 0 below goal
    if (Math.abs(diffKg) <= AT_GOAL_THRESHOLD_KG) {
      return { text: 'At goal', direction: 'at' as const };
    }
    const absDisplay =
      displayUnit === 'lbs' ? Math.abs(diffKg) / 0.453592 : Math.abs(diffKg);
    return diffKg > 0
      ? { text: `${absDisplay.toFixed(1)} ${displayUnit} above goal`, direction: 'above' as const }
      : { text: `${absDisplay.toFixed(1)} ${displayUnit} to go`, direction: 'below' as const };
  }, [latest, goalWeightKg, displayUnit]);

  // Difference since the very first entry (in whichever unit the latest
  // entry is in)
  const totalDelta = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[history.length - 1];
    const latestKg = toKg(latest.weight, latest.unit);
    const firstKg = toKg(first.weight, first.unit);
    const diffKg = latestKg - firstKg;
    const value =
      displayUnit === 'lbs' ? diffKg / 0.453592 : diffKg;
    return { value, positive: diffKg > 0 };
  }, [history, displayUnit, latest]);

  // Short-horizon delta for the hero pill: change across entries in the
  // last 7 days. The track already communicates change-since-start, so
  // the pill carries the fresher signal; falls back to totalDelta when
  // there isn't enough recent data.
  const weekDelta = useMemo(() => {
    if (!latest || history.length < 2) return null;
    const latestMs = new Date(latest.date).getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const recent7 = history.filter(
      (e) => latestMs - new Date(e.date).getTime() <= weekMs
    );
    if (recent7.length < 2) return null;
    const oldest = recent7[recent7.length - 1];
    const diffKg =
      toKg(latest.weight, latest.unit) - toKg(oldest.weight, oldest.unit);
    const value = displayUnit === 'lbs' ? diffKg / 0.453592 : diffKg;
    return { value, positive: diffKg > 0 };
  }, [history, latest, displayUnit]);

  // 7-day rolling average and weekly pace (kg/week, displayed in user's unit)
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const last7 = history.filter(
      (e) => now - new Date(e.date).getTime() <= weekMs
    );
    const avg7 =
      last7.length > 0
        ? last7.reduce((sum, e) => sum + toKg(e.weight, e.unit), 0) /
          last7.length
        : null;

    // Weekly pace: linear fit across the last 4 weeks of data, fallback
    // to total change if not enough data
    let pace: number | null = null;
    const recent = history.filter(
      (e) => now - new Date(e.date).getTime() <= 4 * weekMs
    );
    if (recent.length >= 2) {
      const sorted = [...recent].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const days =
        (new Date(last.date).getTime() - new Date(first.date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (days > 0) {
        const deltaKg = toKg(last.weight, last.unit) - toKg(first.weight, first.unit);
        pace = (deltaKg / days) * 7; // kg per week
      }
    }

    const inDisplay = (kg: number | null) =>
      kg == null
        ? null
        : displayUnit === 'lbs'
          ? kg / 0.453592
          : kg;

    return {
      avg7: inDisplay(avg7),
      pace: inDisplay(pace),
      paceKg: pace,
    };
  }, [history, displayUnit]);

  // Reframe pace as "N weeks to goal" only when it's honest: pace must be
  // nonzero AND moving in the direction the goal actually requires. A
  // zero pace, or progress moving away from goal, keeps the raw pace
  // stat instead of inventing an ETA.
  const goalEtaWeeks = useMemo(() => {
    if (!latest || goalWeightKg == null || !stats?.paceKg) return null;
    const currentKg = toKg(latest.weight, latest.unit);
    const remainingKg = goalWeightKg - currentKg; // > 0 need to gain, < 0 need to lose
    if (Math.abs(remainingKg) <= AT_GOAL_THRESHOLD_KG) return null;
    const sameDirection = Math.sign(stats.paceKg) === Math.sign(remainingKg);
    if (!sameDirection) return null;
    return Math.max(1, Math.round(Math.abs(remainingKg / stats.paceKg)));
  }, [latest, goalWeightKg, stats]);

  const rangedEntries = useMemo(
    () => filterByRange(history, range),
    [history, range]
  );

  // The hero pill prefers the 7-day delta; falls back to since-start.
  const heroPill = weekDelta ?? totalDelta;

  // ---------- Handlers ----------

  const handleDelete = (entry: WeightEntry) => {
    Alert.alert(
      'Delete entry',
      `Delete ${entry.weight} ${entry.unit} from ${formatDate(entry.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const next = history.filter((e) => e.id !== entry.id);
              await WorkoutStorage.saveWeightHistory(next);
              setHistory(next);
              if (detailEntry?.id === entry.id) {
                setDetailEntry(null);
                setShowHistory(false);
              }
            } catch (e) {
              console.error('Delete failed', e);
            }
          },
        },
      ]
    );
  };

  const requestPhotoPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow photo library access to add progress photos.'
      );
      return false;
    }
    return true;
  };

  // Add or replace a photo of a given type on an entry. Photos are
  // attached to specific historical entries — we don't expose photos in
  // the new daily entry flow because the empty-grid pattern was the
  // worst-of-both-worlds (see top-of-file).
  const addPhotoToEntry = async (
    entryId: string,
    type: ProgressPhoto['type']
  ) => {
    if (!(await requestPhotoPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const newPhoto: ProgressPhoto = {
      uri: result.assets[0].uri,
      type,
      timestamp: new Date().toISOString(),
    };

    const next = history.map((e) => {
      if (e.id !== entryId) return e;
      const existing = (e.photos ?? []).filter((p) => p.type !== type);
      return { ...e, photos: [...existing, newPhoto] };
    });
    await WorkoutStorage.saveWeightHistory(next);
    setHistory(next);
    const updated = next.find((e) => e.id === entryId) ?? null;
    setDetailEntry(updated);
  };

  // ---------- Render: history detail view ----------

  if (showHistory && detailEntry) {
    return (
      <View style={styles.container}>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              setShowHistory(false);
              setDetailEntry(null);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Entry</Text>
          <TouchableOpacity
            onPress={() => handleDelete(detailEntry)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#71717a" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll}>
          <View style={styles.detailCard}>
            <Text style={[styles.detailValue, { color: themeColor }]}>
              {detailEntry.weight}
              <Text style={styles.detailUnit}> {detailEntry.unit}</Text>
            </Text>
            <Text style={styles.detailDate}>{formatDate(detailEntry.date)}</Text>
            {detailEntry.notes && (
              <View style={styles.notesBlock}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{detailEntry.notes}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Progress photos</Text>
          <Text style={styles.sectionHint}>
            Optional. Add any angle you want to track.
          </Text>
          <View style={styles.photoGrid}>
            {(['front', 'side_left', 'back', 'side_right', 'extra'] as const).map(
              (type) => {
                const photo = (detailEntry.photos ?? []).find(
                  (p) => p.type === type
                );
                return (
                  <View key={type} style={styles.photoSlot}>
                    <TouchableOpacity
                      style={styles.photoBtn}
                      onPress={() => {
                        if (photo) {
                          const photos = detailEntry.photos ?? [];
                          const idx = photos.indexOf(photo);
                          setViewerPhotos(photos);
                          setViewerStart(idx);
                          setViewerVisible(true);
                        } else {
                          addPhotoToEntry(detailEntry.id, type);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      {photo ? (
                        <Image
                          source={{ uri: photo.uri }}
                          style={styles.photoImg}
                        />
                      ) : (
                        <View style={styles.photoEmpty}>
                          <Ionicons
                            name="add"
                            size={20}
                            color="#52525b"
                          />
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text style={styles.photoLabel}>
                      {type === 'side_left'
                        ? 'Side L'
                        : type === 'side_right'
                          ? 'Side R'
                          : type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </View>
                );
              }
            )}
          </View>
        </ScrollView>

        <PhotoViewer
          visible={viewerVisible}
          photos={viewerPhotos}
          startIndex={viewerStart}
          onClose={() => setViewerVisible(false)}
        />
      </View>
    );
  }

  // ---------- Render: main dashboard ----------

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={themeColor} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Weight</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={themeColor} />
        </View>
      ) : history.length === 0 ? (
        // Empty state
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="scale-outline" size={48} color={themeColor + '60'} />
          </View>
          <Text style={styles.emptyTitle}>Track your weight</Text>
          <Text style={styles.emptySub}>
            Log your weight to see your trend and keep your meal plan accurate.
          </Text>
          <TouchableOpacity
            style={[styles.emptyCta, { backgroundColor: themeColor }]}
            onPress={() => setSheetVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#0a0a0b" />
            <Text style={styles.emptyCtaText}>Log first weight</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero card: current + goal + progress track + goal stats */}
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroLabel}>Current</Text>
                  <View style={styles.heroRow}>
                    <Text style={styles.heroValue}>
                      {latest.weight.toFixed(1)}
                    </Text>
                    <Text style={styles.heroUnit}>{latest.unit}</Text>
                  </View>
                  <View style={styles.heroMeta}>
                    {heroPill && (
                      <View
                        style={[
                          styles.deltaPill,
                          { backgroundColor: hexToRgba(themeColor, 0.1) },
                        ]}
                      >
                        <Ionicons
                          name={heroPill.positive ? 'trending-up' : 'trending-down'}
                          size={12}
                          color={themeColor}
                        />
                        <Text style={[styles.deltaText, { color: themeColor }]}>
                          {heroPill.positive ? '+' : ''}
                          {heroPill.value.toFixed(1)}
                          {weekDelta ? ' this wk' : ` ${displayUnit}`}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.heroSub}>{formatRelative(latest.date)}</Text>
                  </View>
                </View>

                {/* Goal — tap to edit in place via GoalEntrySheet. */}
                {hasGoal && (
                  <TouchableOpacity
                    style={styles.goalSide}
                    onPress={() => setGoalSheetVisible(true)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Edit goal"
                  >
                    <View style={styles.goalLabelRow}>
                      <Ionicons name="flag-outline" size={12} color="#71717a" />
                      <Text style={styles.microLabel}>Goal</Text>
                      <Ionicons name="chevron-forward" size={12} color="#52525b" />
                    </View>
                    <View style={styles.goalNumRow}>
                      <Text style={[styles.goalValue, { color: themeColor }]}>
                        {goalDisplay!.toFixed(1)}
                      </Text>
                      <Text style={styles.goalUnit}>{displayUnit}</Text>
                    </View>
                    {goalProfile?.goalBodyFatPct != null && (
                      <View
                        style={[
                          styles.bfChip,
                          { borderColor: hexToRgba(themeColor, 0.3) },
                        ]}
                      >
                        <Text style={[styles.bfChipText, { color: themeColor }]}>
                          {goalProfile.goalBodyFatPct}% BF target
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {hasGoal && goalProgress != null ? (
                // Progress track: start → goal, % on the marker,
                // remaining on the right (goalGap doubles as the label).
                <View style={styles.trackArea}>
                  <Text
                    style={[
                      styles.trackPct,
                      {
                        color: themeColor,
                        left: pctString(
                          Math.min(Math.max(goalProgress, 0.07), 0.93) * 100
                        ),
                      },
                    ]}
                  >
                    {Math.round(goalProgress * 100)}%
                  </Text>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.trackFill,
                        {
                          width: pctString(goalProgress * 100),
                          backgroundColor: themeColor,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.trackMarker,
                        {
                          left: pctString(goalProgress * 100),
                          backgroundColor: themeColor,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.trackLabels}>
                    <Text style={styles.trackStart}>
                      {startDisplay != null
                        ? `${startDisplay.toFixed(1)} start`
                        : ''}
                    </Text>
                    {goalGap && (
                      <Text
                        style={[
                          styles.trackToGo,
                          goalGap.direction === 'at' && { color: '#34d399' },
                        ]}
                      >
                        {goalGap.text}
                      </Text>
                    )}
                  </View>
                </View>
              ) : hasGoal && goalGap ? (
                // Start ≈ goal (recomp-style target): a track would be
                // meaningless, so keep the gap pill.
                <View
                  style={[
                    styles.goalGapPill,
                    {
                      backgroundColor:
                        goalGap.direction === 'at'
                          ? 'rgba(52, 211, 153, 0.12)'
                          : hexToRgba(themeColor, 0.1),
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      goalGap.direction === 'at'
                        ? 'checkmark-circle'
                        : 'navigate-outline'
                    }
                    size={12}
                    color={goalGap.direction === 'at' ? '#34d399' : themeColor}
                  />
                  <Text
                    style={[
                      styles.goalGapText,
                      {
                        color:
                          goalGap.direction === 'at' ? '#34d399' : themeColor,
                      },
                    ]}
                  >
                    {goalGap.text}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.setGoalPill}
                  onPress={() => setGoalSheetVisible(true)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Set a goal"
                >
                  <Ionicons name="flag-outline" size={12} color={themeColor} />
                  <Text style={[styles.setGoalText, { color: themeColor }]}>Set a goal</Text>
                  <Ionicons name="chevron-forward" size={12} color={themeColor} />
                </TouchableOpacity>
              )}

              <View style={styles.heroDivider} />

              {/* Mini stats — replaces the old standalone stats row */}
              <View style={styles.msRow}>
                <View style={styles.msCell}>
                  <Text style={styles.msLabel}>Pace</Text>
                  <Text style={styles.msValue}>
                    {stats?.pace != null
                      ? `${stats.pace > 0 ? '+' : ''}${stats.pace.toFixed(2)}`
                      : '—'}
                    <Text style={styles.msUnit}>/wk</Text>
                  </Text>
                </View>
                {hasGoal ? (
                  <View style={[styles.msCell, styles.msCellCenter]}>
                    <Text style={styles.msLabel}>To goal</Text>
                    <Text
                      style={styles.msValue}
                      accessibilityLabel={
                        goalEtaWeeks != null
                          ? `About ${goalEtaWeeks} ${goalEtaWeeks === 1 ? 'week' : 'weeks'} to goal at current pace`
                          : undefined
                      }
                    >
                      {goalEtaWeeks != null ? `~${goalEtaWeeks}` : '—'}
                      {goalEtaWeeks != null && (
                        <Text style={styles.msUnit}>
                          {' '}
                          {goalEtaWeeks === 1 ? 'wk' : 'wks'}
                        </Text>
                      )}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.msCell, styles.msCellCenter]}>
                    <Text style={styles.msLabel}>7-day avg</Text>
                    <Text style={styles.msValue}>
                      {stats?.avg7 != null ? stats.avg7.toFixed(1) : '—'}
                    </Text>
                  </View>
                )}
                {hasGoal ? (
                  <View style={[styles.msCell, styles.msCellRight]}>
                    <Text style={styles.msLabel}>7-day avg</Text>
                    <Text style={styles.msValue}>
                      {stats?.avg7 != null ? stats.avg7.toFixed(1) : '—'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.msCell, styles.msCellRight]}>
                    <Text style={styles.msLabel}>Entries</Text>
                    <Text style={styles.msValue}>{history.length}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Chart */}
            <View style={styles.chartCard}>
              <View style={styles.rangeRow}>
                {(['1M', '3M', '6M', 'ALL'] as Range[]).map((r) => {
                  const sel = range === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRange(r)}
                      style={[
                        styles.rangeBtn,
                        sel && { backgroundColor: themeColor },
                      ]}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.rangeText,
                          { color: sel ? '#0a0a0b' : '#a1a1aa' },
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.chartWrap}>
                {rangedEntries.length >= 2 ? (
                  <Sparkline
                    entries={rangedEntries}
                    color={themeColor}
                    width={290}
                    height={110}
                    goalWeightKg={goalWeightKg}
                    goalLabel={goalDisplay != null ? goalDisplay.toFixed(1) : null}
                  />
                ) : (
                  <View style={styles.chartEmpty}>
                    <Text style={styles.chartEmptyText}>
                      Add another entry to see your trend
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Recent entries */}
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Recent</Text>
            </View>
            <View style={styles.entryList}>
              {history.slice(0, 8).map((entry, i) => {
                // Each row shows the delta vs the entry below it (older)
                const next = history[i + 1];
                let delta: number | null = null;
                if (next) {
                  const cur = toKg(entry.weight, entry.unit);
                  const prev = toKg(next.weight, next.unit);
                  const d = cur - prev;
                  delta =
                    entry.unit === 'lbs' ? d / 0.453592 : d;
                }
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[
                      styles.entryRow,
                      i === Math.min(history.length, 8) - 1 && { borderBottomWidth: 0 },
                    ]}
                    onPress={() => {
                      setDetailEntry(entry);
                      setShowHistory(true);
                    }}
                    onLongPress={() => handleDelete(entry)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entryWeight}>
                        {entry.weight} {entry.unit}
                      </Text>
                      <Text style={styles.entrySub}>
                        {formatRelative(entry.date)}
                        {entry.notes ? ` · ${entry.notes}` : ''}
                      </Text>
                    </View>
                    {delta != null && (
                      <Text
                        style={[
                          styles.entryDelta,
                          {
                            color:
                              delta === 0
                                ? '#71717a'
                                : delta > 0
                                  ? themeColor
                                  : '#a1a1aa',
                          },
                        ]}
                      >
                        {delta > 0 ? '+' : ''}
                        {delta.toFixed(1)}
                      </Text>
                    )}
                    {(entry.photos?.length ?? 0) > 0 && (
                      <Ionicons
                        name="image-outline"
                        size={14}
                        color="#71717a"
                        style={{ marginLeft: 10 }}
                      />
                    )}
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color="#52525b"
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Floating CTA */}
          <View
            style={[
              styles.ctaBar,
              { paddingBottom: Math.max(insets.bottom, 12) + 4 },
            ]}
          >
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: themeColor }]}
              onPress={() => setSheetVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#0a0a0b" />
              <Text style={styles.ctaText}>Log weight</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <WeightEntrySheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSaved={() => loadHistory()}
      />

      <GoalEntrySheet
        visible={goalSheetVisible}
        onClose={() => setGoalSheetVisible(false)}
        onSaved={() => loadGoal()}
        unit={displayUnit}
        currentWeightKg={latest ? toKg(latest.weight, latest.unit) : null}
      />
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0b' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#18181b',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Scroll
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },

  // Hero card (current + goal + track + mini stats)
  heroCard: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 14,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 12,
  },
  heroLabel: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.3,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  microLabel: {
    fontSize: 10,
    color: '#71717a',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 38,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -1,
    lineHeight: 40,
  },
  heroUnit: {
    fontSize: 15,
    fontWeight: '500',
    color: '#71717a',
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroSub: {
    fontSize: 11,
    color: '#71717a',
  },

  // Goal side of the hero — display only, taps through to Goals & Stats
  goalSide: {
    alignItems: 'flex-end',
  },
  goalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 5,
  },
  goalNumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  goalValue: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  goalUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#71717a',
  },
  bfChip: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  bfChipText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Progress track
  trackArea: {
    marginTop: 24,
  },
  trackPct: {
    position: 'absolute',
    top: -18,
    width: 48,
    marginLeft: -24,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#26262b',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  trackMarker: {
    position: 'absolute',
    top: -4,
    marginLeft: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#0a0a0b',
  },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  trackStart: {
    fontSize: 11,
    color: '#71717a',
  },
  trackToGo: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d4d4d8',
  },

  // Recomp fallback + no-goal pill
  goalGapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  goalGapText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setGoalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
  },
  setGoalText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Hero divider + mini stats row
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#27272a',
    marginTop: 14,
    marginBottom: 11,
  },
  msRow: {
    flexDirection: 'row',
  },
  msCell: {
    flex: 1,
  },
  msCellCenter: {
    alignItems: 'center',
  },
  msCellRight: {
    alignItems: 'flex-end',
  },
  msLabel: {
    fontSize: 10,
    color: '#71717a',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 3,
  },
  msValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  msUnit: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '500',
  },

  // Chart card
  chartCard: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  rangeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chartWrap: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    fontSize: 12,
    color: '#52525b',
  },

  // Recent
  recentHeader: {
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  entryList: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 14,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#27272a',
  },
  entryWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  entrySub: {
    fontSize: 11,
    color: '#71717a',
    marginTop: 2,
  },
  entryDelta: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },

  // CTA
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#0a0a0b',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#18181b',
  },
  cta: {
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaText: {
    color: '#0a0a0b',
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 14,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  emptyCta: {
    height: 48,
    paddingHorizontal: 22,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyCtaText: {
    color: '#0a0a0b',
    fontSize: 14,
    fontWeight: '600',
  },

  // Detail view
  detailScroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    marginBottom: 28,
  },
  detailValue: {
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  detailUnit: {
    fontSize: 18,
    fontWeight: '500',
    color: '#71717a',
  },
  detailDate: {
    fontSize: 13,
    color: '#a1a1aa',
    marginTop: 6,
    marginBottom: 4,
  },
  notesBlock: {
    width: '100%',
    paddingTop: 16,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#27272a',
  },
  notesLabel: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#d4d4d8',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: '#71717a',
    marginBottom: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlot: {
    width: '18%',
    alignItems: 'center',
  },
  photoBtn: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    flex: 1,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  photoLabel: {
    fontSize: 11,
    color: '#a1a1aa',
    fontWeight: '500',
  },

  // Photo viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    paddingBottom: 16,
  },
  viewerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  viewerCount: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  viewerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  viewerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  viewerNavBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerDots: {
    flexDirection: 'row',
    gap: 6,
  },
  viewerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});