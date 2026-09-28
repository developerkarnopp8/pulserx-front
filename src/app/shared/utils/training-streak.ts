import { PersonalRecord } from '../../core/models';

/** Chave de dia no fuso local (YYYY-MM-DD) — o treino conta no dia em que o aluno o viveu. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export interface StreakResult {
  /** Dias seguidos com pelo menos um treino registrado. */
  days: number;
  /**
   * true quando a sequência chega ao dia mais antigo do histórico carregado e o histórico veio
   * truncado (atingiu o limite) — o número real pode ser maior; a tela mostra "N+".
   */
  atLeast: boolean;
}

/**
 * Sequência de dias consecutivos com treino. Hoje ainda sem treino NÃO quebra a sequência
 * (o dia não acabou): conta a partir de ontem nesse caso.
 */
export function trainingStreak(completedAt: Date[], today: Date, truncated: boolean): StreakResult {
  const days = new Set(completedAt.map(localDayKey));
  if (!days.size) return { days: 0, atLeast: false };

  let cursor = days.has(localDayKey(today)) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(localDayKey(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  const oldest = [...days].sort()[0];
  const reachedOldest = count > 0 && localDayKey(addDays(cursor, 1)) === oldest;
  return { days: count, atLeast: truncated && reachedOldest };
}

export type WeekDayState = 'done' | 'today' | 'missed' | 'future';

export interface WeekDay {
  label: string;
  state: WeekDayState;
}

const WEEK_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

/** Semana corrente (segunda a domingo) com o estado real de cada dia. */
export function currentWeek(completedAt: Date[], today: Date): WeekDay[] {
  const days = new Set(completedAt.map(localDayKey));
  const todayKey = localDayKey(today);
  const offsetFromMonday = (today.getDay() + 6) % 7;
  const monday = addDays(today, -offsetFromMonday);

  return WEEK_LABELS.map((label, i) => {
    const key = localDayKey(addDays(monday, i));
    let state: WeekDayState;
    if (days.has(key)) state = 'done';
    else if (key === todayKey) state = 'today';
    else if (key < todayKey) state = 'missed';
    else state = 'future';
    return { label, state };
  });
}

export interface LatestPr {
  record: PersonalRecord;
  /** Quanto superou a melhor carga anterior do mesmo movimento; null no primeiro registro. */
  deltaKg: number | null;
}

/**
 * Último registro que foi de fato recorde de carga (maior que todas as cargas anteriores do
 * mesmo movimento). Registro só de repetições ou abaixo do melhor não conta como PR.
 */
export function latestLoadPr(records: PersonalRecord[]): LatestPr | null {
  const chronological = records
    .filter(r => r.loadKg != null)
    .sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));

  const best = new Map<string, number>();
  let latest: LatestPr | null = null;
  for (const r of chronological) {
    const load = r.loadKg!;
    const previous = best.get(r.movementId);
    if (previous === undefined || load > previous) {
      latest = { record: r, deltaKg: previous === undefined ? null : Math.round((load - previous) * 100) / 100 };
      best.set(r.movementId, load);
    }
  }
  return latest;
}
