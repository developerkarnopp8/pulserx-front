/**
 * Boas-vindas do primeiro acesso (Stitch mo19): aparece uma vez por aluno neste navegador, só enquanto ele ainda não treinou
 * nada. Guardado no navegador (não no servidor): se o armazenamento estiver bloqueado, conta como já visto — nunca prende o
 * aluno num redirecionamento.
 */
const KEY_PREFIX = 'pulserx_welcome_seen_';

export function hasSeenWelcome(userId: string): boolean {
  try {
    return localStorage.getItem(KEY_PREFIX + userId) === '1';
  } catch {
    return true;
  }
}

export function markWelcomeSeen(userId: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + userId, '1');
  } catch {
    // Modo privado/bloqueado: a tela só não é lembrada.
  }
}

/** Mostrar as boas-vindas: aluno logado, ainda não viu neste navegador e nenhum treino registrado. */
export function shouldShowWelcome(userId: string | null | undefined, workoutCount: number): boolean {
  return !!userId && workoutCount === 0 && !hasSeenWelcome(userId);
}

export type NotificationState = 'granted' | 'denied' | 'default' | 'unsupported';

/** Situação da permissão de notificação do navegador (o app já avisa novas mensagens e treinos por ela). */
export function notificationState(): NotificationState {
  const api = typeof window === 'undefined' ? undefined : (window as { Notification?: { permission?: string } }).Notification;
  if (!api?.permission) return 'unsupported';
  return api.permission as NotificationState;
}
