import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ── Types ─────────────────────────────────────────────────────────

export interface NoteEntry {
  id: string;
  text: string;
  createdAt: string; // ISO timestamp
}

interface ExerciseNotesModalProps {
  visible: boolean;
  onClose: () => void;
  exerciseName: string;
  exerciseIndex: number;
  /** Array of note entries for this exercise, newest first */
  notes: NoteEntry[];
  /** Called when user submits a new note */
  onAddNote: (exerciseIndex: number, text: string) => void;
  /** Optional: called when user deletes a note (long-press) */
  onDeleteNote?: (exerciseIndex: number, noteId: string) => void;
  themeColor: string;
}

export default function ExerciseNotesModal({
  visible,
  onClose,
  exerciseName,
  exerciseIndex,
  notes = [],
  onAddNote,
  onDeleteNote,
  themeColor,
}: ExerciseNotesModalProps) {
  const slideY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [internalVisible, setInternalVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setInternalVisible(true);
      setDraft('');
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
      setDraft('');
      onClose();
    });
  };

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddNote(exerciseIndex, trimmed);
    setDraft('');
    // Scroll to top so the newest note is visible
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  const handleDelete = (noteId: string) => {
    if (!onDeleteNote) return;
    Alert.alert(
      'Delete note?',
      'This note will be removed permanently.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteNote(exerciseIndex, noteId),
        },
      ],
    );
  };

  const canSubmit = draft.trim().length > 0;

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

              <Text style={styles.headerLabel}>NOTES</Text>

              <View style={styles.iconButtonSpacer} />
            </View>

            {/* Title */}
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={2}>
                {exerciseName}
              </Text>
              {notes.length > 0 && (
                <Text style={styles.subtitle}>
                  {notes.length} NOTE{notes.length !== 1 ? 'S' : ''}
                </Text>
              )}
            </View>

            {/* Notes list — scrollable, newest first */}
            <ScrollView
              ref={scrollRef}
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {notes.length === 0 ? (
                <View style={styles.emptyState}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { borderColor: hexA(themeColor, 0.25) },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={32}
                      color={hexA(themeColor, 0.6)}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>No notes yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Start tracking how this exercise felt, weights you tried, or form cues that worked.
                  </Text>
                </View>
              ) : (
                notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onLongPress={
                      onDeleteNote ? () => handleDelete(note.id) : undefined
                    }
                  />
                ))
              )}
            </ScrollView>

            {/* Composer at the bottom */}
            <View
              style={[
                styles.composer,
                { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 },
              ]}
            >
              <View style={styles.composerInner}>
                <TextInput
                  style={styles.composerInput}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Add a note..."
                  placeholderTextColor="#55555f"
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleAdd}
                  disabled={!canSubmit}
                  activeOpacity={canSubmit ? 0.7 : 1}
                  style={[
                    styles.sendButton,
                    canSubmit
                      ? { backgroundColor: themeColor }
                      : styles.sendButtonDisabled,
                  ]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="arrow-up"
                    size={18}
                    color={canSubmit ? '#000' : '#55555f'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function NoteCard({
  note,
  onLongPress,
}: {
  note: NoteEntry;
  onLongPress?: () => void;
}) {
  const relativeLabel = formatRelative(note.createdAt);
  const fullDate = formatFullDate(note.createdAt);

  return (
    <TouchableOpacity
      style={styles.noteCard}
      activeOpacity={onLongPress ? 0.7 : 1}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={styles.noteHeader}>
        <Text style={styles.noteDate}>{fullDate}</Text>
        <Text style={styles.noteRelative}>{relativeLabel}</Text>
      </View>
      <Text style={styles.noteText}>{note.text}</Text>
    </TouchableOpacity>
  );
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

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / (1000 * 60));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
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

  // Title
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
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

  // Notes list
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  noteCard: {
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  noteDate: {
    color: '#9898a4',
    fontSize: 11,
    fontFamily: 'DMMono-Medium',
    letterSpacing: 0.3,
  },
  noteRelative: {
    color: '#55555f',
    fontSize: 10,
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
  },
  noteText: {
    color: '#f0f0f2',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Outfit-Regular',
  },

  // Empty state
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

  // Composer (bottom)
  composer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#000',
  },
  composerInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    color: '#f0f0f2',
    fontSize: 15,
    fontFamily: 'Outfit-Regular',
    lineHeight: 20,
    maxHeight: 120,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});