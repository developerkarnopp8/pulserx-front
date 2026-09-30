import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  MySubscription, MyGatewayPayment, TRAINING_CATEGORY_LABEL, SUBSCRIPTION_STATUS_LABEL, GATEWAY_PAYMENT_STATUS_LABEL,
} from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { DeleteAccountComponent } from '../../../shared/components/delete-account/delete-account.component';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-athlete-subscription',
  standalone: true,
  imports: [CommonModule, DeleteAccountComponent],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss',
})
export class AthleteSubscriptionComponent implements OnInit {
  data       = signal<MySubscription | null>(null);
  loading    = signal(true);
  canceling  = signal(false);
  errorMsg   = signal('');
  cancelMsg  = signal('');

  payments        = signal<MyGatewayPayment[]>([]);
  paymentsLoading = signal(true);
  paymentsError   = signal('');
  showAllPayments = signal(false);

  readonly fmtPrice = formatCents;
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;
  readonly statusLabel = SUBSCRIPTION_STATUS_LABEL;
  readonly paymentStatusLabel = GATEWAY_PAYMENT_STATUS_LABEL;

  /**
   * Próxima cobrança = a fatura real em aberto de vencimento mais antigo (vencida primeiro).
   * Não usa `renewsAt`: o backend ainda não preenche esse campo (só com cobrança recorrente — R4).
   */
  readonly nextCharge = computed<MyGatewayPayment | null>(() => {
    const open = this.payments().filter(p => p.status !== 'paid');
    if (!open.length) return null;
    return [...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  });

  readonly visiblePayments = computed(() =>
    this.showAllPayments() ? this.payments() : this.payments().slice(0, 3),
  );

  constructor(private api: ApiService, public auth: AuthService) {}

  // ── Privacidade: consentimento de dados de saúde (LGPD Art. 8 §5 — dar ou retirar a qualquer momento) ──
  confirmandoRetirar = signal(false);
  salvandoSaude = signal(false);
  saudeMsg = signal('');
  saudeErro = signal('');

  get saudeAutorizada(): boolean {
    return this.auth.currentUser()?.healthConsent === true;
  }

  /** Retirar pede confirmação antes (apaga o motivo "Lesão" e as observações já registrados). */
  alterarSaude(autorizar: boolean): void {
    if (!autorizar && !this.confirmandoRetirar()) {
      this.confirmandoRetirar.set(true);
      return;
    }
    this.salvandoSaude.set(true);
    this.saudeMsg.set('');
    this.saudeErro.set('');
    this.api.setHealthConsent(autorizar).subscribe({
      next: r => {
        this.auth.updateUser({ healthConsent: r.healthConsent });
        this.confirmandoRetirar.set(false);
        this.salvandoSaude.set(false);
        this.saudeMsg.set(
          autorizar
            ? 'Compartilhamento de dados de saúde ativado.'
            : 'Autorização retirada. Motivos de lesão e observações já registrados foram apagados.',
        );
      },
      error: err => {
        this.salvandoSaude.set(false);
        this.saudeErro.set(apiMessage(err, 'Não foi possível salvar. Tente de novo.'));
      },
    });
  }

  cancelarRetirar(): void {
    this.confirmandoRetirar.set(false);
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.getMySubscription().subscribe({
      next: data => { this.data.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.errorMsg.set('Não foi possível carregar sua assinatura.'); },
    });
    // Falha no histórico não derruba a tela: o plano continua visível.
    this.paymentsLoading.set(true);
    this.paymentsError.set('');
    this.api.getMyPayments().subscribe({
      next: list => { this.payments.set(list); this.paymentsLoading.set(false); },
      error: () => { this.paymentsLoading.set(false); this.paymentsError.set('Não foi possível carregar suas faturas.'); },
    });
  }

  /** `amount` do gateway vem em reais (Float); o formatador do app trabalha em centavos. */
  fmtAmount(amount: number): string {
    return formatCents(Math.round(amount * 100));
  }

  /** Só abre link de fatura https — nunca `javascript:`/http vindo do gateway. */
  safeInvoiceUrl(url: string | null): string | null {
    return url && /^https:\/\//i.test(url) ? url : null;
  }

  toggleAllPayments(): void {
    this.showAllPayments.update(v => !v);
  }

  async cancel(): Promise<void> {
    const ok = await confirmDialog.ask({
      title: 'Cancelar sua assinatura?',
      message: 'As próximas cobranças param e seu treinador é avisado.',
      confirmLabel: 'Cancelar assinatura',
      cancelLabel: 'Manter assinatura',
      danger: true,
    });
    if (!ok) return;
    this.canceling.set(true);
    this.cancelMsg.set('');
    this.api.cancelMySubscription().subscribe({
      next: () => {
        this.canceling.set(false);
        this.cancelMsg.set('Assinatura cancelada.');
        this.load();
      },
      error: () => {
        this.canceling.set(false);
        this.cancelMsg.set('Não foi possível cancelar agora. Tente novamente.');
      },
    });
  }
}
