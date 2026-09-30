import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AthleteLookup } from '../../../core/models';
import { ApiService } from '../../../core/services/api.service';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

/**
 * Admin: pedido de exclusão que chegou por e-mail (LGPD Art. 18). Busca pelo e-mail EXATO, mostra o mínimo para
 * conferir e só anonimiza depois de confirmar. Conferir a identidade de quem pediu antes (por outro canal).
 */
@Component({
  selector: 'app-athlete-deletion',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './athlete-deletion.component.html',
})
export class AthleteDeletionComponent {
  email = signal('');
  found = signal<AthleteLookup | null>(null);
  busy = signal(false);
  errorMsg = signal('');
  doneMsg = signal('');

  constructor(private api: ApiService) {}

  search(): void {
    const email = this.email().trim();
    if (!email || this.busy()) return;
    this.busy.set(true);
    this.found.set(null);
    this.errorMsg.set('');
    this.doneMsg.set('');
    this.api.adminFindAthlete(email).subscribe({
      next: a => {
        this.found.set(a);
        this.busy.set(false);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível buscar. Tente de novo.'));
      },
    });
  }

  async anonymize(): Promise<void> {
    const a = this.found();
    if (!a || this.busy()) return;
    const ok = await confirmDialog.ask({
      title: `Excluir a conta de ${a.name}?`,
      message: `${a.email} — a assinatura é cancelada e os dados são apagados. Não tem volta.`,
      confirmLabel: 'Excluir conta',
      danger: true,
    });
    if (!ok) return;
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.adminAnonymizeAthlete(a.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.found.set(null);
        this.email.set('');
        this.doneMsg.set('Conta excluída. Responda ao titular confirmando a exclusão.');
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível excluir. Tente de novo.'));
      },
    });
  }
}
