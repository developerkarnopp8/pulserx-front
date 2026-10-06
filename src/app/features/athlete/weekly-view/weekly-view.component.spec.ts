import { of } from 'rxjs';
import { WeeklyViewComponent } from './weekly-view.component';
import { TrainingPlan } from '../../../core/models';

const plan = (over: Partial<TrainingPlan>): TrainingPlan => ({
  id: 'p', studentId: 's1', coachId: 'c1', category: 'PERFORMANCE', scope: 'INDIVIDUAL',
  month: 1, startDate: '2026-10-05', title: 'Plano', published: true,
  weeks: [{ id: 'w1', weekNumber: 1, days: [{ id: 'd1', dayOfWeek: 'Segunda', dayIndex: 1, sessions: [] }] }],
  ...over,
});

function build(plans: TrainingPlan[]) {
  const api = {
    getMyStudentProfile: vi.fn().mockReturnValue(of({ id: 's1', currentMonth: 1, currentWeek: 1 })),
    getPlansByStudent: vi.fn().mockReturnValue(of(plans)),
    getWorkoutHistory: vi.fn().mockReturnValue(of([])),
  };
  const component = new WeeklyViewComponent(api as any, { currentUser: () => ({ name: 'Aluno' }) } as any);
  component.ngOnInit();
  return { component, api };
}

describe('WeeklyViewComponent — categorias', () => {
  it('abre em Performance quando existe e lista as categorias na ordem fixa', () => {
    const { component } = build([
      plan({ id: 'lpo', category: 'LPO', scope: 'SHARED', studentId: null }),
      plan({ id: 'perf' }),
      plan({ id: 'core', category: 'CORE', scope: 'SHARED', studentId: null }),
    ]);
    expect(component.categories()).toEqual(['PERFORMANCE', 'CORE', 'LPO']);
    expect(component.selectedCategory()).toBe('PERFORMANCE');
    expect(component.plan()?.id).toBe('perf');
  });

  it('só com plano compartilhado (sem individual), abre o primeiro disponível', () => {
    const { component } = build([plan({ id: 'core', category: 'CORE', scope: 'SHARED', studentId: null })]);
    expect(component.selectedCategory()).toBe('CORE');
    expect(component.plan()?.id).toBe('core');
  });

  it('trocar de categoria troca o plano e o calendário só mostra planos daquela categoria', () => {
    const { component } = build([
      plan({ id: 'perf' }),
      plan({ id: 'core', category: 'CORE', scope: 'SHARED', studentId: null }),
    ]);

    component.selectCategory('CORE');

    expect(component.plan()?.id).toBe('core');
    expect(component.plansOfCategory().map(p => p.id)).toEqual(['core']);
  });

  it('sem planos não abre nada e não quebra', () => {
    const { component } = build([]);
    expect(component.plan()).toBeNull();
    expect(component.categories()).toEqual([]);
  });

  it('categoria sem plano é ignorada (não troca a tela)', () => {
    const { component } = build([plan({ id: 'perf' })]);
    component.selectCategory('LPO');
    expect(component.selectedCategory()).toBe('PERFORMANCE');
    expect(component.plan()?.id).toBe('perf');
  });
});

describe('WeeklyViewComponent — visual novo (Stitch mo04)', () => {
  const sess = (id: string, status: string) => ({ id, name: id, type: 'LPO', order: 1, status, exercises: [] });

  it('dia X de N, sessões feitas e próxima pendente do dia aberto', () => {
    const { component } = build([plan({
      weeks: [{ id: 'w1', weekNumber: 1, days: [
        { id: 'd1', dayOfWeek: 'Segunda', dayIndex: 1, sessions: [] },
        { id: 'd2', dayOfWeek: 'Terça', dayIndex: 2, sessions: [sess('a', 'done'), sess('b', 'none'), sess('c', 'none')] as any },
      ] }],
    })]);
    component.selectDay(component.week()!.days[1]);
    expect(component.dayPosition()).toEqual({ index: 2, total: 2 });
    expect(component.doneCount()).toBe(1);
    expect(component.nextSessionId()).toBe('b');
    component.selectedDay.set(null);
    expect(component.dayPosition()).toBeNull();
    expect(component.nextSessionId()).toBeNull();
    expect(component.categoryIcon.PERFORMANCE).toBe('bolt');
  });

  it('data do dia: compartilhado mostra a data; individual fora da semana de hoje mostra só o nome', () => {
    const shared = build([plan({ category: 'CORE', scope: 'SHARED', studentId: null, startDate: '2026-10-05T00:00:00.000Z' })]).component;
    const segunda = shared.week()!.days[0];
    expect(shared.dayDate(segunda)?.toDateString()).toBe(new Date(2026, 9, 5).toDateString());
    expect(shared.dayTitle(segunda)).toBe('Segunda-feira, 5 de outubro');

    const ind = build([plan({ weeks: [{ id: 'w2', weekNumber: 2, days: [{ id: 'd1', dayOfWeek: 'Segunda', dayIndex: 1, sessions: [] }] }] })]).component;
    expect(ind.dayDate(ind.week()!.days[0])).toBeNull();
    expect(ind.dayTitle(ind.week()!.days[0])).toBe('Segunda');

    const vazio = new WeeklyViewComponent({} as any, {} as any);
    expect(vazio.dayDate({ id: 'x', dayOfWeek: 'Segunda', dayIndex: 1, sessions: [] })).toBeNull();
  });
});
