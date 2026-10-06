import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AppNotification, FinancialSummary, Student } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';
import { NOTIFICATION_FEED, attentionList, initials, latestNotifications } from '../../../shared/utils/coach-dashboard';
import { formatDurationShort } from '../../../shared/utils/format-duration';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  students  = signal<Student[]>([]);
  /** Média do completionPercent (% do plano do MÊS atual, não da semana) entre os alunos do coach */
  monthlyAvg = computed(() => {
    const list = this.students();
    if (!list.length) return 0;
    const total = list.reduce((sum, s) => sum + (s.completionPercent ?? 0), 0);
    return Math.round(total / list.length);
  });

  /** [Dom, Seg, Ter, Qua, Qui, Sex, Sáb] — índice = dayIndex real do backend (0-6) */
  weeklyCompletion = signal<number[]>([0, 0, 0, 0, 0, 0, 0]);
  readonly todayDayIndex = new Date().getDay();

  /** Tempo médio de treino (em segundos) entre os alunos do coach — últimos 30 dias */
  avgDuration = signal<number>(0);
  fmtDuration = formatDurationShort;
  readonly fmtCents = formatCents;
  readonly feedStyle = NOTIFICATION_FEED;
  readonly initials = initials;

  /** Resumo financeiro (MRR e inadimplentes); null = não carregou (o card não aparece). */
  financial = signal<FinancialSummary | null>(null);
  skipCounts = signal<{ studentId: string; count: number }[]>([]);
  notifications = signal<AppNotification[]>([]);

  /** Pulos de treino ainda sem resposta do coach (todos os alunos). */
  pendingSkips = computed(() => this.skipCounts().reduce((n, s) => n + s.count, 0));
  attention = computed(() => attentionList(this.students(), this.skipCounts()));
  feed = computed(() => latestNotifications(this.notifications(), 5));

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.api.getStudents(coach.id).subscribe(s => this.students.set(s));
    this.api.getWeeklyCompletion().subscribe(days => {
      const byIndex = [0, 0, 0, 0, 0, 0, 0];
      for (const d of days) byIndex[d.dayIndex] = d.percent;
      this.weeklyCompletion.set(byIndex);
    });
    this.api.getCoachAvgDuration().subscribe(r => this.avgDuration.set(r.overallAvgSeconds));
    // Cards extras: falha só esconde o card, não derruba o painel.
    this.api.getFinancialSummary().subscribe({ next: f => this.financial.set(f), error: () => {} });
    this.api.getPendingSkipCounts().subscribe({ next: c => this.skipCounts.set(c), error: () => {} });
    this.api.getNotifications().subscribe({ next: n => this.notifications.set(n), error: () => {} });
  }

}
