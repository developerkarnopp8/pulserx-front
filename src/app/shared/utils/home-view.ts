import { Exercise, Session, SessionType, TrainingCategory, TrainingPlan } from '../../core/models';
import { currentWeekNumber, defaultCategory, pickPlan } from './plan-selection';

/** Tipo da sessão em português (o mesmo vocabulário da Biblioteca do coach). */
export const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  LPO: 'LPO',
  Strength: 'Força',
  Gymnastics: 'Ginástica',
  Metcon: 'Metcon',
  Endurance: 'Resistência',
  Mobility: 'Mobilidade',
  Core: 'Core',
};

/** Ícone (Material Symbols) de cada tipo de sessão no cronograma do Início. */
export const SESSION_TYPE_ICON: Record<SessionType, string> = {
  LPO: 'fitness_center',
  Strength: 'exercise',
  Gymnastics: 'sports_gymnastics',
  Metcon: 'timer',
  Endurance: 'directions_run',
  Mobility: 'self_improvement',
  Core: 'accessibility_new',
};

/** "Back Squat 5x5 @ 75%" — só com o que o coach preencheu (sem séries/reps/carga, fica só o nome). */
export function exerciseSummary(e: Exercise): string {
  const volume = e.sets && e.reps ? `${e.sets}x${e.reps}` : e.reps ? `${e.reps}` : e.duration ? e.duration : '';
  const load = e.loadPercent ? `@ ${e.loadPercent}%` : '';
  return [e.name, volume, load].filter(Boolean).join(' ');
}

/** Prévia da sessão: os primeiros exercícios, na ordem do coach ("A → B"); "+N" quando há mais. */
export function sessionPreview(session: Session, max = 2): string {
  const shown = session.exercises.slice(0, max).map(exerciseSummary);
  const rest = session.exercises.length - shown.length;
  return shown.join(' → ') + (rest > 0 ? ` → +${rest}` : '');
}

/** Primeira observação escrita pelo coach nos exercícios da sessão (vazio = o coach não escreveu nada). */
export function coachNoteOf(session: Session | null | undefined): string | null {
  const note = session?.exercises.find(e => e.coachNotes?.trim())?.coachNotes?.trim();
  return note || null;
}

export interface PlanPosition {
  category: TrainingCategory;
  month: number;
  week: number;
}

/** Onde o aluno está no plano principal (Performance se tiver, senão o primeiro): mês do plano e semana de hoje. */
export function planPosition(
  plans: TrainingPlan[],
  student: { currentMonth: number; currentWeek: number },
  today: Date = new Date(),
): PlanPosition | null {
  const category = defaultCategory(plans);
  if (!category) return null;
  const plan = pickPlan(plans, category, student.currentMonth)!;
  return { category, month: plan.month, week: currentWeekNumber(plan, student.currentWeek, today) };
}

/** Percentual até a meta, de 0 a 100 (passou da meta, a barra fica cheia). */
export function goalPercent(value: number, goal: number): number {
  if (goal <= 0 || value <= 0) return 0;
  return Math.min(100, Math.round((value / goal) * 100));
}

/** "Quinta-feira, 24 de outubro" (primeira letra maiúscula). */
export function longDate(date: Date): string {
  const s = date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface SessionStats {
  exercises: number;
  /** Soma das séries prescritas (exercício sem séries conta 0). */
  totalSets: number;
  /** Maior % de carga prescrito; null se o coach não pôs carga em nenhum. */
  maxLoadPercent: number | null;
  /** Faixa do descanso prescrito, em segundos; null se nenhum exercício tem descanso. */
  rest: { min: number; max: number } | null;
}

/** Números da sessão tirados só da prescrição do coach (nada estimado: sem duração nem volume em kg). */
export function sessionStats(session: Session): SessionStats {
  const ex = session.exercises;
  const loads = ex.map(e => e.loadPercent ?? 0).filter(v => v > 0);
  const rests = ex.map(e => e.restSeconds ?? 0).filter(v => v > 0);
  return {
    exercises: ex.length,
    totalSets: ex.reduce((sum, e) => sum + (e.sets ?? 0), 0),
    maxLoadPercent: loads.length ? Math.max(...loads) : null,
    rest: rests.length ? { min: Math.min(...rests), max: Math.max(...rests) } : null,
  };
}

/** "90 s" ou "60–120 s" (minutos quando passa de 1 min redondo: "2 min"). */
export function restLabel(rest: { min: number; max: number }): string {
  const fmt = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);
  return rest.min === rest.max ? fmt(rest.min) : `${fmt(rest.min)}–${fmt(rest.max)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Posição do dia na semana do plano, começando na segunda (dayIndex: 0 = domingo … 6 = sábado). */
const mondayOffset = (dayIndex: number) => (dayIndex + 6) % 7;

/**
 * Data de um dia do plano, só quando dá para saber com certeza: plano compartilhado tem calendário próprio
 * (startDate = segunda da semana 1); o individual só na semana em que o aluno está hoje. Fora disso, null.
 */
export function planDayDate(
  plan: TrainingPlan,
  weekNumber: number,
  dayIndex: number,
  studentCurrentWeek: number,
  today: Date = new Date(),
): Date | null {
  if (plan.scope === 'SHARED') {
    const start = new Date(plan.startDate);
    const base = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    return new Date(base.getTime() + ((weekNumber - 1) * 7 + mondayOffset(dayIndex)) * DAY_MS);
  }
  if (weekNumber !== studentCurrentWeek) return null;
  const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return new Date(todayLocal.getTime() + (mondayOffset(dayIndex) - mondayOffset(today.getDay())) * DAY_MS);
}
