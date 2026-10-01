import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
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

    // Login/logout em OUTRA aba troca o token do localStorage; sem isto esta aba seguiria com a
    // tela e o socket do usuário anterior, mas com as requisições saindo com o token novo.
    // O evento 'storage' só dispara nas outras abas; key null = localStorage.clear().
    window.addEventListener('storage', event => {
      if (event.key === TOKEN_KEY || event.key === null) this.reloadForSessionChange();
    });
  }

  /** Recarrega a aba pra ela assumir a sessão atual do navegador (ou cair no login). */
  protected reloadForSessionChange(): void {
    window.location.reload();
  }

  /**
   * Entra e devolve o usuário. `expectedRole` = perfil(is) aceito(s) nesta tela: o login comum aceita coach e atleta (o sistema
   * detecta qual é); o admin só entra por /login/root.
   */
  login(email: string, password: string, expectedRole: UserRole | UserRole[]): Observable<User> {
    return this.http
      .post<{ access_token: string; user: User }>(
        `${environment.apiUrl}/auth/login`,
        { email, password },
      )
      .pipe(
        // Perfil errado é recusado ANTES de gravar a sessão: senão o token/socket do outro perfil
        // ficava ativo na aba mesmo com a tela de erro (e vazava tempo real pro próximo login).
        map(res => {
          const aceitos = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
          if (!aceitos.includes(res.user.role)) {
            const labels: Record<string, string> = { coach: 'Coach', athlete: 'Atleta', admin: 'Admin' };
            throw new Error(
              `Este e-mail pertence a um perfil diferente. Use o acesso ${labels[res.user.role] ?? res.user.role}.`,
            );
          }
          this.startSession(res.access_token, res.user);
          return res.user;
        }),
      );
  }

  /** Grava a sessão (token + usuário) e abre o tempo real — usado pelo login e pela inscrição pública. */
  startSession(accessToken: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
    this.socket.connect(accessToken);
  }

  /** Atualiza o usuário da sessão (ex.: consentimento de saúde mudado no Perfil), sem trocar o token. */
  updateUser(changes: Partial<User>): void {
    const atual = this.currentUser();
    if (!atual) return;
    const user = { ...atual, ...changes };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  /** Coach sem o Termo do Coach na versão atual vai para a tela de aceite (sessão antiga sem o campo = pendente). */
  needsCoachTerms(): boolean {
    const u = this.currentUser();
    return u?.role === 'coach' && u.termsPending !== false;
  }

  /** Aluno com termos pendentes ou sem responder sobre saúde vai para a tela de consentimento. */
  needsConsent(): boolean {
    const u = this.currentUser();
    return u?.role === 'athlete' && (u.termsPending !== false || u.healthConsent === undefined || u.healthConsent === null);
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
