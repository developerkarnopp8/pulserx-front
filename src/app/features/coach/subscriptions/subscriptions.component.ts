import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { SubscriptionPlan, TrainingCategory, TRAINING_CATEGORY_LABEL } from '../../../core/models';
import { formatCents, reaisToCents, centsToReaisInput } from '../../../shared/utils/currency';
import { apiMessage } from '../../../shared/utils/signup-flow';

type ModalMode = 'add' | 'edit';

@Component({
  selector: 'app-coach-subscriptions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './subscriptions.component.html',
  styleUrl: './subscriptions.component.scss',
})
export class CoachSubscriptionsComponent implements OnInit {
  plans      = signal<SubscriptionPlan[]>([]);
  loading    = signal(true);
  errorMsg   = signal('');

  showModal  = signal(false);
  modalMode  = signal<ModalMode>('add');
  editingId  = signal<string | null>(null);
  saving     = signal(false);
  formError  = signal('');

  readonly categories: TrainingCategory[] = ['CORE', 'LPO', 'PERFORMANCE'];
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;
  readonly fmtPrice = formatCents;

  form!: FormGroup;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
      description: ['', Validators.maxLength(300)],
      priceReais: [0, [Validators.required, Validators.min(0)]],
      categories: this.fb.group(Object.fromEntries(this.categories.map(c => [c, false]))),
      isFree: [false],
      active: [true],
    });
  }

  // ── Recebimento (carteira Asaas) — sem ela, nenhum plano pago consegue ser cobrado ──
  walletId      = signal<string | null>(null);
  walletInput   = signal('');
  walletLoading = signal(true);
  savingWallet  = signal(false);
  walletMsg     = signal('');
  walletError   = signal('');

  ngOnInit(): void {
    this.load();
    this.api.getMyWallet().subscribe({
      next: w => { this.walletId.set(w.walletId); this.walletInput.set(w.walletId ?? ''); this.walletLoading.set(false); },
      error: () => this.walletLoading.set(false),
    });
  }

  saveWallet(): void {
    const value = this.walletInput().trim();
    if (value.length < 10 || this.savingWallet()) {
      this.walletError.set('Cole o Wallet ID completo da sua conta Asaas.');
      return;
    }
    this.savingWallet.set(true);
    this.walletError.set('');
    this.walletMsg.set('');
    this.api.setMyWallet(value).subscribe({
      next: w => {
        this.walletId.set(w.walletId);
        this.savingWallet.set(false);
        this.walletMsg.set('Carteira salva. Seus alunos já podem assinar planos pagos.');
      },
      error: err => {
        this.savingWallet.set(false);
        this.walletError.set(apiMessage(err, 'Não foi possível salvar a carteira.'));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.api.getSubscriptionPlans().subscribe({
      next: plans => { this.plans.set(plans); this.loading.set(false); },
      error: () => { this.errorMsg.set('Não foi possível carregar o catálogo de planos.'); this.loading.set(false); },
    });
  }

  private selectedCategories(): TrainingCategory[] {
    const group = this.form.get('categories')!.value as Record<TrainingCategory, boolean>;
    return this.categories.filter(c => group[c]);
  }

  openAdd(): void {
    this.modalMode.set('add');
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({ name: '', description: '', priceReais: 0, isFree: false, active: true });
    this.form.get('categories')!.reset(Object.fromEntries(this.categories.map(c => [c, false])));
    this.showModal.set(true);
  }

  openEdit(plan: SubscriptionPlan): void {
    this.modalMode.set('edit');
    this.editingId.set(plan.id);
    this.formError.set('');
    this.form.reset({
      name: plan.name,
      description: plan.description ?? '',
      priceReais: Number(centsToReaisInput(plan.priceCents)),
      isFree: plan.isFree,
      active: plan.active,
    });
    this.form.get('categories')!.reset(Object.fromEntries(this.categories.map(c => [c, plan.categories.includes(c)])));
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.saving.set(false);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value as { name: string; description: string; priceReais: number; isFree: boolean; active: boolean };
    const isFree = v.isFree;
    const dto = {
      name: v.name.trim(),
      description: v.description?.trim() || undefined,
      priceCents: isFree ? 0 : reaisToCents(v.priceReais),
      categories: this.selectedCategories(),
      isFree,
      active: v.active,
    };
    this.saving.set(true);
    this.formError.set('');

    const id = this.editingId();
    const request = id ? this.api.updateSubscriptionPlan(id, dto) : this.api.createSubscriptionPlan(dto);
    request.subscribe({
      next: plan => {
        this.plans.update(list => id ? list.map(p => p.id === id ? plan : p) : [...list, plan]);
        this.closeModal();
      },
      error: err => {
        this.formError.set(apiMessage(err, 'Não foi possível salvar o plano.'));
        this.saving.set(false);
      },
    });
  }

  toggleActive(plan: SubscriptionPlan): void {
    this.api.updateSubscriptionPlan(plan.id, { active: !plan.active }).subscribe({
      next: updated => this.plans.update(list => list.map(p => p.id === plan.id ? updated : p)),
      error: () => this.errorMsg.set('Não foi possível atualizar o plano. Tente novamente.'),
    });
  }
}
