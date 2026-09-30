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
      return throwError(() => err);
    }),
  );
};
