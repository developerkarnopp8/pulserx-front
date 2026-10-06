import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, WorkoutLogEntry } from '../../../core/services/api.service';
import { PersonalRecord, WorkoutSessionRecord } from '../../../core/models';
import { WorkoutHistoryCalendarComponent } from '../../../shared/components/workout-history-calendar/workout-history-calendar.component';
import { StreakResult, trainingStreak } from '../../../shared/utils/training-streak';
import { PrProgression, WeekTraining, prProgressions, sparklinePoints, weeklyTrainingDays } from '../../../shared/utils/athlete-evolution';

/** Mesma janela do card de sequência da Início — cheia, a tela mostra "N+". */
const HISTORY_LIMIT = 200;
const SPARK_W = 96;
const SPARK_H = 28;
/** Gráfico grande do movimento escolhido. */
const BIG_W = 300;
const BIG_H = 96;

/**
 * Evolução: painel do PRÓPRIO atleta (nos planos fixos quem analisa o desempenho é ele — decisão
 * do dono). Tudo calculado do histórico real: treinos, sessões e registros de PR.
 */
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, WorkoutHistoryCalendarComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  loading  = signal(true);
  logs     = signal<WorkoutLogEntry[]>([]);
  sessions = signal<WorkoutSessionRecord[]>([]);
  records  = signal<PersonalRecord[]>([]);
  errorMsg = signal('');

  readonly sparkW = SPARK_W;
  readonly sparkH = SPARK_H;

  avgSessionSeconds = computed(() => {
    const list = this.sessions();
    if (!list.length) return 0;
    return Math.round(list.reduce((a, s) => a + s.elapsedSeconds, 0) / list.length);
  });

  streak = computed<StreakResult>(() =>
    trainingStreak(this.logs().map(l => l.completedAt), new Date(), this.logs().length >= HISTORY_LIMIT),
  );

  weeks = computed<WeekTraining[]>(() => weeklyTrainingDays(this.logs().map(l => l.completedAt), new Date()));

  /** Média de dias treinados por semana nas semanas mostradas (1 casa). */
  weeklyAverage = computed(() => {
    const w = this.weeks();
    return Math.round((w.reduce((n, x) => n + x.days, 0) / w.length) * 10) / 10;
  });

  progressions = computed<PrProgression[]>(() => prProgressions(this.records()));

  readonly bigW = BIG_W;
  readonly bigH = BIG_H;
  /** Movimento aberto no card grande; null = o primeiro da lista. */
  selectedMovementId = signal<string | null>(null);
  selected = computed<PrProgression | null>(() => {
    const list = this.progressions();
    return list.find(p => p.movementId === this.selectedMovementId()) ?? list[0] ?? null;
  });
  /** Ganho em % da primeira marca até a melhor (arredondado); 0 sem ganho. */
  gainPercent = computed(() => {
    const p = this.selected();
    return p && p.firstKg > 0 && p.gainKg > 0 ? Math.round((p.gainKg / p.firstKg) * 100) : 0;
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getWorkoutHistory(HISTORY_LIMIT).subscribe({
      next: logs => { this.logs.set(logs); this.loading.set(false); },
      error: () => { this.loading.set(false); this.errorMsg.set('Não foi possível carregar seu histórico de treinos.'); },
    });
    this.api.getMyWorkoutSessions().subscribe({ next: s => this.sessions.set(s), error: () => {} });
    this.api.getMyPersonalRecords().subscribe({ next: r => this.records.set(r), error: () => {} });
  }

  /** Altura da barra em % (7 dias = 100%). Mínimo visível pra semana com 1 dia. */
  barHeight(days: number): number {
    return days === 0 ? 0 : Math.max(8, Math.round((days / 7) * 100));
  }

  sparkPath(p: PrProgression): string {
    return sparklinePoints(p.points.map(x => x.loadKg), SPARK_W, SPARK_H)
      .map((pt, i) => `${i ? 'L' : 'M'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
  }

  /** Mesma linha da evolução, no tamanho do card grande. */
  bigPath(p: PrProgression): string {
    return sparklinePoints(p.points.map(x => x.loadKg), BIG_W, BIG_H)
      .map((pt, i) => `${i ? 'L' : 'M'}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
  }

  bigPoints(p: PrProgression): { x: number; y: number }[] {
    return sparklinePoints(p.points.map(x => x.loadKg), BIG_W, BIG_H);
  }

  sparkLast(p: PrProgression): { x: number; y: number } {
    return sparklinePoints(p.points.map(x => x.loadKg), SPARK_W, SPARK_H).at(-1)!;
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '—';
    const min = Math.round(seconds / 60);
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
  }
}
