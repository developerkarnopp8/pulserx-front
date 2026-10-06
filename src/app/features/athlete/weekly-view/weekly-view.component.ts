import { Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TrainingPlan, TrainingDay, TrainingCategory, TRAINING_CATEGORY_LABEL } from '../../../core/models';
import { categoriesOf, currentWeekNumber, defaultCategory, pickPlan } from '../../../shared/utils/plan-selection';
import { PlanCalendarModalComponent } from '../../../shared/components/plan-calendar-modal/plan-calendar-modal.component';
import { toLocalDateKey } from '../../../shared/utils/date-key';
import { exportWeekToPdf, exportMonthToPdf } from '../../../shared/utils/plan-pdf-export';
import { SESSION_TYPE_ICON, SESSION_TYPE_LABEL, longDate, planDayDate, sessionPreview } from '../../../shared/utils/home-view';

/** Ícone de cada categoria nas abas do treino. */
export const CATEGORY_ICON: Record<TrainingCategory, string> = { PERFORMANCE: 'bolt', CORE: 'sports_gymnastics', LPO: 'fitness_center' };

@Component({
  selector: 'app-weekly-view',
  standalone: true,
  imports: [CommonModule, RouterLink, PlanCalendarModalComponent],
  templateUrl: './weekly-view.component.html',
  styleUrl: './weekly-view.component.scss'
})
export class WeeklyViewComponent implements OnInit {
  plan = signal<TrainingPlan | null>(null);
  selectedWeek = signal(0);
  selectedDay = signal<TrainingDay | null>(null);
  allPlans = signal<TrainingPlan[]>([]);
  categories = signal<TrainingCategory[]>([]);
  selectedCategory = signal<TrainingCategory | null>(null);
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;
  readonly categoryIcon = CATEGORY_ICON;
  readonly typeLabel = SESSION_TYPE_LABEL;
  readonly typeIcon = SESSION_TYPE_ICON;
  readonly preview = sessionPreview;

  /** Semana aberta (objeto) — atalho para o template. */
  week = computed(() => this.plan()?.weeks.at(this.selectedWeek()) ?? null);
  /** "Dia X de N" do dia aberto dentro da semana do plano. */
  dayPosition = computed(() => {
    const days = this.week()?.days ?? [];
    const i = days.findIndex(d => d.id === this.selectedDay()?.id);
    return i >= 0 ? { index: i + 1, total: days.length } : null;
  });
  doneCount = computed(() => (this.selectedDay()?.sessions ?? []).filter(s => s.status === 'done').length);
  /** Primeira sessão pendente do dia aberto: ganha destaque e o botão Iniciar. */
  nextSessionId = computed(() => (this.selectedDay()?.sessions ?? []).find(s => s.status === 'none')?.id ?? null);
  /** Só os planos da categoria aberta — o calendário não mistura Core com Performance. */
  plansOfCategory = computed(() => this.allPlans().filter(p => p.category === this.selectedCategory()));
  private student: { currentMonth: number; currentWeek: number } = { currentMonth: 1, currentWeek: 1 };
  workoutDates = signal<Set<string>>(new Set());
  showCalendarModal = signal(false);

  @ViewChild('dayScroller') dayScroller?: ElementRef<HTMLElement>;

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.api.getMyStudentProfile().subscribe({
      next: student => {
        this.api.getPlansByStudent(student.id).subscribe({
          next: plans => {
            this.student = student;
            this.allPlans.set(plans);
            this.categories.set(categoriesOf(plans));
            const category = defaultCategory(plans);
            if (category) this.selectCategory(category);
          },
        });
        this.api.getWorkoutHistory(500).subscribe(logs => {
          // toLocalDateKey (não toDateKey/UTC): completedAt é um timestamp
          // real de quando o atleta registrou o treino — o "dia" dele é o
          // dia local do atleta, não o dia UTC do instante.
          this.workoutDates.set(new Set(logs.map(l => toLocalDateKey(l.completedAt))));
        });
      },
    });
  }

  /** Abre o plano da categoria (Performance / Core / LPO) na semana e no dia de hoje. */
  selectCategory(category: TrainingCategory): void {
    const plan = pickPlan(this.allPlans(), category, this.student.currentMonth);
    if (!plan) return;
    this.selectedCategory.set(category);
    this.plan.set(plan);

    const weekNumber = currentWeekNumber(plan, this.student.currentWeek);
    const weekIndex = plan.weeks.findIndex(w => w.weekNumber === weekNumber);
    this.selectedWeek.set(weekIndex >= 0 ? weekIndex : 0);

    const week = plan.weeks.at(weekIndex >= 0 ? weekIndex : 0);
    const today = week?.days.find(d => d.dayIndex === new Date().getDay());
    const initialDay = today ?? week?.days[0] ?? null;
    this.selectedDay.set(initialDay);
    if (initialDay) {
      setTimeout(() => this.scrollDayIntoView(initialDay.id));
    }
  }

  selectDay(day: TrainingDay, event?: Event): void {
    this.selectedDay.set(day);
    const target = event?.currentTarget as HTMLElement | undefined;
    try { target?.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } catch {}
  }

  private scrollDayIntoView(dayId: string): void {
    try {
      this.dayScroller?.nativeElement
        .querySelector(`[data-day-id="${dayId}"]`)
        ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    } catch {}
  }

  exportCurrentWeekPdf(): void {
    const p = this.plan();
    const weekNumber = p?.weeks.at(this.selectedWeek())?.weekNumber;
    if (!p || weekNumber == null) return;
    this.api.getWorkoutHistory(500).subscribe(logs =>
      exportWeekToPdf(p, weekNumber, this.auth.currentUser()?.name ?? '', logs));
  }

  exportCurrentMonthPdf(): void {
    const p = this.plan();
    if (!p) return;
    this.api.getWorkoutHistory(500).subscribe(logs =>
      exportMonthToPdf(p, this.auth.currentUser()?.name ?? '', logs));
  }

  onCalendarDaySelected(sel: { planId: string; weekNumber: number }): void {
    this.showCalendarModal.set(false);
    const target = this.allPlans().find(p => p.id === sel.planId);
    if (!target) return;
    this.plan.set(target);
    const idx = target.weeks.findIndex(w => w.weekNumber === sel.weekNumber);
    this.selectedWeek.set(idx >= 0 ? idx : 0);
    const week = target.weeks.at(idx >= 0 ? idx : 0);
    const day = week?.days[0] ?? null;
    this.selectedDay.set(day);
    if (day) {
      setTimeout(() => this.scrollDayIntoView(day.id));
    }
  }

  getCompletionForDay(day: TrainingDay): number {
    const all = day.sessions.flatMap(s => s.exercises);
    if (!all.length) return 0;
    return Math.round((all.filter(e => e.completed).length / all.length) * 100);
  }

  /** Data real do dia (quando dá para saber — ver planDayDate); null = mostra só o dia da semana. */
  dayDate(day: TrainingDay): Date | null {
    const p = this.plan();
    const w = this.week();
    return p && w ? planDayDate(p, w.weekNumber, day.dayIndex, this.student.currentWeek) : null;
  }

  /** Título do dia aberto: "Quinta-feira, 24 de outubro" quando a data é conhecida, senão o nome do dia. */
  dayTitle(day: TrainingDay): string {
    const date = this.dayDate(day);
    return date ? longDate(date) : day.dayOfWeek;
  }

  isToday(day: TrainingDay): boolean {
    return day.dayIndex === new Date().getDay();
  }
}
