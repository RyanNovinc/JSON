// Test script to generate prompt with mock data
const { generateProgramSpecs } = require('./src/data/workoutPrompt.ts');

const mockData = {
  primaryGoal: 'build_muscle',
  secondaryGoals: ['include_cardio', 'maintain_flexibility'],
  totalTrainingDays: 5,
  gymTrainingDays: 3,
  otherTrainingDays: 2,
  trainingExperience: 'advanced',
  trainingApproach: 'push_hard',
  programDuration: '8_weeks',
  useAISuggestion: true, // Test AI optimized duration
  useAIRestTime: true, // Test AI optimized rest
  selectedEquipment: ['commercial_gym', 'home_gym'], // Test equipment mapping
  priorityMuscleGroups: ['Calves', 'Rear Delts'],
  movementLimitations: ['Heavy deadlifts', 'Other'], // Test "Other" filtering
  customLimitation: 'Wrist pain on pressing',
  likedExercises: ['Pull ups', 'Romanian Deadlifts'],
  dislikedExercises: ['Burpees'],
  hasHeartRateMonitor: true,
  cardioPreferences: ['rowing_machine', 'stationary_bike', 'swimming'],
  flexibilityDetails: 'Tight hip flexors and hamstrings',
  exerciseNoteDetail: 'detailed' // Test new note detail format
};

console.log("=== TEST OUTPUT ===");
console.log(generateProgramSpecs(mockData));
console.log("=== END OUTPUT ===");