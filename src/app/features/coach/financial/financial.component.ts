import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Payment, PaymentSummary, Student, FinancialSummary, MonthlyBreakdown, CoachGatewayPayment, GATEWAY_PAYMENT_STATUS_LABEL } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';
import { SplitSegment, shareOfMax, splitSegments } from '../../../shared/utils/split-bar';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-financial',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './financial.component.html',
  // Mesmo :host das outras telas do coach: ocupa a altura do <main> e rola por dentro.
  styleUrl: './financial.component.scss',
})
export class FinancialComponent implements OnInit {
  payments    = signal<Payment[]>([]);
  summary     = signal<PaymentSummary | null>(null);
  students    = signal<Student[]>([]);
  loading     = signal(true);
  showModal   = signal(false);
  saving      = signal(false);

  /** MRR/receita por plano, inadimplência e churn/LTV — assinaturas reais (Asaas), não o log manual abaixo. */
  financialSummary = signal<FinancialSummary | null>(null);
  loadingSummary   = signal(true);
  readonly fmtCents = formatCents;
  readonly gatewayStatusLabel = GATEWAY_PAYMENT_STATUS_LABEL;
  /** Paleta validada (dataviz) no fundo escuro — mesma dos pontos de legenda nos cards. */
  readonly segmentColor: Record<SplitSegment['key'], string> = { gateway: '#199e70', platform: '#3987e5', coach: '#d95926' };

  /** Repasse do mês (cobranças pagas): bruto, taxa real do Asaas, % da AEVON e líquido do coach. */
  monthly        = signal<MonthlyBreakdown | null>(null);
  gatewayPayments = signal<CoachGatewayPayment[]>([]);

  split = computed<SplitSegment[]>(() => {
    const m = this.monthly()?.month;
    return m ? splitSegments(m.gatewayFee, m.platformFee, m.coachNet) : [];
  });

  /** Largura da barra de cada plano em relação ao de maior receita. */
  planShares = computed(() => shareOfMax(this.financialSummary()?.revenueByPlan.map(p => p.mrrCents) ?? []));

  form!: FormGroup;

  statusFilter = signal<'all' | 'pending' | 'paid' | 'overdue'>('all');

  filtered = computed(() => {
    const f = this.statusFilter();
    if (f === 'all') return this.payments();
    return this.payments().filter(p => p.status === f);
  });

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      studentId:   ['', Validators.required],
      amount:      [null, [Validators.required, Validators.min(0.01)]],
      dueDate:     ['', Validators.required],
      description: [''],
    });
  }

  ngOnInit(): void {
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.api.getStudents(coach.id).subscribe(s => this.students.set(s));
    this.loadData();
    this.loadFinancialSummary();
    // Falha aqui só esconde as seções do Asaas; o resto do Financeiro segue funcionando.
    this.api.getMonthlyBreakdown().subscribe({ next: m => this.monthly.set(m), error: () => {} });
    this.api.getCoachGatewayPayments().subscribe({ next: p => this.gatewayPayments.set(p), error: () => {} });
  }

  /** Reais (Float do Asaas) → moeda; null = o Asaas ainda não informou. */
  fmtReais(value: number | null): string {
    return value == null ? '—' : formatCents(Math.round(value * 100));
  }

  private loadFinancialSummary(): void {
    this.loadingSummary.set(true);
    this.api.getFinancialSummary().subscribe({
      next: s => { this.financialSummary.set(s); this.loadingSummary.set(false); },
      error: () => this.loadingSummary.set(false),
    });
  }

  private loadData(): void {
    this.api.getPaymentSummary().subscribe(s => this.summary.set(s));
    this.api.getPayments().subscribe({
      next: p => { this.payments.set(p); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openModal(): void {
    this.form.reset();
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.saving.set(false);
  }

  createPayment(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const { studentId, amount, dueDate, description } = this.form.value as {
      studentId: string; amount: number; dueDate: string; description: string;
    };
    this.api.createPayment({ studentId, amount: Number(amount), dueDate, description: description || undefined }).subscribe({
      next: () => { this.closeModal(); this.loadData(); },
      error: () => this.saving.set(false),
    });
  }

  markPaid(payment: Payment): void {
    this.api.markPaymentPaid(payment.id).subscribe({
      next: updated => this.payments.update(list => list.map(p => p.id === updated.id ? updated : p)),
    });
    this.api.getPaymentSummary().subscribe(s => this.summary.set(s));
  }

  async deletePayment(payment: Payment): Promise<void> {
    const ok = await confirmDialog.ask({
      title: 'Remover lançamento?', message: 'Ele sai do seu financeiro.', confirmLabel: 'Remover', danger: true,
    });
    if (!ok) return;
    this.api.deletePayment(payment.id).subscribe({
      next: () => {
        this.payments.update(list => list.filter(p => p.id !== payment.id));
        this.api.getPaymentSummary().subscribe(s => this.summary.set(s));
      },
    });
  }

  getStudentName(payment: Payment): string {
    return payment.student?.user.name
      ?? this.students().find(s => s.id === payment.studentId)?.name
      ?? '—';
  }

  statusLabel(status: string): string {
    return { pending: 'Pendente', paid: 'Pago', overdue: 'Atrasado' }[status] ?? status;
  }

  statusClass(status: string): string {
    return {
      pending: 'bg-yellow-500/20 text-yellow-400',
      paid:    'bg-green-500/20 text-green-400',
      overdue: 'bg-error/20 text-error',
    }[status] ?? 'bg-surface-container text-outline';
  }

  formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
