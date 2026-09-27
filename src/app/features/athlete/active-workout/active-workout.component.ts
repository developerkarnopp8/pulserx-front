import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Session, Exercise, SkipReason, SkipDecision } from '../../../core/models';
import { SkipReasonModalComponent } from '../../../shared/components/skip-reason-modal/skip-reason-modal.component';
import { Subject, interval, takeUntil } from 'rxjs';
import { loadDraft, saveDraft, clearDraft, WorkoutDraft } from '../../../shared/utils/workout-draft';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';

type Phase = 'exercise' | 'rest' | 'done';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [CommonModule, SkipReasonModalComponent, YoutubeEmbedComponent],
  templateUrl: './active-workout.component.html',
  styleUrl: './active-workout.component.scss',
})
export class ActiveWorkoutComponent implements OnInit, OnDestroy {
  session       = signal<Session | null>(null);
  currentIndex  = signal(0);
  skipModalOpen = signal(false);
  skipError     = signal('');
  phase         = signal<Phase>('exercise');
  resumedToast  = signal(false);

  /** ISO do primeiro "Iniciar exercício" do treino (relógio de parede da sessão) */
  sessionStartedAt = signal<string | null>(null);

  /**
   * ISO do momento em que o atleta entrou na tela de resumo (fase 'done').
   * Capturado uma única vez para que o número exibido no resumo e o `finishedAt`
   * enviado ao backend sejam idênticos — e não cresçam enquanto a tela fica aberta.
   */
  finishedAtIso = signal<string | null>(null);

  // ── Cronômetro do exercício (count-up) ──
  exRunning = signal(false);
  exPaused  = signal(false);
  exElapsed = signal(0);               // segundos decorridos no exercício atual
  private exStartMs = 0;               // Date.now() de quando iniciou/retomou
  private exAccumBeforePause = 0;      // segundos acumulados antes da pausa atual

  // ── Timer de descanso (countdown, inalterado) ──
  restSecs   = signal(0);
  restTarget = signal(0);
  restPaused = signal(false);

  /**
   * exerciseId -> durationSeconds dos já concluídos (fonte da tela de resumo).
   * RULING 1: signal (não propriedade simples) — o `summaryRows` da Task 11 lê
   * isto num computed e precisa reagir às mudanças.
   */
  perExercise = signal<Record<string, number>>({});

  private destroy$   = new Subject<void>();
  private timerStop$ = new Subject<void>();

  currentExercise = computed(() => {
    const s = this.session();
    return s ? (s.exercises[this.currentIndex()] ?? null) : null;
  });

  nextExercise = computed(() => {
    const s = this.session();
    if (!s) return null;
    return s.exercises[this.currentIndex() + 1] ?? null;
  });

  /** alvo de duração parseável, só como guia visual */
  durationTarget = computed(() => {
    const ex = this.currentExercise();
    return ex?.duration ? this.parseDuration(ex.duration) : 0;
  });

  restProgress = computed(() => {
    const t = this.restTarget();
    return t ? ((t - this.restSecs()) / t) * 100 : 0;
  });

  // ── Resumo + checkout ──────────────────────────────────────────────────────
  saving      = signal(false);
  checkoutErr = signal('');

  summaryRows = computed(() => {
    const s = this.session();
    if (!s) return [];
    const per = this.perExercise();
    return s.exercises.map(e => ({
      name: e.name,
      durationSeconds: per[e.id] ?? null,
      completed: e.completed,
      skipped: e.status === 'postponed' || e.status === 'abandoned',
    }));
  });

  summaryDoneCount   = computed(() => this.summaryRows().filter(r => r.completed).length);
  summarySkipCount   = computed(() => this.summaryRows().filter(r => r.skipped).length);
  summaryActiveSecs  = computed(() =>
    Object.values(this.perExercise()).reduce((a, b) => a + b, 0));

  summaryElapsedSecs = computed(() => {
    const start = this.sessionStartedAt();
    const end = this.finishedAtIso();
    if (!start || !end) return this.summaryActiveSecs();
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  });

  /**
   * Única porta de entrada para a fase de resumo: para os cronômetros e
   * congela o instante de término antes de renderizar o resumo.
   */
  goToSummary(): void {
    this.stopTimers();
    if (!this.finishedAtIso()) this.finishedAtIso.set(new Date().toISOString());
    this.phase.set('done');
  }

  finishWorkout(): void {
    const s = this.session();
    const startedAt = this.sessionStartedAt();
    if (!s) return;
    if (!startedAt) {
      // treino encerrado sem nunca iniciar um exercício — nada a gravar
      this.router.navigate(['/athlete/history']);
      return;
    }
    this.saving.set(true);
    this.checkoutErr.set('');
    this.api.checkoutWorkoutSession(s.id, startedAt, this.finishedAtIso() ?? new Date().toISOString()).subscribe({
      next: () => {
        clearDraft(s.id);
        this.saving.set(false);
        this.router.navigate(['/athlete/history']);
      },
      error: () => {
        this.saving.set(false);
        this.checkoutErr.set('Não foi possível salvar o treino. Tente novamente.');
      },
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') ?? '';
    this.api.getSession(id).subscribe(s => {
      this.session.set(s);
      this.restoreDraftIfAny(s);
      this.enterExercise();
    });
  }

  ngOnDestroy(): void {
    this.timerStop$.next();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Rascunho ───────────────────────────────────────────────────────────────

  private restoreDraftIfAny(s: Session): void {
    const draft = loadDraft(s.id);
    if (!draft) return;
    this.sessionStartedAt.set(draft.startedAt);
    this.perExercise.set({ ...draft.perExercise });
    // marca como concluídos os exercícios que já têm tempo no rascunho
    this.session.update(cur => cur ? {
      ...cur,
      exercises: cur.exercises.map(e =>
        draft.perExercise[e.id] != null ? { ...e, completed: true, status: 'done' as const } : e),
    } : cur);
    const idx = Math.min(draft.currentIndex, s.exercises.length - 1);
    this.currentIndex.set(Math.max(0, idx));
    this.resumedToast.set(true);
    setTimeout(() => this.resumedToast.set(false), 3000);
  }

  private persistDraft(): void {
    const s = this.session();
    const startedAt = this.sessionStartedAt();
    if (!s || !startedAt) return;
    const draft: WorkoutDraft = {
      sessionId: s.id,
      startedAt,
      currentIndex: this.currentIndex(),
      perExercise: { ...this.perExercise() },
      updatedAt: new Date().toISOString(),
    };
    saveDraft(draft);
  }

  // ── Navegação ──────────────────────────────────────────────────────────────

  exitWorkout(): void {
    this.stopTimers();
    const s = this.session();
    this.router.navigate(s ? ['/athlete/session', s.id] : ['/athlete/home']);
  }

  // ── Fase exercício ─────────────────────────────────────────────────────────

  private enterExercise(): void {
    this.stopTimers();
    const ex = this.currentExercise();
    if (!ex) { this.goToSummary(); return; }
    this.phase.set('exercise');
    this.exRunning.set(false);
    this.exPaused.set(false);
    this.exElapsed.set(0);
    this.exAccumBeforePause = 0;
  }

  startExercise(): void {
    if (this.exRunning()) return;
    if (!this.sessionStartedAt()) this.sessionStartedAt.set(new Date().toISOString());
    this.exRunning.set(true);
    this.exPaused.set(false);
    this.exStartMs = Date.now();
    this.persistDraft();

    interval(1000).pipe(takeUntil(this.timerStop$)).subscribe(() => {
      if (this.exPaused()) return;
      const running = Math.round((Date.now() - this.exStartMs) / 1000);
      this.exElapsed.set(this.exAccumBeforePause + running);
    });
  }

  toggleExPause(): void {
    if (!this.exRunning()) return;
    if (this.exPaused()) {
      this.exPaused.set(false);
      this.exStartMs = Date.now();
    } else {
      this.exPaused.set(true);
      this.exAccumBeforePause += Math.round((Date.now() - this.exStartMs) / 1000);
      this.exElapsed.set(this.exAccumBeforePause);
    }
  }

  /** "Concluir exercício" */
  completeExercise(): void {
    const ex = this.currentExercise();
    if (!ex) return;

    let duration = this.exElapsed();
    if (this.exRunning() && !this.exPaused()) {
      duration = this.exAccumBeforePause + Math.round((Date.now() - this.exStartMs) / 1000);
    }
    this.stopTimers();
    this.exRunning.set(false);

    this.perExercise.update(m => ({ ...m, [ex.id]: duration }));
    this.api.logExercise(ex.id, ex.sets ?? 1, undefined, duration).subscribe();
    this.session.update(s => s ? {
      ...s,
      exercises: s.exercises.map((e, i) =>
        i === this.currentIndex() ? { ...e, completed: true, status: 'done' as const } : e),
    } : s);
    this.persistDraft();

    const rest = ex.restSeconds ?? 0;
    if (rest > 0) this.enterRest(rest);
    else this.advance();
  }

  skipExercise(): void {
    this.stopTimers();
    this.skipModalOpen.set(true);
  }

  onSkipConfirmed(payload: { reason: SkipReason; decision: SkipDecision; note?: string }): void {
    this.skipModalOpen.set(false);
    const ex = this.currentExercise();
    if (!ex) return;
    this.api.skip({ exerciseId: ex.id }, payload.reason, payload.decision, payload.note).subscribe({
      next: () => {
        // RULING 2: registra no estado do exercício atual a decisão do pulo
        // (minúsculo) antes de avançar — o resumo da Task 11 conta os pulados.
        const status: Exercise['status'] =
          payload.decision === 'Postponed' ? 'postponed' : 'abandoned';
        this.session.update(s => s ? {
          ...s,
          exercises: s.exercises.map((e, i) =>
            i === this.currentIndex() ? { ...e, status } : e),
        } : s);
        this.persistDraft();
        this.advance();
      },
      error: () => {
        this.exRunning.set(false);
        this.exPaused.set(false);
        this.showSkipError();
      },
    });
  }

  onSkipCancelled(): void {
    this.skipModalOpen.set(false);
    this.exRunning.set(false);
    this.exPaused.set(false);
  }

  private showSkipError(): void {
    this.skipError.set('Não foi possível registrar o pulo. Tente novamente.');
    setTimeout(() => this.skipError.set(''), 3500);
  }

  // ── Fase descanso ──────────────────────────────────────────────────────────

  private enterRest(seconds: number): void {
    this.stopTimers();
    this.restTarget.set(seconds);
    this.restSecs.set(seconds);
    this.restPaused.set(false);
    this.phase.set('rest');

    interval(1000).pipe(takeUntil(this.timerStop$)).subscribe(() => {
      if (this.restPaused()) return;
      const cur = this.restSecs();
      if (cur <= 1) { this.restSecs.set(0); this.advance(); }
      else this.restSecs.set(cur - 1);
    });
  }

  toggleRestPause(): void { this.restPaused.update(v => !v); }
  skipRest(): void { this.stopTimers(); this.advance(); }

  // ── Avançar ────────────────────────────────────────────────────────────────

  private advance(): void {
    const s = this.session();
    if (!s) return;
    if (this.currentIndex() < s.exercises.length - 1) {
      this.currentIndex.update(i => i + 1);
      this.persistDraft();
      this.enterExercise();
    } else {
      this.goToSummary();
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private stopTimers(): void { this.timerStop$.next(); }

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  parseDuration(d: string): number {
    if (!d) return 0;
    const s = d.toLowerCase().trim();
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^(\d+):(\d+)$/))) return +m[1] * 60 + +m[2];
    if ((m = s.match(/^(\d+)\s*min$/)))  return +m[1] * 60;
    if ((m = s.match(/^(\d+)\s*s$/)))    return +m[1];
    if ((m = s.match(/^(\d+)$/)))         return +m[1];
    return 0;
  }

  repsFontSizeClass(reps: string | number): string {
    const len = String(reps).length;
    if (len <= 3)  return 'text-[64px]';
    if (len <= 7)  return 'text-[40px]';
    if (len <= 14) return 'text-2xl';
    return 'text-base';
  }
}
