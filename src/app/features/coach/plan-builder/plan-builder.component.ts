import { Component, OnInit, OnChanges, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { TrainingPlan, TRAINING_CATEGORY_LABEL, Exercise, Session, SessionType, ExerciseLibraryItem, TrainingDay, PersonalRecord, SessionTimeSummary, SessionTimeDetail } from '../../../core/models';
import { PlanCalendarModalComponent } from '../../../shared/components/plan-calendar-modal/plan-calendar-modal.component';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { exportWeekToPdf, exportMonthToPdf } from '../../../shared/utils/plan-pdf-export';
import { formatDurationShort } from '../../../shared/utils/format-duration';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

type DrawerMode = 'add' | 'edit';

@Component({
  selector: 'app-plan-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PlanCalendarModalComponent, YoutubeEmbedComponent],
  templateUrl: './plan-builder.component.html',
  styleUrl: './plan-builder.component.scss'
})
export class PlanBuilderComponent implements OnInit, OnChanges {
  @Input() studentId?: string;       // ausente no plano compartilhado (Core/LPO), que pertence ao coach
  @Input() planId?: string;          // opcional: pula direto para um plano específico

  loadError = signal(false);

  /** Plano compartilhado: aberto só por planId, sem aluno — esconde o que é do aluno (recordes, tempo, PDF). */
  get isShared(): boolean { return !this.studentId && !!this.planId; }
  readonly categoryLabel = TRAINING_CATEGORY_LABEL;

  plan          = signal<TrainingPlan | null>(null);
  loading       = signal(true);
  selectedWeek  = signal(0);
  studentCurrentWeek = signal<number | null>(null);
  expandedSessions = signal<Set<string>>(new Set());
  allPlans = signal<TrainingPlan[]>([]);
  showCalendarModal = signal(false);
  studentName = signal('');

  publishing       = signal(false);
  toastMsg         = signal('');
  initializingPlan = signal(false);

  // Drawer: add / edit exercise
  showExerciseDrawer = signal(false);
  drawerMode         = signal<DrawerMode>('add');
  activeSessionId    = signal<string | null>(null);
  editingExercise    = signal<Exercise | null>(null);
  savingExercise     = signal(false);

  // Biblioteca de exercícios (reutilizar ao adicionar)
  libraryItems = signal<ExerciseLibraryItem[]>([]);
  selectedLibraryId = signal('');

  // Hidratação/calorias do aluno (últimos 14 dias) — recolhido por padrão, some espaço na dobra do plano
  intakeHistory = signal<{ date: string; hydrationMl: number; calories: number }[]>([]);
  showIntakeChart = signal(false);
  maxHydrationMl = computed(() => Math.max(1000, ...this.intakeHistory().map(h => h.hydrationMl)));
  maxCalories    = computed(() => Math.max(500, ...this.intakeHistory().map(h => h.calories)));

  // Recordes de força do aluno
  prHistory = signal<PersonalRecord[]>([]);
  showPRSection = signal(false);
  selectedPRMovementId = signal<string | null>(null);
  showMovementForm = signal(false);
  savingMovement = signal(false);
  movementForm!: FormGroup;
  readonly MOVEMENT_CATEGORIES = ['LPO', 'Força', 'Ginástica', 'Metcon', 'Resistência', 'Mobilidade', 'Core', 'Outro'];

  prByMovement = computed(() => {
    const grouped = new Map<string, PersonalRecord[]>();
    for (const r of this.prHistory()) {
      const list = grouped.get(r.movementId) ?? [];
      list.push(r);
      grouped.set(r.movementId, list);
    }
    return Array.from(grouped.entries()).map(([movementId, records]) => {
      const sorted = [...records].sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));
      const best = sorted.reduce((max, r) => Math.max(max, r.loadKg ?? r.reps ?? 0), 0);
      const previous = sorted.length > 1 ? Math.max(...sorted.slice(0, -1).map(r => r.loadKg ?? r.reps ?? 0)) : null;
      return {
        movementId,
        movementName: records[0].movement.name,
        unit: records[0].loadKg != null ? 'kg' : 'reps',
        best,
        trend: previous == null ? 'new' : best > previous ? 'up' : best === previous ? 'same' : 'down',
        history: sorted,
      };
    }).sort((a, b) => a.movementName.localeCompare(b.movementName));
  });

  selectedPRHistory = computed(() => {
    const id = this.selectedPRMovementId();
    if (!id) return null;
    return this.prByMovement().find(m => m.movementId === id) ?? null;
  });

  // Tempo de execução do aluno — recolhido por padrão
  timeSummary = signal<SessionTimeSummary | null>(null);
  showTimeSection = signal(false);
  fmtDuration = formatDurationShort;

  // Detalhe de tempo por sessão — carregado sob demanda ao expandir a sessão, cacheado por id
  sessionTimeDetails = signal<Record<string, SessionTimeDetail>>({});

  loadSessionTime(sessionId: string): void {
    if (this.sessionTimeDetails()[sessionId]) return;
    this.api.getStudentSessionDetail(this.studentId!, sessionId).subscribe(d =>
      this.sessionTimeDetails.update(m => ({ ...m, [sessionId]: d })));
  }

  maxPerExerciseSeconds = computed(() => {
    const s = this.timeSummary();
    return Math.max(1, ...(s?.perExercise ?? []).map(e => e.avgSeconds));
  });

  trendLabel(dir: string): string {
    return dir === 'faster' ? 'Mais rápido'
      : dir === 'slower' ? 'Mais lento'
      : dir === 'equal' ? 'Estável'
      : 'Sem histórico';
  }

  prBarHeight(record: PersonalRecord, maxValue: number): number {
    const value = record.loadKg ?? record.reps ?? 0;
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  }

  formatPRDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  openMovementForm(): void {
    this.movementForm.reset({ name: '', category: this.MOVEMENT_CATEGORIES[0] });
    this.showMovementForm.set(true);
    this.showPRSection.set(true);
  }

  closeMovementForm(): void {
    this.showMovementForm.set(false);
  }

  submitMovement(): void {
    if (this.movementForm.invalid) { this.movementForm.markAllAsTouched(); return; }
    const { name, category } = this.movementForm.value as { name: string; category: string };
    this.savingMovement.set(true);
    this.api.createMovement(name, category).subscribe({
      next: () => {
        this.savingMovement.set(false);
        this.showMovementForm.set(false);
        this.showToast(`Movimento "${name}" cadastrado — já disponível pro aluno registrar PR.`);
      },
      error: () => {
        this.savingMovement.set(false);
        this.showToast('Erro ao cadastrar movimento. Tente novamente.');
      },
    });
  }

  groupedLibraryItems = computed(() => {
    const grouped: Record<string, ExerciseLibraryItem[]> = {};
    for (const item of this.libraryItems()) {
      const cat = item.category ?? 'Sem categoria';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  });

  // Add session inline
  showAddSession    = signal<string | null>(null); // dayId being edited
  savingSession     = signal(false);

  sessionTypes: SessionType[] = ['LPO','Strength','Gymnastics','Metcon','Endurance','Mobility','Core'];

  typeColors: Record<SessionType, string> = {
    LPO:        'bg-primary-fixed/20 text-primary-fixed',
    Strength:   'bg-blue-500/20 text-blue-400',
    Gymnastics: 'bg-tertiary/20 text-tertiary',
    Metcon:     'bg-primary/20 text-primary',
    Endurance:  'bg-green-500/20 text-green-400',
    Mobility:   'bg-teal-400/20 text-teal-400',
    Core:       'bg-yellow-500/20 text-yellow-400',
  };

  /** Só a cor de texto (sem fundo) — usada no rótulo pequeno acima do nome da sessão */
  typeTextColors: Record<SessionType, string> = {
    LPO:        'text-primary-fixed',
    Strength:   'text-blue-400',
    Gymnastics: 'text-tertiary',
    Metcon:     'text-primary',
    Endurance:  'text-green-400',
    Mobility:   'text-teal-400',
    Core:       'text-yellow-400',
  };

  /** Cor da borda esquerda do card — mesma paleta de typeColors */
  typeBorderColors: Record<SessionType, string> = {
    LPO:        'border-primary-fixed',
    Strength:   'border-blue-400',
    Gymnastics: 'border-tertiary',
    Metcon:     'border-primary',
    Endurance:  'border-green-400',
    Mobility:   'border-teal-400',
    Core:       'border-yellow-400',
  };

  exerciseForm!: FormGroup;
  sessionForm!:  FormGroup;
  currentWeek = computed(() => this.plan()?.weeks[this.selectedWeek()] ?? null);

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.exerciseForm = this.fb.group({
      name:        ['', Validators.required],
      youtubeUrl:  [''],
      sets:        [null as number | null],
      reps:        [''],
      duration:    [''],
      restSeconds: [90],
      loadPercent: [null as number | null],
      coachNotes:  [''],
    });

    this.sessionForm = this.fb.group({
      name: ['', Validators.required],
      type: ['Strength', Validators.required],
    });

    this.movementForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(80)]],
      category: [this.MOVEMENT_CATEGORIES[0], Validators.required],
    });
  }

  // ngOnChanges cobre tanto o carregamento inicial quanto a reutilização
  // do componente quando o Angular muda studentId ou planId via router
  ngOnChanges(): void {
    if (!this.studentId) {
      if (this.planId) this.loadSharedPlan(this.planId);
      return;
    }
    this.plan.set(null);
    this.studentCurrentWeek.set(null);
    this.loading.set(true);
    this.loadPlan();
    this.api.getStudentIntakeHistory(this.studentId).subscribe(h => this.intakeHistory.set(h));
    this.api.getStudentPersonalRecordsHistory(this.studentId).subscribe(h => this.prHistory.set(h));
    this.api.getStudentSessionSummary(this.studentId).subscribe(s => this.timeSummary.set(s));
    this.api.getPlansByStudent(this.studentId).subscribe(plans => this.allPlans.set(plans));
    this.api.getStudentWithPlan(this.studentId).subscribe(r => {
      this.studentCurrentWeek.set(r.student.currentWeek);
      this.studentName.set(r.student.name);
      this.applyDefaultWeek();
    });
  }

  exportCurrentWeekPdf(): void {
    const p = this.plan();
    const week = this.currentWeek();
    if (!p || !week) return;
    this.api.getStudentWorkoutHistory(this.studentId!).subscribe(logs =>
      exportWeekToPdf(p, week.weekNumber, this.studentName(), logs));
  }

  exportCurrentMonthPdf(): void {
    const p = this.plan();
    if (!p) return;
    this.api.getStudentWorkoutHistory(this.studentId!).subscribe(logs =>
      exportMonthToPdf(p, this.studentName(), logs));
  }

  onCalendarDaySelected(sel: { planId: string; weekNumber: number }): void {
    this.showCalendarModal.set(false);
    const target = this.allPlans().find(p => p.id === sel.planId);
    if (!target) return;
    this.plan.set(target);
    const idx = target.weeks.findIndex(w => w.weekNumber === sel.weekNumber);
    this.selectedWeek.set(idx >= 0 ? idx : 0);
  }

  /**
   * Abre direto na semana atual do aluno (student.currentWeek), não sempre
   * na Semana 1 — reportado pelo usuário: "a semana 1 ja foi feita agora
   * tem que vim na semana 2". Chamado depois que plano e aluno carregam
   * (ordem não importa, idempotente).
   */
  private applyDefaultWeek(): void {
    const week = this.studentCurrentWeek();
    const p = this.plan();
    if (week == null || !p) return;
    const idx = p.weeks.findIndex(w => w.weekNumber === week);
    this.selectedWeek.set(idx >= 0 ? idx : 0);
  }

  ngOnInit(): void {
    this.api.getLibrary().subscribe(items => this.libraryItems.set(items));
  }

  private loadSharedPlan(planId: string): void {
    this.plan.set(null);
    this.loadError.set(false);
    this.loading.set(true);
    this.api.getPlanById(planId).subscribe({
      next: plan => {
        this.plan.set(plan);
        this.allPlans.set([plan]);
        this.selectedWeek.set(0);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.loadError.set(true); },
    });
  }

  private loadPlan(): void {
    if (this.planId) {
      this.api.getPlanById(this.planId).subscribe({
        next: plan => { this.plan.set(plan); this.loading.set(false); this.applyDefaultWeek(); },
        error: ()  => this.loadByStudent(),
      });
      return;
    }
    this.loadByStudent();
  }

  private loadByStudent(): void {
    this.api.getPlansByStudent(this.studentId!).subscribe({
      next: plans => {
        if (!plans.length) { this.loading.set(false); return; }

        // Conta total de sessões por plano e prefere o com mais conteúdo
        const countSessions = (p: TrainingPlan) =>
          p.weeks.reduce((s, w) => s + w.days.reduce((d, day) => d + day.sessions.length, 0), 0);

        const sorted = [...plans].sort((a, b) => {
          const diff = countSessions(b) - countSessions(a);
          if (diff !== 0) return diff;           // mais sessões primeiro
          return b.weeks.length - a.weeks.length; // depois mais semanas
        });

        this.plan.set(sorted[0]);
        this.loading.set(false);
        this.applyDefaultWeek();
      },
      error: () => { this.loading.set(false); this.loadError.set(true); },
    });
  }

  // ── Sessions ────────────────────────────────────────────────────────────

  toggleSession(sessionId: string): void {
    const willExpand = !this.expandedSessions().has(sessionId);
    this.expandedSessions.update(set => {
      const next = new Set(set);
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId);
      return next;
    });
    if (willExpand) this.loadSessionTime(sessionId);
  }

  isExpanded(id: string): boolean { return this.expandedSessions().has(id); }

  // Vídeo do exercício embutido inline (facade — só carrega ao clicar em "play"), um por vez
  // pra não abrir vários players simultâneos numa sessão com muitos exercícios em vídeo.
  expandedVideoId = signal<string | null>(null);

  toggleVideo(exerciseId: string): void {
    this.expandedVideoId.update(cur => cur === exerciseId ? null : exerciseId);
  }

  openAddSession(dayId: string): void {
    this.sessionForm.reset({ type: 'Strength' });
    this.showAddSession.set(dayId);
  }

  saveSession(): void {
    if (this.sessionForm.invalid) { this.sessionForm.markAllAsTouched(); return; }
    const dayId = this.showAddSession();
    if (!dayId) return;
    this.savingSession.set(true);
    const { name, type } = this.sessionForm.value as { name: string; type: string };
    this.api.addSession(dayId, name, type).subscribe({
      next: newSession => {
        this.plan.update(p => {
          if (!p) return p;
          const clone = JSON.parse(JSON.stringify(p)) as TrainingPlan;
          for (const w of clone.weeks) {
            for (const d of w.days) {
              if (d.id === dayId) { d.sessions.push(newSession); break; }
            }
          }
          return clone;
        });
        this.expandedSessions.update(s => new Set([...s, newSession.id]));
        this.showAddSession.set(null);
        this.savingSession.set(false);
      },
      error: () => this.savingSession.set(false),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    const ok = await confirmDialog.ask({
      title: 'Remover sessão?', message: 'A sessão e todos os exercícios dela saem do plano.', confirmLabel: 'Remover', danger: true,
    });
    if (!ok) return;
    this.api.deleteSession(sessionId).subscribe({
      next: () => {
        this.plan.update(p => {
          if (!p) return p;
          const clone = JSON.parse(JSON.stringify(p)) as TrainingPlan;
          for (const w of clone.weeks) {
            for (const d of w.days) {
              d.sessions = d.sessions.filter(s => s.id !== sessionId);
            }
          }
          return clone;
        });
      },
    });
  }

  // ── Exercises ────────────────────────────────────────────────────────────

  openAddExercise(sessionId: string): void {
    this.drawerMode.set('add');
    this.activeSessionId.set(sessionId);
    this.editingExercise.set(null);
    this.exerciseForm.reset({ sets: null, restSeconds: 90, loadPercent: null });
    this.selectedLibraryId.set('');
    this.showExerciseDrawer.set(true);
  }

  /** Preenche o formulário com um item da biblioteca — o coach ainda pode ajustar antes de salvar */
  selectFromLibrary(itemId: string): void {
    this.selectedLibraryId.set(itemId);
    if (!itemId) return;
    const item = this.libraryItems().find(i => i.id === itemId);
    if (!item) return;
    this.exerciseForm.patchValue({
      name:        item.name,
      youtubeUrl:  item.youtubeUrl ?? '',
      sets:        item.sets ?? null,
      reps:        item.reps ?? '',
      duration:    item.duration ?? '',
      restSeconds: item.restSeconds ?? 90,
      loadPercent: item.loadPercent ?? null,
      coachNotes:  item.notes ?? '',
    });
  }

  openEditExercise(ex: Exercise, sessionId: string): void {
    this.drawerMode.set('edit');
    this.activeSessionId.set(sessionId);
    this.editingExercise.set(ex);
    this.exerciseForm.patchValue({
      name:        ex.name,
      youtubeUrl:  ex.youtubeUrl ?? '',
      sets:        ex.sets ?? null,
      reps:        ex.reps ?? '',
      duration:    ex.duration ?? '',
      restSeconds: ex.restSeconds ?? 90,
      loadPercent: ex.loadPercent ?? null,
      coachNotes:  ex.coachNotes ?? '',
    });
    this.showExerciseDrawer.set(true);
  }

  saveExercise(): void {
    if (this.exerciseForm.invalid) { this.exerciseForm.markAllAsTouched(); return; }
    this.savingExercise.set(true);

    const v = this.exerciseForm.value as {
      name: string; youtubeUrl: string; sets: number | null; reps: string;
      duration: string; restSeconds: number; loadPercent: number | null; coachNotes: string;
    };

    const dto = {
      name:        v.name,
      youtubeUrl:  v.youtubeUrl || null,
      sets:        v.sets || null,
      reps:        v.reps || null,
      duration:    v.duration || null,
      restSeconds: v.restSeconds,
      loadPercent: v.loadPercent || null,
      coachNotes:  v.coachNotes || null,
    };

    if (this.drawerMode() === 'add') {
      this.api.addExercise(this.activeSessionId()!, dto).subscribe({
        next: newEx => {
          this.patchExerciseInPlan(this.activeSessionId()!, null, newEx);
          this.closeDrawer();
        },
        error: () => this.savingExercise.set(false),
      });
    } else {
      const exId = this.editingExercise()!.id;
      this.api.updateExercise(exId, dto).subscribe({
        next: updated => {
          this.patchExerciseInPlan(this.activeSessionId()!, exId, updated);
          this.closeDrawer();
        },
        error: () => this.savingExercise.set(false),
      });
    }
  }

  deleteExercise(ex: Exercise, sessionId: string): void {
    this.api.deleteExercise(ex.id).subscribe({
      next: () => this.patchExerciseInPlan(sessionId, ex.id, null),
    });
  }

  closeDrawer(): void {
    this.showExerciseDrawer.set(false);
    this.savingExercise.set(false);
    this.editingExercise.set(null);
  }

  private patchExerciseInPlan(sessionId: string, exId: string | null, value: Exercise | null): void {
    this.plan.update(p => {
      if (!p) return p;
      const clone = JSON.parse(JSON.stringify(p)) as TrainingPlan;
      for (const w of clone.weeks) {
        for (const d of w.days) {
          for (const s of d.sessions) {
            if (s.id !== sessionId) continue;
            if (exId === null && value) {
              // add
              s.exercises.push(value);
            } else if (exId && value) {
              // update
              const i = s.exercises.findIndex(e => e.id === exId);
              if (i !== -1) s.exercises[i] = value;
            } else if (exId && !value) {
              // delete
              s.exercises = s.exercises.filter(e => e.id !== exId);
            }
          }
        }
      }
      return clone;
    });
  }

  // ── Publish / Draft ──────────────────────────────────────────────────────

  initializePlan(): void {
    const p = this.plan();
    if (!p || this.initializingPlan()) return;
    this.initializingPlan.set(true);
    this.api.initializePlan(p.id).subscribe({
      next: updated => {
        this.plan.set(updated);
        this.initializingPlan.set(false);
        this.showToast('Estrutura de semanas criada com sucesso!');
      },
      error: () => {
        this.initializingPlan.set(false);
        this.showToast('Erro ao inicializar semanas.');
      },
    });
  }

  saveDraft(): void {
    this.showToast('Rascunho salvo. Todas as alterações já são salvas automaticamente.');
  }

  publish(): void {
    const p = this.plan();
    if (!p) return;
    if (p.published) { this.showToast('Este plano já está publicado.'); return; }
    this.publishing.set(true);
    this.api.publishPlan(p.id).subscribe({
      next: updated => {
        this.plan.update(cur => cur ? { ...cur, published: updated.published } : cur);
        this.publishing.set(false);
        this.showToast('Plano publicado! O atleta já pode visualizar.');
      },
      error: () => {
        this.publishing.set(false);
        this.showToast('Erro ao publicar. Tente novamente.');
      },
    });
  }

  private showToast(msg: string): void {
    this.toastMsg.set(msg);
    setTimeout(() => this.toastMsg.set(''), 3500);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getTypeColor(type: SessionType): string {
    return this.typeColors[type] ?? 'bg-surface-container text-on-surface-variant';
  }

  getTypeTextColor(type: SessionType): string {
    return this.typeTextColors[type] ?? 'text-on-surface-variant';
  }

  getTypeBorderColor(type: SessionType): string {
    return this.typeBorderColors[type] ?? 'border-outline-variant';
  }

  /** Letra do bloco (A, B, C...) pela posição real do exercício na sessão — nada inventado, só rótulo. */
  blockLetter(index: number): string {
    return String.fromCharCode(65 + (index % 26));
  }

  formatReps(ex: Exercise): string {
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets}×`);
    if (ex.reps) parts.push(String(ex.reps));
    if (ex.duration) parts.push(ex.duration);
    return parts.join(' ') || '—';
  }

  formatShortDay(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' });
  }

  /**
   * Cor do indicador de status do dia, a partir do status real das sessões
   * (antes era um ponto laranja fixo, decorativo, igual em todo dia).
   */
  dayStatusClass(day: TrainingDay): string {
    const sessions = day.sessions;
    if (!sessions.length) return 'bg-outline-variant/30';
    if (sessions.every(s => s.status === 'done')) return 'bg-primary-fixed';
    if (sessions.some(s => s.status === 'abandoned')) return 'bg-error';
    if (sessions.some(s => s.status === 'done' || s.status === 'postponed')) return 'bg-primary-fixed/50';
    return 'bg-outline-variant/30';
  }
}
