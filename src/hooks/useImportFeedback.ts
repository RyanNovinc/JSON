import { useState, useCallback } from 'react';
import { WorkoutStorage, FeedbackEntry } from '../utils/storage';
import { sendImportFeedback } from '../services/feedbackApi';
// import * as Crypto from 'expo-crypto';

export interface UseImportFeedbackReturn {
  showFeedbackModal: boolean;
  submitFeedback: (feedback: 'positive' | 'negative', details?: string) => Promise<void>;
  skipFeedback: () => void;
  triggerFeedbackModal: (programId: string) => Promise<void>;
}

export function useImportFeedback(): UseImportFeedbackReturn {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentProgramId, setCurrentProgramId] = useState<string | null>(null);

  const submitFeedback = useCallback(async (feedback: 'positive' | 'negative', details?: string) => {
    if (!currentProgramId) return;
    
    const feedbackEntry: FeedbackEntry = {
      id: Date.now().toString() + Math.random().toString(36),
      feedback,
      timestamp: new Date().toISOString(),
      programId: currentProgramId,
      details,
    };
    
    // Save feedback locally
    await WorkoutStorage.saveFeedback(feedbackEntry);
    
    // Send feedback to AWS (only negative feedback)
    // This runs async but we don't await it to avoid blocking the UI
    sendImportFeedback(feedback, details, currentProgramId).catch(error => {
      console.log('Failed to send feedback to server:', error);
      // Feedback is already saved locally, so we can retry later
    });
    
    // TODO: Future enhancement - route to follow-up based on feedback type
    // if (feedback === 'negative') {
    //   // Could trigger detailed feedback flow, support ticket, or improvement suggestions
    //   // analytics.track('negative_import_feedback', { programId });
    // } else {
    //   // Could trigger app store review prompt, sharing options, or feature discovery
    //   // analytics.track('positive_import_feedback', { programId });
    // }
    
    setShowFeedbackModal(false);
    setCurrentProgramId(null);
  }, [currentProgramId]);

  const skipFeedback = useCallback(() => {
    setShowFeedbackModal(false);
    setCurrentProgramId(null);
  }, []);

  const triggerFeedbackModal = useCallback(async (programId: string) => {
    // Check if feedback already exists to avoid nagging
    const hasFeedback = await WorkoutStorage.hasFeedbackForProgram(programId);
    
    if (!hasFeedback) {
      setCurrentProgramId(programId);
      setShowFeedbackModal(true);
    }
  }, []);

  return {
    showFeedbackModal,
    submitFeedback,
    skipFeedback,
    triggerFeedbackModal,
  };
}

// TODO: Future enhancements for feedback system:
//
// 1. Analytics Integration:
//    - Track feedback patterns to identify common import issues
//    - A/B test different feedback modal designs
//    - Correlate feedback with user retention and engagement
//
// 2. Smart Feedback Triggers:
//    - Only show modal after user has had time to try the imported program
//    - Delay feedback request until after first workout completion
//    - Consider user's import frequency (don't nag power users)
//
// 3. Feedback Actionability:
//    - For negative feedback: immediate help/troubleshooting flow
//    - For positive feedback: encourage app store reviews, sharing
//    - Collect specific feedback categories (format issues, missing exercises, etc.)
//
// 4. Backend Sync:
//    - Batch upload feedback when network available
//    - Include device/OS info for debugging import issues
//    - Sync user feedback with their account for better support
//
// 5. Continuous Improvement:
//    - Use feedback to improve AI prompts and JSON validation
//    - Create knowledge base of common import problems
//    - Automated suggestions for program improvements