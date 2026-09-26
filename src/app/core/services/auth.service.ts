import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map } from 'rxjs';
import { User, UserRole } from '../models';
import { SocketService } from './socket.service';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'pulserx_token';
const USER_KEY  = 'pulserx_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(this.loadUser());

  constructor(
    private http: HttpClient,
    private router: Router,
    private socket: SocketService,
  ) {
    // Re-connect socket if already logged in (page refresh)
    const token = this.getToken();
    if (token) this.socket.connect(token);
  }

  login(email: string, password: string, expectedRole: UserRole): Observable<void> {
    return this.http
      .post<{ access_token: string; user: User }>(
        `${environment.apiUrl}/auth/login`,
        { email, password },
      )
      .pipe(
        tap(res => {
          localStorage.setItem(TOKEN_KEY, res.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);
          this.socket.connect(res.access_token);
        }),
        map(res => {
          if (res.user.role !== expectedRole) {
            const labels: Record<string, string> = { coach: 'Coach', athlete: 'Atleta', admin: 'Admin' };
            throw new Error(
              `Este e-mail pertence a um perfil diferente. Use o acesso ${labels[res.user.role] ?? res.user.role}.`,
            );
          }
        }),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.clearWorkoutDrafts();
    this.currentUser.set(null);
    this.socket.disconnect();
    this.router.navigate(['/login']);
  }

  /** Remove todos os rascunhos de treino locais — não devem sobreviver ao logout. */
  private clearWorkoutDrafts(): void {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith('workout-draft:')) localStorage.removeItem(k);
      }
    } catch {
      /* localStorage indisponível */
    }
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null && !!this.getToken();
  }

  isCoach(): boolean {
    return this.currentUser()?.role === 'coach';
  }

  isAthlete(): boolean {
    return this.currentUser()?.role === 'athlete';
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
