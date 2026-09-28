import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student, SubscriptionPlan, Subscription, SubscriptionStatus, SUBSCRIPTION_STATUS_LABEL, TRAINING_CATEGORY_LABEL } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';
import { formatDurationShort } from '../../../shared/utils/format-duration';

type ModalMode = 'add' | 'edit';

/** Aba de filtro: status da assinatura, "sem plano", ou o id de um plano específico. */
type FilterTab = 'all' | 'no_plan' | 'TRIALING' | 'PAST_DUE';

interface PlanTabOption {
  id: string;
  name: string;
  count: number;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss'
})
export class StudentsComponent implements OnInit {
  students      = signal<Student[]>([]);
  pendingSkips  = signal<Record<string, number>>({});
  /** studentId → tempo médio de treino em segundos (últimos 30 dias) */
  avgByStudent  = signal<Record<string, number>>({});
  fmtDuration   = formatDurationShort;
  search        = signal('');
  showModal     = signal(false);
  modalMode     = signal<ModalMode>('add');
  saving        = signal(false);
  deleting      = signal<string | null>(null);
  errorMsg      = signal('');
  editingId     = signal<string | null>(null);

  // ── Assinatura (atribuir plano ao aluno) ──────────────────────────────────
  subscriptionPlans   = signal<SubscriptionPlan[]>([]);
  plansLoaded         = signal(false);
  showSubscriptionModal = signal(false);
  subscriptionTarget  = signal<Student | null>(null);
  currentSubscription = signal<Subscription | null>(null);
  loadingSubscription = signal(false);
  selectedPlanId      = signal('');
  assigning           = signal(false);
  subscriptionError   = signal('');
  readonly fmtPrice = formatCents;
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;
  readonly statusLabelMap = SUBSCRIPTION_STATUS_LABEL;

  // ── Filtros por status/plano da assinatura (dado real, vindo junto de GET /students) ──────
  filterTab = signal<FilterTab | string>('all');

  activeCount   = computed(() => this.students().filter(s => s.subscription?.status === 'ACTIVE').length);
  trialingCount = computed(() => this.students().filter(s => s.subscription?.status === 'TRIALING').length);
  pastDueCount  = computed(() => this.students().filter(s => s.subscription?.status === 'PAST_DUE').length);
  noPlanCount   = computed(() => this.students().filter(s => !s.subscription || s.subscription.status === 'CANCELED').length);

  /** Uma aba por plano com pelo menos 1 aluno assinante — ordem por quantidade de alunos. */
  planTabs = computed<PlanTabOption[]>(() => {
    const byPlan = new Map<string, PlanTabOption>();
    for (const s of this.students()) {
      const plan = s.subscription?.plan;
      if (!plan || s.subscription?.status === 'CANCELED') continue;
      const entry = byPlan.get(plan.id) ?? { id: plan.id, name: plan.name, count: 0 };
      entry.count++;
      byPlan.set(plan.id, entry);
    }
    return Array.from(byPlan.values()).sort((a, b) => b.count - a.count);
  });

  filtered = computed(() => {
    const term = this.search().toLowerCase();
    let list = this.students().filter(s =>
      s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
    );
    const tab = this.filterTab();
    if (tab === 'no_plan') list = list.filter(s => !s.subscription || s.subscription.status === 'CANCELED');
    else if (tab === 'TRIALING' || tab === 'PAST_DUE') list = list.filter(s => s.subscription?.status === tab);
    else if (tab !== 'all') list = list.filter(s => s.subscription?.plan.id === tab && s.subscription.status !== 'CANCELED');
    return list;
  });

  form!: FormGroup;
  editForm!: FormGroup;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name:     ['', Validators.required],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      goal:     ['', Validators.required],
    });

    this.editForm = this.fb.group({
      goal: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.api.getStudents(coach.id).subscribe(s => this.students.set(s));
    this.loadPendingSkips();
    this.loadAvgDuration();
  }

  private loadPendingSkips(): void {
    this.api.getPendingSkipCounts().subscribe(counts => {
      const map: Record<string, number> = {};
      for (const c of counts) map[c.studentId] = c.count;
      this.pendingSkips.set(map);
    });
  }

  private loadAvgDuration(): void {
    this.api.getCoachAvgDuration().subscribe(r => {
      const map: Record<string, number> = {};
      for (const b of r.byStudent) map[b.studentId] = b.avgSeconds;
      this.avgByStudent.set(map);
    });
  }

  openSubscriptionModal(student: Student): void {
    this.subscriptionTarget.set(student);
    this.subscriptionError.set('');
    this.selectedPlanId.set('');
    this.showSubscriptionModal.set(true);

    if (!this.plansLoaded()) {
      this.api.getSubscriptionPlans().subscribe(plans => {
        this.subscriptionPlans.set(plans);
        this.plansLoaded.set(true);
      });
    }

    this.loadingSubscription.set(true);
    this.currentSubscription.set(null);
    this.api.getStudentSubscription(student.id).subscribe({
      next: sub => {
        this.currentSubscription.set(sub);
        this.selectedPlanId.set(sub?.plan.id ?? '');
        this.loadingSubscription.set(false);
      },
      error: () => { this.loadingSubscription.set(false); this.subscriptionError.set('Não foi possível carregar a assinatura do aluno.'); },
    });
  }

  closeSubscriptionModal(): void {
    this.showSubscriptionModal.set(false);
    this.subscriptionTarget.set(null);
    this.assigning.set(false);
  }

  assignPlan(): void {
    const student = this.subscriptionTarget();
    const planId = this.selectedPlanId();
    if (!student || !planId) return;
    this.assigning.set(true);
    this.subscriptionError.set('');
    this.api.assignSubscription(student.id, { planId }).subscribe({
      next: sub => { this.currentSubscription.set(sub); this.assigning.set(false); },
      error: err => {
        const msg = err?.error?.message;
        this.subscriptionError.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Não foi possível atribuir o plano.'));
        this.assigning.set(false);
      },
    });
  }

  removePlan(): void {
    const student = this.subscriptionTarget();
    if (!student) return;
    if (!confirm('Remover a assinatura deste aluno? Ele volta a ficar sem plano.')) return;
    this.assigning.set(true);
    this.api.removeSubscription(student.id).subscribe({
      next: () => { this.currentSubscription.set(null); this.selectedPlanId.set(''); this.assigning.set(false); },
      error: () => { this.subscriptionError.set('Não foi possível remover a assinatura.'); this.assigning.set(false); },
    });
  }

  openModal(): void {
    this.modalMode.set('add');
    this.form.reset();
    this.errorMsg.set('');
    this.showModal.set(true);
  }

  openEditModal(student: Student): void {
    this.modalMode.set('edit');
    this.editingId.set(student.id);
    this.editForm.reset({ goal: student.goal ?? '' });
    this.errorMsg.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.saving.set(false);
    this.errorMsg.set('');
    this.editingId.set(null);
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  saveStudent(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set('');
    const { name, email, password, goal } = this.form.value as {
      name: string; email: string; password: string; goal: string;
    };
    this.api.createStudent({ name, email, password, goal }).subscribe({
      next: student => {
        this.students.update(list => [student, ...list]);
        this.closeModal();
      },
      error: err => {
        const msg = err?.error?.message;
        this.errorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao criar atleta.'));
        this.saving.set(false);
      },
    });
  }

  saveEdit(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const id = this.editingId();
    if (!id) return;
    this.saving.set(true);
    this.errorMsg.set('');
    const { goal } = this.editForm.value as { goal: string };
    this.api.updateStudent(id, { goal }).subscribe({
      next: () => {
        this.students.update(list =>
          list.map(s => s.id === id ? { ...s, goal } : s)
        );
        this.closeModal();
      },
      error: err => {
        const msg = err?.error?.message;
        this.errorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao atualizar atleta.'));
        this.saving.set(false);
      },
    });
  }

  deleteStudent(student: Student): void {
    if (!confirm(`Remover ${student.name}? Esta ação é irreversível e remove todos os dados do atleta.`)) return;
    this.deleting.set(student.id);
    this.api.deleteStudent(student.id).subscribe({
      next: () => {
        this.students.update(list => list.filter(s => s.id !== student.id));
        this.deleting.set(null);
      },
      error: () => this.deleting.set(null),
    });
  }

  subscriptionStatusLabel(student: Student): string {
    const status = student.subscription?.status;
    if (!status || status === 'CANCELED') return 'Sem plano';
    return this.statusLabelMap[status];
  }

  subscriptionStatusClass(student: Student): string {
    const status = student.subscription?.status;
    const map: Record<SubscriptionStatus, string> = {
      ACTIVE:   'bg-green-500/20 text-green-400',
      TRIALING: 'bg-tertiary/20 text-tertiary',
      PAST_DUE: 'bg-error/20 text-error',
      CANCELED: 'bg-surface-container text-outline',
    };
    return status ? map[status] : 'bg-surface-container text-outline';
  }

  formatDate(date: string | null): string {
    return date ? new Date(date).toLocaleDateString('pt-BR') : '—';
  }

  /** Exporta a lista filtrada (nome/e-mail/plano/status/datas) — sem CPF nem qualquer dado de pagamento. */
  exportCsv(): void {
    const header = ['Nome', 'E-mail', 'Objetivo', 'Plano', 'Status', 'Início', 'Renovação'];
    const rows = this.filtered().map(s => [
      s.name,
      s.email,
      s.goal,
      s.subscription?.plan.name ?? 'Sem plano',
      this.subscriptionStatusLabel(s),
      this.formatDate(s.subscription?.startedAt ?? null),
      this.formatDate(s.subscription?.renewsAt ?? null),
    ]);
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alunos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
