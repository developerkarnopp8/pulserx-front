import { Component, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiMessage } from '../../utils/signup-flow';

/**
 * "Excluir minha conta" do aluno (LGPD Art. 18, decisão do dono 2026-09-30): pede a senha e uma confirmação
 * explícita. A conta é anonimizada — as cobranças pagas ficam (obrigação fiscal), o resto é apagado. Sem volta.
 */
@Component({
  selector: 'app-delete-account',
  standalone: true,
  templateUrl: './delete-account.component.html',
})
export class DeleteAccountComponent {
  open = signal(false);
  password = signal('');
  confirmed = signal(false);
  showPassword = signal(false);
  busy = signal(false);
  errorMsg = signal('');

  constructor(
    private api: ApiService,
    private auth: AuthService,
  ) {}

  get canSubmit(): boolean {
    return this.confirmed() && this.password().length > 0 && !this.busy();
  }

  toggle(): void {
    this.open.update(v => !v);
    this.password.set('');
    this.showPassword.set(false);
    this.confirmed.set(false);
    this.errorMsg.set('');
  }

  submit(): void {
    if (!this.canSubmit) return;
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.deleteMyAccount(this.password()).subscribe({
      next: () => this.auth.logout(),
      error: err => {
        this.busy.set(false);
        this.password.set('');
        this.errorMsg.set(apiMessage(err, 'Não foi possível excluir a conta. Tente de novo.'));
      },
    });
  }
}
