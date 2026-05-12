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
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerLabel: {
    fontSize: 10,
    color: '#9898a4',
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },

  // ── Title block ──────────────────────────────────────────────────
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 18,
  },
  routineName: {
    color: '#f0f0f2',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: 'Outfit-Bold',
    lineHeight: 30,
  },
  routineSubtitle: {
    color: '#55555f',
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // ── Section labels ───────────────────────────────────────────────
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
    marginBottom: 8,
    paddingHorizontal: 18,
  },
  sectionLabelMuted: {
    color: '#55555f',
  },
  sectionLabelAccent: {
    color: '#22d3ee',
  },

  // ── ACTIVE hero card ─────────────────────────────────────────────
  heroCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f0f0f2',
    letterSpacing: -0.3,
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 5,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroMetaText: {
    fontSize: 11,
    color: '#9898a4',
    fontFamily: 'Outfit-Regular',
  },
  heroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#3a3a44',
  },
  heroOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 9,
  },
  heroOpenButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.1,
  },
  heroProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroProgressLabel: {
    fontSize: 9,
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Medium',
    fontWeight: '600',
  },
  heroProgressMeta: {
    fontSize: 9,
    color: '#9898a4',
    letterSpacing: 1.3,
    fontFamily: 'DMMono-Regular',
  },
  heroProgressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Completed hero variant (only shown if active block is fully done)
  heroCompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  heroCompleteTitle: {
    fontSize: 11,
    letterSpacing: 1.3,
    fontWeight: '600',
    fontFamily: 'DMMono-Medium',
  },

  // ── Compact list rows ────────────────────────────────────────────
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#0a0a0f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
    marginBottom: 7,
  },
  blockRowStatus: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockRowStatusText: {
    fontSize: 13,
    color: '#9898a4',
    fontFamily: 'Outfit-SemiBold',
    fontWeight: '600',
  },
  blockRowContent: {
    flex: 1,
    gap: 3,
  },
  blockRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f0f0f2',
    fontFamily: 'Outfit-SemiBold',
    letterSpacing: -0.2,
  },
  blockRowMeta: {
    fontSize: 11,
    color: '#9898a4',
    fontFamily: 'Outfit-Regular',
  },

  // ── List ─────────────────────────────────────────────────────────
  listContent: {
    paddingTop: 4,
    paddingBottom: 32,
  },

  // ── Add button (block + mesocycle) ───────────────────────────────
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: 'Outfit-Medium',
  },

  // ── Android Add Mesocycle modal ──────────────────────────────────
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
    textAlign: 'center',
    marginBottom: 20,
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