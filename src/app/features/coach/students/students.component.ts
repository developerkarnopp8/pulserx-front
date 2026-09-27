import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student, SubscriptionPlan, Subscription, TRAINING_CATEGORY_LABEL } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';
import { formatDurationShort } from '../../../shared/utils/format-duration';

type ModalMode = 'add' | 'edit';

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

  filtered = computed(() =>
    this.students().filter(s =>
      s.name.toLowerCase().includes(this.search().toLowerCase()) ||
      s.email.toLowerCase().includes(this.search().toLowerCase())
    )
  );

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
}
