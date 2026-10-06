import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { MyPix } from '../../../core/models';
import { CheckoutStepsComponent, checkoutSteps } from '../../../shared/components/checkout-steps/checkout-steps.component';
import { apiMessage, isSafeCheckoutUrl } from '../../../shared/utils/signup-flow';
import { isSubscriptionReleased, pixExpiresAtMs, pixImageSrc, pixRemaining } from '../../../shared/utils/pix';

/** De quanto em quanto tempo pergunta se o pagamento caiu (a rota tem limite próprio de 40/min). */
export const PIX_POLL_MS = 5000;
/** Para de perguntar depois disso (aba esquecida aberta); o botão "Já paguei" pergunta de novo. */
export const PIX_POLL_MAX_MS = 30 * 60 * 1000;

/**
 * Pagar com PIX dentro do app (Stitch mo17): QR e copia e cola da cobrança em aberto do próprio aluno. Enquanto a tela está
 * aberta, pergunta a cada 5 s se o webhook do Asaas já confirmou; confirmou → tela de assinatura ativa.
 */
@Component({
  selector: 'app-pix-payment',
  standalone: true,
  imports: [CommonModule, RouterLink, CheckoutStepsComponent],
  templateUrl: './pix-payment.component.html',
})
export class PixPaymentComponent implements OnInit, OnDestroy {
  loading = signal(true);
  pix = signal<MyPix | null>(null);
  /** Nenhuma cobrança em aberto (já pagou ou não tem plano pago). */
  nothingOpen = signal(false);
  errorMsg = signal('');
  copied = signal(false);
  checking = signal(false);
  /** Parou de perguntar sozinho (passou de 30 min). */
  pollStopped = signal(false);
  now = signal(Date.now());

  readonly steps = checkoutSteps(3, false);

  qrSrc = computed(() => pixImageSrc(this.pix()?.qrCodeImage));
  private expiresAtMs = computed(() => pixExpiresAtMs(this.pix()?.expiresAt));
  remaining = computed(() => pixRemaining(this.expiresAtMs(), this.now()));
  expired = computed(() => {
    const exp = this.expiresAtMs();
    return exp !== null && exp <= this.now();
  });
  invoiceUrl = computed(() => {
    const url = this.pix()?.invoiceUrl ?? null;
    return isSafeCheckoutUrl(url) ? url : null;
  });

  private clock?: Subscription;
  private poll?: Subscription;
  private pollStartedAt = 0;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.api.getMyPix().subscribe({
      next: pix => {
        this.pix.set(pix);
        this.loading.set(false);
        this.clock = interval(1000).subscribe(() => this.now.set(Date.now()));
        this.startPolling();
      },
      error: err => {
        this.loading.set(false);
        if (err?.status === 404) { this.nothingOpen.set(true); return; }
        this.errorMsg.set(apiMessage(err, 'Não foi possível gerar o PIX agora. Tente de novo em instantes ou pague pela fatura.'));
      },
    });
  }

  ngOnDestroy(): void {
    this.clock?.unsubscribe();
    this.poll?.unsubscribe();
  }

  private startPolling(): void {
    this.poll?.unsubscribe();
    this.pollStopped.set(false);
    this.pollStartedAt = Date.now();
    this.poll = interval(PIX_POLL_MS).subscribe(() => {
      if (Date.now() - this.pollStartedAt > PIX_POLL_MAX_MS) {
        this.poll?.unsubscribe();
        this.pollStopped.set(true);
        return;
      }
      // Aba em segundo plano: não pergunta (economiza a cota); volta a perguntar quando o aluno volta para a aba.
      if (typeof document !== 'undefined' && document.hidden) return;
      this.checkStatus();
    });
  }

  /** Pergunta se o pagamento caiu; caiu → tela de assinatura ativa. Erro de rede é ignorado (a próxima rodada tenta). */
  checkStatus(manual = false): void {
    if (this.checking()) return;
    this.checking.set(true);
    this.api.getMyPaymentStatus().subscribe({
      next: st => {
        this.checking.set(false);
        if (isSubscriptionReleased(st.status, st.hasOpenPayment)) {
          this.router.navigate(['/assinatura/confirmada']);
          return;
        }
        if (manual) {
          this.errorMsg.set('Ainda não recebemos a confirmação do banco. Pode levar alguns segundos — esta tela atualiza sozinha.');
          this.startPolling();
        }
      },
      error: () => this.checking.set(false),
    });
  }

  async copyCode(): Promise<void> {
    const code = this.pix()?.pixCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 3000);
    } catch {
      this.errorMsg.set('Não foi possível copiar. Selecione o código e copie manualmente.');
    }
  }

  /** Fatura do Asaas (boleto ou cartão), fora do app — só link https. */
  openInvoice(): void {
    const url = this.invoiceUrl();
    if (url) this.redirectTo(url);
  }

  /** Separado para teste. */
  protected redirectTo(url: string): void {
    window.location.assign(url);
  }

  fmtAmount(reais: number): string {
    return reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
