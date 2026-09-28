import { currentWeek, latestLoadPr, localDayKey, trainingStreak } from './training-streak';
import { PersonalRecord } from '../../core/models';

// Quinta-feira, 24/09/2026, 10h (horário local)
const TODAY = new Date(2026, 8, 24, 10, 0, 0);
const day = (d: number, h = 8) => new Date(2026, 8, d, h, 0, 0);

describe('localDayKey', () => {
  it('usa o dia local com zero à esquerda', () => {
    expect(localDayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('trainingStreak', () => {
  it('sem treino nenhum: 0', () => {
    expect(trainingStreak([], TODAY, false)).toEqual({ days: 0, atLeast: false });
  });

  it('conta dias seguidos terminando hoje; vários treinos no mesmo dia contam 1', () => {
    const logs = [day(24), day(24, 18), day(23), day(22), day(20)];
    expect(trainingStreak(logs, TODAY, false)).toEqual({ days: 3, atLeast: false });
  });

  it('hoje ainda sem treino não quebra: conta a partir de ontem', () => {
    expect(trainingStreak([day(23), day(22)], TODAY, false).days).toBe(2);
  });

  it('último treino anteontem: sequência zerada', () => {
    expect(trainingStreak([day(22), day(21)], TODAY, false).days).toBe(0);
  });

  it('atravessa virada de mês', () => {
    const logs = [new Date(2026, 9, 1, 8), new Date(2026, 8, 30, 8), new Date(2026, 8, 29, 8)];
    expect(trainingStreak(logs, new Date(2026, 9, 1, 20), false).days).toBe(3);
  });

  it('histórico truncado e a sequência chega ao dia mais antigo carregado: marca "no mínimo"', () => {
    expect(trainingStreak([day(24), day(23)], TODAY, true)).toEqual({ days: 2, atLeast: true });
  });

  it('histórico truncado mas a sequência quebrou antes do mais antigo: número exato', () => {
    expect(trainingStreak([day(24), day(23), day(20)], TODAY, true)).toEqual({ days: 2, atLeast: false });
  });

  it('histórico não truncado nunca marca "no mínimo"', () => {
    expect(trainingStreak([day(24), day(23)], TODAY, false).atLeast).toBe(false);
  });
});

describe('currentWeek', () => {
  it('segunda a domingo com feito / perdido / hoje / futuro', () => {
    // seg 21 feito, ter 22 perdido, qua 23 feito, qui 24 = hoje sem treino
    const week = currentWeek([day(21), day(23)], TODAY);
    expect(week.map(d => d.label)).toEqual(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM']);
    expect(week.map(d => d.state)).toEqual(['done', 'missed', 'done', 'today', 'future', 'future', 'future']);
  });

  it('hoje com treino aparece como feito', () => {
    expect(currentWeek([day(24)], TODAY)[3].state).toBe('done');
  });

  it('domingo é o último dia da semana (não o primeiro)', () => {
    const sunday = new Date(2026, 8, 27, 10);
    const week = currentWeek([], sunday);
    expect(week[6].state).toBe('today');
    expect(week[0].state).toBe('missed');
  });
});

const pr = (over: Partial<PersonalRecord>): PersonalRecord => ({
  id: 'r', athleteId: 'a', movementId: 'snatch', loadKg: 80, reps: 1,
  achievedAt: '2026-09-01T10:00:00.000Z', movement: { id: 'snatch', name: 'Snatch' } as any,
  ...over,
});

describe('latestLoadPr', () => {
  it('sem registros de carga: null', () => {
    expect(latestLoadPr([])).toBeNull();
    expect(latestLoadPr([pr({ loadKg: undefined, reps: 20 })])).toBeNull();
  });

  it('primeiro registro do movimento é PR sem diferença', () => {
    const r = pr({ id: 'r1' });
    expect(latestLoadPr([r])).toEqual({ record: r, deltaKg: null });
  });

  it('último PR de verdade com a diferença pra melhor anterior (ignora registro abaixo do melhor)', () => {
    const list = [
      pr({ id: 'r3', loadKg: 78, achievedAt: '2026-09-20T10:00:00.000Z' }), // abaixo do melhor: não é PR
      pr({ id: 'r2', loadKg: 84, achievedAt: '2026-09-10T10:00:00.000Z' }),
      pr({ id: 'r1', loadKg: 80, achievedAt: '2026-09-01T10:00:00.000Z' }),
    ];
    const result = latestLoadPr(list);
    expect(result?.record.id).toBe('r2');
    expect(result?.deltaKg).toBe(4);
  });

  it('igualar o melhor não é PR', () => {
    const list = [
      pr({ id: 'r1', loadKg: 80, achievedAt: '2026-09-01T10:00:00.000Z' }),
      pr({ id: 'r2', loadKg: 80, achievedAt: '2026-09-05T10:00:00.000Z' }),
    ];
    expect(latestLoadPr(list)?.record.id).toBe('r1');
  });

  it('compara só dentro do mesmo movimento e pega o PR mais recente entre movimentos', () => {
    const list = [
      pr({ id: 's1', movementId: 'snatch', loadKg: 80, achievedAt: '2026-09-01T10:00:00.000Z' }),
      pr({ id: 'q1', movementId: 'squat', loadKg: 120, achievedAt: '2026-09-02T10:00:00.000Z' }),
      pr({ id: 's2', movementId: 'snatch', loadKg: 82.5, achievedAt: '2026-09-03T10:00:00.000Z' }),
    ];
    expect(latestLoadPr(list)).toEqual({ record: list[2], deltaKg: 2.5 });
  });

  it('diferença sem ruído de ponto flutuante', () => {
    const list = [
      pr({ id: 'r1', loadKg: 0.1, achievedAt: '2026-09-01T10:00:00.000Z' }),
      pr({ id: 'r2', loadKg: 0.3, achievedAt: '2026-09-02T10:00:00.000Z' }),
    ];
    expect(latestLoadPr(list)?.deltaKg).toBe(0.2);
  });
});
