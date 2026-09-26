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
