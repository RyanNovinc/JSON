import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MesocyclePhase {
  mesocycleNumber: number;
  phaseName: string;           // e.g., "Hypertrophy Foundation"
  repFocus: string;            // e.g., "8-12 reps"
  emphasis: string;            // e.g., "Volume accumulation, movement mastery"
  weeks: number;
  blocks: number;
}

export interface CompletedMesocycleSummary {
  mesocycleNumber: number;
  phaseName: string;
  splitStructure: string;
  repRangeFocus: string;
  exercisesUsed: string[];           // just exercise name strings
  volumePerMuscle: Record<string, number>;  // muscle name → sets/week
}

export interface Program {
  id: string;
  name: string;
  createdAt: string;
  programDuration: string;           // '6_months' | '1_year' | 'custom'
  totalMesocycles: number;
  currentMesocycle: number;          // 1-indexed
  mesocycleRoadmap: MesocyclePhase[];
  mesocycleRoadmapText: string;      // raw AI-generated roadmap text for re-injection
  completedMesocycles: CompletedMesocycleSummary[];
  routineIds: string[];              // references to WorkoutRoutine ids
}

const STORAGE_KEYS = {
  PROGRAMS: 'workout_programs',
};

export class ProgramStorage {
  // Program management
  static async savePrograms(programs: Program[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.PROGRAMS, JSON.stringify(programs));
    } catch (error) {
      console.error('Failed to save programs:', error);
    }
  }

  static async loadPrograms(): Promise<Program[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PROGRAMS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load programs:', error);
      return [];
    }
  }

  static async addProgram(program: Program): Promise<void> {
    const programs = await this.loadPrograms();
    programs.push(program);
    await this.savePrograms(programs);
  }

  static async updateProgram(programId: string, updates: Partial<Program>): Promise<void> {
    try {
      const programs = await this.loadPrograms();
      const programIndex = programs.findIndex(p => p.id === programId);
      
      if (programIndex === -1) {
        throw new Error(`Program with id ${programId} not found`);
      }

      programs[programIndex] = { ...programs[programIndex], ...updates };
      await this.savePrograms(programs);
    } catch (error) {
      console.error('Failed to update program:', error);
    }
  }

  static async getProgram(programId: string): Promise<Program | null> {
    try {
      const programs = await this.loadPrograms();
      return programs.find(p => p.id === programId) || null;
    } catch (error) {
      console.error('Failed to get program:', error);
      return null;
    }
  }

  static async deleteProgram(programId: string): Promise<void> {
    try {
      const programs = await this.loadPrograms();
      const filtered = programs.filter(p => p.id !== programId);
      await this.savePrograms(filtered);
    } catch (error) {
      console.error('Failed to delete program:', error);
    }
  }

  // Utility methods
  static async getProgramByRoutineId(routineId: string): Promise<Program | null> {
    try {
      const programs = await this.loadPrograms();
      return programs.find(p => p.routineIds.includes(routineId)) || null;
    } catch (error) {
      console.error('Failed to get program by routine id:', error);
      return null;
    }
  }

  static async addRoutineToProgram(programId: string, routineId: string): Promise<void> {
    try {
      const program = await this.getProgram(programId);
      if (!program) {
        throw new Error(`Program with id ${programId} not found`);
      }

      if (!program.routineIds.includes(routineId)) {
        program.routineIds.push(routineId);
        await this.updateProgram(programId, { routineIds: program.routineIds });
      }
    } catch (error) {
      console.error('Failed to add routine to program:', error);
    }
  }

  static async removeRoutineFromProgram(programId: string, routineId: string): Promise<void> {
    try {
      const program = await this.getProgram(programId);
      if (!program) {
        throw new Error(`Program with id ${programId} not found`);
      }

      const updatedRoutineIds = program.routineIds.filter(id => id !== routineId);
      await this.updateProgram(programId, { routineIds: updatedRoutineIds });
    } catch (error) {
      console.error('Failed to remove routine from program:', error);
    }
  }

  // Mesocycle management
  static async completeMesocycle(
    programId: string, 
    summary: CompletedMesocycleSummary
  ): Promise<void> {
    try {
      const program = await this.getProgram(programId);
      if (!program) {
        throw new Error(`Program with id ${programId} not found`);
      }

      // Add completed mesocycle summary
      const updatedCompletedMesocycles = [...program.completedMesocycles, summary];
      
      // Increment current mesocycle
      const newCurrentMesocycle = Math.min(program.currentMesocycle + 1, program.totalMesocycles);

      await this.updateProgram(programId, {
        completedMesocycles: updatedCompletedMesocycles,
        currentMesocycle: newCurrentMesocycle
      });
    } catch (error) {
      console.error('Failed to complete mesocycle:', error);
    }
  }

  static async updateMesocycleRoadmap(
    programId: string, 
    roadmapText: string, 
    roadmapData: MesocyclePhase[]
  ): Promise<void> {
    try {
      await this.updateProgram(programId, {
        mesocycleRoadmapText: roadmapText,
        mesocycleRoadmap: roadmapData
      });
    } catch (error) {
      console.error('Failed to update mesocycle roadmap:', error);
    }
  }

  // Clear all program data (for testing/debugging)
  static async clearAllPrograms(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PROGRAMS);
    } catch (error) {
      console.error('Failed to clear all programs:', error);
    }
  }
}