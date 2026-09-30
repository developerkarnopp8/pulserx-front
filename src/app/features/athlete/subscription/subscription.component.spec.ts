import { of, throwError } from 'rxjs';
import { AthleteSubscriptionComponent } from './subscription.component';
import { MySubscription, MyGatewayPayment } from '../../../core/models';

const mySub = (over: Partial<MySubscription> = {}): MySubscription => ({
  subscription: {
    id: 'sub1', studentId: 's1', status: 'ACTIVE', startedAt: '2026-09-01T00:00:00.000Z',
    renewsAt: null, canceledAt: null, trialEndsAt: null,
    plan: { id: 'p1', name: 'Core', priceCents: 14900, categories: ['CORE'], isFree: false },
  },
  categories: ['CORE'],
  ...over,
});

const pay = (over: Partial<MyGatewayPayment> = {}): MyGatewayPayment => ({
  id: 'g1', status: 'paid', amount: 149.9, dueDate: '2026-09-10T00:00:00.000Z',
  paidAt: '2026-09-09T12:00:00.000Z', invoiceUrl: 'https://www.asaas.com/i/abc', createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getMySubscription: vi.fn().mockReturnValue(of(mySub())),
    getMyPayments: vi.fn().mockReturnValue(of([])),
    cancelMySubscription: vi.fn().mockReturnValue(of({})),
    ...apiOver,
  };
  const auth = { currentUser: vi.fn().mockReturnValue(null) };
  const component = new AthleteSubscriptionComponent(api as any, auth as any);
  return { component, api };
}

describe('AthleteSubscriptionComponent', () => {
  it('carrega a própria assinatura ao iniciar', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getMySubscription).toHaveBeenCalled();
    expect(component.data()?.subscription?.plan.name).toBe('Core');
    expect(component.loading()).toBe(false);
  });

  it('sem assinatura (plano null) não quebra — o template trata o caso vazio', () => {
    const { component } = build({ getMySubscription: vi.fn().mockReturnValue(of(mySub({ subscription: null, categories: [] }))) });
    component.ngOnInit();
    expect(component.data()?.subscription).toBeNull();
    expect(component.data()?.categories).toEqual([]);
  });

  it('erro ao carregar mostra mensagem e libera o loading', () => {
    const { component } = build({ getMySubscription: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.errorMsg()).toContain('Não foi possível carregar');
    expect(component.loading()).toBe(false);
  });
});

describe('AthleteSubscriptionComponent — faturas', () => {
  it('carrega o histórico real de cobranças junto com a assinatura', () => {
    const list = [pay()];
    const { component, api } = build({ getMyPayments: vi.fn().mockReturnValue(of(list)) });
    component.ngOnInit();
    expect(api.getMyPayments).toHaveBeenCalled();
    expect(component.payments()).toEqual(list);
    expect(component.paymentsLoading()).toBe(false);
  });

  it('erro no histórico não derruba a tela: plano continua carregado', () => {
    const { component } = build({ getMyPayments: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.paymentsError()).toContain('Não foi possível carregar suas faturas');
    expect(component.paymentsLoading()).toBe(false);
    expect(component.errorMsg()).toBe('');
    expect(component.data()?.subscription?.plan.name).toBe('Core');
  });

  it('próxima cobrança = fatura em aberto de vencimento mais antigo (ignora as pagas)', () => {
    const { component } = build({
      getMyPayments: vi.fn().mockReturnValue(of([
        pay({ id: 'a', status: 'pending', dueDate: '2026-11-10T00:00:00.000Z' }),
        pay({ id: 'b', status: 'overdue', dueDate: '2026-10-10T00:00:00.000Z' }),
        pay({ id: 'c', status: 'paid', dueDate: '2026-09-10T00:00:00.000Z' }),
      ])),
    });
    component.ngOnInit();
    expect(component.nextCharge()?.id).toBe('b');
  });

  it('sem fatura em aberto: próxima cobrança é null (não inventa data)', () => {
    const { component } = build({ getMyPayments: vi.fn().mockReturnValue(of([pay()])) });
    component.ngOnInit();
    expect(component.nextCharge()).toBeNull();
  });

  it('mostra 3 faturas e expande/recolhe o resto', () => {
    const list = [1, 2, 3, 4, 5].map(i => pay({ id: `p${i}` }));
    const { component } = build({ getMyPayments: vi.fn().mockReturnValue(of(list)) });
    component.ngOnInit();
    expect(component.visiblePayments().map(p => p.id)).toEqual(['p1', 'p2', 'p3']);
    component.toggleAllPayments();
    expect(component.visiblePayments()).toHaveLength(5);
    component.toggleAllPayments();
    expect(component.visiblePayments()).toHaveLength(3);
  });

  it('fmtAmount converte reais (Float do gateway) pra moeda formatada sem erro de arredondamento', () => {
    const { component } = build();
    expect(component.fmtAmount(149.9)).toBe(component.fmtPrice(14990));
    expect(component.fmtAmount(0.1 + 0.2)).toBe(component.fmtPrice(30));
  });

  it('safeInvoiceUrl só aceita https (bloqueia javascript:, http e vazio)', () => {
    const { component } = build();
    expect(component.safeInvoiceUrl('https://www.asaas.com/i/abc')).toBe('https://www.asaas.com/i/abc');
    expect(component.safeInvoiceUrl('javascript:alert(1)')).toBeNull();
    expect(component.safeInvoiceUrl('http://evil.com')).toBeNull();
    expect(component.safeInvoiceUrl(null)).toBeNull();
    expect(component.safeInvoiceUrl('')).toBeNull();
  });
});

describe('AthleteSubscriptionComponent.cancel', () => {
  const originalConfirm = window.confirm;
  afterEach(() => { window.confirm = originalConfirm; });

  it('sem confirmar (confirm() false): não chama a API', () => {
    window.confirm = vi.fn().mockReturnValue(false);
    const { component, api } = build();
    component.cancel();
    expect(api.cancelMySubscription).not.toHaveBeenCalled();
  });

  it('confirmando: cancela, mostra mensagem e recarrega a assinatura', () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const { component, api } = build();
    component.ngOnInit();
    api.getMySubscription.mockClear();

    component.cancel();

    expect(api.cancelMySubscription).toHaveBeenCalled();
    expect(component.cancelMsg()).toBe('Assinatura cancelada.');
    expect(component.canceling()).toBe(false);
    expect(api.getMySubscription).toHaveBeenCalled(); // recarrega
  });

  it('erro ao cancelar: mostra mensagem de erro, libera o botão', () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const { component } = build({ cancelMySubscription: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });

    component.cancel();

    expect(component.cancelMsg()).toContain('Não foi possível cancelar');
    expect(component.canceling()).toBe(false);
  });
});

describe('AthleteSubscriptionComponent — dados de saúde (LGPD)', () => {
  function buildSaude(healthConsent: boolean | null, apiOver: Record<string, unknown> = {}) {
    const api = {
      getMySubscription: vi.fn().mockReturnValue(of(mySub())),
      getMyPayments: vi.fn().mockReturnValue(of([])),
      setHealthConsent: vi.fn((v: boolean) => of({ healthConsent: v, healthConsentAt: '2026-09-30T12:00:00.000Z' })),
      ...apiOver,
    };
    const auth = { currentUser: vi.fn().mockReturnValue({ id: 'u1', role: 'athlete', healthConsent }), updateUser: vi.fn() };
    const component = new AthleteSubscriptionComponent(api as any, auth as any);
    return { component, api, auth };
  }

  it('mostra se o aluno autorizou (só true conta como autorizado)', () => {
    expect(buildSaude(true).component.saudeAutorizada).toBe(true);
    expect(buildSaude(false).component.saudeAutorizada).toBe(false);
    expect(buildSaude(null).component.saudeAutorizada).toBe(false);
    const semSessao = new AthleteSubscriptionComponent({} as any, { currentUser: () => null } as any);
    expect(semSessao.saudeAutorizada).toBe(false);
  });

  it('autorizar: grava direto, atualiza a sessão e confirma', () => {
    const { component, api, auth } = buildSaude(false);
    component.alterarSaude(true);
    expect(api.setHealthConsent).toHaveBeenCalledWith(true);
    expect(auth.updateUser).toHaveBeenCalledWith({ healthConsent: true });
    expect(component.salvandoSaude()).toBe(false);
    expect(component.saudeMsg()).toBe('Compartilhamento de dados de saúde ativado.');
  });

  it('retirar: primeiro pede confirmação, sem chamar a API', () => {
    const { component, api } = buildSaude(true);
    component.alterarSaude(false);
    expect(component.confirmandoRetirar()).toBe(true);
    expect(api.setHealthConsent).not.toHaveBeenCalled();
  });

  it('retirar confirmado: grava, fecha a confirmação e avisa que apagou os registros', () => {
    const { component, api, auth } = buildSaude(true);
    component.alterarSaude(false);
    component.alterarSaude(false);
    expect(api.setHealthConsent).toHaveBeenCalledWith(false);
    expect(auth.updateUser).toHaveBeenCalledWith({ healthConsent: false });
    expect(component.confirmandoRetirar()).toBe(false);
    expect(component.saudeMsg()).toBe('Autorização retirada. Motivos de lesão e observações já registrados foram apagados.');
  });

  it('desistir de retirar fecha a confirmação sem gravar', () => {
    const { component, api } = buildSaude(true);
    component.alterarSaude(false);
    component.cancelarRetirar();
    expect(component.confirmandoRetirar()).toBe(false);
    expect(api.setHealthConsent).not.toHaveBeenCalled();
  });

  it('erro ao gravar: mostra a mensagem, libera o botão e não mexe na sessão', () => {
    const { component, auth } = buildSaude(false, {
      setHealthConsent: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Tente mais tarde' } }))),
    });
    component.alterarSaude(true);
    expect(component.salvandoSaude()).toBe(false);
    expect(component.saudeErro()).toBe('Tente mais tarde');
    expect(component.saudeMsg()).toBe('');
    expect(auth.updateUser).not.toHaveBeenCalled();

    const semMsg = buildSaude(false, { setHealthConsent: vi.fn().mockReturnValue(throwError(() => new Error('rede'))) });
    semMsg.component.alterarSaude(true);
    expect(semMsg.component.saudeErro()).toBe('Não foi possível salvar. Tente de novo.');
  });
});
