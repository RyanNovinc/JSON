import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // ── Container ────────────────────────────────────────────────────
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Header ───────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  placeholder: {
    width: 38,
    height: 38,
  },
  programLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#55555f',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
    fontFamily: 'DMMono-Medium',
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0f0f2',
    textAlign: 'center',
    width: '100%',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },

  // ── List ─────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },

  // ── Card (block or mesocycle) ────────────────────────────────────
  card: {
    backgroundColor: '#0a0a0f',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
  },
  blockName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#f0f0f2',
    lineHeight: 24,
    marginBottom: 6,
    letterSpacing: -0.4,
    fontFamily: 'Outfit-Bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // ── Status badges ────────────────────────────────────────────────
  activeBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#000',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#22d3ee',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },

  // ── Phase badge (Week N indicator) ───────────────────────────────
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 0,
  },
  phaseText: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },

  // ── Card body ────────────────────────────────────────────────────
  cardBody: {
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 18,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 12,
    color: '#9898a4',
    fontWeight: '500',
    fontFamily: 'Outfit-Medium',
  },

  // ── Training split preview ───────────────────────────────────────
  exercisePreview: {
    backgroundColor: '#111116',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#55555f',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
  previewText: {
    fontSize: 13,
    color: '#f0f0f2',
    lineHeight: 19,
    fontFamily: 'Outfit-Regular',
  },

  // ── Progress section ─────────────────────────────────────────────
  progressSection: {
    backgroundColor: '#111116',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f0f0f2',
    fontFamily: 'Outfit-SemiBold',
  },
  progressStatus: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Block complete celebration ───────────────────────────────────
  completedSection: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
  },
  completedSubtext: {
    fontSize: 11,
    color: '#55555f',
    fontWeight: '500',
    fontFamily: 'DMMono-Regular',
    letterSpacing: 0.3,
  },

  // ── Add buttons (mesocycle / block) ──────────────────────────────
  addMesocycleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginVertical: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  addMesocycleText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: 'Outfit-Medium',
  },
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginVertical: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  addBlockText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    fontFamily: 'Outfit-Medium',
  },

  // ── Android-only add mesocycle modal ─────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 32,
  },
  modal: {
    backgroundColor: '#0a0a0f',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f0f0f2',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.3,
    fontFamily: 'Outfit-SemiBold',
  },
  input: {
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 11,
    padding: 14,
    fontSize: 15,
    color: '#f0f0f2',
    marginBottom: 24,
    fontFamily: 'Outfit-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonWrapper: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});