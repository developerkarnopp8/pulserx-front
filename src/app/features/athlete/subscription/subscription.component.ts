import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { MySubscription, TRAINING_CATEGORY_LABEL, SUBSCRIPTION_STATUS_LABEL } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';

@Component({
  selector: 'app-athlete-subscription',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './subscription.component.html',
  styleUrl: './subscription.component.scss',
})
export class AthleteSubscriptionComponent implements OnInit {
  data       = signal<MySubscription | null>(null);
  loading    = signal(true);
  canceling  = signal(false);
  errorMsg   = signal('');
  cancelMsg  = signal('');

  readonly fmtPrice = formatCents;
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;
  readonly statusLabel = SUBSCRIPTION_STATUS_LABEL;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.getMySubscription().subscribe({
      next: data => { this.data.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.errorMsg.set('Não foi possível carregar sua assinatura.'); },
    });
  }

  cancel(): void {
    if (!confirm('Cancelar sua assinatura? Seu treinador será avisado.')) return;
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
