import { PersonalRecord } from '../../core/models';
import { localDayKey } from './training-streak';

export interface WeekTraining {
  /** Segunda-feira da semana (00:00 local). */
  weekStart: Date;
  /** Rótulo curto "dd/MM" da segunda-feira. */
  label: string;
  /** Dias distintos com pelo menos um treino registrado na semana (0–7). */
  days: number;
}

function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * Dias treinados por semana (segunda a domingo) nas últimas `weeks` semanas, da mais antiga
 * pra atual. Conta DIAS, não exercícios: 10 exercícios num dia = 1 dia treinado.
 */
export function weeklyTrainingDays(completedAt: Date[], today: Date, weeks = 8): WeekTraining[] {
  const daysByWeek = new Map<string, Set<string>>();
  for (const date of completedAt) {
    const weekKey = localDayKey(mondayOf(date));
    const set = daysByWeek.get(weekKey) ?? new Set<string>();
    set.add(localDayKey(date));
    daysByWeek.set(weekKey, set);
  }

  const currentMonday = mondayOf(today);
  const result: WeekTraining[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentMonday);
    weekStart.setDate(currentMonday.getDate() - i * 7);
    const dd = String(weekStart.getDate()).padStart(2, '0');
    const mm = String(weekStart.getMonth() + 1).padStart(2, '0');
    result.push({
      weekStart,
      label: `${dd}/${mm}`,
      days: daysByWeek.get(localDayKey(weekStart))?.size ?? 0,
    });
  }
  return result;
}

export interface PrPoint {
  achievedAt: string;
  loadKg: number;
}

export interface PrProgression {
  movementId: string;
  movementName: string;
  category: string;
  /** Só os registros que bateram o melhor anterior (a "escada" de PRs), em ordem cronológica. */
  points: PrPoint[];
  bestKg: number;
  firstKg: number;
  /** Ganho do primeiro PR ao atual (0 quando só há um). */
  gainKg: number;
  lastPrAt: string;
}

/**
 * Evolução de carga por movimento a partir do histórico de registros do atleta. Registro que
 * não superou o melhor anterior não entra (não é PR). Ordena pelo PR mais recente primeiro.
 */
export function prProgressions(records: PersonalRecord[]): PrProgression[] {
  const byMovement = new Map<string, PersonalRecord[]>();
  for (const r of records) {
    if (r.loadKg == null || r.loadKg <= 0) continue;
    const list = byMovement.get(r.movementId) ?? [];
    list.push(r);
    byMovement.set(r.movementId, list);
  }

  const result: PrProgression[] = [];
  for (const [movementId, list] of byMovement) {
    const sorted = [...list].sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));
    const points: PrPoint[] = [];
    for (const r of sorted) {
      const best = points.at(-1)?.loadKg ?? 0;
      if (r.loadKg! > best) points.push({ achievedAt: r.achievedAt, loadKg: r.loadKg! });
    }
    const first = points[0];
    const last = points.at(-1)!;
    result.push({
      movementId,
      movementName: sorted[0].movement.name,
      category: sorted[0].movement.category,
      points,
      bestKg: last.loadKg,
      firstKg: first.loadKg,
      gainKg: Math.round((last.loadKg - first.loadKg) * 100) / 100,
      lastPrAt: last.achievedAt,
    });
  }
  return result.sort((a, b) => b.lastPrAt.localeCompare(a.lastPrAt));
}

/**
 * Pontos de uma linha simples (sparkline) num quadro `width`×`height`, com `pad` de respiro.
 * Um ponto só fica no meio; valores iguais ficam numa linha horizontal no meio.
 */
export function sparklinePoints(values: number[], width: number, height: number, pad = 4): { x: number; y: number }[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  return values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : pad + (innerW * i) / (values.length - 1),
    y: span === 0 ? height / 2 : pad + innerH - ((v - min) / span) * innerH,
  }));
}
