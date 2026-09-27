import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { StudentsComponent } from './students.component';
import { Student, SubscriptionPlan, Subscription } from '../../../core/models';

/** Cobre só a atribuição de assinatura ao aluno (o resto do componente já existia antes da R3). */

const student: Student = {
  id: 's1', name: 'Ana', email: 'ana@example.com', goal: 'Força', currentMonth: 1, currentWeek: 1, coachId: 'coach-1',
};

const plan = (over: Partial<SubscriptionPlan> = {}): SubscriptionPlan => ({
  id: 'p1', coachId: 'coach-1', name: 'Core', description: null, priceCents: 14900,
  categories: ['CORE'], isFree: false, freeConfig: null, active: true, ...over,
});

const subscription = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'sub1', studentId: 's1', status: 'ACTIVE', startedAt: '2026-09-01T00:00:00.000Z',
  renewsAt: null, canceledAt: null, trialEndsAt: null,
  plan: { id: 'p1', name: 'Core', priceCents: 14900, categories: ['CORE'], isFree: false },
  ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getStudents: vi.fn().mockReturnValue(of([])),
    getPendingSkipCounts: vi.fn().mockReturnValue(of([])),
    getCoachAvgDuration: vi.fn().mockReturnValue(of({ byStudent: [] })),
    getSubscriptionPlans: vi.fn().mockReturnValue(of([plan()])),
    getStudentSubscription: vi.fn().mockReturnValue(of(null)),
    assignSubscription: vi.fn().mockReturnValue(of(subscription())),
    removeSubscription: vi.fn().mockReturnValue(of({ removed: true })),
    ...apiOver,
  };
  const auth = { currentUser: () => ({ id: 'coach-1' }) };
  const component = new StudentsComponent(api as any, auth as any, new FormBuilder());
  return { component, api };
}

describe('StudentsComponent — atribuir assinatura', () => {
  it('abre o modal, carrega o catálogo (uma vez) e a assinatura atual do aluno', () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);

    expect(component.showSubscriptionModal()).toBe(true);
    expect(component.subscriptionTarget()).toEqual(student);
    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(1);
    expect(api.getStudentSubscription).toHaveBeenCalledWith('s1');
    expect(component.loadingSubscription()).toBe(false);
    expect(component.selectedPlanId()).toBe('');
  });

  it('aluno já com assinatura: pré-seleciona o plano atual', () => {
    const { component } = build({ getStudentSubscription: vi.fn().mockReturnValue(of(subscription())) });
    component.openSubscriptionModal(student);
    expect(component.currentSubscription()?.plan.name).toBe('Core');
    expect(component.selectedPlanId()).toBe('p1');
  });

  it('reabrir o modal para outro aluno NÃO recarrega o catálogo de novo', () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);
    component.openSubscriptionModal({ ...student, id: 's2' });
    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(1);
    expect(api.getStudentSubscription).toHaveBeenLastCalledWith('s2');
  });

  it('erro ao carregar a assinatura mostra mensagem', () => {
    const { component } = build({ getStudentSubscription: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.openSubscriptionModal(student);
    expect(component.subscriptionError()).toContain('Não foi possível carregar');
    expect(component.loadingSubscription()).toBe(false);
  });

  it('assignPlan sem plano selecionado não chama a API', () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);
    component.assignPlan();
    expect(api.assignSubscription).not.toHaveBeenCalled();
  });

  it('assignPlan atribui o plano selecionado e atualiza a assinatura exibida', () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);
    component.selectedPlanId.set('p1');

    component.assignPlan();

    expect(api.assignSubscription).toHaveBeenCalledWith('s1', { planId: 'p1' });
    expect(component.currentSubscription()?.id).toBe('sub1');
    expect(component.assigning()).toBe(false);
  });

  it('erro do backend (ex.: plano de outro coach) aparece na mensagem', () => {
    const { component } = build({
      assignSubscription: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Plano não encontrado' } }))),
    });
    component.openSubscriptionModal(student);
    component.selectedPlanId.set('p1');

    component.assignPlan();

    expect(component.subscriptionError()).toBe('Plano não encontrado');
    expect(component.assigning()).toBe(false);
  });

  it('removePlan pede confirmação; cancelando não chama a API', () => {
    const { component, api } = build();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.openSubscriptionModal(student);

    component.removePlan();

    expect(api.removeSubscription).not.toHaveBeenCalled();
  });

  it('removePlan confirmado remove a assinatura e limpa a seleção', () => {
    const { component, api } = build();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.openSubscriptionModal(student);
    component.currentSubscription.set(subscription());
    component.selectedPlanId.set('p1');

    component.removePlan();

    expect(api.removeSubscription).toHaveBeenCalledWith('s1');
    expect(component.currentSubscription()).toBeNull();
    expect(component.selectedPlanId()).toBe('');
  });

  it('closeSubscriptionModal limpa o alvo', () => {
    const { component } = build();
    component.openSubscriptionModal(student);
    component.closeSubscriptionModal();
    expect(component.showSubscriptionModal()).toBe(false);
    expect(component.subscriptionTarget()).toBeNull();
  });
});
