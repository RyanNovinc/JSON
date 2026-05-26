import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWorkoutRoutines } from '../contexts/WorkoutRoutineContext';
import { useTheme } from '../contexts/ThemeContext';

// Share-page palette (matches https://json.fit/p/* share pages).
const C = {
  bg: '#050508',
  surface: '#0a0a0f',
  surface2: '#111116',
  border: 'rgba(255,255,255,0.06)',
  text: '#f0f0f2',
  text2: '#9898a4',
  text3: '#55555f',
};

const MONO = Platform.OS === 'ios' ? 'Courier' : 'monospace';

// hex (#rrggbb) -> rgba string with given alpha
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return `rgba(236,72,153,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

function formatWeekly(obj: any): string {
  if (!obj || typeof obj !== 'object') return '';
  return Object.entries(obj)
    .map(([w, v]) => `W${w}: ${v}`)
    .join('  ·  ');
}

function exerciseMeta(ex: any): string {
  const sets = ex?.sets;
  const reps = ex?.reps;
  if (sets && reps) return `${sets} × ${reps}`;
  return String(sets || reps || '');
}

export default function SamplePlanDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { themeColor } = useTheme();
  const accent = themeColor || '#ec4899';

  const entry = route.params?.plan;
  const { saveRoutine } = useWorkoutRoutines();

  // ---- All hooks must run before any early return ----
  const block = entry?.raw?.blocks?.[0];
  const trainingDays = useMemo(
    () =>
      (block?.days || []).filter(
        (d: any) =>
          Array.isArray(d?.exercises) &&
          d.exercises.length > 0 &&
          !(d.day_name || '').toLowerCase().includes('rest')
      ),
    [block]
  );

  // Which day groups are open (first open by default), and which exercise rows expanded.
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true });
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState<Record<number, boolean>>({});

  if (!entry) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Plan not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.emptyBack, { color: accent }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const summary = entry.summary;

  const toggleDay = (i: number) =>
    setOpenDays((p) => ({ ...p, [i]: !p[i] }));
  const toggleRow = (key: string) =>
    setExpandedRows((p) => ({ ...p, [key]: !p[key] }));
  const toggleShowAll = (i: number) =>
    setShowAll((p) => ({ ...p, [i]: !p[i] }));

  const handleImport = async () => {
    await saveRoutine({
      id: Date.now().toString(),
      name: entry.raw.routine_name,
      days: entry.raw.days_per_week,
      blocks: entry.raw.blocks.length,
      data: entry.raw,
      programId: entry.raw.programId,
    });
    navigation.navigate('Main');
  };

  const renderExerciseRow = (ex: any, dayIdx: number, exIdx: number) => {
    const key = `${dayIdx}-${exIdx}`;
    const expanded = !!expandedRows[key];
    const muscles = [
      ...(ex.primaryMuscles || []),
      ...(ex.secondaryMuscles || []),
    ];
    const hasDetail =
      ex.notes || ex.reps_weekly || ex.rir_weekly || ex.rest || muscles.length;

    return (
      <View key={key}>
        <TouchableOpacity
          style={[styles.exRow, expanded && styles.exRowExpanded]}
          onPress={() => hasDetail && toggleRow(key)}
          activeOpacity={hasDetail ? 0.6 : 1}
        >
          <Text style={styles.exName} numberOfLines={1}>
            {ex.exercise || ex.name || 'Exercise'}
          </Text>
          <Text style={styles.exMeta}>{exerciseMeta(ex)}</Text>
          {hasDetail ? (
            <Text style={[styles.chev, expanded && { color: accent, transform: [{ rotate: '90deg' }] }]}>
              ›
            </Text>
          ) : null}
        </TouchableOpacity>

        {hasDetail && expanded ? (
          <View style={styles.exDetail}>
            {ex.rest ? (
              <DetailRow label="Rest" value={`${ex.rest}s`} muted />
            ) : null}
            {muscles.length ? (
              <DetailRow label="Targets" value={muscles.join(', ')} />
            ) : null}
            {ex.reps_weekly ? (
              <DetailRow label="Reps" value={formatWeekly(ex.reps_weekly)} muted />
            ) : null}
            {ex.rir_weekly ? (
              <DetailRow label="RIR" value={formatWeekly(ex.rir_weekly)} muted />
            ) : null}
            {ex.notes ? <DetailRow label="Notes" value={ex.notes} /> : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <View
            style={[
              styles.pill,
              { borderColor: withAlpha(accent, 0.2), backgroundColor: withAlpha(accent, 0.06) },
            ]}
          >
            <View style={[styles.pillDot, { backgroundColor: accent }]} />
            <Text style={[styles.pillText, { color: accent }]}>
              {String(entry.level).toLowerCase()} program
            </Text>
          </View>
          <Text style={styles.title}>{summary.routine_name}</Text>
          <Text style={styles.subtitle}>
            {summary.split} · {summary.daysPerWeek} days/week
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Stat grid */}
          <View style={styles.statGrid}>
            <Stat accent={accent} num={String(summary.daysPerWeek)} lbl="days/week" />
            <Stat accent={accent} num={`${summary.weeks}wk`} lbl="program" />
            <Stat accent={accent} num={String(summary.exerciseCount)} lbl="exercises" />
          </View>

          <View style={styles.cardBody}>
            {entry.raw.description ? (
              <View style={styles.aboutSection}>
                <Text style={[styles.sectionLbl, { color: accent }]}>About</Text>
                <Text style={styles.aboutText}>{entry.raw.description}</Text>
              </View>
            ) : null}

            {/* Day groups */}
            {trainingDays.map((day: any, dayIdx: number) => {
              const isOpen = !!openDays[dayIdx];
              const exercises = day.exercises || [];
              const all = !!showAll[dayIdx];
              const visible = all ? exercises : exercises.slice(0, 4);
              const hiddenCount = exercises.length - 4;
              const duration = day.estimated_duration ? `~${day.estimated_duration} min` : '';

              return (
                <View key={dayIdx} style={[styles.dayGroup, dayIdx === 0 && styles.dayGroupFirst]}>
                  <TouchableOpacity
                    style={styles.dayHeader}
                    onPress={() => toggleDay(dayIdx)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChev, isOpen && { color: accent, transform: [{ rotate: '90deg' }] }]}>
                      ›
                    </Text>
                    <Text style={[styles.dayName, { color: isOpen ? accent : C.text2 }]}>
                      {day.day_name}
                    </Text>
                    <Text style={styles.dayMeta}>
                      {duration ? duration : `${exercises.length} exercises`}
                    </Text>
                  </TouchableOpacity>

                  {isOpen ? (
                    <View style={styles.dayContent}>
                      {visible.map((ex: any, exIdx: number) =>
                        renderExerciseRow(ex, dayIdx, exIdx)
                      )}
                      {hiddenCount > 0 ? (
                        <TouchableOpacity
                          style={styles.toggleMore}
                          onPress={() => toggleShowAll(dayIdx)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.toggleMoreText}>
                            {all
                              ? 'Show less'
                              : `+ ${hiddenCount} more exercise${hiddenCount === 1 ? '' : 's'}`}{' '}
                            {all ? '▴' : '▾'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: accent }]}
          onPress={handleImport}
          activeOpacity={0.85}
        >
          <Text style={styles.importBtnText}>Import &amp; start</Text>
        </TouchableOpacity>
        <Text style={styles.footerHint}>Adds this plan to your workouts</Text>
      </View>
    </SafeAreaView>
  );
}

function Stat({ accent, num, lbl }: { accent: string; num: string; lbl: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statNum, { color: accent }]}>{num}</Text>
      <Text style={styles.statLbl}>{lbl}</Text>
    </View>
  );
}

function DetailRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, muted && styles.detailValueMuted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 130 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: C.text, fontSize: 16 },
  emptyBack: { fontSize: 15, fontWeight: '600' },

  // Header
  header: { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  backBtn: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backIcon: { color: C.text, fontSize: 26, lineHeight: 26, marginTop: -2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderRadius: 100,
    marginTop: 36,
    marginBottom: 16,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontFamily: MONO, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  title: {
    color: C.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    lineHeight: 30,
  },
  subtitle: { color: C.text3, fontSize: 13, fontFamily: MONO, letterSpacing: 0.4, marginTop: 8 },

  // Card
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  statGrid: { flexDirection: 'row', backgroundColor: C.border },
  stat: { flex: 1, backgroundColor: C.surface, paddingVertical: 18, alignItems: 'center', marginRight: 1 },
  statNum: { fontFamily: MONO, fontSize: 22, fontWeight: '500', letterSpacing: -0.4 },
  statLbl: { fontSize: 11, color: C.text3, fontFamily: MONO, marginTop: 6 },

  cardBody: { padding: 20 },

  aboutSection: { marginBottom: 20 },
  sectionLbl: { fontFamily: MONO, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  aboutText: { fontSize: 14, color: C.text2, lineHeight: 22 },

  // Day groups
  dayGroup: { borderTopWidth: 1, borderTopColor: C.border },
  dayGroupFirst: { borderTopWidth: 0 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  dayChev: { color: C.text3, fontSize: 16, width: 12, fontWeight: '700' },
  dayName: { fontFamily: MONO, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  dayMeta: { color: C.text3, fontFamily: MONO, fontSize: 11, letterSpacing: 0.6, marginLeft: 'auto' },
  dayContent: { paddingBottom: 12 },

  // Exercise rows
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  exRowExpanded: { backgroundColor: C.surface2, borderBottomColor: 'transparent' },
  exName: { color: C.text, fontSize: 14, fontWeight: '500', flex: 1 },
  exMeta: { fontFamily: MONO, fontSize: 11, color: C.text3 },
  chev: { color: C.text3, fontSize: 16, width: 14, fontWeight: '700', textAlign: 'center' },

  exDetail: {
    backgroundColor: C.surface2,
    paddingHorizontal: 8,
    paddingBottom: 12,
    paddingTop: 4,
    marginHorizontal: -8,
    marginTop: -4,
    borderRadius: 6,
  },
  detailRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  detailLabel: {
    fontFamily: MONO,
    fontSize: 10,
    color: C.text3,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    width: 56,
    paddingTop: 1,
  },
  detailValue: { flex: 1, fontSize: 13, color: C.text2, lineHeight: 18 },
  detailValueMuted: { fontFamily: MONO, fontSize: 12, color: C.text3 },

  toggleMore: { paddingVertical: 12, alignItems: 'center' },
  toggleMoreText: { fontFamily: MONO, fontSize: 12, color: C.text3, letterSpacing: 0.6 },

  // Footer
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  importBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  importBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
  footerHint: { fontFamily: MONO, fontSize: 11, color: C.text3, textAlign: 'center', marginTop: 12, letterSpacing: 0.4 },
});