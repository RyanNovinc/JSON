// Test actual prompt generation
import { assemblePlanningPrompt } from './src/data/planningPrompt';

// Mock questionnaire data
const mockData = {
  primaryGoal: 'build_muscle' as const,
  trainingExperience: 'intermediate' as const, 
  trainingApproach: 'balanced' as const,
  selectedEquipment: ['commercial_gym'],
  programDuration: '1_year' as const,
  gymTrainingDays: 4,
  restTimePreference: 'optimal' as const,
  secondaryGoals: []
};

console.log('Testing Mesocycle 1 Prompt Generation...\n');

try {
  // Test Mesocycle 1 (no context)
  const prompt1 = assemblePlanningPrompt(mockData);
  
  console.log('MESOCYCLE 1 PROMPT ANALYSIS');
  console.log('===========================');
  console.log('Length:', prompt1.length, 'characters');
  
  // Check key features
  const checks = [
    ['Contains "1 year program divided into"', prompt1.includes('1 year program divided into')],
    ['Contains "Mesocycle 1 of"', prompt1.includes('Mesocycle 1 of')], 
    ['Contains "Design this mesocycle AND provide"', prompt1.includes('Design this mesocycle AND provide')],
    ['Contains "### Mesocycle Roadmap"', prompt1.includes('### Mesocycle Roadmap')],
    ['Contains "Plan 3 blocks within this"', prompt1.includes('Plan 3 blocks within this')],
    ['Contains "Follow the mesocycle progression"', prompt1.includes('Follow the mesocycle progression')]
  ];
  
  checks.forEach(([description, passed]) => {
    console.log(passed ? '✅' : '❌', description);
  });
  
  // Test Mesocycle 2 (with context)
  console.log('\n\nTesting Mesocycle 2 Prompt Generation...\n');
  
  const context = {
    totalMesocycles: 3,
    currentMesocycle: 2,
    mesocycleWeeks: 17,
    mesocycleBlocks: 3,
    mesocycleRoadmapText: `| Mesocycle | Phase | Rep Focus | Emphasis | Weeks | Blocks |
|---|---|---|---|---|---|
| 1 | Hypertrophy Foundation | 8-12 reps | Volume accumulation | 17 | 3 |
| 2 | Strength-Hypertrophy | 6-10 reps | Progressive overload | 17 | 3 |
| 3 | Power Definition | 10-15 reps | Metabolic stress | 18 | 3 |`,
    previousMesocycleSummary: {
      mesocycleNumber: 1,
      phaseName: 'Hypertrophy Foundation',
      splitStructure: 'Upper/Lower Split (4x/week)',
      repRangeFocus: '8-12 reps',
      exercisesUsed: ['Barbell Bench Press', 'Barbell Back Squat', 'Bent-Over Row', 'Overhead Press', 'Romanian Deadlift'],
      volumePerMuscle: { 
        'Chest': 16, 
        'Quads': 14, 
        'Lats': 12, 
        'Front Delts': 10,
        'Hamstrings': 8 
      }
    }
  };
  
  const prompt2 = assemblePlanningPrompt(mockData, context);
  
  console.log('MESOCYCLE 2 PROMPT ANALYSIS');
  console.log('===========================');
  console.log('Length:', prompt2.length, 'characters');
  
  const checks2 = [
    ['Contains "Mesocycle 2 of 3"', prompt2.includes('Mesocycle 2 of 3')],
    ['Contains "Previous Mesocycle Summary"', prompt2.includes('Previous Mesocycle Summary')],
    ['Contains "Hypertrophy Foundation"', prompt2.includes('Hypertrophy Foundation')],
    ['Contains "Upper/Lower Split"', prompt2.includes('Upper/Lower Split')],
    ['Contains "Volume Achieved:"', prompt2.includes('Volume Achieved:')],
    ['Contains "| Chest | 16 |"', prompt2.includes('| Chest | 16 |')],
    ['Contains "Exercises Used:"', prompt2.includes('Exercises Used:')],
    ['Contains "Barbell Bench Press"', prompt2.includes('Barbell Bench Press')],
    ['Contains roadmap table', prompt2.includes('| 1 | Hypertrophy Foundation |')],
    ['Contains "Rotate exercises from the previous mesocycle"', prompt2.includes('Rotate exercises from the previous mesocycle')]
  ];
  
  checks2.forEach(([description, passed]) => {
    console.log(passed ? '✅' : '❌', description);
  });
  
  // Save prompts for manual inspection
  require('fs').writeFileSync('/tmp/mesocycle_1_prompt.md', prompt1);
  require('fs').writeFileSync('/tmp/mesocycle_2_prompt.md', prompt2);
  
  console.log('\n📄 Prompts saved to:');
  console.log('   /tmp/mesocycle_1_prompt.md');
  console.log('   /tmp/mesocycle_2_prompt.md');
  
  console.log('\n🎉 Prompt generation test complete!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}