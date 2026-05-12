/**
 * OneRMProgressionModal.tsx
 *
 * Modal component for displaying 1RM progression data for a specific exercise.
 * Animated bottom-sheet with two tabs: Chart (visualization with range filters)
 * and Sessions (chronological history with change indicators).
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { WorkoutStorage } from '../utils/storage';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Epley formula: 1RM = weight × (1 + reps/30)
const defaultCalc1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
};

interface ProgressionData {
  date: string;
  dayName: string;
  oneRM: number;
  timestamp: number;
}

type RangeKey = '14D' | '1M' | '3M' | '6M' | '12M' | 'ALL';

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '14D', label: '14D', days: 14 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 180 },
  { key: '12M', label: '12M', days: 365 },
  { key: 'ALL', label: 'ALL', days: null },
];

type TabKey = 'chart' | 'sessions';

interface OneRMProgressionModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  themeColor: string;
  globalUnit: string;
}

// ── Helpers ───────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatShortDate(timestamp: number): string {
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function OneRMProgressionModal({
  visible,
  onClose,
  exerciseName,
  themeColor,
  globalUnit,
}: OneRMProgressionModalProps) {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progressionData, setProgressionData] = useState<ProgressionData[]>([]);
  const [activeRange, setActiveRange] = useState<RangeKey>('3M');
  const [activeTab, setActiveTab] = useState<TabKey>('chart');
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  // Open / close animations
  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      Animated.parallel([
        Animated.timing(slideY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: SCREEN_HEIGHT,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setInternalVisible(false);
      onClose();
    });
  };

  // Load exercise history
  useEffect(() => {
    if (!visible || !exerciseName) return;

    const loadHistoryData = async () => {
      try {
        setLoading(true);
        const history = await WorkoutStorage.getExerciseHistory(exerciseName);

        const progression: ProgressionData[] = history
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((workout) => {
            const bestOneRM = workout.sets.reduce((best, set) => {
              const weight = parseFloat(set.weight) || 0;
              const reps = parseInt(set.reps) || 0;
              const oneRM = weight > 0 && reps > 0 ? defaultCalc1RM(weight, reps) : 0;
              return Math.max(best, oneRM);
            }, 0);

            return {
              date: workout.date,
              dayName: workout.dayName || workout.date,
              oneRM: bestOneRM,
              timestamp: new Date(workout.date).getTime(),
            };
          })
          .filter((session) => session.oneRM > 0);

        setProgressionData(progression);

        // Default to smallest range that contains all data
        if (progression.length === 0) {
          setActiveRange('ALL');
        } else {
          const oldest = progression[0].timestamp;
          const ageDays = (Date.now() - oldest) / (1000 * 60 * 60 * 24);
          if (ageDays <= 14) setActiveRange('14D');
          else if (ageDays <= 30) setActiveRange('1M');
          else if (ageDays <= 90) setActiveRange('3M');
          else if (ageDays <= 180) setActiveRange('6M');
          else if (ageDays <= 365) setActiveRange('12M');
          else setActiveRange('3M');
        }

        setActiveTab('chart');
      } catch (error) {
        console.error('Failed to load exercise history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistoryData();
  }, [visible, exerciseName]);

  // Filter progression by active range (for chart only)
  const filteredProgression = useMemo(() => {
    const range = RANGE_OPTIONS.find((r) => r.key === activeRange);
    if (!range || range.days === null) return progressionData;
    const cutoff = Date.now() - range.days * 24 * 60 * 60 * 1000;
    return progressionData.filter((s) => s.timestamp >= cutoff);
  }, [progressionData, activeRange]);

  // All-time stats
  const allTimeBest = progressionData.length > 0
    ? Math.max(...progressionData.map((s) => s.oneRM))
    : 0;
  const current = progressionData.length > 0
    ? progressionData[progressionData.length - 1].oneRM
    : 0;
  const first = progressionData.length > 0
    ? progressionData[0].oneRM
    : 0;
  const totalGain = current - first;
  const totalGainPercent = first > 0 ? (totalGain / first) * 100 : 0;

  // Sessions newest-first for the list tab (all sessions, not range-filtered)
  const reversedProgression = [...progressionData].reverse();

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { borderColor: hexA(themeColor, 0.25) }]}>
        <Ionicons
          name="trending-up-outline"
          size={32}
          color={hexA(themeColor, 0.6)}
        />
      </View>
      <Text style={styles.emptyTitle}>No progression yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete sets with weight and reps to start tracking your 1RM strength progression over time.
      </Text>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>CURRENT 1RM</Text>
          <View style={styles.statValueRow}>
            <Text style={[styles.statValue, { color: themeColor }]}>
              {current.toFixed(1)}
            </Text>
            <Text style={styles.statUnit}>{globalUnit}</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>ALL-TIME BEST</Text>
          <View style={styles.statValueRow}>
            <Text style={styles.statValueWhite}>{allTimeBest.toFixed(1)}</Text>
            <Text style={styles.statUnit}>{globalUnit}</Text>
          </View>
        </View>
      </View>

      {progressionData.length > 1 && (
        <View style={styles.totalGainRow}>
          <Text style={styles.totalGainLabel}>TOTAL GAIN</Text>
          <View style={styles.totalGainValueRow}>
            <Ionicons
              name={totalGain >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={totalGain >= 0 ? themeColor : '#f87171'}
            />
            <Text
              style={[
                styles.totalGainValue,
                { color: totalGain >= 0 ? themeColor : '#f87171' },
              ]}
            >
              {totalGain >= 0 ? '+' : ''}
              {totalGain.toFixed(1)} {globalUnit}
            </Text>
            <Text
              style={[
                styles.totalGainPercent,
                { color: totalGain >= 0 ? themeColor : '#f87171' },
              ]}
            >
              ({totalGain >= 0 ? '+' : ''}
              {totalGainPercent.toFixed(1)}%)
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderChartTab = () => (
    <>
      <ProgressionChart
        data={filteredProgression}
        themeColor={themeColor}
        globalUnit={globalUnit}
        activeRange={activeRange}
        onRangeChange={setActiveRange}
        allTimeBest={allTimeBest}
      />
      {renderStatsCard()}
    </>
  );

  const renderSessionsTab = () => (
    <>
      {renderStatsCard()}

      <View style={styles.sectionLabelRow}>
        <Text style={styles.sectionLabel}>SESSION HISTORY</Text>
        <Text style={styles.sectionLabelMeta}>
          {progressionData.length} SESSION{progressionData.length !== 1 ? 'S' : ''}
        </Text>
      </View>

      {reversedProgression.map((session, displayIdx) => {
        const chronologicalIdx = progressionData.length - 1 - displayIdx;
        const previousSession = chronologicalIdx > 0
          ? progressionData[chronologicalIdx - 1]
          : null;
        const change = previousSession ? session.oneRM - previousSession.oneRM : 0;
        const percentChange = previousSession && previousSession.oneRM > 0
          ? (change / previousSession.oneRM) * 100
          : 0;
        const isPR = session.oneRM === allTimeBest;

        return (
          <View
            key={`${session.date}-${displayIdx}`}
            style={[
              styles.sessionCard,
              isPR && {
                borderColor: hexA(themeColor, 0.3),
                backgroundColor: hexA(themeColor, 0.04),
              },
            ]}
          >
            <View style={styles.sessionHeader}>
              <View style={styles.sessionHeaderLeft}>
                <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                <Text style={styles.sessionDayName}>{session.dayName}</Text>
              </View>
              {isPR && (
                <View
                  style={[
                    styles.prBadge,
                    {
                      backgroundColor: hexA(themeColor, 0.15),
                      borderColor: hexA(themeColor, 0.4),
                    },
                  ]}
                >
                  <Ionicons name="trophy" size={10} color={themeColor} />
                  <Text style={[styles.prBadgeText, { color: themeColor }]}>PR</Text>
                </View>
              )}
            </View>

            <View style={styles.sessionStatsRow}>
              <View style={styles.sessionOneRM}>
                <View style={styles.sessionValueRow}>
                  <Text style={[styles.sessionValue, { color: themeColor }]}>
                    {session.oneRM.toFixed(1)}
                  </Text>
                  <Text style={styles.sessionUnit}>{globalUnit}</Text>
                </View>
                <Text style={styles.sessionValueLabel}>EST. 1RM</Text>
              </View>

              {previousSession && (
                <View style={styles.sessionChange}>
                  <View style={styles.sessionChangeValueRow}>
                    <Ionicons
                      name={change >= 0 ? 'trending-up' : 'trending-down'}
                      size={13}
                      color={change >= 0 ? themeColor : '#f87171'}
                    />
                    <Text
                      style={[
                        styles.sessionChangeValue,
                        { color: change >= 0 ? themeColor : '#f87171' },
                      ]}
                    >
                      {change >= 0 ? '+' : ''}
                      {change.toFixed(1)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.sessionChangePercent,
                      { color: change >= 0 ? themeColor : '#f87171' },
                    ]}
                  >
                    {change >= 0 ? '+' : ''}
                    {percentChange.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </>
  );

  return (
    <Modal
      visible={internalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: backdropOpacity,
          },
        ]}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideY }] },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.iconButton}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="chevron-back" size={22} color="#fff" />
              </TouchableOpacity>

              <Text style={styles.headerLabel}>1RM PROGRESSION</Text>

              <View style={styles.iconButtonSpacer} />
            </View>

            {/* Title */}
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={2}>
                {exerciseName}
              </Text>
              {!loading && progressionData.length > 0 && (
                <Text style={styles.subtitle}>
                  {progressionData.length} SESSION{progressionData.length !== 1 ? 'S' : ''} TRACKED
                </Text>
              )}
            </View>

            {/* Tabs — only show when there's data */}
            {!loading && progressionData.length > 0 && (
              <View style={styles.tabsContainer}>
                <TouchableOpacity
                  style={styles.tabItem}
                  onPress={() => setActiveTab('chart')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === 'chart' && { color: themeColor },
                    ]}
                  >
                    Chart
                  </Text>
                  {activeTab === 'chart' && (
                    <View style={[styles.tabIndicator, { backgroundColor: themeColor }]} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabItem}
                  onPress={() => setActiveTab('sessions')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === 'sessions' && { color: themeColor },
                    ]}
                  >
                    Sessions
                  </Text>
                  {activeTab === 'sessions' && (
                    <View style={[styles.tabIndicator, { backgroundColor: themeColor }]} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={themeColor} />
                <Text style={styles.loadingText}>Loading progression…</Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollRef}
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {progressionData.length === 0
                  ? renderEmptyState()
                  : activeTab === 'chart'
                    ? renderChartTab()
                    : renderSessionsTab()}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ── Chart sub-component ───────────────────────────────────────────

interface ChartProps {
  data: ProgressionData[];
  themeColor: string;
  globalUnit: string;
  activeRange: RangeKey;
  onRangeChange: (range: RangeKey) => void;
  allTimeBest: number;
}

function ProgressionChart({
  data,
  themeColor,
  globalUnit,
  activeRange,
  onRangeChange,
  allTimeBest,
}: ChartProps) {
  // Chart dimensions — bigger now that tab is dedicated to chart
  const horizontalPadding = 16;
  const chartCardPadding = 14;
  const chartWidth = SCREEN_WIDTH - (horizontalPadding * 2) - (chartCardPadding * 2);
  const chartHeight = 260;
  const chartLeftPad = 38;
  const chartRightPad = 6;
  const chartTopPad = 16;
  const chartBottomPad = 26;
  const plotWidth = chartWidth - chartLeftPad - chartRightPad;
  const plotHeight = chartHeight - chartTopPad - chartBottomPad;

  let yMin = 0;
  let yMax = 100;
  if (data.length > 0) {
    const values = data.map((d) => d.oneRM);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.15 || maxVal * 0.1 || 10;
    yMin = Math.max(0, minVal - padding);
    yMax = maxVal + padding;
  }
  const yRange = yMax - yMin || 1;

  let xMin = 0;
  let xMax = 0;
  if (data.length > 0) {
    xMin = data[0].timestamp;
    xMax = data[data.length - 1].timestamp;
    if (xMin === xMax) {
      xMin = xMin - 1000 * 60 * 60 * 24;
      xMax = xMax + 1000 * 60 * 60 * 24;
    }
  }
  const xRange = xMax - xMin || 1;

  const xForTime = (t: number) =>
    chartLeftPad + ((t - xMin) / xRange) * plotWidth;
  const yForValue = (v: number) =>
    chartTopPad + (1 - (v - yMin) / yRange) * plotHeight;

  let pathData = '';
  let areaPathData = '';
  if (data.length > 0) {
    data.forEach((point, idx) => {
      const x = xForTime(point.timestamp);
      const y = yForValue(point.oneRM);
      if (idx === 0) {
        pathData = `M ${x} ${y}`;
        areaPathData = `M ${x} ${chartTopPad + plotHeight} L ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
        areaPathData += ` L ${x} ${y}`;
      }
    });
    if (data.length > 0) {
      const lastX = xForTime(data[data.length - 1].timestamp);
      areaPathData += ` L ${lastX} ${chartTopPad + plotHeight} Z`;
    }
  }

  // 4 ticks now that chart is taller
  const yTicks = data.length > 0
    ? [
        yMin,
        yMin + (yMax - yMin) * 0.33,
        yMin + (yMax - yMin) * 0.66,
        yMax,
      ]
    : [];

  return (
    <View style={styles.chartCard}>
      {/* Range filter pills */}
      <View style={styles.rangePillsRow}>
        {RANGE_OPTIONS.map((option) => {
          const isActive = activeRange === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onRangeChange(option.key)}
              style={[
                styles.rangePill,
                isActive && {
                  backgroundColor: hexA(themeColor, 0.15),
                  borderColor: hexA(themeColor, 0.4),
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.rangePillText,
                  { color: isActive ? themeColor : '#9898a4' },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Chart */}
      {data.length === 0 ? (
        <View style={[styles.chartEmpty, { width: chartWidth, height: chartHeight }]}>
          <Text style={styles.chartEmptyText}>No sessions in this range</Text>
        </View>
      ) : (
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={themeColor} stopOpacity={0.22} />
              <Stop offset="1" stopColor={themeColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Y-axis grid lines and labels */}
          {yTicks.map((tick, idx) => {
            const y = yForValue(tick);
            return (
              <React.Fragment key={`tick-${idx}`}>
                <Line
                  x1={chartLeftPad}
                  y1={y}
                  x2={chartLeftPad + plotWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={1}
                />
                <SvgText
                  x={chartLeftPad - 6}
                  y={y + 3}
                  fontSize={9}
                  fill="#55555f"
                  textAnchor="end"
                  fontFamily="DMMono-Medium"
                >
                  {tick.toFixed(0)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Area fill */}
          {data.length > 1 && (
            <Path d={areaPathData} fill="url(#areaFill)" />
          )}

          {/* Line */}
          {data.length > 1 && (
            <Path
              d={pathData}
              stroke={themeColor}
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data point dots */}
          {data.map((point, idx) => {
            const x = xForTime(point.timestamp);
            const y = yForValue(point.oneRM);
            const isPR = point.oneRM === allTimeBest;

            return (
              <React.Fragment key={`dot-${idx}`}>
                {isPR && (
                  <Circle
                    cx={x}
                    cy={y}
                    r={7}
                    fill="none"
                    stroke={themeColor}
                    strokeWidth={1}
                    opacity={0.5}
                  />
                )}
                <Circle
                  cx={x}
                  cy={y}
                  r={isPR ? 4.5 : 3.5}
                  fill={themeColor}
                />
                <Circle
                  cx={x}
                  cy={y}
                  r={1.4}
                  fill="#000"
                />
              </React.Fragment>
            );
          })}

          {/* X-axis labels — first and last only */}
          {data.length >= 1 && (
            <SvgText
              x={chartLeftPad}
              y={chartHeight - 8}
              fontSize={9}
              fill="#55555f"
              textAnchor="start"
              fontFamily="DMMono-Medium"
            >
              {formatShortDate(data[0].timestamp)}
            </SvgText>
          )}
          {data.length >= 2 && (
            <SvgText
              x={chartLeftPad + plotWidth}
              y={chartHeight - 8}
              fontSize={9}
              fill="#55555f"
              textAnchor="end"
              fontFamily="DMMono-Medium"
            >
              {formatShortDate(data[data.length - 1].timestamp)}
            </SvgText>
          )}
        </Svg>
      )}

      {/* Chart footer */}
      <View style={styles.chartFooter}>
        <Text style={styles.chartUnitLabel}>EST. 1RM · {globalUnit.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Sheet & Container ─────────────────────────────────────────────
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: '#000',
    flex: 1,
    overflow: 'hidden',
  },

  // ── Header ────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // ── Title ─────────────────────────────────────────────────────────
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    fontFamily: 'Outfit-Bold',
    lineHeight: 28,
  },
  subtitle: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },

  // ── Tabs ──────────────────────────────────────────────────────────
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 14,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 4,
    position: 'relative',
  },
  tabLabel: {
    color: '#55555f',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.1,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 14,
    right: 14,
    height: 2,
    borderRadius: 2,
  },

  // ── Loading ───────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },

  // ── Scroll ────────────────────────────────────────────────────────
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // ── Empty state ───────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 17,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#0a0a0f',
  },
  emptyTitle: {
    color: '#f0f0f2',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#55555f',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    fontFamily: 'Outfit-Regular',
  },

  // ── Chart card ────────────────────────────────────────────────────
  chartCard: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    marginBottom: 14,
  },
  rangePillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangePillText: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: 'DMMono-Medium',
    fontWeight: '600',
  },
  chartEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartEmptyText: {
    color: '#55555f',
    fontSize: 12,
    fontFamily: 'Outfit-Regular',
    fontStyle: 'italic',
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  chartUnitLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  chartCountLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // ── Stats summary card ────────────────────────────────────────────
  statsCard: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontFamily: 'Outfit-Bold',
  },
  statValueWhite: {
    color: '#f0f0f2',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontFamily: 'Outfit-Bold',
  },
  statUnit: {
    color: '#55555f',
    fontSize: 11,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: 4,
  },
  totalGainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  totalGainLabel: {
    color: '#9898a4',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  totalGainValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  totalGainValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
  },
  totalGainPercent: {
    fontSize: 11,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.3,
  },

  // ── Section label ─────────────────────────────────────────────────
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  sectionLabelMeta: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Regular',
  },

  // ── Session cards ─────────────────────────────────────────────────
  sessionCard: {
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    marginBottom: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  sessionHeaderLeft: {
    flex: 1,
  },
  sessionDate: {
    color: '#f0f0f2',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
  },
  sessionDayName: {
    color: '#55555f',
    fontSize: 10,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  prBadgeText: {
    fontSize: 9,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
    fontWeight: '600',
  },
  sessionStatsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  sessionOneRM: {
    flex: 1,
  },
  sessionValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  sessionValue: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.4,
  },
  sessionUnit: {
    color: '#55555f',
    fontSize: 11,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
  },
  sessionValueLabel: {
    color: '#55555f',
    fontSize: 9,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
    marginTop: 2,
  },
  sessionChange: {
    alignItems: 'flex-end',
  },
  sessionChangeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionChangeValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
  },
  sessionChangePercent: {
    fontSize: 10,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.3,
    marginTop: 2,
  },
});