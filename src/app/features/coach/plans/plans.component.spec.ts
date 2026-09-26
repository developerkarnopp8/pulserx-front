import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PlansComponent } from './plans.component';
import { TrainingPlan } from '../../../core/models';

const sharedPlan = (over: Partial<TrainingPlan> = {}): TrainingPlan => ({
  id: 'plan-s', studentId: null, coachId: 'coach-1', category: 'CORE', scope: 'SHARED',
  month: 1, startDate: '2026-10-05', title: 'Core — Outubro', published: false, weeks: [], ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getStudents: vi.fn().mockReturnValue(of([])),
    getSharedPlans: vi.fn().mockReturnValue(of([sharedPlan()])),
    createSharedPlan: vi.fn().mockReturnValue(of(sharedPlan({ id: 'novo' }))),
    ...apiOver,
  };
  const auth = { currentUser: () => ({ id: 'coach-1' }) };
  const router = { navigate: vi.fn() };
  const component = new PlansComponent(api as any, auth as any, new FormBuilder(), router as any);
  return { component, api, router };
}

describe('PlansComponent — planos compartilhados', () => {
  it('carrega os alunos e os planos compartilhados do coach', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getSharedPlans).toHaveBeenCalled();
    expect(component.sharedPlans().map(p => p.id)).toEqual(['plan-s']);
    expect(component.sharedLoading()).toBe(false);
  });

  it('erro ao carregar mostra mensagem e não deixa o carregando preso', () => {
    const { component } = build({ getSharedPlans: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.sharedError()).toContain('Não foi possível carregar');
    expect(component.sharedLoading()).toBe(false);
  });

  it('só oferece Core e LPO (Performance é sempre individual)', () => {
    const { component } = build();
    expect(component.sharedCategories).toEqual(['CORE', 'LPO']);
  });

  it('formulário inválido (sem título) não chama a API', () => {
    const { component, api } = build();
    component.createShared();
    expect(api.createSharedPlan).not.toHaveBeenCalled();
    expect(component.sharedForm.touched).toBe(true);
  });

  it('cria o plano (título sem espaços nas pontas) e abre o editor compartilhado', () => {
    const { component, api, router } = build();
    component.sharedForm.patchValue({ category: 'LPO', title: '  LPO — Outubro  ', month: 2, startDate: '2026-10-05' });

    component.createShared();

    expect(api.createSharedPlan).toHaveBeenCalledWith('LPO', 'LPO — Outubro', 2, '2026-10-05');
    expect(router.navigate).toHaveBeenCalledWith(['/coach/plan-builder/shared', 'novo']);
    expect(component.creatingShared()).toBe(false);
  });

  it('falha ao criar mostra erro, não navega e libera o botão', () => {
    const { component, router } = build({ createSharedPlan: vi.fn().mockReturnValue(throwError(() => new Error('400'))) });
    component.sharedForm.patchValue({ title: 'Core', startDate: '2026-10-05' });

    component.createShared();

    expect(component.sharedError()).toContain('Não foi possível criar');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.creatingShared()).toBe(false);
  });
});
