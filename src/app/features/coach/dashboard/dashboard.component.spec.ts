import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';

function build(apiOver: Record<string, unknown> = {}, user: unknown = { id: 'c1' }) {
  const api = {
    getStudents: vi.fn().mockReturnValue(of([
      { id: 's1', name: 'Ana', completionPercent: 80, subscription: { status: 'PAST_DUE' } },
      { id: 's2', name: 'Bruno', completionPercent: 40, subscription: { status: 'ACTIVE' } },
    ])),
    getWeeklyCompletion: vi.fn().mockReturnValue(of([{ dayIndex: 2, percent: 70 }])),
    getCoachAvgDuration: vi.fn().mockReturnValue(of({ overallAvgSeconds: 3600 })),
    getFinancialSummary: vi.fn().mockReturnValue(of({ mrrCents: 912000, totalActive: 10, totalPastDue: 1 })),
    getPendingSkipCounts: vi.fn().mockReturnValue(of([{ studentId: 's2', count: 2 }])),
    getNotifications: vi.fn().mockReturnValue(of([{ id: 'n1', type: 'new_pr', title: 'PR', read: false, createdAt: '2026-10-06' }])),
    ...apiOver,
  };
  const auth = { currentUser: vi.fn().mockReturnValue(user) };
  return { component: new DashboardComponent(api as any, auth as any), api };
}

describe('DashboardComponent (Stitch mo07) — só dado real', () => {
  it('carrega alunos, conclusão, tempo, financeiro, pulos e avisos', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getStudents).toHaveBeenCalledWith('c1');
    expect(component.monthlyAvg()).toBe(60);
    expect(component.weeklyCompletion()[2]).toBe(70);
    expect(component.avgDuration()).toBe(3600);
    expect(component.financial()?.mrrCents).toBe(912000);
    expect(component.pendingSkips()).toBe(2);
    expect(component.attention().map(i => i.student.id)).toEqual(['s2', 's1']);
    expect(component.feed().length).toBe(1);
    expect(component.initials('Ana Souza')).toBe('AS');
  });

  it('falha nos cards extras só esconde o card', () => {
    const fail = vi.fn().mockReturnValue(throwError(() => new Error('x')));
    const { component } = build({ getFinancialSummary: fail, getPendingSkipCounts: fail, getNotifications: fail });
    component.ngOnInit();
    expect(component.financial()).toBeNull();
    expect(component.pendingSkips()).toBe(0);
    expect(component.feed()).toEqual([]);
  });

  it('sem coach logado não carrega nada; sem alunos a média é 0', () => {
    const { component, api } = build({}, null);
    component.ngOnInit();
    expect(api.getStudents).not.toHaveBeenCalled();
    expect(component.monthlyAvg()).toBe(0);
  });
});
