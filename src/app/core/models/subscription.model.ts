import { TrainingCategory } from './training.model';

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIALING: 'Em teste',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento em atraso',
  CANCELED: 'Cancelada',
};

export interface FreeConfig {
  sampleSessionsPerCategory?: number;
  supportVideos?: boolean;
  fullHistory?: boolean;
  chat?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  coachId: string;
  name: string;
  description: string | null;
  /** Preço mensal em centavos; 0 = gratuito. */
  priceCents: number;
  categories: TrainingCategory[];
  isFree: boolean;
  freeConfig: FreeConfig | null;
  active: boolean;
}

export interface Subscription {
  id: string;
  studentId: string;
  status: SubscriptionStatus;
  startedAt: string;
  renewsAt: string | null;
  canceledAt: string | null;
  trialEndsAt: string | null;
  plan: Pick<SubscriptionPlan, 'id' | 'name' | 'priceCents' | 'categories' | 'isFree'>;
}

export interface MySubscription {
  subscription: Subscription | null;
  /** Categorias que a assinatura libera agora (todas, enquanto o bloqueio estiver desligado). */
  categories: TrainingCategory[];
}

export interface CoachContract {
  coachId: string;
  platformFeePercent: number;
}

export interface PlatformSettings {
  enforceSubscriptionAccess: boolean;
  totalStudents: number;
  studentsWithoutAccess: number;
}
