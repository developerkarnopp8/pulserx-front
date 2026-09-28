export interface ExerciseLibraryItem {
  id: string;
  coachId: string;
  name: string;
  youtubeUrl?: string;
  /** Capa enviada pelo coach; tem prioridade sobre a miniatura do vídeo. */
  imageUrl?: string | null;
  sets?: number;
  reps?: string;
  duration?: string;
  restSeconds?: number;
  loadPercent?: number;
  category?: string;
  notes?: string;
  /** Veio sozinho dos planos do coach (não cadastrado à mão). */
  autoImported?: boolean;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export interface Payment {
  id: string;
  studentId: string;
  coachId: string;
  amount: number;
  description?: string;
  dueDate: string;
  paidAt?: string;
  status: PaymentStatus;
  createdAt: string;
  student?: {
    user: { name: string };
  };
}

export interface PaymentSummary {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  countOverdue: number;
}
