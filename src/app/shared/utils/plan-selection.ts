import { Session, TrainingCategory, TrainingPlan } from '../../core/models';

const CATEGORY_ORDER: TrainingCategory[] = ['PERFORMANCE', 'CORE', 'LPO'];
const DAY_MS = 24 * 60 * 60 * 1000;

/** Categorias presentes nos planos do aluno, sempre na mesma ordem (Performance, Core, LPO). */
export function categoriesOf(plans: TrainingPlan[]): TrainingCategory[] {
  const present = new Set(plans.map(p => p.category));
  return CATEGORY_ORDER.filter(c => present.has(c));
}

/** Plano do mês atual dentro de uma categoria; sem correspondência, o mais recente (a API já ordena). */
export function pickPlan(plans: TrainingPlan[], category: TrainingCategory, currentMonth: number): TrainingPlan | null {
  const inCategory = plans.filter(p => p.category === category);
  return inCategory.find(p => p.month === currentMonth) ?? inCategory[0] ?? null;
}

/** Categoria que abre por padrão: Performance (o plano individual) se existir, senão a primeira disponível. */
export function defaultCategory(plans: TrainingPlan[]): TrainingCategory | null {
  return categoriesOf(plans)[0] ?? null;
}

/**
 * Semana (1..N) em que o plano está hoje. Plano compartilhado tem calendário próprio (conta a
 * partir do `startDate`, uma segunda-feira, igual pra todos); o individual segue a semana do aluno.
 */
export function currentWeekNumber(plan: TrainingPlan, studentCurrentWeek: number, today: Date = new Date()): number {
  const total = Math.max(1, plan.weeks.length);
  if (plan.scope !== 'SHARED') return studentCurrentWeek;

  const start = new Date(plan.startDate);
  const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const week = Math.floor((todayUtc - startUtc) / (7 * DAY_MS)) + 1;
  return Math.min(total, Math.max(1, week));
}

/** Sessões de hoje somando um plano por categoria (o aluno pode ter Performance + Core + LPO no mesmo dia). */
export function todaySessions(
  plans: TrainingPlan[],
  student: { currentMonth: number; currentWeek: number },
  today: Date = new Date(),
): Session[] {
  return categoriesOf(plans).flatMap(category => {
    const plan = pickPlan(plans, category, student.currentMonth);
    if (!plan) return [];
    const weekNumber = currentWeekNumber(plan, student.currentWeek, today);
    const week = plan.weeks.find(w => w.weekNumber === weekNumber) ?? plan.weeks[0];
    const day = week?.days.find(d => d.dayIndex === today.getDay()) ?? week?.days[0];
    return day?.sessions ?? [];
  });
}
