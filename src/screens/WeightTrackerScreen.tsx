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
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Line, Circle } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { WorkoutStorage } from '../utils/storage';
import WeightEntrySheet from '../components/nutrition/WeightEntrySheet';

/**
 * WeightTrackerScreen — v2.
 *
 * Goal: a proper progress dashboard, not a hero-number screensaver.
 *
 * What changed vs. v1:
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

// ---------- Helpers ----------

// Convert any weight to kg for cross-unit math. Storage allows users
// to flip kg/lbs over time, so all aggregation goes through this.
function toKg(weight: number, unit: 'kg' | 'lbs'): number {
  return unit === 'lbs' ? weight * 0.453592 : weight;
}

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
}

/**
 * Tiny inline sparkline. Plots oldest-first, padded to the chart area.
 * Uses linear interpolation between points — entries are typically
 * weekly-ish so a smooth curve would over-promise on precision.
 */
function Sparkline({ entries, color, width, height }: SparklineProps) {
  if (entries.length < 2) return null;

  // Sort oldest-first for chronological plotting
  const sorted = [...entries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const values = sorted.map((e) => toKg(e.weight, e.unit));
  const min = Math.min(...values);
  const max = Math.max(...values);
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

  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('1M');
  const [sheetVisible, setSheetVisible] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  // ---------- Derived stats ----------

  const latest = history[0];
  const displayUnit: 'kg' | 'lbs' = latest?.unit ?? 'kg';

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
    };
  }, [history, displayUnit]);

  const rangedEntries = useMemo(
    () => filterByRange(history, range),
    [history, range]
  );

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
            {/* Current weight + delta */}
            <View style={styles.heroBlock}>
              <Text style={styles.heroLabel}>Current</Text>
              <View style={styles.heroRow}>
                <Text style={styles.heroValue}>
                  {latest.weight.toFixed(1)}
                </Text>
                <Text style={styles.heroUnit}>{latest.unit}</Text>
              </View>
              <View style={styles.heroMeta}>
                {totalDelta && (
                  <View
                    style={[
                      styles.deltaPill,
                      { backgroundColor: hexToRgba(themeColor, 0.1) },
                    ]}
                  >
                    <Ionicons
                      name={totalDelta.positive ? 'trending-up' : 'trending-down'}
                      size={12}
                      color={themeColor}
                    />
                    <Text style={[styles.deltaText, { color: themeColor }]}>
                      {totalDelta.positive ? '+' : ''}
                      {totalDelta.value.toFixed(1)} {displayUnit}
                    </Text>
                  </View>
                )}
                <Text style={styles.heroSub}>{formatRelative(latest.date)}</Text>
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

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>7-day avg</Text>
                <Text style={styles.statValue}>
                  {stats?.avg7 != null ? stats.avg7.toFixed(1) : '—'}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Pace</Text>
                <Text style={styles.statValue}>
                  {stats?.pace != null
                    ? `${stats.pace > 0 ? '+' : ''}${stats.pace.toFixed(2)}`
                    : '—'}
                  <Text style={styles.statUnit}>/wk</Text>
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Entries</Text>
                <Text style={styles.statValue}>{history.length}</Text>
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
    paddingTop: 18,
    paddingBottom: 100,
  },

  // Hero block
  heroBlock: {
    marginBottom: 18,
  },
  heroLabel: {
    fontSize: 11,
    color: '#71717a',
    letterSpacing: 0.3,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  heroValue: {
    fontSize: 44,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -1,
    lineHeight: 46,
  },
  heroUnit: {
    fontSize: 16,
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

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 22,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#131316',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#27272a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statLabel: {
    fontSize: 10,
    color: '#71717a',
    letterSpacing: 0.3,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  statUnit: {
    fontSize: 10,
    color: '#71717a',
    fontWeight: '500',
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