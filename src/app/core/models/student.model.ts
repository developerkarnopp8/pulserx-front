import { Subscription } from './subscription.model';

export interface Student {
  id: string;
  name: string;
  email: string;
  goal: string;
  currentMonth: number;
  currentWeek: number;
  avatarUrl?: string;
  coachId: string;
  completionPercent?: number;
  /** Só vem preenchida em `GET /students` (listagem do coach) — as demais rotas não incluem. */
  subscription?: Subscription | null;
}
