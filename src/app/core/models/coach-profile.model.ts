import { SubscriptionPlan } from './subscription.model';
import { LandingPageCopy } from '../../shared/utils/landing-copy';

export interface CoachProfile {
  id: string;
  coachId: string;
  slug: string;
  bio: string | null;
  bannerUrl: string | null;
  photoUrl: string | null;
  headline: string | null;
  subheadline: string | null;
  quote: string | null;
  achievementBadge: string | null;
  yearsExperience: number | null;
  athletesCount: number | null;
  npsScore: number | null;
  completionRate: number | null;
  whatsappNumber: string | null;
  videoUrl: string | null;
  /** Garantia oferecida pelo coach (além dos 7 dias legais) e suporte ao aluno. */
  guaranteeDays: number | null;
  guaranteeText: string | null;
  supportEmail: string | null;
  supportHours: string | null;
  /** Textos editáveis da página (ausente = padrão). */
  pageCopy: LandingPageCopy | null;
  published: boolean;
}

export interface UpdateCoachProfileInput {
  slug: string;
  bio?: string;
  headline?: string;
  subheadline?: string;
  quote?: string;
  achievementBadge?: string;
  yearsExperience?: number;
  athletesCount?: number;
  npsScore?: number;
  completionRate?: number;
  whatsappNumber?: string;
  videoUrl?: string;
  /** null limpa (o coach tirou a garantia/suporte). */
  guaranteeDays?: number | null;
  guaranteeText?: string | null;
  supportEmail?: string | null;
  supportHours?: string | null;
  pageCopy?: LandingPageCopy;
}

export interface Testimonial {
  id: string;
  authorName: string;
  authorRole: string | null;
  rating: number;
  content: string;
  order?: number;
}

export interface UpsertTestimonialInput {
  authorName: string;
  authorRole?: string;
  rating?: number;
  content: string;
  order?: number;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order?: number;
}

export interface UpsertFaqItemInput {
  question: string;
  answer: string;
  order?: number;
}

export interface PublicCoachProfile {
  coachName: string;
  bio: string | null;
  bannerUrl: string | null;
  photoUrl: string | null;
  headline: string | null;
  subheadline: string | null;
  quote: string | null;
  achievementBadge: string | null;
  yearsExperience: number | null;
  athletesCount: number | null;
  npsScore: number | null;
  completionRate: number | null;
  whatsappNumber: string | null;
  videoUrl: string | null;
  /** Garantia oferecida pelo coach (além dos 7 dias legais) e suporte ao aluno. */
  guaranteeDays: number | null;
  guaranteeText: string | null;
  supportEmail: string | null;
  supportHours: string | null;
  /** Textos editáveis da página (ausente = padrão). */
  pageCopy: LandingPageCopy | null;
  plans: Pick<SubscriptionPlan, 'id' | 'name' | 'description' | 'priceCents' | 'categories' | 'isFree'>[];
  testimonials: Testimonial[];
  faqItems: FaqItem[];
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

/** Inscrição do visitante na landing do coach (POST /public/coaches/:slug/signup). */
export interface PublicSignupInput {
  name: string;
  email: string;
  password: string;
  planId: string;
  acceptTerms: true;
}

export interface PublicSignupResult {
  access_token: string;
  user: { id: string; name: string; email: string; role: 'athlete' };
  planId: string;
}

