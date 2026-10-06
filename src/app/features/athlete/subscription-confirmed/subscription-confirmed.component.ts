import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { MyPaymentStatus } from '../../../core/models';
import { CheckoutStepsComponent, checkoutSteps } from '../../../shared/components/checkout-steps/checkout-steps.component';
import { formatCents } from '../../../shared/utils/currency';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { isSubscriptionReleased } from '../../../shared/utils/pix';

/**
 * Assinatura ativa (Stitch mo18): aparece quando o pagamento é confirmado (ou ao assinar o plano grátis). Só dado real —
 * plano, treinador, valor e data do pagamento. Ainda não confirmado: avisa e leva de volta ao PIX.
 */
@Component({
  selector: 'app-subscription-confirmed',
  standalone: true,
  imports: [CommonModule, RouterLink, CheckoutStepsComponent],
  templateUrl: './subscription-confirmed.component.html',
})
export class SubscriptionConfirmedComponent implements OnInit {
  loading = signal(true);
  status = signal<MyPaymentStatus | null>(null);
  errorMsg = signal('');

  released = computed(() => {
    const st = this.status();
    return !!st && isSubscriptionReleased(st.status, st.hasOpenPayment);
  });
  isFree = computed(() => this.status()?.plan?.isFree ?? false);
  steps = computed(() => checkoutSteps(this.released() ? 4 : 3, this.isFree()));
  firstName = computed(() => this.auth.currentUser()?.name?.split(' ')[0] ?? '');
  email = computed(() => this.auth.currentUser()?.email ?? '');

  readonly fmtCents = formatCents;

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.api.getMyPaymentStatus().subscribe({
      next: st => { this.status.set(st); this.loading.set(false); },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível carregar sua assinatura agora. Tente de novo em instantes.'));
      },
    });
  }
}
