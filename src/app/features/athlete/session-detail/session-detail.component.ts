import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Session, Exercise, SkipReason, SkipDecision } from '../../../core/models';
import { SkipReasonModalComponent } from '../../../shared/components/skip-reason-modal/skip-reason-modal.component';
import { Subject, interval, takeUntil } from 'rxjs';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, SkipReasonModalComponent, YoutubeEmbedComponent],
  templateUrl: './session-detail.component.html',
  styleUrl: './session-detail.component.scss'
})
export class SessionDetailComponent implements OnInit, OnDestroy {
  session = signal<Session | null>(null);
  timerActive = signal(false);
  timerSeconds = signal(0);
  timerTarget = signal(90);
  timerExercise = signal<Exercise | null>(null);
  skipModalOpen = signal(false);
  skipError     = signal('');
  expandedVideoId = signal<string | null>(null);

  toggleVideo(id: string): void {
    this.expandedVideoId.update(current => current === id ? null : id);
  }

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') ?? '';
    this.api.getSession(id).subscribe(s => this.session.set(s));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  toggleExercise(ex: Exercise): void {
    ex.completed = !ex.completed;
    if (ex.completed) {
      this.api.logExercise(ex.id, ex.sets ?? 1).subscribe();
    }
    this.session.update(s => s ? { ...s } : null);
  }

  startTimer(ex: Exercise): void {
    this.timerExercise.set(ex);
    this.timerTarget.set(ex.restSeconds ?? 90);
    this.timerSeconds.set(ex.restSeconds ?? 90);
    this.timerActive.set(true);

    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const cur = this.timerSeconds();
      if (cur <= 1) {
        this.timerSeconds.set(0);
        this.timerActive.set(false);
      } else {
        this.timerSeconds.set(cur - 1);
      }
    });
  }

  closeTimer(): void { this.timerActive.set(false); this.destroy$.next(); }

  openSkipSession(): void {
    this.skipModalOpen.set(true);
  }

  onSkipConfirmed(payload: { reason: SkipReason; decision: SkipDecision; note?: string }): void {
    this.skipModalOpen.set(false);
    const s = this.session();
    if (!s) return;

    this.api.skip({ sessionId: s.id }, payload.reason, payload.decision, payload.note).subscribe({
      next: () => this.router.navigate(['/athlete/home']),
      error: () => this.showSkipError(),
    });
  }

  onSkipCancelled(): void {
    this.skipModalOpen.set(false);
  }

  private showSkipError(): void {
    this.skipError.set('Não foi possível registrar o pulo. Tente novamente.');
    setTimeout(() => this.skipError.set(''), 3500);
  }

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  }

  getTimerProgress(): number {
    const target = this.timerTarget();
    return target ? ((target - this.timerSeconds()) / target) * 100 : 0;
  }

  formatReps(ex: Exercise): string {
    if (ex.duration) return ex.duration;
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets}`);
    if (ex.reps) parts.push(`× ${ex.reps}`);
    return parts.join(' ') || '—';
  }
}
