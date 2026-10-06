import { AppNotification, NotificationType, Student } from '../../core/models';

export type AttentionReason = { kind: 'skips'; count: number } | { kind: 'past_due' };

export interface AttentionItem {
  student: Student;
  reasons: AttentionReason[];
}

/**
 * Alunos que pedem ação do coach, só com sinais reais: treinos pulados ainda sem resposta e mensalidade
 * vencida (assinatura PAST_DUE). Mais pulos primeiro; empate por nome.
 */
export function attentionList(students: Student[], skipCounts: { studentId: string; count: number }[]): AttentionItem[] {
  const skips = new Map(skipCounts.map(s => [s.studentId, s.count]));
  return students
    .map(student => {
      const reasons: AttentionReason[] = [];
      const count = skips.get(student.id) ?? 0;
      if (count > 0) reasons.push({ kind: 'skips', count });
      if (student.subscription?.status === 'PAST_DUE') reasons.push({ kind: 'past_due' });
      return { student, reasons };
    })
    .filter(item => item.reasons.length > 0)
    .sort((a, b) => (skips.get(b.student.id) ?? 0) - (skips.get(a.student.id) ?? 0) || a.student.name.localeCompare(b.student.name, 'pt-BR'));
}

/** Ícone e rótulo de cada tipo de aviso no feed do dashboard. */
export const NOTIFICATION_FEED: Record<NotificationType, { icon: string; label: string }> = {
  plan_published: { icon: 'assignment_turned_in', label: 'Plano publicado' },
  new_message: { icon: 'chat', label: 'Mensagem' },
  workout_skipped: { icon: 'event_busy', label: 'Pulou treino' },
  new_pr: { icon: 'emoji_events', label: 'Novo PR' },
  ai_credit_exhausted: { icon: 'block', label: 'Importação por IA' },
  new_lead: { icon: 'person_search', label: 'Novo interessado' },
  subscription_canceled: { icon: 'cancel', label: 'Assinatura cancelada' },
  new_student: { icon: 'person_add', label: 'Novo aluno' },
  card_refused: { icon: 'credit_card_off', label: 'Cartão recusado' },
};

/** Os avisos mais recentes primeiro, até `max`. */
export function latestNotifications(list: AppNotification[], max = 5): AppNotification[] {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, max);
}

/** Iniciais do nome ("Ana Souza" → "AS"). */
export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase();
}
