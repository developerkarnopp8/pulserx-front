import { calcStreak, calcMonthCompletion, buildHistoryCalendar, historyMonthName } from './workout-history-calendar';

const log = (y: number, m: number, d: number) => ({ completedAt: new Date(y, m, d) });

describe('calcStreak', () => {
  it('0 quando não há logs', () => {
    expect(calcStreak([], new Date(2026, 2, 10))).toBe(0);
  });

  it('conta dias seguidos terminando hoje', () => {
    const today = new Date(2026, 2, 10);
    const logs = [log(2026, 2, 10), log(2026, 2, 9), log(2026, 2, 8)];
    expect(calcStreak(logs, today)).toBe(3);
  });

  it('quebra a contagem no primeiro dia sem log', () => {
    const today = new Date(2026, 2, 10);
    const logs = [log(2026, 2, 10), log(2026, 2, 8)]; // falta o dia 9 — streak para em 1
    expect(calcStreak(logs, today)).toBe(1);
  });

  it('0 quando hoje não tem log, mesmo com dias anteriores completos', () => {
    const today = new Date(2026, 2, 10);
    const logs = [log(2026, 2, 9), log(2026, 2, 8)];
    expect(calcStreak(logs, today)).toBe(0);
  });

  it('streak atravessa virada de mês corretamente', () => {
    const today = new Date(2026, 2, 1); // 1º de março
    const logs = [log(2026, 2, 1), log(2026, 1, 28)]; // 1/mar + 28/fev
    expect(calcStreak(logs, today)).toBe(2);
  });
});

describe('calcMonthCompletion', () => {
  it('0% no primeiro dia do mês sem log', () => {
    expect(calcMonthCompletion([], new Date(2026, 2, 1))).toBe(0);
  });

  it('calcula % de dias com log sobre dias já passados no mês', () => {
    const today = new Date(2026, 2, 10); // dia 10 do mês
    const logs = [log(2026, 2, 1), log(2026, 2, 2), log(2026, 2, 3), log(2026, 2, 4), log(2026, 2, 5)];
    expect(calcMonthCompletion(logs, today)).toBe(50); // 5/10
  });

  it('ignora logs de outro mês/ano', () => {
    const today = new Date(2026, 2, 10);
    const logs = [log(2026, 1, 9), log(2025, 2, 9)];
    expect(calcMonthCompletion(logs, today)).toBe(0);
  });

  it('não conta duas vezes o mesmo dia (múltiplos treinos no mesmo dia)', () => {
    const today = new Date(2026, 2, 2);
    const logs = [log(2026, 2, 1), log(2026, 2, 1)];
    expect(calcMonthCompletion(logs, today)).toBe(50); // 1 dia distinto / 2 dias passados
  });
});

describe('buildHistoryCalendar', () => {
  it('marca dias passados como hasWorkout e futuros como não', () => {
    const today = new Date(2026, 1, 10); // fevereiro (28 dias em 2026, não bissexto)
    const calendar = buildHistoryCalendar([], today);
    expect(calendar).toHaveLength(28);
    expect(calendar[9]).toEqual({ date: 10, completed: false, hasWorkout: true }); // hoje
    expect(calendar[10]).toEqual({ date: 11, completed: false, hasWorkout: false }); // amanhã
  });

  it('marca completed nos dias com log', () => {
    const today = new Date(2026, 1, 10);
    const calendar = buildHistoryCalendar([log(2026, 1, 5)], today);
    expect(calendar[4]).toEqual({ date: 5, completed: true, hasWorkout: true });
  });

  it('ignora log de outro mês', () => {
    const today = new Date(2026, 1, 10);
    const calendar = buildHistoryCalendar([log(2026, 0, 5)], today);
    expect(calendar[4].completed).toBe(false);
  });
});

describe('historyMonthName', () => {
  it('formata mês e ano em português', () => {
    expect(historyMonthName(new Date(2026, 2, 15))).toContain('2026');
    expect(historyMonthName(new Date(2026, 2, 15)).toLowerCase()).toContain('março');
  });
});
