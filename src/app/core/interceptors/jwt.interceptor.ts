import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('pulserx_token');
  if (token && !req.url.includes('/auth/login')) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      // Termos mudaram (ou nunca foram aceitos): a API barra o aluno em toda rota até ele aceitar.
      if (err instanceof HttpErrorResponse && err.status === 403 && err.error?.code === 'TERMS_PENDING') {
        auth.updateUser({ termsPending: true });
        void router.navigate(['/consentimento']);
      }
      // Termo do Coach mudou (ou nunca foi aceito): a API barra o painel até o coach aceitar.
      if (err instanceof HttpErrorResponse && err.status === 403 && err.error?.code === 'COACH_TERMS_PENDING') {
        auth.updateUser({ termsPending: true });
        void router.navigate(['/aceite-coach']);
      }
      // O coach desvinculou o aluno: só resta sair ou excluir a conta.
      if (err instanceof HttpErrorResponse && err.status === 403 && err.error?.code === 'UNLINKED') {
        void router.navigate(['/conta-encerrada']);
      }
      // Conta excluída (anonimizada) com a sessão ainda aberta: a API recusa o token — sai de vez.
      if (err instanceof HttpErrorResponse && err.status === 401 && err.error?.message === 'Sessão encerrada. Entre novamente.') {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
