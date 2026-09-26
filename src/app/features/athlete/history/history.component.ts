import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, WorkoutLogEntry } from '../../../core/services/api.service';
import { WorkoutSessionRecord } from '../../../core/models';
import { WorkoutHistoryCalendarComponent } from '../../../shared/components/workout-history-calendar/workout-history-calendar.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, WorkoutHistoryCalendarComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  loading = signal(true);
  logs    = signal<WorkoutLogEntry[]>([]);
  sessions = signal<WorkoutSessionRecord[]>([]);

  avgSessionSeconds = computed(() => {
    const list = this.sessions();
    if (!list.length) return 0;
    return Math.round(list.reduce((a, s) => a + s.elapsedSeconds, 0) / list.length);
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getWorkoutHistory().subscribe({
      next: logs => { this.logs.set(logs); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
    this.api.getMyWorkoutSessions().subscribe(s => this.sessions.set(s));
  }
}
