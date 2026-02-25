import { assemblePlanningPrompt, ProgramContext } from './src/data/planningPrompt';
import { ProgramStorage, Program, CompletedMesocycleSummary, MesocyclePhase } from './src/data/programStorage';
import { extractMesocycleSummary } from './src/data/mesocycleExtractor';
import { WorkoutStorage, WorkoutRoutine } from './src/utils/storage';

// Mock questionnaire data for 1-year muscle building profile  
const mockQuestionnaireData = {
  primaryGoal: 'build_muscle' as const,
  trainingExperience: 'intermediate' as const,
  trainingApproach: 'balanced' as const,
  selectedEquipment: ['commercial_gym'],
  programDuration: '1_year' as const,
  gymTrainingDays: 4,
  restTimePreference: 'optimal' as const,
  secondaryGoals: []
};

// Mock JSON blocks for testing
const mockBlock1JSON = {
  routine_name: "1 Year Muscle Builder - Block A",
  description: "Hypertrophy foundation phase focusing on volume accumulation",
  days_per_week: 4,
  blocks: [{
    block_name: "Block A — Hypertrophy Foundation: 8-12 reps",
    weeks: "1-6",
    structure: "Upper/Lower Split",
    deload_weeks: [6],
    days: [
      {
        day_name: "Upper Body",
        exercises: [
          {
            type: "strength",
            exercise: "Barbell Bench Press",
            sets: 4,
            reps: "8-12",
            rest: 120,
            primaryMuscles: ["Chest", "Front Delts"],
            secondaryMuscles: ["Triceps"]
          },
          {
            type: "strength", 
            exercise: "Bent-Over Barbell Row",
            sets: 4,
            reps: "8-12",
            rest: 120,
            primaryMuscles: ["Lats", "Middle Traps"],
            secondaryMuscles: ["Rear Delts", "Biceps"]
          },
          {
            type: "strength",
            exercise: "Overhead Press",
            sets: 3,
            reps: "10-15",
            rest: 90,
            primaryMuscles: ["Front Delts", "Side Delts"],
            secondaryMuscles: ["Triceps"]
          }
        ]
      },
      {
        day_name: "Lower Body",
        exercises: [
          {
            type: "strength",
            exercise: "Barbell Back Squat",
            sets: 4,
            reps: "8-12", 
            rest: 150,
            primaryMuscles: ["Quads", "Glutes"],
            secondaryMuscles: ["Hamstrings"]
          },
          {
            type: "strength",
            exercise: "Romanian Deadlift",
            sets: 3,
            reps: "10-15",
            rest: 120,
            primaryMuscles: ["Hamstrings", "Glutes"],
            secondaryMuscles: ["Lower Back"]
          }
        ]
      }
    ]
  }]
};

const mockBlock2JSON = {
  ...mockBlock1JSON,
  routine_name: "1 Year Muscle Builder - Block B",
  blocks: [{
    ...mockBlock1JSON.blocks[0],
    block_name: "Block B — Hypertrophy Progression: 8-12 reps",
    weeks: "7-12"
  }]
};

const mockBlock3JSON = {
  ...mockBlock1JSON,
  routine_name: "1 Year Muscle Builder - Block C", 
  blocks: [{
    ...mockBlock1JSON.blocks[0],
    block_name: "Block C — Hypertrophy Intensification: 6-10 reps",
    weeks: "13-18",
    days: mockBlock1JSON.blocks[0].days.map(day => ({
      ...day,
      exercises: day.exercises.map(ex => ({
        ...ex,
        reps: "6-10"
      }))
    }))
  }]
};

// Mock roadmap text for testing
const mockRoadmapText = `
| Mesocycle | Phase | Rep Focus | Emphasis | Weeks | Blocks |
|---|---|---|---|---|---|
| 1 | Hypertrophy Foundation | 8-12 reps | Volume accumulation, movement mastery | 18 | 3 |
| 2 | Strength-Hypertrophy | 6-10 reps | Progressive overload, strength building | 17 | 3 |
| 3 | Power & Definition | 10-15 reps | Metabolic stress, advanced techniques | 17 | 3 |
`;

async function testMesocycleSystem() {
  console.log('🧪 Testing Mesocycle System\n');

  try {
    // Clear any existing data
    await ProgramStorage.clearAllPrograms();
    console.log('✅ Cleared existing program data\n');

    // Test 1: Mesocycle 1 Planning Prompt
    console.log('📝 Test 1: Mesocycle 1 Planning Prompt');
    console.log('==========================================');
    
    const mesocycle1Prompt = assemblePlanningPrompt(mockQuestionnaireData);
    
    console.log('Length:', mesocycle1Prompt.length, 'characters');
    console.log('Contains mesocycle structure:', mesocycle1Prompt.includes('mesocycles'));
    console.log('Contains roadmap request:', mesocycle1Prompt.includes('Mesocycle Roadmap'));
    console.log('Contains "Design this mesocycle AND provide":', mesocycle1Prompt.includes('Design this mesocycle AND provide'));
    
    // Save prompt to file for inspection
    const fs = require('fs');
    fs.writeFileSync('/tmp/mesocycle1_prompt.md', mesocycle1Prompt);
    console.log('✅ Mesocycle 1 prompt saved to /tmp/mesocycle1_prompt.md\n');

    // Test 2: Create Program and Mock Roadmap
    console.log('🗺️  Test 2: Program Creation & Roadmap Parsing');
    console.log('===============================================');
    
    const program: Program = {
      id: 'test_program_1',
      name: '1 Year Muscle Builder',
      createdAt: new Date().toISOString(),
      programDuration: '1_year',
      totalMesocycles: 3,
      currentMesocycle: 1,
      mesocycleRoadmap: [
        {
          mesocycleNumber: 1,
          phaseName: 'Hypertrophy Foundation',
          repFocus: '8-12 reps',
          emphasis: 'Volume accumulation, movement mastery',
          weeks: 18,
          blocks: 3
        },
        {
          mesocycleNumber: 2, 
          phaseName: 'Strength-Hypertrophy',
          repFocus: '6-10 reps',
          emphasis: 'Progressive overload, strength building',
          weeks: 17,
          blocks: 3
        },
        {
          mesocycleNumber: 3,
          phaseName: 'Power & Definition', 
          repFocus: '10-15 reps',
          emphasis: 'Metabolic stress, advanced techniques',
          weeks: 17,
          blocks: 3
        }
      ],
      mesocycleRoadmapText: mockRoadmapText,
      completedMesocycles: [],
      routineIds: []
    };
    
    await ProgramStorage.addProgram(program);
    console.log('✅ Created test program with 3-mesocycle roadmap\n');

    // Test 3: Mock Importing 3 JSON Blocks
    console.log('📦 Test 3: Mock JSON Block Imports');
    console.log('===================================');
    
    const mockRoutines: WorkoutRoutine[] = [];
    
    // Import Block 1
    const routine1: WorkoutRoutine = {
      id: 'routine_1',
      name: mockBlock1JSON.routine_name,
      days: mockBlock1JSON.days_per_week,
      blocks: mockBlock1JSON.blocks.length,
      data: mockBlock1JSON,
      programId: program.id
    };
    await WorkoutStorage.addRoutine(routine1);
    await ProgramStorage.addRoutineToProgram(program.id, routine1.id);
    mockRoutines.push(routine1);
    console.log('✅ Imported Block 1:', routine1.name);
    
    // Import Block 2
    const routine2: WorkoutRoutine = {
      id: 'routine_2', 
      name: mockBlock2JSON.routine_name,
      days: mockBlock2JSON.days_per_week,
      blocks: mockBlock2JSON.blocks.length,
      data: mockBlock2JSON,
      programId: program.id
    };
    await WorkoutStorage.addRoutine(routine2);
    await ProgramStorage.addRoutineToProgram(program.id, routine2.id);
    mockRoutines.push(routine2);
    console.log('✅ Imported Block 2:', routine2.name);
    
    // Import Block 3  
    const routine3: WorkoutRoutine = {
      id: 'routine_3',
      name: mockBlock3JSON.routine_name, 
      days: mockBlock3JSON.days_per_week,
      blocks: mockBlock3JSON.blocks.length,
      data: mockBlock3JSON,
      programId: program.id
    };
    await WorkoutStorage.addRoutine(routine3);
    await ProgramStorage.addRoutineToProgram(program.id, routine3.id);
    mockRoutines.push(routine3);
    console.log('✅ Imported Block 3:', routine3.name);
    console.log('');

    // Test 4: Verify Extraction
    console.log('🔍 Test 4: Mesocycle Summary Extraction'); 
    console.log('=========================================');
    
    const summary = extractMesocycleSummary(mockRoutines, 'Hypertrophy Foundation');
    
    console.log('Phase Name:', summary.phaseName);
    console.log('Split Structure:', summary.splitStructure); 
    console.log('Rep Range Focus:', summary.repRangeFocus);
    console.log('Exercises Used:', summary.exercisesUsed.length, 'exercises');
    console.log('  -', summary.exercisesUsed.slice(0, 3).join(', '), '...');
    console.log('Volume Per Muscle:');
    Object.entries(summary.volumePerMuscle).forEach(([muscle, sets]) => {
      console.log(`  - ${muscle}: ${sets} sets/week`);
    });
    console.log('');

    // Complete Mesocycle 1
    await ProgramStorage.completeMesocycle(program.id, { ...summary, mesocycleNumber: 1 });
    console.log('✅ Completed Mesocycle 1 with extracted summary\n');

    // Test 5: Mesocycle 2 Planning Prompt
    console.log('📝 Test 5: Mesocycle 2 Planning Prompt');
    console.log('=======================================');
    
    const updatedProgram = await ProgramStorage.getProgram(program.id);
    
    const mesocycle2Context: ProgramContext = {
      totalMesocycles: 3,
      currentMesocycle: 2, 
      mesocycleWeeks: 17,
      mesocycleBlocks: 3,
      mesocycleRoadmapText: mockRoadmapText,
      previousMesocycleSummary: updatedProgram?.completedMesocycles[0]
    };
    
    const mesocycle2Prompt = assemblePlanningPrompt(mockQuestionnaireData, mesocycle2Context);
    
    console.log('Length:', mesocycle2Prompt.length, 'characters');
    console.log('Contains previous summary:', mesocycle2Prompt.includes('Previous Mesocycle Summary'));
    console.log('Contains volume table:', mesocycle2Prompt.includes('Volume Achieved:'));
    console.log('Contains exercises used:', mesocycle2Prompt.includes('Exercises Used:'));
    console.log('Contains roadmap text:', mesocycle2Prompt.includes('Mesocycle Roadmap'));
    console.log('Contains rotation instruction:', mesocycle2Prompt.includes('Rotate exercises from the previous mesocycle'));
    
    // Save prompt to file for inspection
    fs.writeFileSync('/tmp/mesocycle2_prompt.md', mesocycle2Prompt);
    console.log('✅ Mesocycle 2 prompt saved to /tmp/mesocycle2_prompt.md\n');

    // Test 6: Validate Prompt Quality
    console.log('✨ Test 6: Prompt Quality Validation');
    console.log('=====================================');
    
    // Check Mesocycle 1 prompt structure
    const m1HasCorrectStructure = 
      mesocycle1Prompt.includes('Program Structure:') &&
      mesocycle1Prompt.includes('Mesocycle 1 of 3') && 
      mesocycle1Prompt.includes('Design this mesocycle AND provide') &&
      mesocycle1Prompt.includes('Plan 3 blocks within this ~17 week mesocycle');
    
    // Check Mesocycle 2 prompt structure  
    const m2HasCorrectStructure =
      mesocycle2Prompt.includes('Program Structure:') &&
      mesocycle2Prompt.includes('Mesocycle 2 of 3') &&
      mesocycle2Prompt.includes('Previous Mesocycle Summary') &&
      mesocycle2Prompt.includes('Hypertrophy Foundation') &&
      mesocycle2Prompt.includes('Upper/Lower Split') &&
      mesocycle2Prompt.includes('Design Mesocycle 2 following the roadmap');
    
    console.log('Mesocycle 1 structure:', m1HasCorrectStructure ? '✅ Correct' : '❌ Missing elements');
    console.log('Mesocycle 2 structure:', m2HasCorrectStructure ? '✅ Correct' : '❌ Missing elements');
    
    console.log('\n🎉 All tests completed!');
    console.log('==============================');
    console.log('Check /tmp/mesocycle1_prompt.md and /tmp/mesocycle2_prompt.md for full prompts');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMesocycleSystem();