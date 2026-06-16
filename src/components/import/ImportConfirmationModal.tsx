// src/components/import/ImportConfirmationModal.tsx
//
// Adaptive confirmation modal for the workout import flow. Driven by the
// useWorkoutImport hook's state, it renders three views:
//
//   1. Single-block confirmation (accumulatedPrograms.length <= 1):
//      "Workout Ready" + a clean stat list (Training days / Total
//      duration / Unique movements) + Start training + Add another block.
//
//   2. Combined-block confirmation (accumulatedPrograms.length > 1):
//      "Your program so far" + a "{n} blocks combined" badge + each
//      block listed as a numbered row (name + week range + frequency) +
//      a quiet totals line + Start training + Add another block.
//
//   3. Add-more view (showAddMoreMode === true): two buttons to bring in
//      the next block — "Paste next block" / "Import next file" — matching
//      the welcome-back card pattern. Combines with the existing program.
//
// This component is presentational: it owns no import logic. All state
// and handlers come in as props from the hook. Keeping it self-contained
// means it can be wired into PromptReady now and reused elsewhere later.
//
// Layout note: the scrollable content (badge / title / stats / block list)
// and the action buttons are SEPARATE. The buttons live in a fixed footer
// outside the ScrollView, so a very long routine_name can never push the
// primary action off-screen — the title scrolls, the buttons stay put.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutProgram } from '../../types/workout';

interface ImportConfirmationModalProps {
  visible: boolean;
  parsedProgram: WorkoutProgram | null;
  accumulatedPrograms: WorkoutProgram[];
  showAddMoreMode: boolean;
  generationTime: number | null;
  modalScale: Animated.Value;
  modalOpacity: Animated.Value;
  themeColor: string;
  // Actions
  onConfirm: () => void;          // confirmImport — "Start training"
  onAddMore: () => void;          // addMoreFiles — enter add-more view
  onBackToConfirmation: () => void; // backToConfirmation — leave add-more view
  onCancel: () => void;           // cancelConfirmation — dismiss the modal
  onPasteNext: () => void;        // importFromClipboard — paste next block
  onImportNextFile: () => void;   // importFromFile — pick next block file
}

// ---------------------------------------------------------------------------
// Stat helpers — compute display values from the parsed program. These mirror
// the original ImportRoutineScreen computations (total weeks across blocks,
// unique movement count) so the numbers match the proven behaviour.
// ---------------------------------------------------------------------------

function totalWeeks(program: WorkoutProgram | null): number {
  if (!program?.blocks) return 0;
  return program.blocks.reduce((total, block) => {
    const w = String(block.weeks ?? '');
    const weeks = w.includes('-')
      ? parseInt(w.split('-')[1]) - parseInt(w.split('-')[0]) + 1
      : parseInt(w);
    return total + (isNaN(weeks) ? 0 : weeks);
  }, 0);
}

function uniqueMovementCount(program: WorkoutProgram | null): number {
  if (!program?.blocks) return 0;
  const names = new Set<string>();
  program.blocks.forEach((block) =>
    block.days?.forEach((day: any) =>
      day.exercises?.forEach((exercise: any) => {
        const name =
          exercise.type === 'strength'
            ? exercise.exercise
            : exercise.type === 'cardio'
            ? exercise.activity
            : exercise.type === 'stretch'
            ? exercise.exercise
            : exercise.type === 'circuit'
            ? exercise.circuit_name
            : exercise.type === 'sport'
            ? exercise.activity
            : 'Unknown';
        if (name) names.add(name);
      })
    )
  );
  return names.size;
}

// Derive a human week-range label for a single block, e.g. "Weeks 1–6".
// Falls back gracefully when the weeks field is a single number or missing.
function blockWeekLabel(block: any): string {
  const w = String(block?.weeks ?? '').trim();
  if (!w) return '';
  if (w.includes('-')) {
    const [a, b] = w.split('-').map((s) => s.trim());
    return `Weeks ${a}\u2013${b}`;
  }
  return `Week ${w}`;
}

export default function ImportConfirmationModal({
  visible,
  parsedProgram,
  accumulatedPrograms,
  showAddMoreMode,
  generationTime,
  modalScale,
  modalOpacity,
  themeColor,
  onConfirm,
  onAddMore,
  onBackToConfirmation,
  onCancel,
  onPasteNext,
  onImportNextFile,
}: ImportConfirmationModalProps) {
  const combined = accumulatedPrograms.length > 1;
  const weeks = totalWeeks(parsedProgram);
  const movements = uniqueMovementCount(parsedProgram);
  const days = parsedProgram?.days_per_week ?? 0;

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: modalOpacity }]}>
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
              borderColor: themeColor,
              shadowColor: themeColor,
            },
          ]}
        >
          {/* Top-left navigation button: back (in add-more) or close */}
          <View style={styles.navButtonWrapper}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={showAddMoreMode ? onBackToConfirmation : onCancel}
              activeOpacity={0.8}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <Ionicons
                name={showAddMoreMode ? 'arrow-back' : 'close'}
                size={22}
                color="#71717a"
              />
            </TouchableOpacity>
          </View>

          {showAddMoreMode ? (
            // ----------------------------------------------------------------
            // VIEW 3 — Add another block
            // ----------------------------------------------------------------
            <>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.addMoreBody}
                showsVerticalScrollIndicator
              >
                <Text style={styles.eyebrow}>ADD ANOTHER BLOCK</Text>
                <Text style={styles.programName}>
                  {parsedProgram?.routine_name || 'Your Workout Program'}
                </Text>

                {/* Blocks already added so far */}
                <View style={styles.blockList}>
                  {parsedProgram?.blocks?.map((block: any, idx: number) => {
                    const label = blockWeekLabel(block);
                    return (
                      <View key={idx} style={styles.blockRow}>
                        <View
                          style={[
                            styles.blockNum,
                            { backgroundColor: themeColor + '26' },
                          ]}
                        >
                          <Text style={[styles.blockNumText, { color: themeColor }]}>
                            {idx + 1}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.blockName} numberOfLines={1}>
                            {block.block_name || `Block ${idx + 1}`}
                          </Text>
                          {label ? <Text style={styles.blockMeta}>{label}</Text> : null}
                        </View>
                        <Ionicons name="checkmark" size={16} color="#10b981" />
                      </View>
                    );
                  })}

                  {/* Dashed placeholder for the block about to be added */}
                  <View style={styles.nextBlockRow}>
                    <View style={styles.nextBlockNum}>
                      <Ionicons name="add" size={15} color="#71717a" />
                    </View>
                    <Text style={styles.nextBlockText}>Next block</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Fixed footer — always visible regardless of list length */}
              <View style={styles.footer}>
                {/* Primary: paste next block */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: themeColor }]}
                  onPress={onPasteNext}
                  activeOpacity={0.9}
                >
                  <Ionicons name="clipboard-outline" size={17} color="#0a0a0b" />
                  <Text style={styles.primaryButtonText}>Paste next block</Text>
                </TouchableOpacity>

                {/* Secondary: import a file */}
                <TouchableOpacity
                  style={[styles.outlineButton, { borderColor: themeColor }]}
                  onPress={onImportNextFile}
                  activeOpacity={0.9}
                >
                  <Ionicons name="document-outline" size={17} color={themeColor} />
                  <Text style={[styles.outlineButtonText, { color: themeColor }]}>
                    Import a file
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // ----------------------------------------------------------------
            // VIEW 1 & 2 — Confirmation (adaptive on block count)
            // ----------------------------------------------------------------
            <>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.confirmBody}
                showsVerticalScrollIndicator
              >
                {/* Badge row */}
                <View style={styles.badgeRow}>
                  {combined ? (
                    <View
                      style={[
                        styles.combinedBadge,
                        {
                          backgroundColor: '#10b981' + '1A',
                          borderColor: '#10b981',
                        },
                      ]}
                    >
                      <Ionicons name="layers-outline" size={14} color="#10b981" />
                      <Text
                        style={[styles.combinedBadgeText, { color: '#10b981' }]}
                      >
                        {accumulatedPrograms.length} blocks combined
                      </Text>
                    </View>
                  ) : (
                    generationTime != null && (
                      <View
                        style={[
                          styles.timeBadge,
                          {
                            backgroundColor: themeColor + '1A',
                            borderColor: themeColor,
                          },
                        ]}
                      >
                        <Text style={[styles.timeBadgeText, { color: themeColor }]}>
                          Generated in {generationTime.toFixed(2)}s
                        </Text>
                      </View>
                    )
                  )}
                </View>

                {/* Eyebrow + program name */}
                <Text style={styles.eyebrow}>
                  {combined ? 'YOUR PROGRAM SO FAR' : 'WORKOUT READY'}
                </Text>
                <Text style={styles.programName}>
                  {parsedProgram?.routine_name || 'Your Workout Program'}
                </Text>

                {combined ? (
                  // VIEW 2 — block-aware list
                  <>
                    <View style={styles.blockList}>
                      {parsedProgram?.blocks?.map((block: any, idx: number) => {
                        const label = blockWeekLabel(block);
                        const meta = [label, days ? `${days} days/week` : '']
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <View key={idx} style={styles.blockRow}>
                            <View
                              style={[
                                styles.blockNum,
                                { backgroundColor: themeColor + '26' },
                              ]}
                            >
                              <Text style={[styles.blockNumText, { color: themeColor }]}>
                                {idx + 1}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.blockName} numberOfLines={1}>
                                {block.block_name || `Block ${idx + 1}`}
                              </Text>
                              {meta ? (
                                <Text style={styles.blockMeta}>{meta}</Text>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    <Text style={styles.totalsLine}>
                      {weeks} weeks total · {movements} unique movements
                    </Text>
                  </>
                ) : (
                  // VIEW 1 — clean stat list
                  <View style={styles.statCard}>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Training days</Text>
                      <Text style={[styles.statValue, { color: themeColor }]}>
                        {days} per week
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Total duration</Text>
                      <Text style={[styles.statValue, { color: themeColor }]}>
                        {weeks} weeks
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Unique movements</Text>
                      <Text style={[styles.statValue, { color: themeColor }]}>
                        {movements} movements
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Fixed footer — primary action always reachable, even when the
                  routine name is long enough to fill the scroll area. */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: themeColor }]}
                  onPress={onConfirm}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryButtonTextLg}>Start training</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addAnotherButton}
                  onPress={onAddMore}
                  activeOpacity={0.9}
                >
                  <Ionicons name="add" size={18} color="#d4d4d8" />
                  <Text style={styles.addAnotherText}>Add another block</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  content: {
    backgroundColor: '#0a0a0b',
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
    maxWidth: 420,
    maxHeight: '82%',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 28,
  },

  // Scroll area — shrinks within the modal's maxHeight so the fixed footer
  // below always has room. Content taller than the available space scrolls.
  scrollArea: {
    flexShrink: 1,
  },

  // Nav button (top-left)
  navButtonWrapper: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 5,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    borderWidth: 0.5,
    borderColor: '#27272a',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Confirmation body
  confirmBody: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  badgeRow: {
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  combinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  combinedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  eyebrow: {
    fontSize: 13,
    color: '#a1a1aa',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  programName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 31,
    marginBottom: 22,
  },

  // View 1 — stat card
  statCard: {
    backgroundColor: 'rgba(39, 39, 42, 0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(113, 113, 122, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
    marginBottom: 22,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statDivider: {
    height: 1,
    backgroundColor: 'rgba(113, 113, 122, 0.15)',
  },
  statLabel: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // View 2 — block list
  blockList: {
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(39, 39, 42, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  blockNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockNumText: {
    fontSize: 13,
    fontWeight: '600',
  },
  blockName: {
    fontSize: 14,
    color: '#ffffff',
  },
  blockMeta: {
    fontSize: 11,
    color: '#a1a1aa',
    marginTop: 1,
  },
  totalsLine: {
    fontSize: 12,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Fixed footer (shared by all three views) — sits below the ScrollView so
  // the buttons are always on screen. The top border separates it from the
  // scrolling content above.
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(113, 113, 122, 0.15)',
    backgroundColor: '#0a0a0b',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0a0a0b',
  },
  primaryButtonTextLg: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0a0b',
    letterSpacing: 0.3,
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#27272a',
    backgroundColor: 'transparent',
  },
  addAnotherText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d4d4d8',
  },

  // View 3 — add more
  addMoreBody: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  nextBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3f3f46',
  },
  nextBlockNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(113, 113, 122, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBlockText: {
    flex: 1,
    fontSize: 14,
    color: '#71717a',
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    width: '100%',
  },
  outlineButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});