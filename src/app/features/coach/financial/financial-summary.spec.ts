import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { FinancialComponent } from './financial.component';
import { FinancialSummary } from '../../../core/models';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

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

const monthly = {
  currentPlatformFeePercent: 10,
  month: { count: 2, gross: 198, gatewayFee: 3.98, platformFee: 19.4, coachNet: 174.62, pendingBreakdown: 0 },
};

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getStudents: vi.fn().mockReturnValue(of([])),
    getPaymentSummary: vi.fn().mockReturnValue(of({ totalReceived: 0, totalPending: 0, totalOverdue: 0, countOverdue: 0 })),
    getPayments: vi.fn().mockReturnValue(of([])),
    getFinancialSummary: vi.fn().mockReturnValue(of(summary())),
    getMonthlyBreakdown: vi.fn().mockReturnValue(of(monthly)),
    getCoachGatewayPayments: vi.fn().mockReturnValue(of([])),
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

describe('FinancialComponent — repasse do mês (Asaas → AEVON → coach)', () => {
  it('carrega o repasse do mês e as cobranças do Asaas', () => {
    const rows = [{ id: 'pay1' }];
    const { component, api } = build({ getCoachGatewayPayments: vi.fn().mockReturnValue(of(rows)) });
    component.ngOnInit();
    expect(api.getMonthlyBreakdown).toHaveBeenCalled();
    expect(component.monthly()).toEqual(monthly);
    expect(component.gatewayPayments()).toEqual(rows);
  });

  it('barra de rateio a partir dos totais reais do mês', () => {
    const { component } = build();
    expect(component.split()).toEqual([]);
    component.ngOnInit();
    expect(component.split().map(s => s.percent)).toEqual([2, 9.8, 88.2]);
    expect(component.segmentColor.coach).toBe('#d95926');
  });

  it('erros nas rotas do Asaas só escondem as seções (resto da tela segue)', () => {
    const { component } = build({
      getMonthlyBreakdown: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
      getCoachGatewayPayments: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
    });
    component.ngOnInit();
    expect(component.monthly()).toBeNull();
    expect(component.gatewayPayments()).toEqual([]);
    expect(component.financialSummary()).toEqual(summary());
  });

  it('barras de receita por plano proporcionais ao maior plano', () => {
    const { component } = build({
      getFinancialSummary: vi.fn().mockReturnValue(of(summary({
        revenueByPlan: [
          { planId: 'a', planName: 'Combo', priceCents: 19900, activeCount: 1, mrrCents: 19900 },
          { planId: 'b', planName: 'Core', priceCents: 9950, activeCount: 1, mrrCents: 9950 },
        ],
      }))),
    });
    expect(component.planShares()).toEqual([]);
    component.ngOnInit();
    expect(component.planShares()).toEqual([100, 50]);
  });

  it('sem contrato definido: % atual null chega intacto pra tela avisar', () => {
    const { component } = build({ getMonthlyBreakdown: vi.fn().mockReturnValue(of({ ...monthly, currentPlatformFeePercent: null })) });
    component.ngOnInit();
    expect(component.monthly()?.currentPlatformFeePercent).toBeNull();
  });

  it('fmtReais: reais do Asaas em moeda; null vira "—" (não inventa)', () => {
    const { component } = build();
    expect(component.fmtReais(null)).toBe('—');
    expect(component.fmtReais(87.31)).toBe(component.fmtCents(8731));
  });
});


describe('FinancialComponent — remover lançamento (caixa de confirmação do app)', () => {
  afterEach(() => vi.restoreAllMocks());
  const lancamento = { id: 'pay-1' } as any;

  it('sem confirmar: nada é removido', async () => {
    const { component, api } = build({ deletePayment: vi.fn() });
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    await component.deletePayment(lancamento);
    expect((api as any).deletePayment).not.toHaveBeenCalled();
  });

  it('confirmado: remove da lista e recarrega o resumo', async () => {
    const { component, api } = build({ deletePayment: vi.fn().mockReturnValue(of(undefined)) });
    component.payments.set([lancamento, { id: 'pay-2' } as any]);
    const ask = vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.deletePayment(lancamento);
    expect(ask.mock.calls[0][0]).toMatchObject({ title: 'Remover lançamento?', danger: true });
    expect((api as any).deletePayment).toHaveBeenCalledWith('pay-1');
    expect(component.payments().map((p: any) => p.id)).toEqual(['pay-2']);
    expect(api.getPaymentSummary).toHaveBeenCalled();
  });
});
