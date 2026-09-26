import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkoutLogEntry } from '../../../core/services/api.service';
import { formatDurationShort } from '../../utils/format-duration';
import {
  calcStreak, calcMonthCompletion, buildHistoryCalendar, historyMonthName,
} from '../../utils/workout-history-calendar';

/**
 * Calendário/streak/conclusão mensal de histórico de treino — usado tanto pelo atleta
 * (próprio histórico) quanto pelo coach (histórico de um aluno específico, aba "Histórico
 * por Aluno" na Biblioteca). Recebe os logs já carregados; não busca dado sozinho, pra
 * poder ser reusado com fontes diferentes (GET /workout-logs/history vs
 * GET /workout-logs/student/:id/history) sem duplicar a lógica de calendário/streak.
 */
@Component({
  selector: 'app-workout-history-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workout-history-calendar.component.html',
})
export class WorkoutHistoryCalendarComponent {
  @Input() set logs(value: WorkoutLogEntry[]) { this._logs.set(value ?? []); }
  private _logs = signal<WorkoutLogEntry[]>([]);

  @Input() avgSessionSeconds = 0;

  weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  fmtDuration = formatDurationShort;

  streak = computed(() => calcStreak(this._logs()));
  monthCompletion = computed(() => calcMonthCompletion(this._logs()));
  calendar = computed(() => buildHistoryCalendar(this._logs()));

  getMonthName(): string {
    return historyMonthName();
  }
}
