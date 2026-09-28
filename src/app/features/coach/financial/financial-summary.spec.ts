import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { FinancialComponent } from './financial.component';
import { FinancialSummary } from '../../../core/models';

/** Cobre só o carregamento da Visão Geral (MRR/inadimplência/churn/LTV) — o resto do componente (log manual de cobranças) não tem harness de teste ainda. */

const summary = (over: Partial<FinancialSummary> = {}): FinancialSummary => ({
  mrrCents: 29700,
  revenueByPlan: [{ planId: 'p1', planName: 'Core', priceCents: 9900, activeCount: 3, mrrCents: 29700 }],
  totalActive: 3,
  totalPastDue: 1,
  pastDueRatePercent: 25,
  churn: { canceledThisMonth: 1, activeAtStartOfMonth: 4, ratePercent: 25 },
  arpuCents: 9900,
  ltvProjectedCents: 39600,
  ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getStudents: vi.fn().mockReturnValue(of([])),
    getPaymentSummary: vi.fn().mockReturnValue(of({ totalReceived: 0, totalPending: 0, totalOverdue: 0, countOverdue: 0 })),
    getPayments: vi.fn().mockReturnValue(of([])),
    getFinancialSummary: vi.fn().mockReturnValue(of(summary())),
    ...apiOver,
  };
  const auth = { currentUser: () => ({ id: 'coach-1' }) };
  const component = new FinancialComponent(api as any, auth as any, new FormBuilder());
  return { component, api };
}

describe('FinancialComponent — Visão Geral (assinaturas reais)', () => {
  it('carrega o resumo financeiro ao iniciar', () => {
    const { component, api } = build();
    component.ngOnInit();

    expect(api.getFinancialSummary).toHaveBeenCalled();
    expect(component.financialSummary()).toEqual(summary());
    expect(component.loadingSummary()).toBe(false);
  });

  it('sem coach autenticado: não chama nada', () => {
    const api = { getFinancialSummary: vi.fn() };
    const auth = { currentUser: () => null };
    const component = new FinancialComponent(api as any, auth as any, new FormBuilder());

    component.ngOnInit();

    expect(api.getFinancialSummary).not.toHaveBeenCalled();
  });

  it('erro ao carregar: para o loading, sem quebrar a tela', () => {
    const { component } = build({ getFinancialSummary: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();

    expect(component.loadingSummary()).toBe(false);
    expect(component.financialSummary()).toBeNull();
  });
});
