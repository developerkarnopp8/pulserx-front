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
  /** Cartão do débito automático (o Asaas guarda quando o aluno paga com cartão): só bandeira e final. */
  autoDebitCard?: { brand: string; last4: string } | null;
  /**
   * Aviso de acesso (só com o bloqueio por assinatura ligado): inadimplente dentro dos 5 dias de tolerância (`graceUntil`)
   * ou cobrança contestada no cartão (`chargeback`, acesso pausado até resolver).
   */
  accessNotice?: { graceUntil: string | null; chargeback: boolean } | null;
}

/** Status de uma cobrança do gateway (Asaas). Estornada e contestada não contam como recebido. */
export type GatewayPaymentStatus = 'pending' | 'paid' | 'overdue' | 'refunded' | 'chargeback';

export const GATEWAY_PAYMENT_STATUS_LABEL: Record<GatewayPaymentStatus, string> = {
  pending: 'Em aberto',
  paid: 'Paga',
  overdue: 'Vencida',
  refunded: 'Estornada',
  chargeback: 'Contestada',
};

/** Ícone (Material Symbols) de cada status. */
export const GATEWAY_PAYMENT_STATUS_ICON: Record<GatewayPaymentStatus, string> = {
  pending: 'schedule',
  paid: 'task_alt',
  overdue: 'error',
  refunded: 'undo',
  chargeback: 'gavel',
};

/** Ainda a pagar (entra em "próxima cobrança"); estornada/contestada não é cobrança em aberto. */
export function isOpenGatewayPayment(status: GatewayPaymentStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

/** Dinheiro que não ficou com o coach: estornada (voltou ao aluno) ou contestada (em disputa). */
export function isReversedGatewayPayment(status: GatewayPaymentStatus): boolean {
  return status === 'refunded' || status === 'chargeback';
}

/** Cobrança real do próprio aluno (GET /subscriptions/me/payments). `amount` em reais. */
export interface MyGatewayPayment {
  id: string;
  status: GatewayPaymentStatus;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  createdAt: string;
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

export interface RevenueByPlan {
  planId: string;
  planName: string;
  priceCents: number;
  activeCount: number;
  mrrCents: number;
}

/**
 * MRR/receita por plano, inadimplência e churn/LTV — tudo calculado a partir do dado real de
 * assinatura (sem billing history tabular, churn/LTV são aproximações honestas, não contábeis).
 */
export interface FinancialSummary {
  mrrCents: number;
  revenueByPlan: RevenueByPlan[];
  totalActive: number;
  totalPastDue: number;
  pastDueRatePercent: number;
  churn: {
    canceledThisMonth: number;
    activeAtStartOfMonth: number;
    ratePercent: number;
  };
  arpuCents: number;
  /** null quando não há cancelamento no mês pra calcular uma taxa de churn (evita divisão por zero/número fictício). */
  ltvProjectedCents: number | null;
}

/** Divisão real de uma cobrança do Asaas (valores em reais). null = o Asaas ainda não informou. */
export interface PaymentBreakdown {
  gross: number;
  gatewayFee: number | null;
  netValue: number | null;
  platformFeePercent: number | null;
  platformFee: number | null;
  coachNet: number | null;
}

/** Cobrança do Asaas de um aluno do coach (GET /subscriptions/gateway-payments). */
export interface CoachGatewayPayment {
  id: string;
  status: GatewayPaymentStatus;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  createdAt: string;
  subscription: { student: { id: string; user: { name: string } }; plan: { name: string } };
  breakdown: PaymentBreakdown;
}

/** Mês corrente, só cobranças pagas (GET /subscriptions/monthly-breakdown). */
export interface MonthlyBreakdown {
  /** null = o admin ainda não definiu o contrato deste coach (≠ 0% combinado). */
  currentPlatformFeePercent: number | null;
  month: {
    count: number;
    gross: number;
    gatewayFee: number;
    platformFee: number;
    coachNet: number;
    /** Pagas sem o líquido do Asaas ainda — ficam fora das somas de taxa/repasse. */
    pendingBreakdown: number;
  };
}

/** Resposta do checkout do aluno: plano pago devolve o link da fatura do Asaas pra pagar. */
export interface CheckoutResult {
  subscription: Subscription;
  checkoutUrl: string | null;
}


/** Soma das cobranças pagas num mês: bruto → taxa do Asaas → AEVON → coach (mesma conta do Financeiro do coach). */
export interface MonthTotals {
  count: number;
  gross: number;
  gatewayFee: number;
  platformFee: number;
  coachNet: number;
  /** Cobranças pagas sem o líquido do Asaas ainda — entram no bruto, fora das taxas/repasses. */
  pendingBreakdown: number;
}

/** Admin: financeiro por coach no mês atual e nos 5 anteriores (`months` = AAAA-MM, do mais antigo ao atual). */
export interface AdminFinancialOverview {
  months: string[];
  coaches: { id: string; name: string; email: string; months: MonthTotals[] }[];
  totals: MonthTotals[];
}

/** Admin: o que falta configurar num coach para ele cobrar direito. */
export type CoachAlert = 'NO_CONTRACT' | 'NO_WALLET' | 'PAGE_UNPUBLISHED';

export const COACH_ALERT_LABEL: Record<CoachAlert, string> = {
  NO_CONTRACT: 'Sem % de contrato',
  NO_WALLET: 'Sem carteira Asaas',
  PAGE_UNPUBLISHED: 'Página despublicada',
};

/** Admin: assinaturas dos alunos ativos do coach (MRR = ativas + em teste, mesma conta do Financeiro do coach). */
export interface CoachSubscriptionSummary {
  active: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  withoutPlan: number;
  mrrCents: number;
}

/** Admin: uso do coach. Último login e planos por IA são registrados desde 30/09/2026 (antes: sem registro). */
export interface CoachUsage {
  plans: number;
  aiImportedPlans: number;
  completedWorkouts30d: number;
  lastLoginAt: string | null;
  lastPlanUpdateAt: string | null;
}
