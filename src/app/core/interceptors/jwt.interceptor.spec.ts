import { jwtInterceptor } from './jwt.interceptor';

function fakeReq(url: string) {
  return {
    url,
    clone: vi.fn((opts: unknown) => ({ url, cloned: true, opts })),
  };
}

describe('jwtInterceptor', () => {
  beforeEach(() => localStorage.clear());

  it('com token e URL que não é login: clona a requisição com o header Authorization', () => {
    localStorage.setItem('pulserx_token', 'tok-1');
    const req = fakeReq('http://localhost:3000/api/students');
    const next = vi.fn(r => r);

    jwtInterceptor(req as never, next as never);

    expect(req.clone).toHaveBeenCalledWith({ setHeaders: { Authorization: 'Bearer tok-1' } });
    expect(next).toHaveBeenCalledWith({ url: req.url, cloned: true, opts: { setHeaders: { Authorization: 'Bearer tok-1' } } });
  });

  it('com token mas URL de login: não clona (evita mandar token velho no login)', () => {
    localStorage.setItem('pulserx_token', 'tok-1');
    const req = fakeReq('http://localhost:3000/api/auth/login');
    const next = vi.fn(r => r);

    jwtInterceptor(req as never, next as never);

    expect(req.clone).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(req);
  });

  it('sem token: não clona, repassa a requisição original', () => {
    const req = fakeReq('http://localhost:3000/api/students');
    const next = vi.fn(r => r);

    jwtInterceptor(req as never, next as never);

    expect(req.clone).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(req);
  });
});
