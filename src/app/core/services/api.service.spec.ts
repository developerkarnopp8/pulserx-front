import { of } from 'rxjs';
import { ApiService } from './api.service';

const BASE = 'http://localhost:3000/api';

function build() {
  const http = {
    get: vi.fn().mockReturnValue(of({})),
    post: vi.fn().mockReturnValue(of({})),
    patch: vi.fn().mockReturnValue(of({})),
    put: vi.fn().mockReturnValue(of({})),
    delete: vi.fn().mockReturnValue(of({})),
  };
  const service = new ApiService(http as any);
  return { service, http };
}

function firstValue<T>(obs: { subscribe: (fn: (v: T) => void) => void }): T {
  let value!: T;
  obs.subscribe(v => { value = v; });
  return value;
}

describe('ApiService — students', () => {
  it('createStudent posta o dto e mapeia a resposta', () => {
    const { service, http } = build();
    http.post.mockReturnValue(of({
      id: 's1', user: { name: 'Ana', email: 'ana@x.com' }, goal: 'Emagrecer',
      currentWeek: 2, currentMonth: 1, completionPercent: 50,
    }));

    const result = firstValue(service.createStudent({ name: 'Ana', email: 'ana@x.com', password: 'x', goal: 'Emagrecer' }));

    expect(http.post).toHaveBeenCalledWith(`${BASE}/students`, { name: 'Ana', email: 'ana@x.com', password: 'x', goal: 'Emagrecer' });
    expect(result).toEqual({
      id: 's1', name: 'Ana', email: 'ana@x.com', goal: 'Emagrecer',
      currentWeek: 2, currentMonth: 1, coachId: '', completionPercent: 50,
    });
  });

  it('getStudents sem coachId usa a URL simples; com coachId, com query', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([]));
    service.getStudents();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/students`);
    service.getStudents('coach-1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/students?coachId=coach-1`);
  });

  it('getStudents mapeia cada item da lista', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([{ id: 's1', userId: 'u1', coachId: 'c1', goal: 'G', currentMonth: 1, currentWeek: 1, user: { id: 'u1', name: 'N', email: 'e', role: 'athlete' } }]));
    const result = firstValue(service.getStudents());
    expect(result[0]).toEqual({
      id: 's1', name: 'N', email: 'e', goal: 'G', currentMonth: 1, currentWeek: 1,
      coachId: 'c1', completionPercent: undefined, avatarUrl: undefined,
    });
  });

  it('updateStudent chama PATCH e mapeia', () => {
    const { service, http } = build();
    http.patch.mockReturnValue(of({ id: 's1', userId: 'u1', coachId: 'c1', goal: 'G2', currentMonth: 2, currentWeek: 3, user: { id: 'u1', name: 'N', email: 'e', role: 'athlete' } }));
    const result = firstValue(service.updateStudent('s1', { goal: 'G2' }));
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/students/s1`, { goal: 'G2' });
    expect(result.goal).toBe('G2');
  });

  it('deleteStudent chama DELETE', () => {
    const { service, http } = build();
    service.deleteStudent('s1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/students/s1`);
  });

  it('getMyStudentProfile chama /students/me e mapeia', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of({ id: 's1', userId: 'u1', coachId: 'c1', goal: 'G', currentMonth: 1, currentWeek: 1, user: { id: 'u1', name: 'N', email: 'e', role: 'athlete' } }));
    const result = firstValue(service.getMyStudentProfile());
    expect(http.get).toHaveBeenCalledWith(`${BASE}/students/me`);
    expect(result.id).toBe('s1');
  });

  it('getStudentWithPlan mapeia student + plan null', () => {
    const { service, http } = build();
    const rawStudent = { id: 's1', userId: 'u1', coachId: 'c1', goal: 'G', currentMonth: 1, currentWeek: 1, user: { id: 'u1', name: 'N', email: 'e', role: 'athlete' } };
    http.get.mockReturnValue(of({ student: rawStudent, plan: null }));
    const result = firstValue(service.getStudentWithPlan('s1'));
    expect(http.get).toHaveBeenCalledWith(`${BASE}/students/s1/plan`);
    expect(result.plan).toBeNull();
    expect(result.student.id).toBe('s1');
  });

  it('getStudentWithPlan mapeia student + plan presente', () => {
    const { service, http } = build();
    const rawStudent = { id: 's1', userId: 'u1', coachId: 'c1', goal: 'G', currentMonth: 1, currentWeek: 1, user: { id: 'u1', name: 'N', email: 'e', role: 'athlete' } };
    http.get.mockReturnValue(of({
      student: rawStudent,
      plan: { id: 'p1', studentId: 's1', coachId: 'c1', month: 1, startDate: '2026-09-01', title: 'Plano', published: false, weeks: [] },
    }));
    const result = firstValue(service.getStudentWithPlan('s1'));
    expect(result.plan?.id).toBe('p1');
  });
});

describe('ApiService — training plans', () => {
  const rawPlanMinimal = {
    id: 'p1', studentId: 's1', coachId: 'c1', month: 1, startDate: '2026-09-01',
    title: 'Plano', published: false, weeks: [],
  };

  it('getPlanById mapeia plano com category/scope padrão quando ausentes', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of(rawPlanMinimal));
    const result = firstValue(service.getPlanById('p1'));
    expect(http.get).toHaveBeenCalledWith(`${BASE}/training-plans/p1`);
    expect(result.category).toBe('PERFORMANCE');
    expect(result.scope).toBe('INDIVIDUAL');
    expect(result.studentId).toBe('s1');
  });

  it('getPlanById mapeia plano com category/scope explícitos e árvore completa (weeks/days/sessions/exercises)', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of({
      ...rawPlanMinimal,
      studentId: null,
      category: 'CORE',
      scope: 'SHARED',
      weeks: [{
        id: 'w1', planId: 'p1', weekNumber: 1,
        days: [{
          id: 'd1', weekId: 'w1', dayOfWeek: 'Terça', dayIndex: 2,
          sessions: [{
            id: 'sess1', dayId: 'd1', name: 'Sessão', type: 'LPO', order: 1,
            exercises: [{
              id: 'ex1', sessionId: 'sess1', name: 'Snatch', order: 1,
              youtubeUrl: 'https://youtu.be/x', sets: 5, reps: '3', duration: '30s',
              restSeconds: 60, loadPercent: 80, coachNotes: 'nota',
              workoutLogs: [{ id: 'log1' }],
            }],
          }],
        }],
      }],
    }));

    const result = firstValue(service.getPlanById('p1'));

    expect(result.studentId).toBeNull();
    expect(result.category).toBe('CORE');
    expect(result.scope).toBe('SHARED');
    const exercise = result.weeks[0].days[0].sessions[0].exercises[0];
    expect(exercise.completed).toBe(true);
    expect(exercise.status).toBe('done');
    expect(result.weeks[0].days[0].sessions[0].status).toBe('done');
  });

  it('mapExercise usa undefined para campos ausentes (branches nullish)', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of({
      ...rawPlanMinimal,
      weeks: [{
        id: 'w1', planId: 'p1', weekNumber: 1,
        days: [{
          id: 'd1', weekId: 'w1', dayOfWeek: 'Terça', dayIndex: 2,
          sessions: [{
            id: 'sess1', dayId: 'd1', name: 'Sessão', type: 'LPO', order: 1,
            exercises: [{ id: 'ex1', sessionId: 'sess1', name: 'Ex sem extras', order: 1 }],
          }],
        }],
      }],
    }));

    const result = firstValue(service.getPlanById('p1'));
    const exercise = result.weeks[0].days[0].sessions[0].exercises[0];
    expect(exercise.youtubeUrl).toBeUndefined();
    expect(exercise.sets).toBeUndefined();
    expect(exercise.completed).toBe(false);
    expect(exercise.status).toBe('none');
  });

  it('sessão com skip Postponed (sem log) → status postponed; Abandoned → abandoned', () => {
    const { service, http } = build();
    const dayWith = (skipDecision: 'Postponed' | 'Abandoned') => ({
      id: 'd1', weekId: 'w1', dayOfWeek: 'Terça', dayIndex: 2,
      sessions: [{
        id: 'sess1', dayId: 'd1', name: 'Sessão', type: 'LPO', order: 1,
        workoutSkips: [{ decision: skipDecision }],
        exercises: [{ id: 'ex1', sessionId: 'sess1', name: 'Ex', order: 1, workoutSkips: [{ decision: skipDecision }] }],
      }],
    });

    http.get.mockReturnValue(of({ ...rawPlanMinimal, weeks: [{ id: 'w1', planId: 'p1', weekNumber: 1, days: [dayWith('Postponed')] }] }));
    let result = firstValue(service.getPlanById('p1'));
    expect(result.weeks[0].days[0].sessions[0].status).toBe('postponed');
    expect(result.weeks[0].days[0].sessions[0].exercises[0].status).toBe('postponed');

    http.get.mockReturnValue(of({ ...rawPlanMinimal, weeks: [{ id: 'w1', planId: 'p1', weekNumber: 1, days: [dayWith('Abandoned')] }] }));
    result = firstValue(service.getPlanById('p1'));
    expect(result.weeks[0].days[0].sessions[0].status).toBe('abandoned');
  });

  it('plano sem weeks na resposta cai em array vazio (?? [])', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of({ ...rawPlanMinimal, weeks: undefined }));
    expect(firstValue(service.getPlanById('p1')).weeks).toEqual([]);
  });

  it('semana sem days e dia sem sessions caem em array vazio (?? [])', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of({
      ...rawPlanMinimal,
      weeks: [{ id: 'w1', planId: 'p1', weekNumber: 1, days: undefined }],
    }));
    expect(firstValue(service.getPlanById('p1')).weeks[0].days).toEqual([]);

    http.get.mockReturnValue(of({
      ...rawPlanMinimal,
      weeks: [{ id: 'w1', planId: 'p1', weekNumber: 1, days: [{ id: 'd1', weekId: 'w1', dayOfWeek: 'Terça', dayIndex: 2, sessions: undefined }] }],
    }));
    expect(firstValue(service.getPlanById('p1')).weeks[0].days[0].sessions).toEqual([]);
  });

  it('initializePlan e publishPlan chamam os endpoints certos e mapeiam', () => {
    const { service, http } = build();
    http.post.mockReturnValue(of(rawPlanMinimal));
    http.patch.mockReturnValue(of(rawPlanMinimal));

    firstValue(service.initializePlan('p1'));
    expect(http.post).toHaveBeenCalledWith(`${BASE}/training-plans/p1/initialize`, {});

    firstValue(service.publishPlan('p1'));
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/training-plans/p1/publish`, {});
  });

  it('getPlansByStudent mapeia a lista', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([rawPlanMinimal]));
    const result = firstValue(service.getPlansByStudent('s1'));
    expect(http.get).toHaveBeenCalledWith(`${BASE}/training-plans/student/s1`);
    expect(result).toHaveLength(1);
  });

  it('createPlan posta studentId/title/month/startDate', () => {
    const { service, http } = build();
    http.post.mockReturnValue(of(rawPlanMinimal));
    firstValue(service.createPlan('s1', 'Plano', 1, '2026-09-01'));
    expect(http.post).toHaveBeenCalledWith(`${BASE}/training-plans`, { studentId: 's1', title: 'Plano', month: 1, startDate: '2026-09-01' });
  });

  it('getSharedPlans sem category usa URL sem query; com category, com query codificada; mapeia a lista', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([rawPlanMinimal]));
    const result = firstValue(service.getSharedPlans());
    expect(http.get).toHaveBeenCalledWith(`${BASE}/training-plans/shared`);
    expect(result[0].id).toBe('p1');
    service.getSharedPlans('CORE');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/training-plans/shared?category=CORE`);
  });

  it('createSharedPlan posta category/title/month/startDate', () => {
    const { service, http } = build();
    http.post.mockReturnValue(of(rawPlanMinimal));
    firstValue(service.createSharedPlan('LPO', 'Compartilhado', 1, '2026-09-01'));
    expect(http.post).toHaveBeenCalledWith(`${BASE}/training-plans/shared`, { category: 'LPO', title: 'Compartilhado', month: 1, startDate: '2026-09-01' });
  });

  it('importPlanFromPdf monta FormData com studentId/startDate/file', () => {
    const { service, http } = build();
    const file = new File(['x'], 'plano.pdf', { type: 'application/pdf' });
    service.importPlanFromPdf('s1', '2026-09-01', file);
    const call = http.post.mock.calls[0];
    expect(call[0]).toBe(`${BASE}/training-plans/import-pdf`);
    const formData = call[1] as FormData;
    expect(formData.get('studentId')).toBe('s1');
    expect(formData.get('startDate')).toBe('2026-09-01');
    expect(formData.get('file')).toBe(file);
  });

  it('getFirstPlanByStudent retorna o primeiro plano, ou null se a lista vier vazia', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([rawPlanMinimal]));
    expect(firstValue(service.getFirstPlanByStudent('s1'))?.id).toBe('p1');

    http.get.mockReturnValue(of([]));
    expect(firstValue(service.getFirstPlanByStudent('s1'))).toBeNull();
  });

  it('getWeeklyCompletion chama o endpoint certo', () => {
    const { service, http } = build();
    service.getWeeklyCompletion();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/training-plans/coach/weekly-completion`);
  });
});

describe('ApiService — daily intake, movimentos, PRs', () => {
  it('logHydration/logCalories/getTodayIntake/getStudentIntakeHistory chamam os endpoints certos', () => {
    const { service, http } = build();
    service.logHydration(500);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/daily-intake/hydration`, { amountMl: 500 });
    service.logCalories(300);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/daily-intake/calories`, { kcal: 300 });
    service.getTodayIntake();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/daily-intake/today`);
    service.getStudentIntakeHistory('s1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/daily-intake/student/s1/history`);
  });

  it('getMovements/createMovement chamam os endpoints certos', () => {
    const { service, http } = build();
    service.getMovements();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/movements`);
    service.createMovement('Back Squat', 'Força');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/movements`, { name: 'Back Squat', category: 'Força' });
  });

  it('logPersonalRecord/getMyPersonalRecords/getStudentPersonalRecordsHistory chamam os endpoints certos', () => {
    const { service, http } = build();
    service.logPersonalRecord('mov-1', 100, undefined, 'nota');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/personal-records`, { movementId: 'mov-1', loadKg: 100, reps: undefined, note: 'nota' });
    service.getMyPersonalRecords();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/personal-records/me`);
    service.getStudentPersonalRecordsHistory('s1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/personal-records/student/s1/history`);
  });
});

describe('ApiService — plan-builder (sessions/exercises)', () => {
  it('addSession posta e mapeia a sessão', () => {
    const { service, http } = build();
    http.post.mockReturnValue(of({ id: 'sess1', dayId: 'd1', name: 'Nova', type: 'LPO', order: 0, exercises: [] }));
    const result = firstValue(service.addSession('d1', 'Nova', 'LPO'));
    expect(http.post).toHaveBeenCalledWith(`${BASE}/training-plans/days/d1/sessions`, { name: 'Nova', type: 'LPO', order: 0 });
    expect(result.name).toBe('Nova');
  });

  it('deleteSession chama DELETE', () => {
    const { service, http } = build();
    service.deleteSession('sess1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/training-plans/sessions/sess1`);
  });

  it('addExercise/updateExercise/deleteExercise chamam os endpoints certos e mapeiam', () => {
    const { service, http } = build();
    const rawExercise = { id: 'ex1', sessionId: 'sess1', name: 'Ex', order: 1 };
    http.post.mockReturnValue(of(rawExercise));
    http.patch.mockReturnValue(of(rawExercise));

    firstValue(service.addExercise('sess1', { name: 'Ex' }));
    expect(http.post).toHaveBeenCalledWith(`${BASE}/training-plans/sessions/sess1/exercises`, { name: 'Ex' });

    firstValue(service.updateExercise('ex1', { name: 'Ex2' }));
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/training-plans/exercises/ex1`, { name: 'Ex2' });

    service.deleteExercise('ex1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/training-plans/exercises/ex1`);
  });

  it('getSession mapeia a sessão', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of({ id: 'sess1', dayId: 'd1', name: 'S', type: 'LPO', order: 1, exercises: [] }));
    const result = firstValue(service.getSession('sess1'));
    expect(http.get).toHaveBeenCalledWith(`${BASE}/sessions/sess1`);
    expect(result.id).toBe('sess1');
  });

  it('getSession sem exercises na resposta cai em array vazio (?? [])', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of({ id: 'sess1', dayId: 'd1', name: 'S', type: 'LPO', order: 1, exercises: undefined }));
    const result = firstValue(service.getSession('sess1'));
    expect(result.exercises).toEqual([]);
  });
});

describe('ApiService — exercise library, payments', () => {
  it('CRUD da biblioteca de exercícios', () => {
    const { service, http } = build();
    service.getLibrary();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/exercise-library`);
    service.createLibraryItem({ name: 'Ex' } as never);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/exercise-library`, { name: 'Ex' });
    service.updateLibraryItem('lib1', { name: 'Ex2' } as never);
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/exercise-library/lib1`, { name: 'Ex2' });
    service.deleteLibraryItem('lib1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/exercise-library/lib1`);
  });

  it('CRUD de pagamentos', () => {
    const { service, http } = build();
    service.getPayments();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/payments`);
    service.getPaymentSummary();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/payments/summary`);
    service.createPayment({ studentId: 's1', amount: 100, dueDate: '2026-10-01' });
    expect(http.post).toHaveBeenCalledWith(`${BASE}/payments`, { studentId: 's1', amount: 100, dueDate: '2026-10-01' });
    service.markPaymentPaid('pay1');
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/payments/pay1/pay`, {});
    service.deletePayment('pay1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/payments/pay1`);
  });
});

describe('ApiService — workout logs, sessions de treino, skips', () => {
  it('logExercise posta os campos certos', () => {
    const { service, http } = build();
    service.logExercise('ex1', 3, 'nota', 120);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/workout-logs`, { exerciseId: 'ex1', setsCompleted: 3, notes: 'nota', durationSeconds: 120 });
  });

  it('checkoutWorkoutSession/getMyWorkoutSessions/summary/detail/avg-duration chamam os endpoints certos', () => {
    const { service, http } = build();
    service.checkoutWorkoutSession('sess1', '2026-09-01T10:00:00Z', '2026-09-01T10:30:00Z');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/workout-sessions`, { sessionId: 'sess1', startedAt: '2026-09-01T10:00:00Z', finishedAt: '2026-09-01T10:30:00Z' });
    service.getMyWorkoutSessions();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-sessions/me`);
    service.getStudentSessionSummary('s1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-sessions/student/s1/summary`);
    service.getStudentSessionDetail('s1', 'sess1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-sessions/student/s1/session/sess1`);
    service.getCoachAvgDuration();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-sessions/coach/avg-duration`);
  });

  it('getWorkoutHistory usa limit padrão (200) e mapeia cada log', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([{
      id: 'log1', exerciseId: 'ex1', athleteId: 'a1', setsCompleted: 3, completedAt: '2026-09-01T10:00:00Z',
      exercise: { id: 'ex1', name: 'Snatch', session: { id: 'sess1', name: 'S', type: 'LPO', day: { dayOfWeek: 'Terça', week: { weekNumber: 1 } } } },
    }]));

    const result = firstValue(service.getWorkoutHistory());

    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-logs/history?limit=200`);
    expect(result[0]).toEqual({
      id: 'log1', exerciseId: 'ex1', exerciseName: 'Snatch', sessionName: 'S', sessionType: 'LPO',
      completedAt: new Date('2026-09-01T10:00:00Z'), setsCompleted: 3, notes: undefined,
    });
  });

  it('getWorkoutHistory com limit customizado e log sem exercise/notes (branches ??)', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([{ id: 'log1', exerciseId: 'ex1', athleteId: 'a1', setsCompleted: 1, completedAt: '2026-09-01T10:00:00Z' }]));

    const result = firstValue(service.getWorkoutHistory(10));

    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-logs/history?limit=10`);
    expect(result[0].exerciseName).toBe('');
    expect(result[0].sessionName).toBe('');
    expect(result[0].sessionType).toBe('');
    expect(result[0].notes).toBeUndefined();
  });

  it('getStudentWorkoutHistory usa limit padrão (500) e mapeia', () => {
    const { service, http } = build();
    http.get.mockReturnValue(of([]));
    firstValue(service.getStudentWorkoutHistory('s1'));
    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-logs/student/s1/history?limit=500`);
    firstValue(service.getStudentWorkoutHistory('s1', 20));
    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-logs/student/s1/history?limit=20`);
  });

  it('skip posta target espalhado + reason/decision/note', () => {
    const { service, http } = build();
    service.skip({ exerciseId: 'ex1' }, 'Injury', 'Postponed', 'dói o ombro');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/workout-skips`, { exerciseId: 'ex1', reason: 'Injury', decision: 'Postponed', note: 'dói o ombro' });
  });

  it('getPendingSkipCounts chama o endpoint certo', () => {
    const { service, http } = build();
    service.getPendingSkipCounts();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/workout-skips/pending-count`);
  });
});

describe('ApiService — mensagens e notificações', () => {
  it('getInbox/getConversation/sendMessage/getUnreadCount chamam os endpoints certos', () => {
    const { service, http } = build();
    service.getInbox();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/messages/inbox`);
    service.getConversation('u2');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/messages/u2`);
    service.sendMessage('u2', 'Oi');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/messages`, { toId: 'u2', content: 'Oi' });
    service.getUnreadCount();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/messages/unread`);
  });

  it('notificações: get/unread-count/marcar lida/marcar todas', () => {
    const { service, http } = build();
    service.getNotifications();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/notifications`);
    service.getNotificationsUnreadCount();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/notifications/unread-count`);
    service.markNotificationRead('n1');
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/notifications/n1/read`, {});
    service.markAllNotificationsRead();
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/notifications/read-all`, {});
  });
});

describe('ApiService — admin', () => {
  it('getCoaches/createCoach/resetCoachPassword/toggleCoachAi chamam os endpoints certos', () => {
    const { service, http } = build();
    service.getCoaches();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/admin/coaches`);
    service.createCoach('Novo', 'novo@x.com');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/admin/coaches`, { name: 'Novo', email: 'novo@x.com' });
    service.resetCoachPassword('coach1');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/admin/coaches/coach1/reset-password`, {});
    service.toggleCoachAi('coach1', false);
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/admin/coaches/coach1`, { aiImportEnabled: false });
  });
});

describe('ApiService — planos de assinatura, assinaturas, contrato/plataforma', () => {
  it('getSubscriptionPlans sem/com coachId', () => {
    const { service, http } = build();
    service.getSubscriptionPlans();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/subscription-plans`);
    service.getSubscriptionPlans('coach-1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/subscription-plans?coachId=coach-1`);
  });

  it('createSubscriptionPlan sem/com coachId', () => {
    const { service, http } = build();
    const dto = { name: 'Core', priceCents: 9900, categories: ['CORE'] as const };
    service.createSubscriptionPlan(dto as never);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/subscription-plans`, dto);
    service.createSubscriptionPlan(dto as never, 'coach-1');
    expect(http.post).toHaveBeenCalledWith(`${BASE}/subscription-plans?coachId=coach-1`, dto);
  });

  it('updateSubscriptionPlan chama PATCH com o id', () => {
    const { service, http } = build();
    service.updateSubscriptionPlan('plan1', { active: false });
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/subscription-plans/plan1`, { active: false });
  });

  it('assinatura do aluno: get/assign/remove/me', () => {
    const { service, http } = build();
    service.getStudentSubscription('s1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/students/s1/subscription`);
    service.assignSubscription('s1', { planId: 'plan1' });
    expect(http.put).toHaveBeenCalledWith(`${BASE}/students/s1/subscription`, { planId: 'plan1' });
    service.removeSubscription('s1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/students/s1/subscription`);
    service.getMySubscription();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/subscriptions/me`);
  });

  it('contrato do coach e configurações da plataforma', () => {
    const { service, http } = build();
    service.getCoachContract('coach1');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/admin/coaches/coach1/contract`);
    service.setCoachContract('coach1', 15);
    expect(http.put).toHaveBeenCalledWith(`${BASE}/admin/coaches/coach1/contract`, { platformFeePercent: 15 });
    service.getPlatformSettings();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/admin/platform-settings`);
  });

  it('setPlatformSettings usa confirmLockout padrão false e repassa quando informado', () => {
    const { service, http } = build();
    service.setPlatformSettings(true);
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/admin/platform-settings`, { enforceSubscriptionAccess: true, confirmLockout: false });
    service.setPlatformSettings(true, true);
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/admin/platform-settings`, { enforceSubscriptionAccess: true, confirmLockout: true });
  });
});

describe('ApiService — landing page do coach', () => {
  it('getMyCoachProfile/upsertCoachProfile/publishCoachProfile chamam os endpoints certos', () => {
    const { service, http } = build();
    service.getMyCoachProfile();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/coach-profile`);
    const dto = { slug: 'luan', bio: 'Treinador de CrossFit', yearsExperience: 12 };
    service.upsertCoachProfile(dto);
    expect(http.put).toHaveBeenCalledWith(`${BASE}/coach-profile`, dto);
    service.publishCoachProfile(true);
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/coach-profile/publish`, { published: true });
  });

  it('uploadCoachBanner/uploadCoachPhoto montam FormData com o arquivo', () => {
    const { service, http } = build();
    const bannerFile = new File(['x'], 'banner.jpg', { type: 'image/jpeg' });
    service.uploadCoachBanner(bannerFile);
    const bannerCall = http.post.mock.calls[0];
    expect(bannerCall[0]).toBe(`${BASE}/coach-profile/banner`);
    expect((bannerCall[1] as FormData).get('file')).toBe(bannerFile);

    const photoFile = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    service.uploadCoachPhoto(photoFile);
    const photoCall = http.post.mock.calls[1];
    expect(photoCall[0]).toBe(`${BASE}/coach-profile/photo`);
    expect((photoCall[1] as FormData).get('file')).toBe(photoFile);
  });

  it('CRUD de depoimentos chama os endpoints certos', () => {
    const { service, http } = build();
    service.getCoachTestimonials();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/coach-profile/testimonials`);
    const dto = { authorName: 'Ana', content: 'Ótimo!' };
    service.createTestimonial(dto);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/coach-profile/testimonials`, dto);
    service.updateTestimonial('t1', dto);
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/coach-profile/testimonials/t1`, dto);
    service.deleteTestimonial('t1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/coach-profile/testimonials/t1`);
  });

  it('CRUD de FAQ chama os endpoints certos', () => {
    const { service, http } = build();
    service.getCoachFaqItems();
    expect(http.get).toHaveBeenCalledWith(`${BASE}/coach-profile/faq`);
    const dto = { question: 'Q?', answer: 'A.' };
    service.createFaqItem(dto);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/coach-profile/faq`, dto);
    service.updateFaqItem('f1', dto);
    expect(http.patch).toHaveBeenCalledWith(`${BASE}/coach-profile/faq/f1`, dto);
    service.deleteFaqItem('f1');
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/coach-profile/faq/f1`);
  });

  it('getPublicCoachProfile/createLead chamam os endpoints certos', () => {
    const { service, http } = build();
    service.getPublicCoachProfile('luan');
    expect(http.get).toHaveBeenCalledWith(`${BASE}/public/coaches/luan`);
    const lead = { name: 'Ana', email: 'ana@x.com' };
    service.createLead('luan', lead);
    expect(http.post).toHaveBeenCalledWith(`${BASE}/public/coaches/luan/leads`, lead);
  });

  it('cancelMySubscription chama o endpoint certo', () => {
    const { service, http } = build();
    service.cancelMySubscription();
    expect(http.delete).toHaveBeenCalledWith(`${BASE}/subscriptions/me`);
  });
});
