import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CoachSubscriptionsComponent } from './subscriptions.component';
import { SubscriptionPlan } from '../../../core/models';

const plan = (over: Partial<SubscriptionPlan> = {}): SubscriptionPlan => ({
  id: 'p1', coachId: 'coach-1', name: 'Core', description: null, priceCents: 0,
  categories: ['CORE'], isFree: false, freeConfig: null, active: false, ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getSubscriptionPlans: vi.fn().mockReturnValue(of([plan()])),
    createSubscriptionPlan: vi.fn().mockReturnValue(of(plan({ id: 'novo' }))),
    updateSubscriptionPlan: vi.fn().mockReturnValue(of(plan({ active: true }))),
    ...apiOver,
  };
  const component = new CoachSubscriptionsComponent(api as any, new FormBuilder());
  return { component, api };
}

describe('CoachSubscriptionsComponent', () => {
  it('carrega o catálogo ao iniciar', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getSubscriptionPlans).toHaveBeenCalled();
    expect(component.plans().map(p => p.id)).toEqual(['p1']);
    expect(component.loading()).toBe(false);
  });

  it('erro ao carregar mostra mensagem e libera o loading', () => {
    const { component } = build({ getSubscriptionPlans: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.errorMsg()).toContain('Não foi possível carregar');
    expect(component.loading()).toBe(false);
  });

  it('openAdd zera o form (nome vazio, sem categoria, não-grátis, ativo)', () => {
    const { component } = build();
    component.openAdd();
    expect(component.modalMode()).toBe('add');
    expect(component.editingId()).toBeNull();
    expect(component.form.value).toEqual(expect.objectContaining({ name: '', isFree: false, active: true }));
    expect(component.showModal()).toBe(true);
  });

  it('openEdit preenche o form com os dados do plano, incluindo categorias marcadas', () => {
    const { component } = build();
    component.openEdit(plan({ id: 'p2', name: 'LPO', priceCents: 14900, categories: ['LPO', 'CORE'], active: true }));
    expect(component.editingId()).toBe('p2');
    expect(component.form.value.name).toBe('LPO');
    expect(component.form.value.priceReais).toBe(149);
    expect(component.form.value.categories).toEqual({ CORE: true, LPO: true, PERFORMANCE: false });
  });

  it('form inválido (nome vazio) não chama a API', () => {
    const { component, api } = build();
    component.openAdd();
    component.save();
    expect(api.createSubscriptionPlan).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });

  it('cria plano pago com as categorias marcadas, preço em centavos e nome aparado', () => {
    const { component, api } = build();
    component.ngOnInit();
    component.openAdd();
    component.form.patchValue({ name: '  Combo  ', priceReais: 199.9 });
    component.form.get('categories')!.patchValue({ CORE: true, LPO: true });

    component.save();

    expect(api.createSubscriptionPlan).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Combo', priceCents: 19990, categories: ['CORE', 'LPO'], isFree: false, active: true,
    }));
    expect(component.plans().map(p => p.id)).toEqual(['p1', 'novo']);
    expect(component.showModal()).toBe(false);
  });

  it('plano gratuito sempre manda priceCents 0, mesmo com valor digitado no campo', () => {
    const { component, api } = build();
    component.openAdd();
    component.form.patchValue({ name: 'Free', priceReais: 50, isFree: true });

    component.save();

    expect(api.createSubscriptionPlan).toHaveBeenCalledWith(expect.objectContaining({ isFree: true, priceCents: 0 }));
  });

  it('editar chama updateSubscriptionPlan com o id e substitui o plano na lista', () => {
    const { component, api } = build();
    component.plans.set([plan({ id: 'p1' })]);
    component.openEdit(plan({ id: 'p1' }));
    component.form.patchValue({ name: 'Core Plus' });

    component.save();

    expect(api.updateSubscriptionPlan).toHaveBeenCalledWith('p1', expect.objectContaining({ name: 'Core Plus' }));
    expect(component.plans()[0].active).toBe(true); // valor devolvido pelo mock
  });

  it('erro do backend (ex.: plano gratuito com preço) aparece no form e libera o botão', () => {
    const { component } = build({
      createSubscriptionPlan: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Plano gratuito não pode ter preço.' } }))),
    });
    component.openAdd();
    component.form.patchValue({ name: 'Free' });

    component.save();

    expect(component.formError()).toBe('Plano gratuito não pode ter preço.');
    expect(component.saving()).toBe(false);
  });

  it('toggleActive troca o estado do plano na lista', () => {
    const { component, api } = build();
    component.plans.set([plan({ id: 'p1', active: false })]);

    component.toggleActive(plan({ id: 'p1', active: false }));

    expect(api.updateSubscriptionPlan).toHaveBeenCalledWith('p1', { active: true });
    expect(component.plans()[0].active).toBe(true);
  });
});
