import { of, throwError } from 'rxjs';
import { WelcomeComponent } from './welcome.component';
import { hasSeenWelcome } from '../../../shared/utils/welcome';

const status = { coachName: 'Luan', status: 'ACTIVE', plan: { name: 'Core', priceCents: 14990, isFree: false }, hasOpenPayment: false, lastPaidAt: null };

function build(over: Record<string, unknown> = {}, user: unknown = { id: 'u1', name: 'Ana Souza' }) {
  const api = {
    getMyPaymentStatus: vi.fn().mockReturnValue(of(status)),
    getMyPersonalRecords: vi.fn().mockReturnValue(of([])),
    ...over,
  };
  const auth = { currentUser: vi.fn().mockReturnValue(user) };
  return { component: new WelcomeComponent(api as any, auth as any), api };
}

describe('WelcomeComponent', () => {
  const original = (window as any).Notification;
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    (window as any).Notification = original;
    if (original === undefined) delete (window as any).Notification;
  });

  it('abrir já marca como visto; mostra treinador/plano e o estado dos recordes', () => {
    const { component } = build({ getMyPersonalRecords: vi.fn().mockReturnValue(of([{ id: 'pr1' }])) });
    component.ngOnInit();
    expect(hasSeenWelcome('u1')).toBe(true);
    expect(component.status()?.coachName).toBe('Luan');
    expect(component.hasRecords()).toBe(true);
    expect(component.firstName()).toBe('Ana');
  });

  it('sem recordes: item fica recomendado; falhas não derrubam a tela', () => {
    const { component } = build({
      getMyPaymentStatus: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
      getMyPersonalRecords: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
    });
    component.ngOnInit();
    expect(component.status()).toBeNull();
    expect(component.hasRecords()).toBe(false);
  });

  it('sem usuário em memória: não marca nada e não quebra', () => {
    const { component } = build({}, null);
    component.ngOnInit();
    expect(component.firstName()).toBe('');
    expect(localStorage.length).toBe(0);
  });

  it('ativar notificações: pede permissão ao navegador e atualiza o estado', async () => {
    const requestPermission = vi.fn().mockImplementation(async () => { (window as any).Notification.permission = 'granted'; return 'granted'; });
    (window as any).Notification = { permission: 'default', requestPermission };
    const { component } = build();
    expect(component.notif()).toBe('default');
    await component.enableNotifications();
    expect(requestPermission).toHaveBeenCalled();
    expect(component.notif()).toBe('granted');
  });

  it('já decidido (ou sem suporte): não pede de novo', async () => {
    const requestPermission = vi.fn();
    (window as any).Notification = { permission: 'denied', requestPermission };
    const { component } = build();
    await component.enableNotifications();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(component.notif()).toBe('denied');
  });
});
