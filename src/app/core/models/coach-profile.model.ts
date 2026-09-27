import { SubscriptionPlan } from './subscription.model';

export interface CoachProfile {
  id: string;
  coachId: string;
  slug: string;
  bio: string | null;
  bannerUrl: string | null;
  published: boolean;
}

export interface PublicCoachProfile {
  coachName: string;
  bio: string | null;
  bannerUrl: string | null;
  plans: Pick<SubscriptionPlan, 'id' | 'name' | 'description' | 'priceCents' | 'categories' | 'isFree'>[];
}

export interface CreateLeadInput {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}
