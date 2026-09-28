import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Session } from '../../../core/models';
import { todaySessions } from '../../../shared/utils/plan-selection';
import { LatestPr, StreakResult, WeekDay, currentWeek, latestLoadPr, trainingStreak } from '../../../shared/utils/training-streak';

const WATER_TAP_ML = 250;
/** Janela do histórico usada pra sequência; se vier cheia, a tela mostra "N+" (nunca inventa o total). */
const STREAK_HISTORY_LIMIT = 200;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  todaySessions = signal<Session[]>([]);
  greeting = signal('Boa tarde');

  /** % real de sessões de hoje já concluídas — mesmo critério (session.status) usado no Cronograma abaixo */
  dailyGoalPercent = computed(() => {
    const sessions = this.todaySessions();
    if (!sessions.length) return 0;
    const done = sessions.filter(s => s.status === 'done').length;
    return Math.round((done / sessions.length) * 100);
  });

  hydrationMl = signal(0);
  /** 2 casas — com passos de +250ml, 1 casa arredonda de forma enganosa
   * (ex.: 250ml exibia "0.3L" por causa do desempate do toFixed, dando
   * a impressão de 300ml logados quando só 250ml foram registrados). */
  hydration = computed(() => (this.hydrationMl() / 1000).toFixed(2));
  calories = signal(0);

  addingCalories = signal(false);
  calorieInput = signal<number | null>(null);
  loggingWater = signal(false);
  loggingCalories = signal(false);

  streak = signal<StreakResult | null>(null);
  week = signal<WeekDay[]>([]);
  latestPr = signal<LatestPr | null>(null);
  prsLoaded = signal(false);

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    const h = new Date().getHours();
    this.greeting.set(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

    this.api.getMyStudentProfile().subscribe({
      next: student => {
        this.api.getPlansByStudent(student.id).subscribe({
          next: plans => {
            if (!plans.length) return;
            this.todaySessions.set(todaySessions(plans, student));
          },
        });
      },
    });

    // Cards de sequência e PR: falha só esconde o card, não derruba a Início.
    this.api.getWorkoutHistory(STREAK_HISTORY_LIMIT).subscribe({
      next: logs => {
        const now = new Date();
        const dates = logs.map(l => l.completedAt);
        this.streak.set(trainingStreak(dates, now, logs.length >= STREAK_HISTORY_LIMIT));
        this.week.set(currentWeek(dates, now));
      },
      error: () => {},
    });

    this.api.getMyPersonalRecords().subscribe({
      next: records => { this.latestPr.set(latestLoadPr(records)); this.prsLoaded.set(true); },
      error: () => {},
    });

    this.api.getTodayIntake().subscribe(t => {
      this.hydrationMl.set(t.hydrationMl);
      this.calories.set(t.calories);
    });
  }

  addWater(): void {
    if (this.loggingWater()) return;
    this.loggingWater.set(true);
    this.api.logHydration(WATER_TAP_ML).subscribe({
      next: () => { this.hydrationMl.update(v => v + WATER_TAP_ML); this.loggingWater.set(false); },
      error: () => this.loggingWater.set(false),
    });
  }

  openCalorieInput(): void {
    this.calorieInput.set(null);
    this.addingCalories.set(true);
  }

  cancelCalorieInput(): void {
    this.addingCalories.set(false);
  }

  confirmCalories(): void {
    const kcal = this.calorieInput();
    if (!kcal || kcal <= 0 || this.loggingCalories()) return;
    this.loggingCalories.set(true);
    this.api.logCalories(kcal).subscribe({
      next: () => {
        this.calories.update(v => v + kcal);
        this.addingCalories.set(false);
        this.calorieInput.set(null);
        this.loggingCalories.set(false);
      },
      error: () => this.loggingCalories.set(false),
    });
  }

  getWeekDay(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  }

  isNextSession(session: Session): boolean {
    const pending = this.todaySessions().filter(s => s.status === 'none');
    return pending.length > 0 && pending[0].id === session.id;
  }
}
