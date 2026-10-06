import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ConsentStatus } from '../../../core/models';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';

/**
 * Tela do próximo login do aluno (LGPD, decisões do dono 2026-09-30): aceite dos Termos/Política na versão atual
 * (obrigatório para usar o app) e resposta sobre dados de saúde (obrigatório RESPONDER; a escolha é livre).
 */
@Component({
  selector: 'app-consent',
  standalone: true,
  imports: [RouterLink, AuthShellComponent],
  templateUrl: './consent.component.html',
})
export class ConsentComponent implements OnInit {
  status = signal<ConsentStatus | null>(null);
  loading = signal(true);
  acceptTerms = signal(false);
  health = signal<boolean | null>(null);
  busy = signal(false);
  errorMsg = signal('');

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.api.getConsents().subscribe({
      next: s => {
        this.status.set(s);
        this.acceptTerms.set(s.termsAccepted);
        this.health.set(s.healthConsent);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível carregar. Tente de novo.'));
      },
    });
  }

  /** Quantas das 2 respostas já foram dadas (aceite dos termos + escolha sobre saúde), para o contador da tela. */
  get answered(): number {
    return (this.acceptTerms() ? 1 : 0) + (this.health() !== null ? 1 : 0);
  }

  get canSubmit(): boolean {
    return this.acceptTerms() && this.health() !== null && !this.busy();
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.acceptConsents(this.health()!).subscribe({
      next: res => {
        // Sessão nova: o token antigo não traz a versão atual dos termos.
        this.auth.startSession(res.access_token, res.user);
        void this.router.navigate(['/athlete/home']);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível salvar. Tente de novo.'));
      },
    });
  }
}
