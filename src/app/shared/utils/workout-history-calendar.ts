import { toLocalDateKey } from './date-key';

/**
 * Lógica de calendário/streak/conclusão mensal — extraída do HistoryComponent (visão do
 * atleta sobre o próprio histórico) pra ser reusada também na visão do coach sobre o
 * histórico de um aluno específico (aba "Histórico por Aluno" na Biblioteca). Pura e
 * testável: recebe `today` como parâmetro (default `new Date()`) em vez de ler o relógio
 * internamente, senão os testes de streak/calendário virando o mês ficariam impossíveis.
 */

export interface CalendarDay { date: number; completed: boolean; hasWorkout: boolean; }

export interface HasCompletedAt { completedAt: Date; }

export function calcStreak(logs: HasCompletedAt[], today: Date = new Date()): number {
  const doneSet = new Set(logs.map(l => toLocalDateKey(l.completedAt)));
  let streak = 0;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (doneSet.has(toLocalDateKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function calcMonthCompletion(logs: HasCompletedAt[], today: Date = new Date()): number {
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysElapsed = today.getDate();
  const doneSet = new Set(
    logs
      .filter(l => l.completedAt.getFullYear() === year && l.completedAt.getMonth() === month)
      .map(l => l.completedAt.getDate())
  );
  if (daysElapsed === 0) return 0;
  return Math.round((doneSet.size / daysElapsed) * 100);
}

export function buildHistoryCalendar(logs: HasCompletedAt[], today: Date = new Date()): CalendarDay[] {
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const doneSet = new Set(
    logs
      .filter(l => l.completedAt.getFullYear() === year && l.completedAt.getMonth() === month)
      .map(l => l.completedAt.getDate())
  );

  // Dias com treino = dias que já passaram (passado + hoje contam como "dia de treino" pro
  // acompanhamento; dias futuros não aparecem marcados).
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const isPast = day <= today.getDate();
    return {
      date: day,
      completed: doneSet.has(day),
      hasWorkout: isPast,
    };
  });
}

export function historyMonthName(today: Date = new Date()): string {
  return today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
