import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../contexts/ThemeContext';

interface WorkoutGeneratorStep2Props {
  onNext: () => void;
  onBack: () => void;
}

export default function WorkoutGeneratorStep2({ onNext, onBack }: WorkoutGeneratorStep2Props) {
  const { themeColor } = useTheme();
  const [reviewPromptCopied, setReviewPromptCopied] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showInfo, setShowInfo] = useState(false);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleCopyReviewPrompt = async () => {
    const reviewPrompt = `# Critical Training Plan Review

Do not search conversation history or reference previous chats. This prompt is self-contained — all context needed is provided below.

First, read the workout program you just created so you have the full content in context. Then review it as an experienced workout planning expert conducting an independent audit of this training plan for a client. This is an independent quality gate — do not assume your self-check caught everything.

## CRITICAL INSTRUCTIONS
1. **Review the plan** using the checklist below, noting PASS or FAIL for each check.
2. **If ANY check fails, FIX IT IMMEDIATELY** — do not ask the user for permission to fix. Silently revise the plan to resolve all failures.
3. **After fixing, re-verify** — run the checklist again on the corrected plan to confirm all checks now pass.
4. **Present the CORRECTED plan** — output the complete, clean, final version of the workout program with all fixes applied.
5. **At the end, provide a brief change log** — a short bullet list of what you changed and why.
6. **Duration Reality Check** — Calculate the total session duration for each training day using the rest periods in the plan. If any session exceeds reasonable limits, flag it to the user:
   - **Optimal sessions >90 minutes**: "⚠️ This program creates [X] minute sessions with optimal rest periods. Continue with these longer sessions, or would you prefer shorter sessions with reduced rest periods?"
   - **Moderate sessions >75 minutes**: "⚠️ This program exceeds your 75-minute target, reaching [X] minutes. Continue as-is, or shall I adjust for shorter sessions?"
   - **Minimal sessions >60 minutes**: "⚠️ This program exceeds your 60-minute target, reaching [X] minutes. Shall I reduce volume or exercises to fit your time constraints?"
   
   **Wait for user confirmation before proceeding to JSON generation.**

## QUALITY CHECKLIST

### Volume Distribution Check
- **Weekly volume per muscle group**: 10-22 sets per week for major muscles, 6-16 for smaller muscles
- **Session volume**: No more than 10 working sets per muscle per session
- **Recovery balance**: At least 48 hours between training same muscle groups directly

### Exercise Selection Audit  
- **Compound movements**: At least 70% of exercises should be multi-joint movements
- **Movement patterns**: Balanced push/pull ratios, adequate hip hinge and squat patterns
- **Progression potential**: All exercises should allow clear weight/rep/set progression

### Programming Logic Review
- **Weekly structure**: Logical distribution of training stress across the week
- **Exercise order**: Compound before isolation, higher skill before lower skill
- **Rep ranges**: Appropriate for stated goals (strength: 1-6, hypertrophy: 6-20, endurance: 15+)

### Practical Implementation Check
- **Equipment consistency**: All exercises use equipment stated as available
- **Time realistic**: Sessions fit within stated time constraints (optimal ≤90min, moderate ≤75min, minimal ≤60min)
- **Skill appropriate**: Exercise complexity matches stated experience level
- **Duration calculation**: Calculate total workout time including rest periods and flag if excessive

End with: "When you're happy with this plan, send me the JSON conversion prompt and I'll convert it for import into JSON.fit."`;
    
    try {
      await Clipboard.setStringAsync(reviewPrompt);
      setReviewPromptCopied(true);
      setTimeout(() => {
        setReviewPromptCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy review prompt:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={{ 
        flex: 1,
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          })
        }]
      }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Ionicons name="barbell" size={24} color={themeColor} style={styles.headerIcon} />
          <View style={styles.progressContainer}>
            <View style={styles.progressDot} />
            <View style={[styles.progressDot, { backgroundColor: themeColor }]} />
            <View style={styles.progressDot} />
            <View style={styles.progressDot} />
          </View>
        </View>

        <TouchableOpacity style={styles.infoButton} onPress={() => setShowInfo(!showInfo)}>
          <Ionicons name="information-circle-outline" size={24} color="#71717a" />
        </TouchableOpacity>
      </View>

      {showInfo && (
        <View style={styles.infoModal}>
          <Text style={styles.infoMessage}>
            Send one prompt at a time before continuing to the next step. Don't send them all in one message.
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.centerContent}>
          <View style={[styles.stepBadge, { backgroundColor: themeColor }]}>
            <Text style={styles.stepText}>2</Text>
          </View>
          
          <Text style={styles.mainTitle}>Quality Check Review</Text>
          
          <TouchableOpacity 
            style={[styles.primaryAction, { backgroundColor: themeColor }]}
            onPress={handleCopyReviewPrompt}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={reviewPromptCopied ? "checkmark" : "clipboard"} 
              size={20} 
              color="#000" 
            />
            <Text style={styles.actionText}>
              {reviewPromptCopied ? 'Copied!' : 'Copy Review Prompt'}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.hintText}>Ask AI to review and improve your plan</Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[styles.nextButton, { borderColor: themeColor }]}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, { color: themeColor }]}>Next Step</Text>
          <Ionicons name="chevron-forward" size={20} color={themeColor} />
        </TouchableOpacity>
      </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27272a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  centerContent: {
    alignItems: 'center',
    gap: 32,
  },
  stepBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000',
  },
  mainTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -1.5,
    marginTop: -8,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 10,
    marginTop: 8,
  },
  actionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  hintText: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginTop: -8,
  },
  bottomContainer: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    paddingTop: 20,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 18,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  infoButton: {
    position: 'absolute',
    right: 20,
    top: 60,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoModal: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333336',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  infoMessage: {
    fontSize: 15,
    color: '#d1d5db',
    lineHeight: 22,
    textAlign: 'center',
  },
});