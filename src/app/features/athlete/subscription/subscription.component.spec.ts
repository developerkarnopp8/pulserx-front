import { of, throwError } from 'rxjs';
import { AthleteSubscriptionComponent } from './subscription.component';
import { MySubscription } from '../../../core/models';

const mySub = (over: Partial<MySubscription> = {}): MySubscription => ({
  subscription: {
    id: 'sub1', studentId: 's1', status: 'ACTIVE', startedAt: '2026-09-01T00:00:00.000Z',
    renewsAt: null, canceledAt: null, trialEndsAt: null,
    plan: { id: 'p1', name: 'Core', priceCents: 14900, categories: ['CORE'], isFree: false },
  },
  categories: ['CORE'],
  ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getMySubscription: vi.fn().mockReturnValue(of(mySub())),
    cancelMySubscription: vi.fn().mockReturnValue(of({})),
    ...apiOver,
  };
  const component = new AthleteSubscriptionComponent(api as any);
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
