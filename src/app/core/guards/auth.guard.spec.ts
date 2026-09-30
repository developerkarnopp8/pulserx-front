import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { authGuard, coachGuard, athleteGuard, adminGuard, consentGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

function build(authOver: Record<string, unknown> = {}) {
  const auth = {
    isAuthenticated: vi.fn().mockReturnValue(false),
    isCoach: vi.fn().mockReturnValue(false),
    isAthlete: vi.fn().mockReturnValue(false),
    isAdmin: vi.fn().mockReturnValue(false),
    needsConsent: vi.fn().mockReturnValue(false),
    ...authOver,
  };
  const tree = { treeMarker: true };
  const router = { createUrlTree: vi.fn().mockReturnValue(tree) };

  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: Router, useValue: router },
    ],
  });

  return { auth, router, tree };
}

function run<T>(fn: () => T): T {
  return TestBed.runInInjectionContext(fn);
}

describe('authGuard', () => {
  it('autenticado: permite', () => {
    const { auth } = build({ isAuthenticated: vi.fn().mockReturnValue(true) });
    expect(run(() => authGuard({} as never, {} as never))).toBe(true);
    expect(auth.isAuthenticated).toHaveBeenCalled();
  });

  it('não autenticado: redireciona pro login', () => {
    const { router, tree } = build();
    expect(run(() => authGuard({} as never, {} as never))).toBe(tree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});

describe('coachGuard', () => {
  it('coach: permite', () => {
    build({ isCoach: vi.fn().mockReturnValue(true) });
    expect(run(() => coachGuard({} as never, {} as never))).toBe(true);
  });

  it('não-coach que é atleta: redireciona pra home do atleta', () => {
    const { router } = build({ isAthlete: vi.fn().mockReturnValue(true) });
    run(() => coachGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/athlete/home']);
  });

  it('não-coach que é admin: redireciona pra home do admin', () => {
    const { router } = build({ isAdmin: vi.fn().mockReturnValue(true) });
    run(() => coachGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/admin/coaches']);
  });

  it('nenhum papel reconhecido: redireciona pro login', () => {
    const { router } = build();
    run(() => coachGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});

describe('athleteGuard', () => {
  it('atleta: permite', () => {
    build({ isAthlete: vi.fn().mockReturnValue(true) });
    expect(run(() => athleteGuard({} as never, {} as never))).toBe(true);
  });

  it('não-atleta que é coach: redireciona pra home do coach', () => {
    const { router } = build({ isCoach: vi.fn().mockReturnValue(true) });
    run(() => athleteGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/coach/dashboard']);
  });
});

describe('adminGuard', () => {
  it('admin: permite', () => {
    build({ isAdmin: vi.fn().mockReturnValue(true) });
    expect(run(() => adminGuard({} as never, {} as never))).toBe(true);
  });

  it('não-admin: redireciona pra home do papel atual', () => {
    const { router } = build({ isCoach: vi.fn().mockReturnValue(true) });
    run(() => adminGuard({} as never, {} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/coach/dashboard']);
  });
});

describe('consentGuard', () => {
  it('aluno com termos/saúde respondidos: permite', () => {
    const { router } = build();
    expect(run(() => consentGuard({} as never, {} as never))).toBe(true);
    expect(router.createUrlTree).not.toHaveBeenCalled();
  });

  it('aluno que ainda precisa consentir: vai pra tela de consentimento', () => {
    const { router, tree } = build({ needsConsent: vi.fn().mockReturnValue(true) });
    expect(run(() => consentGuard({} as never, {} as never))).toBe(tree);
    expect(router.createUrlTree).toHaveBeenCalledWith(['/consentimento']);
  });
});
