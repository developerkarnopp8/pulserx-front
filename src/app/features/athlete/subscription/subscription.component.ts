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
  data     = signal<MySubscription | null>(null);
  loading  = signal(true);
  errorMsg = signal('');

  readonly fmtPrice = formatCents;
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;
  readonly statusLabel = SUBSCRIPTION_STATUS_LABEL;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getMySubscription().subscribe({
      next: data => { this.data.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.errorMsg.set('Não foi possível carregar sua assinatura.'); },
    });
  }
}
