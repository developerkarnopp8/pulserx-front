import { Exercise, Session, TrainingPlan } from '../../core/models';
import {
  SESSION_TYPE_ICON, SESSION_TYPE_LABEL, coachNoteOf, exerciseSummary, goalPercent, longDate, planDayDate, planPosition,
  restLabel, sessionPreview, sessionStats,
} from './home-view';

const ex = (over: Partial<Exercise> = {}): Exercise => ({ id: 'e', name: 'Back Squat', completed: false, status: 'none', ...over });
const session = (exercises: Exercise[]): Session => ({ id: 's', name: 'Força', type: 'Strength', order: 1, exercises, status: 'none' });

describe('home-view — textos do Início', () => {
  it('todo tipo de sessão tem rótulo e ícone', () => {
    expect(Object.keys(SESSION_TYPE_LABEL)).toEqual(Object.keys(SESSION_TYPE_ICON));
    expect(SESSION_TYPE_LABEL.Strength).toBe('Força');
    expect(SESSION_TYPE_LABEL.Mobility).toBe('Mobilidade');
  });

  it('resumo do exercício usa só o que o coach preencheu', () => {
    expect(exerciseSummary(ex({ sets: 5, reps: 5, loadPercent: 75 }))).toBe('Back Squat 5x5 @ 75%');
    expect(exerciseSummary(ex({ reps: '21-15-9' }))).toBe('Back Squat 21-15-9');
    expect(exerciseSummary(ex({ duration: '10 min' }))).toBe('Back Squat 10 min');
    expect(exerciseSummary(ex())).toBe('Back Squat');
    expect(exerciseSummary(ex({ sets: 3, reps: null, loadPercent: null }))).toBe('Back Squat');
  });

  it('prévia mostra os primeiros exercícios e quantos faltam', () => {
    const s = session([ex({ name: 'A' }), ex({ name: 'B' }), ex({ name: 'C' }), ex({ name: 'D' })]);
    expect(sessionPreview(s)).toBe('A → B → +2');
    expect(sessionPreview(session([ex({ name: 'A' })]))).toBe('A');
    expect(sessionPreview(session([]))).toBe('');
  });

  it('recado do coach = primeira observação não vazia', () => {
    expect(coachNoteOf(session([ex({ coachNotes: '  ' }), ex({ coachNotes: ' Segure a pegada. ' })]))).toBe('Segure a pegada.');
    expect(coachNoteOf(session([ex()]))).toBeNull();
    expect(coachNoteOf(null)).toBeNull();
  });

  it('posição no plano: plano principal, mês do plano e semana de hoje', () => {
    const plan = (over: Partial<TrainingPlan>): TrainingPlan => ({
      id: 'p', studentId: 's', category: 'PERFORMANCE', scope: 'INDIVIDUAL', coachId: 'c', month: 2,
      startDate: '2026-09-07', title: 'P', published: true, weeks: [], ...over,
    });
    expect(planPosition([], { currentMonth: 1, currentWeek: 1 })).toBeNull();
    expect(planPosition([plan({ category: 'CORE', month: 1 }), plan({ month: 2 })], { currentMonth: 2, currentWeek: 3 }))
      .toEqual({ category: 'PERFORMANCE', month: 2, week: 3 });
  });

  it('percentual da meta fica entre 0 e 100', () => {
    expect(goalPercent(1500, 3000)).toBe(50);
    expect(goalPercent(4000, 3000)).toBe(100);
    expect(goalPercent(0, 3000)).toBe(0);
    expect(goalPercent(100, 0)).toBe(0);
  });

  it('data por extenso com a primeira letra maiúscula', () => {
    expect(longDate(new Date(2026, 9, 6))).toBe('Terça-feira, 6 de outubro');
  });
});

describe('home-view — números da sessão e datas do plano', () => {
  it('estatísticas só da prescrição', () => {
    const s = session([
      ex({ sets: 3, loadPercent: 60, restSeconds: 60 }),
      ex({ sets: 5, loadPercent: 80, restSeconds: 120 }),
      ex({ sets: null }),
    ]);
    expect(sessionStats(s)).toEqual({ exercises: 3, totalSets: 8, maxLoadPercent: 80, rest: { min: 60, max: 120 } });
    expect(sessionStats(session([ex()]))).toEqual({ exercises: 1, totalSets: 0, maxLoadPercent: null, rest: null });
  });

  it('rótulo do descanso', () => {
    expect(restLabel({ min: 90, max: 90 })).toBe('90 s');
    expect(restLabel({ min: 60, max: 120 })).toBe('1 min–2 min');
    expect(restLabel({ min: 45, max: 90 })).toBe('45 s–90 s');
  });

  it('data do dia: compartilhado pelo calendário do plano; individual só na semana de hoje', () => {
    const shared = { scope: 'SHARED', startDate: '2026-10-05T00:00:00.000Z' } as TrainingPlan;
    expect(planDayDate(shared, 1, 1, 1)?.toDateString()).toBe(new Date(2026, 9, 5).toDateString());
    expect(planDayDate(shared, 2, 0, 1)?.toDateString()).toBe(new Date(2026, 9, 18).toDateString());
    const ind = { scope: 'INDIVIDUAL', startDate: '2026-01-01' } as TrainingPlan;
    const terca = new Date(2026, 9, 6, 15);
    expect(planDayDate(ind, 3, 4, 3, terca)?.toDateString()).toBe(new Date(2026, 9, 8).toDateString());
    expect(planDayDate(ind, 3, 1, 3, terca)?.toDateString()).toBe(new Date(2026, 9, 5).toDateString());
    expect(planDayDate(ind, 2, 1, 3, terca)).toBeNull();
  });
});
