import { of, throwError } from 'rxjs';
import { SubscriptionConfirmedComponent } from './subscription-confirmed.component';

const active = { coachName: 'Luan', status: 'ACTIVE', plan: { name: 'Core', priceCents: 14990, isFree: false }, hasOpenPayment: false, lastPaidAt: '2026-10-06T15:00:00Z' };

function build(result: unknown = of(active), user: unknown = { id: 'u1', name: 'Ana Souza', email: 'ana@example.com' }) {
  const api = { getMyPaymentStatus: vi.fn().mockReturnValue(result) };
  const auth = { currentUser: vi.fn().mockReturnValue(user) };
  return { component: new SubscriptionConfirmedComponent(api as any, auth as any), api };
}

describe('SubscriptionConfirmedComponent', () => {
  it('pago e ativo: liberada, todas as etapas concluídas, nome e e-mail do próprio aluno', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.released()).toBe(true);
    expect(component.isFree()).toBe(false);
    expect(component.steps().map(s => s.state)).toEqual(['done', 'done', 'done']);
    expect(component.firstName()).toBe('Ana');
    expect(component.email()).toBe('ana@example.com');
  });

  it('plano grátis: liberada, etapa 3 é "Acesso"', () => {
    const { component } = build(of({ ...active, plan: { name: 'Free', priceCents: 0, isFree: true }, lastPaidAt: null }));
    component.ngOnInit();
    expect(component.isFree()).toBe(true);
    expect(component.steps().at(2)?.label).toBe('Acesso');
  });

  it('ainda em aberto: não liberada, pagamento continua como etapa atual', () => {
    const { component } = build(of({ ...active, status: 'PAST_DUE', hasOpenPayment: true }));
    component.ngOnInit();
    expect(component.released()).toBe(false);
    expect(component.steps().at(2)?.state).toBe('current');
  });

  it('sem usuário em memória: sem nome e sem e-mail', () => {
    const { component } = build(of(active), null);
    expect(component.firstName()).toBe('');
    expect(component.email()).toBe('');
    expect(component.isFree()).toBe(false);
    expect(component.released()).toBe(false);
  });

  it('falha ao carregar: mensagem em português', () => {
    const { component } = build(throwError(() => ({ status: 0 })));
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.status()).toBeNull();
    expect(component.errorMsg().length).toBeGreaterThan(0);
  });
});
