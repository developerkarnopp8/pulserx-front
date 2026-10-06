import { hasSeenWelcome, markWelcomeSeen, notificationState, shouldShowWelcome } from './welcome';

describe('boas-vindas do primeiro acesso', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('marca como visto por aluno (um aluno não esconde a tela do outro)', () => {
    expect(hasSeenWelcome('u1')).toBe(false);
    markWelcomeSeen('u1');
    expect(hasSeenWelcome('u1')).toBe(true);
    expect(hasSeenWelcome('u2')).toBe(false);
  });

  it('mostra só para aluno logado, que não viu e ainda não treinou', () => {
    expect(shouldShowWelcome('u1', 0)).toBe(true);
    expect(shouldShowWelcome('u1', 3)).toBe(false);
    expect(shouldShowWelcome(null, 0)).toBe(false);
    markWelcomeSeen('u1');
    expect(shouldShowWelcome('u1', 0)).toBe(false);
  });

  it('armazenamento bloqueado: conta como visto (nunca prende em redirecionamento) e marcar não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    expect(hasSeenWelcome('u1')).toBe(true);
    expect(shouldShowWelcome('u1', 0)).toBe(false);
    expect(() => markWelcomeSeen('u1')).not.toThrow();
  });

  it('permissão de notificação: lê do navegador; sem suporte = unsupported', () => {
    const original = (window as any).Notification;
    try {
      (window as any).Notification = { permission: 'granted' };
      expect(notificationState()).toBe('granted');
      delete (window as any).Notification;
      expect(notificationState()).toBe('unsupported');
      // Propriedade existente mas vazia (outro código/teste a zerou): também sem suporte, nunca quebra.
      (window as any).Notification = undefined;
      expect(notificationState()).toBe('unsupported');
    } finally {
      (window as any).Notification = original;
      if (original === undefined) delete (window as any).Notification;
    }
  });
});
