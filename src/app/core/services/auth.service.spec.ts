import { of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { User } from '../models';

const user = (over: Partial<User> = {}): User => ({
  id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'coach', ...over,
} as User);

function build() {
  const http = { post: vi.fn() };
  const router = { navigate: vi.fn() };
  const socket = { connect: vi.fn(), disconnect: vi.fn() };
  return { http, router, socket };
}

describe('AuthService.loadUser (via currentUser no construtor)', () => {
  beforeEach(() => localStorage.clear());

  it('sem usuário salvo: currentUser começa null', () => {
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    expect(service.currentUser()).toBeNull();
  });

  it('com usuário salvo válido: currentUser carrega do localStorage', () => {
    localStorage.setItem('pulserx_user', JSON.stringify(user()));
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    expect(service.currentUser()?.email).toBe('ana@x.com');
  });

  it('com JSON inválido no localStorage: currentUser começa null, sem lançar', () => {
    localStorage.setItem('pulserx_user', '{invalido');
    const { http, router, socket } = build();
    expect(() => new AuthService(http as any, router as any, socket as any)).not.toThrow();
    const service = new AuthService(http as any, router as any, socket as any);
    expect(service.currentUser()).toBeNull();
  });
});

describe('AuthService — construtor reconecta o socket se já havia token', () => {
  beforeEach(() => localStorage.clear());

  it('com token salvo: conecta o socket', () => {
    localStorage.setItem('pulserx_token', 'tok-1');
    const { http, router, socket } = build();
    new AuthService(http as any, router as any, socket as any);
    expect(socket.connect).toHaveBeenCalledWith('tok-1');
  });

  it('sem token salvo: não conecta o socket', () => {
    const { http, router, socket } = build();
    new AuthService(http as any, router as any, socket as any);
    expect(socket.connect).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  beforeEach(() => localStorage.clear());

  it('sucesso com role esperado: guarda token/usuário, seta currentUser, conecta o socket', () => {
    const { http, router, socket } = build();
    http.post.mockReturnValue(of({ access_token: 'tok-1', user: user({ role: 'coach' }) }));
    const service = new AuthService(http as any, router as any, socket as any);

    service.login('ana@x.com', 'senha', 'coach').subscribe();

    expect(http.post).toHaveBeenCalledWith('http://localhost:3000/api/auth/login', { email: 'ana@x.com', password: 'senha' });
    expect(localStorage.getItem('pulserx_token')).toBe('tok-1');
    expect(JSON.parse(localStorage.getItem('pulserx_user')!).email).toBe('ana@x.com');
    expect(service.currentUser()?.role).toBe('coach');
    expect(socket.connect).toHaveBeenCalledWith('tok-1');
  });

  it('role diferente da esperada: lança erro com o rótulo em português (coach/athlete/admin)', () => {
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);

    http.post.mockReturnValue(of({ access_token: 'tok-1', user: user({ role: 'athlete' }) }));
    let err: Error | undefined;
    service.login('a@x.com', 'x', 'coach').subscribe({ error: e => { err = e; } });
    expect(err?.message).toContain('Atleta');

    http.post.mockReturnValue(of({ access_token: 'tok-1', user: user({ role: 'admin' }) }));
    service.login('a@x.com', 'x', 'coach').subscribe({ error: e => { err = e; } });
    expect(err?.message).toContain('Admin');

    http.post.mockReturnValue(of({ access_token: 'tok-1', user: user({ role: 'coach' }) }));
    service.login('a@x.com', 'x', 'athlete').subscribe({ error: e => { err = e; } });
    expect(err?.message).toContain('Coach');
  });

  it('role diferente: NÃO grava token/usuário nem abre socket (sessão do outro perfil não fica ativa na aba)', () => {
    localStorage.clear();
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    http.post.mockReturnValue(of({ access_token: 'tok-coach', user: user({ role: 'coach' }) }));

    service.login('luan@x.com', 'x', 'athlete').subscribe({ error: () => {} });

    expect(localStorage.getItem('pulserx_token')).toBeNull();
    expect(localStorage.getItem('pulserx_user')).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('role diferente e desconhecida (fora do mapa de rótulos): usa o valor bruto (?? res.user.role)', () => {
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    http.post.mockReturnValue(of({ access_token: 'tok-1', user: user({ role: 'juiz' as never }) }));

    let err: Error | undefined;
    service.login('a@x.com', 'x', 'coach').subscribe({ error: e => { err = e; } });

    expect(err?.message).toContain('juiz');
  });

  it('erro de rede propaga (sem side-effect de login)', () => {
    const { http, router, socket } = build();
    http.post.mockReturnValue(throwError(() => new Error('network')));
    const service = new AuthService(http as any, router as any, socket as any);

    let err: Error | undefined;
    service.login('a@x.com', 'x', 'coach').subscribe({ error: e => { err = e; } });

    expect(err?.message).toBe('network');
    expect(localStorage.getItem('pulserx_token')).toBeNull();
  });
});

describe('AuthService.logout', () => {
  beforeEach(() => localStorage.clear());

  it('limpa token/usuário/rascunhos, zera currentUser, desconecta socket e navega pro login', () => {
    localStorage.setItem('pulserx_token', 'tok-1');
    localStorage.setItem('pulserx_user', JSON.stringify(user()));
    localStorage.setItem('workout-draft:sess-1', '{"foo":1}');
    localStorage.setItem('outra-chave', 'mantida');
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);

    service.logout();

    expect(localStorage.getItem('pulserx_token')).toBeNull();
    expect(localStorage.getItem('pulserx_user')).toBeNull();
    expect(localStorage.getItem('workout-draft:sess-1')).toBeNull();
    expect(localStorage.getItem('outra-chave')).toBe('mantida');
    expect(service.currentUser()).toBeNull();
    expect(socket.disconnect).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('se o localStorage lançar ao limpar rascunhos, não propaga (catch silencioso)', () => {
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    const spy = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => { throw new Error('indisponível'); });
    Object.defineProperty(localStorage, 'length', { value: 1, configurable: true });

    expect(() => service.logout()).not.toThrow();

    spy.mockRestore();
  });
});

describe('AuthService — getToken/isAuthenticated/isCoach/isAthlete/isAdmin', () => {
  beforeEach(() => localStorage.clear());

  it('getToken lê do localStorage', () => {
    localStorage.setItem('pulserx_token', 'tok-1');
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    expect(service.getToken()).toBe('tok-1');
  });

  it('isAuthenticated: só true com usuário E token; sem qualquer um dos dois, false', () => {
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    expect(service.isAuthenticated()).toBe(false);

    service.currentUser.set(user());
    expect(service.isAuthenticated()).toBe(false); // sem token ainda

    localStorage.setItem('pulserx_token', 'tok-1');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('isCoach/isAthlete/isAdmin refletem o role atual, e false sem usuário', () => {
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    expect(service.isCoach()).toBe(false);
    expect(service.isAthlete()).toBe(false);
    expect(service.isAdmin()).toBe(false);

    service.currentUser.set(user({ role: 'coach' }));
    expect(service.isCoach()).toBe(true);
    expect(service.isAthlete()).toBe(false);

    service.currentUser.set(user({ role: 'athlete' }));
    expect(service.isAthlete()).toBe(true);
    expect(service.isCoach()).toBe(false);

    service.currentUser.set(user({ role: 'admin' }));
    expect(service.isAdmin()).toBe(true);
  });
});

describe('AuthService — sessão trocada em outra aba', () => {
  function serviceWithReloadSpy() {
    const { http, router, socket } = build();
    const service = new AuthService(http as any, router as any, socket as any);
    const reload = vi.spyOn(service as any, 'reloadForSessionChange').mockImplementation(() => {});
    return reload;
  }

  it('token trocado em outra aba (login/logout): recarrega esta aba', () => {
    const reload = serviceWithReloadSpy();
    window.dispatchEvent(new StorageEvent('storage', { key: 'pulserx_token', newValue: 'tok-outro' }));
    expect(reload).toHaveBeenCalled();
  });

  it('localStorage.clear() em outra aba (key null): recarrega', () => {
    const reload = serviceWithReloadSpy();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(reload).toHaveBeenCalled();
  });

  it('outra chave (ex.: rascunho de treino): não recarrega', () => {
    const reload = serviceWithReloadSpy();
    window.dispatchEvent(new StorageEvent('storage', { key: 'workout-draft:s1', newValue: '{}' }));
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloadForSessionChange chama window.location.reload', () => {
    const original = window.location;
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload }, writable: true, configurable: true });
    try {
      const { http, router, socket } = build();
      const service = new AuthService(http as any, router as any, socket as any);
      (service as any).reloadForSessionChange();
      expect(reload).toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true });
    }
  });
});
