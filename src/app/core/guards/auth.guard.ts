import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Home do papel real do usuário autenticado — nunca aponta pra uma rota
 * que o próprio usuário não tem acesso (evita loop de redirect entre guards
 * quando o papel do usuário não bate com o guard da rota atual). */
function homeFor(auth: AuthService): string {
  if (auth.isCoach()) return '/coach/dashboard';
  if (auth.isAthlete()) return '/athlete/home';
  if (auth.isAdmin()) return '/admin/coaches';
  return '/login';
}

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

export const coachGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isCoach()) return true;
  return router.createUrlTree([homeFor(auth)]);
};

export const athleteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAthlete()) return true;
  return router.createUrlTree([homeFor(auth)]);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAdmin()) return true;
  return router.createUrlTree([homeFor(auth)]);
};

/** Área do aluno só depois de aceitar os termos atuais e responder sobre dados de saúde (LGPD). */
export const consentGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.needsConsent() ? router.createUrlTree(['/consentimento']) : true;
};

/** Painel do coach só depois de aceitar o Termo do Coach na versão atual (LGPD). */
export const coachTermsGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.needsCoachTerms() ? router.createUrlTree(['/aceite-coach']) : true;
};
