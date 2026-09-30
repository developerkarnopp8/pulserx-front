import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { StudentsComponent } from './students.component';
import { Student, SubscriptionPlan, Subscription } from '../../../core/models';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

afterEach(() => vi.restoreAllMocks());

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
    unlinkStudent: vi.fn().mockReturnValue(of({ unlinked: true })),
    sendStudentPasswordReset: vi.fn().mockReturnValue(of({ sent: true })),
    ...apiOver,
  };
  const auth = { currentUser: () => ({ id: 'coach-1' }) };
  const component = new StudentsComponent(api as any, auth as any, new FormBuilder());
  return { component, api };
}

describe('StudentsComponent — atribuir assinatura', () => {
  it('abre o modal, carrega o catálogo (uma vez) e a assinatura atual do aluno', async () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);

    expect(component.showSubscriptionModal()).toBe(true);
    expect(component.subscriptionTarget()).toEqual(student);
    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(1);
    expect(api.getStudentSubscription).toHaveBeenCalledWith('s1');
    expect(component.loadingSubscription()).toBe(false);
    expect(component.selectedPlanId()).toBe('');
  });

  it('aluno já com assinatura: pré-seleciona o plano atual', async () => {
    const { component } = build({ getStudentSubscription: vi.fn().mockReturnValue(of(subscription())) });
    component.openSubscriptionModal(student);
    expect(component.currentSubscription()?.plan.name).toBe('Core');
    expect(component.selectedPlanId()).toBe('p1');
  });

  it('reabrir o modal para outro aluno NÃO recarrega o catálogo de novo', async () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);
    component.openSubscriptionModal({ ...student, id: 's2' });
    expect(api.getSubscriptionPlans).toHaveBeenCalledTimes(1);
    expect(api.getStudentSubscription).toHaveBeenLastCalledWith('s2');
  });

  it('erro ao carregar a assinatura mostra mensagem', async () => {
    const { component } = build({ getStudentSubscription: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.openSubscriptionModal(student);
    expect(component.subscriptionError()).toContain('Não foi possível carregar');
    expect(component.loadingSubscription()).toBe(false);
  });

  it('assignPlan sem plano selecionado não chama a API', async () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);
    component.assignPlan();
    expect(api.assignSubscription).not.toHaveBeenCalled();
  });

  it('assignPlan atribui o plano selecionado e atualiza a assinatura exibida', async () => {
    const { component, api } = build();
    component.openSubscriptionModal(student);
    component.selectedPlanId.set('p1');

    component.assignPlan();

    expect(api.assignSubscription).toHaveBeenCalledWith('s1', { planId: 'p1' });
    expect(component.currentSubscription()?.id).toBe('sub1');
    expect(component.assigning()).toBe(false);
  });

  it('erro do backend (ex.: plano de outro coach) aparece na mensagem', async () => {
    const { component } = build({
      assignSubscription: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Plano não encontrado' } }))),
    });
    component.openSubscriptionModal(student);
    component.selectedPlanId.set('p1');

    component.assignPlan();

    expect(component.subscriptionError()).toBe('Plano não encontrado');
    expect(component.assigning()).toBe(false);
  });

  it('removePlan pede confirmação; cancelando não chama a API', async () => {
    const { component, api } = build();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    component.openSubscriptionModal(student);

    await component.removePlan();

    expect(api.removeSubscription).not.toHaveBeenCalled();
  });

  it('removePlan confirmado remove a assinatura e limpa a seleção', async () => {
    const { component, api } = build();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    component.openSubscriptionModal(student);
    component.currentSubscription.set(subscription());
    component.selectedPlanId.set('p1');

    await component.removePlan();

    expect(api.removeSubscription).toHaveBeenCalledWith('s1');
    expect(component.currentSubscription()).toBeNull();
    expect(component.selectedPlanId()).toBe('');
  });

  it('closeSubscriptionModal limpa o alvo', async () => {
    const { component } = build();
    component.openSubscriptionModal(student);
    component.closeSubscriptionModal();
    expect(component.showSubscriptionModal()).toBe(false);
    expect(component.subscriptionTarget()).toBeNull();
  });
});

describe('StudentsComponent — desvincular aluno', () => {
  afterEach(() => vi.restoreAllMocks());

  it('pede confirmação explicando o que acontece; sem confirmar, nada muda', async () => {
    const { component, api } = build({ unlinkStudent: vi.fn() });
    const confirmSpy = vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    await component.unlinkStudent(student);
    expect(confirmSpy.mock.lastCall?.[0].message).toContain('não são apagados');
    expect(api.unlinkStudent).not.toHaveBeenCalled();
  });

  it('confirmado: desvincula e tira da lista', async () => {
    const { component, api } = build({ unlinkStudent: vi.fn().mockReturnValue(of({ unlinked: true })) });
    component.students.set([student]);
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.unlinkStudent(student);
    expect(api.unlinkStudent).toHaveBeenCalledWith('s1');
    expect(component.students()).toEqual([]);
    expect(component.deleting()).toBeNull();
  });

  it('erro (ex.: Asaas recusou cancelar a cobrança): mostra a mensagem e o aluno continua na lista', async () => {
    const { component } = build({
      unlinkStudent: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Asaas indisponível' } }))),
    });
    component.students.set([student]);
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.unlinkStudent(student);
    expect(component.listErrorMsg()).toBe('Asaas indisponível');
    expect(component.students()).toEqual([student]);
    expect(component.deleting()).toBeNull();

    const semMsg = build({ unlinkStudent: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    await semMsg.component.unlinkStudent(student);
    expect(semMsg.component.listErrorMsg()).toBe('Não foi possível desvincular. Tente de novo.');
  });
});

describe('StudentsComponent — erros com mensagem traduzida', () => {
  it('criar atleta: e-mail repetido mostra a mensagem da API; texto técnico em inglês nunca aparece', () => {
    const { component } = build({
      createStudent: vi.fn().mockReturnValue(throwError(() => ({ status: 409, error: { message: 'E-mail já cadastrado' } }))),
    });
    component.form.patchValue({ name: 'Ana', email: 'ana@example.com', password: 'senha123', goal: 'x' });
    component.saveStudent();
    expect(component.errorMsg()).toBe('E-mail já cadastrado');
    expect(component.saving()).toBe(false);

    const ingles = build({
      createStudent: vi.fn().mockReturnValue(throwError(() => ({ status: 400, error: { message: ['email must be an email'] } }))),
    });
    ingles.component.form.patchValue({ name: 'Ana', email: 'ana@example.com', password: 'senha123', goal: 'x' });
    ingles.component.saveStudent();
    expect(ingles.component.errorMsg()).toBe('Erro ao criar atleta.');
  });

  it('editar atleta: falha mostra a frase padrão', () => {
    const { component } = build({ updateStudent: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))) });
    component.openEditModal(student);
    component.editForm.patchValue({ goal: 'novo' });
    component.saveEdit();
    expect(component.errorMsg()).toBe('Erro ao atualizar atleta.');
    expect(component.saving()).toBe(false);
  });
});

describe('StudentsComponent — link de nova senha', () => {
  it('pede confirmação; sem confirmar, não envia', async () => {
    const { component, api } = build();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    await component.sendPasswordReset(student);
    expect(api.sendStudentPasswordReset).not.toHaveBeenCalled();
  });

  it('confirmado: envia e avisa para qual e-mail foi', async () => {
    const { component, api } = build();
    const ask = vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.sendPasswordReset(student);
    expect(ask.mock.calls[0][0].message).toContain('ana@example.com');
    expect(api.sendStudentPasswordReset).toHaveBeenCalledWith('s1');
    expect(component.listInfoMsg()).toBe('Link enviado para ana@example.com.');
    expect(component.sendingResetId()).toBeNull();
  });

  it('erro: mensagem em português e libera o botão', async () => {
    const { component } = build({ sendStudentPasswordReset: vi.fn().mockReturnValue(throwError(() => ({ status: 429 }))) });
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.sendPasswordReset(student);
    expect(component.listErrorMsg()).toBe('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
    expect(component.sendingResetId()).toBeNull();
  });
});
