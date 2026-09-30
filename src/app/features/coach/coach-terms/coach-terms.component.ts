import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LEGAL_DOCS } from '../../public/legal/legal-content';
import { apiMessage } from '../../../shared/utils/signup-flow';

/**
 * Aceite do Termo do Coach (LGPD, decisão do dono 2026-09-30): o painel fica bloqueado até aceitar a versão atual.
 * O texto é o mesmo da página pública `/termo-coach`.
 */
@Component({
  selector: 'app-coach-terms',
  standalone: true,
  templateUrl: './coach-terms.component.html',
})
export class CoachTermsComponent {
  readonly doc = LEGAL_DOCS['termo-coach'];
  accepted = signal(false);
  busy = signal(false);
  errorMsg = signal('');

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
  ) {}

  get canSubmit(): boolean {
    return this.accepted() && !this.busy();
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.acceptCoachTerms().subscribe({
      next: res => {
        // Sessão nova: o token antigo não traz a versão atual do termo.
        this.auth.startSession(res.access_token, res.user);
        void this.router.navigate(['/coach/dashboard']);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível registrar o aceite. Tente de novo.'));
      },
    });
  }
}
