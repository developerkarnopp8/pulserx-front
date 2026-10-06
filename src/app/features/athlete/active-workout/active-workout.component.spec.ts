import { of, throwError } from 'rxjs';
import { ActiveWorkoutComponent } from './active-workout.component';
import { Session } from '../../../core/models';
import { clearDraft, loadDraft, saveDraft, WorkoutDraft } from '../../../shared/utils/workout-draft';

const SESSION_ID = 'sess-1';

function makeSession(): Session {
  return {
    id: SESSION_ID,
    name: 'Treino A',
    type: 'Strength',
    order: 1,
    status: 'none',
    exercises: [
      { id: 'ex-1', name: 'Agachamento', sets: 3, restSeconds: 0, completed: false, status: 'none' },
      { id: 'ex-2', name: 'Supino', sets: 3, restSeconds: 0, completed: false, status: 'none' },
    ],
  };
}

function makeDeps(session: Session) {
  const api = {
    getSession: vi.fn().mockReturnValue(of(session)),
    logExercise: vi.fn().mockReturnValue(of({})),
    skip: vi.fn().mockReturnValue(of(undefined)),
    checkoutWorkoutSession: vi.fn().mockReturnValue(of({ id: 'ws-1' })),
  };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { paramMap: { get: () => SESSION_ID } } };
  return { api, router, route };
}

describe('ActiveWorkoutComponent', () => {
  afterEach(() => {
    clearDraft(SESSION_ID);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('completeExercise loga durationSeconds numérico e alimenta o signal perExercise', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:00:00.000Z'));

    const session = makeSession();
    const { api, router, route } = makeDeps(session);
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    comp.ngOnInit();

    comp.startExercise();
    // 7s de relógio de parede entre Iniciar e Concluir
    vi.setSystemTime(new Date('2026-08-28T10:00:07.000Z'));
    comp.completeExercise();

    expect(api.logExercise).toHaveBeenCalledTimes(1);
    const args = api.logExercise.mock.calls[0];
    expect(args[0]).toBe('ex-1');
    expect(typeof args[3]).toBe('number');
    expect(args[3]).toBe(7);

    expect(comp.perExercise()['ex-1']).toBe(7);
    expect(comp.sessionStartedAt()).toBeTruthy();

    comp.ngOnDestroy();
  });

  it('restaura currentIndex e marca exercícios concluídos a partir de um rascunho no localStorage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T09:10:00.000Z'));
    const draft: WorkoutDraft = {
      sessionId: SESSION_ID,
      startedAt: '2026-08-28T09:00:00.000Z',
      currentIndex: 1,
      perExercise: { 'ex-1': 42 },
      updatedAt: '2026-08-28T09:05:00.000Z',
    };
    saveDraft(draft);

    const session = makeSession();
    const { api, router, route } = makeDeps(session);
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    comp.ngOnInit();

    expect(comp.currentIndex()).toBe(1);
    expect(comp.perExercise()['ex-1']).toBe(42);
    expect(comp.sessionStartedAt()).toBe('2026-08-28T09:00:00.000Z');

    const exercises = comp.session()!.exercises;
    expect(exercises[0].completed).toBe(true);
    expect(exercises[0].status).toBe('done');
    expect(exercises[1].completed).toBe(false);
    expect(comp.resumedToast()).toBe(true);

    comp.ngOnDestroy();
  });

  it('finishWorkout com sessionStartedAt definido: chama checkout, limpa rascunho e navega para o histórico', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:00:00.000Z'));

    const session = makeSession();
    const { api, router, route } = makeDeps(session);
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    comp.ngOnInit();

    comp.startExercise();          // define sessionStartedAt + grava rascunho
    expect(loadDraft(SESSION_ID)).toBeTruthy();
    const startedAt = comp.sessionStartedAt()!;

    vi.setSystemTime(new Date('2026-08-28T10:05:00.000Z'));
    comp.finishWorkout();

    expect(api.checkoutWorkoutSession).toHaveBeenCalledTimes(1);
    expect(api.checkoutWorkoutSession.mock.calls[0][0]).toBe(SESSION_ID);
    expect(api.checkoutWorkoutSession.mock.calls[0][1]).toBe(startedAt);
    expect(comp.saving()).toBe(false);
    expect(loadDraft(SESSION_ID)).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/athlete/history']);

    comp.ngOnDestroy();
  });

  it('goToSummary congela o finishedAt: o checkout envia o instante do resumo, não o do tap', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:00:00.000Z'));

    const session = makeSession();
    const { api, router, route } = makeDeps(session);
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    comp.ngOnInit();

    comp.startExercise();
    // atleta chega ao resumo às 10:45
    vi.setSystemTime(new Date('2026-08-28T10:45:00.000Z'));
    comp.goToSummary();
    const frozen = comp.finishedAtIso();
    expect(frozen).toBe('2026-08-28T10:45:00.000Z');
    expect(comp.phase()).toBe('done');
    const elapsedAtSummary = comp.summaryElapsedSecs();

    // celular largado: só toca "Finalizar treino" 1h depois
    vi.setSystemTime(new Date('2026-08-28T11:45:00.000Z'));
    expect(comp.summaryElapsedSecs()).toBe(elapsedAtSummary); // não cresce na tela
    comp.finishWorkout();

    expect(api.checkoutWorkoutSession).toHaveBeenCalledTimes(1);
    expect(api.checkoutWorkoutSession.mock.calls[0][2]).toBe(frozen);

    comp.ngOnDestroy();
  });

  it('finishWorkout com erro no checkout: mantém checkoutErr, não navega e preserva o rascunho', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:00:00.000Z'));

    const session = makeSession();
    const { api, router, route } = makeDeps(session);
    api.checkoutWorkoutSession.mockReturnValue(throwError(() => new Error('500')));
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    comp.ngOnInit();

    comp.startExercise();
    comp.finishWorkout();

    expect(comp.checkoutErr()).toBe('Não foi possível salvar o treino. Tente novamente.');
    expect(comp.saving()).toBe(false);
    expect(loadDraft(SESSION_ID)).toBeTruthy();
    expect(router.navigate).not.toHaveBeenCalledWith(['/athlete/history']);

    comp.ngOnDestroy();
  });
});

describe('ActiveWorkoutComponent — visual novo (Stitch mo04)', () => {
  afterEach(() => {
    clearDraft(SESSION_ID);
    vi.useRealTimers();
  });

  it('tempo total conta do primeiro "Iniciar exercício"; antes disso é zero', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-06T10:00:00.000Z'));
    const { api, router, route } = makeDeps(makeSession());
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    comp.ngOnInit();
    expect(comp.totalElapsed()).toBe(0);
    comp.startExercise();
    vi.advanceTimersByTime(65_000);
    expect(comp.totalElapsed()).toBe(65);
    comp.ngOnDestroy();
  });

  it('percentual feito acompanha os exercícios concluídos; sem sessão é 0', () => {
    const { api, router, route } = makeDeps(makeSession());
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    expect(comp.progressPercent()).toBe(0);
    comp.ngOnInit();
    comp.completeExercise();
    expect(comp.progressPercent()).toBe(50);
    comp.ngOnDestroy();
  });

  it('+15 s estica o descanso e a meta', () => {
    const { api, router, route } = makeDeps(makeSession());
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    comp.restSecs.set(30);
    comp.restTarget.set(90);
    comp.addRestTime();
    expect(comp.restSecs()).toBe(45);
    expect(comp.restTarget()).toBe(105);
    comp.addRestTime(5);
    expect(comp.restSecs()).toBe(50);
  });

  it('valor curto da prescrição; vídeo fecha ao trocar de exercício', () => {
    const { api, router, route } = makeDeps(makeSession());
    const comp = new ActiveWorkoutComponent(route as any, router as any, api as any);
    expect(comp.isShort('1+1')).toBe(true);
    expect(comp.isShort(10)).toBe(true);
    expect(comp.isShort('21-15-9')).toBe(false);
    expect(comp.isShort(null)).toBe(true);
    comp.ngOnInit();
    comp.showVideo.set(true);
    comp.completeExercise();
    expect(comp.showVideo()).toBe(false);
    expect(comp.summary({ id: 'x', name: 'Supino', sets: 3, reps: 8, completed: false, status: 'none' })).toBe('Supino 3x8');
    comp.ngOnDestroy();
  });
});
