import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student, TrainingPlan, TRAINING_CATEGORY_LABEL } from '../../../core/models';
import { toLocalDateKey } from '../../../shared/utils/date-key';

type SharedCategory = 'CORE' | 'LPO';

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss',
})
export class PlansComponent implements OnInit {
  students = signal<Student[]>([]);
  loading = signal(true);

  sharedPlans = signal<TrainingPlan[]>([]);
  sharedLoading = signal(true);
  sharedError = signal('');
  showSharedForm = signal(false);
  creatingShared = signal(false);
  sharedForm: FormGroup;

  readonly sharedCategories: SharedCategory[] = ['CORE', 'LPO'];
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.sharedForm = this.fb.group({
      category: ['CORE' as SharedCategory, Validators.required],
      title: ['', [Validators.required, Validators.maxLength(120)]],
      month: [1, [Validators.required, Validators.min(1)]],
      startDate: [toLocalDateKey(new Date()), Validators.required],
    });
  }

  ngOnInit(): void {
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.api.getStudents(coach.id).subscribe({
      next: s => { this.students.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.loadSharedPlans();
  }

  private loadSharedPlans(): void {
    this.sharedLoading.set(true);
    this.api.getSharedPlans().subscribe({
      next: plans => { this.sharedPlans.set(plans); this.sharedLoading.set(false); },
      error: () => { this.sharedError.set('Não foi possível carregar os planos compartilhados.'); this.sharedLoading.set(false); },
    });
  }

  createShared(): void {
    if (this.sharedForm.invalid) { this.sharedForm.markAllAsTouched(); return; }
    const { category, title, month, startDate } = this.sharedForm.value as {
      category: SharedCategory; title: string; month: number; startDate: string;
    };
    this.creatingShared.set(true);
    this.sharedError.set('');
    this.api.createSharedPlan(category, title.trim(), month, startDate).subscribe({
      next: plan => {
        this.creatingShared.set(false);
        this.router.navigate(['/coach/plan-builder/shared', plan.id]);
      },
      error: () => {
        this.creatingShared.set(false);
        this.sharedError.set('Não foi possível criar o plano compartilhado. Tente novamente.');
      },
    });
  }

  /** Semanas e sessões cadastradas no plano (o que já está montado no construtor). */
  planCounts(plan: TrainingPlan): { weeks: number; sessions: number } {
    const sessions = plan.weeks.reduce((n, w) => n + w.days.reduce((m, d) => m + d.sessions.length, 0), 0);
    return { weeks: plan.weeks.length, sessions };
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
