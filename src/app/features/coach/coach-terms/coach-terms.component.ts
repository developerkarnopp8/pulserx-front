import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LEGAL_DOCS, LEGAL_LAST_UPDATED } from '../../public/legal/legal-content';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { apiMessage } from '../../../shared/utils/signup-flow';

/**
 * Aceite do Termo do Coach (LGPD, decisão do dono 2026-09-30): o painel fica bloqueado até aceitar a versão atual.
 * O texto é o mesmo da página pública `/termo-coach`.
 */
@Component({
  selector: 'app-coach-terms',
  standalone: true,
  imports: [AuthShellComponent],
  templateUrl: './coach-terms.component.html',
})
export class CoachTermsComponent {
  readonly doc = LEGAL_DOCS['termo-coach'];
  readonly lastUpdated = LEGAL_LAST_UPDATED;
  /** Seções do termo numeradas para o índice e os cartões (o "1." do título vira o número do cartão). */
  readonly clauses = this.doc.sections.map((s, i) => ({
    id: `clausula-${i + 1}`,
    num: String(i + 1).padStart(2, '0'),
    title: s.title.replace(/^\d+\.\s*/, ''),
    paragraphs: s.paragraphs,
    items: s.items ?? [],
  }));
  accepted = signal(false);
  busy = signal(false);
  errorMsg = signal('');

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private router: Router,
  ) {}

  /** Índice: rola até a cláusula e leva o foco para ela (leitor de tela e teclado acompanham). */
  goTo(id: string): void {
    const el = document.getElementById(id);
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    el?.focus({ preventScroll: true });
  }

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
