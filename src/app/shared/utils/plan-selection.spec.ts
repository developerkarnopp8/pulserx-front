import { TrainingPlan } from '../../core/models';
import { categoriesOf, currentWeekNumber, defaultCategory, pickPlan, todaySessions, todayWeekLocked } from './plan-selection';

const plan = (over: Partial<TrainingPlan>): TrainingPlan => ({
  id: 'p', studentId: 's1', coachId: 'c1', category: 'PERFORMANCE', scope: 'INDIVIDUAL',
  month: 1, startDate: '2026-10-05', title: 'Plano', published: true, weeks: [], ...over,
});

const week = (weekNumber: number, dayIndex: number, sessionNames: string[]) => ({
  id: `w${weekNumber}`, weekNumber,
  days: [{
    id: `d${weekNumber}`, dayOfWeek: 'x', dayIndex,
    sessions: sessionNames.map((name, i) => ({ id: `${name}${i}`, name, type: 'Core', exercises: [], order: i } as any)),
  }],
});

describe('categoriesOf / defaultCategory', () => {
  it('ordena Performance, Core, LPO e não repete', () => {
    const plans = [plan({ category: 'LPO' }), plan({ category: 'CORE' }), plan({ category: 'CORE' }), plan({ category: 'PERFORMANCE' })];
    expect(categoriesOf(plans)).toEqual(['PERFORMANCE', 'CORE', 'LPO']);
    expect(defaultCategory(plans)).toBe('PERFORMANCE');
  });

  it('sem Performance, abre a primeira disponível; sem planos, null', () => {
    expect(defaultCategory([plan({ category: 'LPO' }), plan({ category: 'CORE' })])).toBe('CORE');
    expect(defaultCategory([])).toBeNull();
    expect(categoriesOf([])).toEqual([]);
  });
});

describe('pickPlan', () => {
  const plans = [
    plan({ id: 'core-2', category: 'CORE', month: 2 }),
    plan({ id: 'core-1', category: 'CORE', month: 1 }),
    plan({ id: 'perf', category: 'PERFORMANCE', month: 1 }),
  ];

  it('prefere o plano do mês atual dentro da categoria', () => {
    expect(pickPlan(plans, 'CORE', 1)?.id).toBe('core-1');
  });

  it('sem plano no mês, usa o primeiro da categoria (o mais recente)', () => {
    expect(pickPlan(plans, 'CORE', 9)?.id).toBe('core-2');
  });

  it('categoria inexistente → null (não cai em plano de outra categoria)', () => {
    expect(pickPlan(plans, 'LPO', 1)).toBeNull();
  });
});

describe('currentWeekNumber', () => {
  const shared = plan({ scope: 'SHARED', category: 'CORE', studentId: null, startDate: '2026-10-05T00:00:00.000Z', weeks: [1, 2, 3, 4].map(n => week(n, 1, [])) });

  it('plano individual segue a semana do aluno', () => {
    expect(currentWeekNumber(plan({}), 3, new Date(2026, 9, 6))).toBe(3);
  });

  it('plano compartilhado conta a partir do startDate, independente da semana do aluno', () => {
    expect(currentWeekNumber(shared, 4, new Date(2026, 9, 5))).toBe(1);   // segunda da semana 1
    expect(currentWeekNumber(shared, 4, new Date(2026, 9, 11))).toBe(1);  // domingo ainda semana 1
    expect(currentWeekNumber(shared, 1, new Date(2026, 9, 12))).toBe(2);  // segunda seguinte
    expect(currentWeekNumber(shared, 1, new Date(2026, 9, 26))).toBe(4);
  });

  it('limita a 1..N: antes do início é 1, depois do fim é a última semana', () => {
    expect(currentWeekNumber(shared, 1, new Date(2026, 8, 1))).toBe(1);
    expect(currentWeekNumber(shared, 1, new Date(2027, 0, 1))).toBe(4);
  });

  it('plano compartilhado sem semanas não estoura (mínimo 1)', () => {
    expect(currentWeekNumber(plan({ scope: 'SHARED', startDate: '2026-10-05T00:00:00.000Z', weeks: [] }), 1, new Date(2027, 0, 1))).toBe(1);
  });
});

describe('todaySessions', () => {
  const today = new Date(2026, 9, 6); // terça (dayIndex 2)
  const student = { currentMonth: 1, currentWeek: 2 };

  it('soma as sessões de hoje de cada categoria, cada uma na sua semana', () => {
    const plans = [
      plan({ id: 'perf', category: 'PERFORMANCE', weeks: [week(1, 2, ['fora']), week(2, 2, ['Força'])] }),
      plan({ id: 'core', category: 'CORE', scope: 'SHARED', studentId: null, startDate: '2026-10-05T00:00:00.000Z', weeks: [week(1, 2, ['Prancha']), week(2, 2, ['x'])] }),
    ];
    expect(todaySessions(plans, student, today).map(s => s.name)).toEqual(['Força', 'Prancha']);
  });

  it('sem planos → nenhuma sessão', () => {
    expect(todaySessions([], student, today)).toEqual([]);
  });

  it('dia sem sessão cai no primeiro dia da semana (comportamento anterior)', () => {
    const plans = [plan({ weeks: [week(2, 5, ['Sexta'])] })];
    expect(todaySessions(plans, student, today).map(s => s.name)).toEqual(['Sexta']);
  });
});

describe('todayWeekLocked — Free (amostra)', () => {
  const today = new Date(2026, 9, 6);
  const student = { currentMonth: 1, currentWeek: 2 };

  it('semana de hoje bloqueada em alguma categoria → true; liberada ou sem plano → false', () => {
    const bloqueada = [plan({ category: 'CORE', weeks: [week(1, 2, ['a']), { ...week(2, 2, []), days: [], locked: true }] })];
    expect(todayWeekLocked(bloqueada, student, today)).toBe(true);
    const liberada = [plan({ category: 'CORE', weeks: [week(1, 2, ['a']), week(2, 2, ['b'])] })];
    expect(todayWeekLocked(liberada, student, today)).toBe(false);
    expect(todayWeekLocked([], student, today)).toBe(false);
  });

  it('sem informar "hoje": usa a data atual', () => {
    expect(todayWeekLocked([], student)).toBe(false);
  });
});
