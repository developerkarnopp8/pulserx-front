export type NotificationType =
  | 'plan_published' | 'new_message' | 'workout_skipped' | 'new_pr' | 'ai_credit_exhausted'
  | 'new_lead' | 'subscription_canceled' | 'new_student';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}
