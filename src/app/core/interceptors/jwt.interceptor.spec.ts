import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { jwtInterceptor } from './jwt.interceptor';

function fakeReq(url: string) {
  return {
    url,
    clone: vi.fn((opts: unknown) => ({ url, cloned: true, opts })),
  };
}

describe('jwtInterceptor', () => {
  let auth: { updateUser: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    auth = { updateUser: vi.fn(), logout: vi.fn() };
    router = { navigate: vi.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  const run = (req: unknown, next: unknown) =>
    TestBed.runInInjectionContext(() => jwtInterceptor(req as never, next as never));

  it('com token e URL que não é login: clona a requisição com o header Authorization', () => {
    localStorage.setItem('pulserx_token', 'tok-1');
    const req = fakeReq('http://localhost:3000/api/students');
    const next = vi.fn(() => of('ok'));

    run(req, next).subscribe();

    expect(req.clone).toHaveBeenCalledWith({ setHeaders: { Authorization: 'Bearer tok-1' } });
    expect(next).toHaveBeenCalledWith({ url: req.url, cloned: true, opts: { setHeaders: { Authorization: 'Bearer tok-1' } } });
  });

  it('com token mas URL de login: não clona (evita mandar token velho no login)', () => {
    localStorage.setItem('pulserx_token', 'tok-1');
    const req = fakeReq('http://localhost:3000/api/auth/login');
    const next = vi.fn(() => of('ok'));

    run(req, next).subscribe();

    expect(req.clone).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(req);
  });

  it('sem token: não clona, repassa a requisição original', () => {
    const req = fakeReq('http://localhost:3000/api/students');
    const next = vi.fn(() => of('ok'));

    run(req, next).subscribe();

    expect(req.clone).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(req);
  });

  it('403 TERMS_PENDING: marca os termos como pendentes, leva ao consentimento e repassa o erro', () => {
    const err = new HttpErrorResponse({ status: 403, error: { code: 'TERMS_PENDING' } });
    const next = vi.fn(() => throwError(() => err));
    const onError = vi.fn();

    run(fakeReq('/api/athlete/home'), next).subscribe({ error: onError });

    expect(auth.updateUser).toHaveBeenCalledWith({ termsPending: true });
    expect(router.navigate).toHaveBeenCalledWith(['/consentimento']);
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('403 UNLINKED (coach desvinculou): leva à tela de vínculo encerrado e repassa o erro', () => {
    const err = new HttpErrorResponse({ status: 403, error: { code: 'UNLINKED' } });
    const onError = vi.fn();

    run(fakeReq('/api/athlete/home'), vi.fn(() => throwError(() => err))).subscribe({ error: onError });

    expect(router.navigate).toHaveBeenCalledWith(['/conta-encerrada']);
    expect(auth.logout).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err);
  });

  it('401 "Sessão encerrada" (conta excluída com sessão aberta): sai da conta', () => {
    const err = new HttpErrorResponse({ status: 401, error: { message: 'Sessão encerrada. Entre novamente.' } });
    const onError = vi.fn();

    run(fakeReq('/api/x'), vi.fn(() => throwError(() => err))).subscribe({ error: onError });

    expect(auth.logout).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err);
  });

  it.each([
    ['401 de senha errada (login/excluir conta)', new HttpErrorResponse({ status: 401, error: { message: 'Senha incorreta.' } })],
    ['403 com outro código', new HttpErrorResponse({ status: 403, error: { code: 'HEALTH_CONSENT_REQUIRED' } })],
    ['403 sem corpo', new HttpErrorResponse({ status: 403 })],
    ['401 com TERMS_PENDING', new HttpErrorResponse({ status: 401, error: { code: 'TERMS_PENDING' } })],
    ['erro que não é HTTP', new Error('rede')],
  ])('%s: só repassa o erro, sem redirecionar', (_nome, err) => {
    const next = vi.fn(() => throwError(() => err));
    const onError = vi.fn();

    run(fakeReq('/api/x'), next).subscribe({ error: onError });

    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(err);
  });
});
