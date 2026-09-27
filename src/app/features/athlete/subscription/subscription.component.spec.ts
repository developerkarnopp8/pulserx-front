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
  const api = { getMySubscription: vi.fn().mockReturnValue(of(mySub())), ...apiOver };
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
