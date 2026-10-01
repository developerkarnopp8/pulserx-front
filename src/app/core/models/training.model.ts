export type SessionType =
  | 'LPO'
  | 'Strength'
  | 'Gymnastics'
  | 'Metcon'
  | 'Endurance'
  | 'Mobility'
  | 'Core';

export interface Exercise {
  id: string;
  name: string;
  youtubeUrl?: string;
  sets?: number | null;
  reps?: number | string | null;
  duration?: string | null;
  restSeconds?: number;
  loadPercent?: number | null;
  coachNotes?: string;
  completed: boolean;
  status: 'done' | 'postponed' | 'abandoned' | 'none';
}

export interface Session {
  id: string;
  name: string;
  type: SessionType;
  order: number;
  exercises: Exercise[];
  status: 'done' | 'postponed' | 'abandoned' | 'none';
}

export type SkipReason = 'NoTime' | 'Injury' | 'Later' | 'Other';
export type SkipDecision = 'Postponed' | 'Abandoned';

export interface TrainingDay {
  id: string;
  dayOfWeek: string;
  dayIndex: number;
  sessions: Session[];
}

export interface Week {
  id: string;
  weekNumber: number;
  days: TrainingDay[];
  /** Plano Free (amostra): semana além da amostra — vem sem conteúdo da API e a tela mostra "Assine para ver". */
  locked?: boolean;
}

export type TrainingCategory = 'CORE' | 'LPO' | 'PERFORMANCE';
export type PlanScope = 'SHARED' | 'INDIVIDUAL';

export const TRAINING_CATEGORY_LABEL: Record<TrainingCategory, string> = {
  CORE: 'Core',
  LPO: 'LPO',
  PERFORMANCE: 'Performance',
};

export interface TrainingPlan {
  id: string;
  /** null em plano compartilhado (Core/LPO): pertence ao coach, não a um aluno */
  studentId: string | null;
  category: TrainingCategory;
  scope: PlanScope;
  coachId: string;
  month: number;
  startDate: string;
  title: string;
  published: boolean;
  weeks: Week[];
}

export interface WorkoutLog {
  id: string;
  studentId: string;
  sessionId: string;
  completedAt: string;
  exerciseLogs: ExerciseLog[];
}

export interface ExerciseLog {
  exerciseId: string;
  completedSets: number;
  notes?: string;
}

export type WorkoutSessionStatus = 'Completed' | 'Partial';

export interface WorkoutSessionRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  sessionType: string;
  startedAt: string;
  elapsedSeconds: number;
  activeSeconds: number;
  status: WorkoutSessionStatus;
}

export interface SessionTimeSummary {
  count: number;
  avgElapsedSeconds: number;
  trend: { direction: 'faster' | 'slower' | 'equal' | 'new'; deltaSeconds: number };
  perExercise: { exerciseName: string; avgSeconds: number; samples: number }[];
}

export interface SessionTimeDetail {
  sessionId: string;
  sessionName: string;
  exercises: { id: string; name: string; durationSeconds: number | null; completed: boolean }[];
  lastExecution:
    | { startedAt: string; finishedAt: string; elapsedSeconds: number; activeSeconds: number; status: string }
    | null;
  executionCount: number;
}

export interface CoachAvgDuration {
  overallAvgSeconds: number;
  totalSessions: number;
  byStudent: { studentId: string; avgSeconds: number; count: number }[];
}
