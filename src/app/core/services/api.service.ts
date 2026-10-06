import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Student, TrainingPlan, TrainingCategory, PlanScope, Session, Exercise, WorkoutLog,
  ExerciseLibraryItem, Payment, PaymentSummary, SkipReason, SkipDecision,
  Movement, PersonalRecord, AppNotification,
  WorkoutSessionRecord, SessionTimeSummary, SessionTimeDetail, CoachAvgDuration,
  SubscriptionPlan, Subscription, MySubscription, MyGatewayPayment, AdminCoachStudent, MyPaymentStatus, MyPix, CoachWallet, CheckoutResult, CoachGatewayPayment, MonthlyBreakdown, CoachContract, PlatformSettings, FreeConfig, FinancialSummary,
  CoachProfile, UpdateCoachProfileInput, PublicCoachProfile, CreateLeadInput, PublicSignupInput, PublicSignupResult,
  Testimonial, UpsertTestimonialInput, FaqItem, UpsertFaqItemInput,
  ConsentStatus, User, AthleteLookup, AdminFinancialOverview, CoachAlert, CoachSubscriptionSummary, CoachUsage,
} from '../models';
import { environment } from '../../../environments/environment';

// ── Raw shapes returned by the backend ──────────────────────────────────────

interface RawStudent {
  id: string;
  userId: string;
  coachId: string;
  goal: string;
  currentMonth: number;
  currentWeek: number;
  completionPercent?: number;
  avatarUrl?: string;
  user: { id: string; name: string; email: string; role: string };
  subscription?: Subscription | null;
}

interface RawExercise {
  id: string;
  sessionId: string;
  name: string;
  youtubeUrl?: string | null;
  sets?: number | null;
  reps?: string | null;
  duration?: string | null;
  restSeconds?: number | null;
  loadPercent?: number | null;
  coachNotes?: string | null;
  order: number;
  workoutLogs?: { id: string }[];
  workoutSkips?: { decision: 'Postponed' | 'Abandoned' }[];
}

interface RawSession {
  id: string;
  dayId: string;
  name: string;
  type: string;
  order: number;
  exercises: RawExercise[];
  workoutSkips?: { decision: 'Postponed' | 'Abandoned' }[];
}

interface RawDay {
  id: string;
  weekId: string;
  dayOfWeek: string;
  dayIndex: number;
  sessions: RawSession[];
}

interface RawWeek {
  id: string;
  planId: string;
  weekNumber: number;
  days: RawDay[];
  locked?: boolean;
}

interface RawPlan {
  id: string;
  studentId: string | null;
  category?: TrainingCategory;
  scope?: PlanScope;
  coachId: string;
  month: number;
  startDate: string;
  title: string;
  published: boolean;
  weeks: RawWeek[];
}

interface RawWorkoutLog {
  id: string;
  exerciseId: string;
  athleteId: string;
  setsCompleted: number;
  notes?: string | null;
  completedAt: string;
  exercise?: {
    id: string;
    name: string;
    session?: {
      id: string;
      name: string;
      type: string;
      day?: { dayOfWeek: string; week?: { weekNumber: number } };
    };
  };
}

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  read: boolean;
  createdAt: string;
  isSystem: boolean;
  from: { id: string; name: string; role: string };
  to:   { id: string; name: string; role: string };
}

export interface WorkoutLogEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sessionName: string;
  sessionType: string;
  completedAt: Date;
  setsCompleted: number;
  notes?: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Students ──────────────────────────────────────────────────────────────

  /** Coach: cria conta de atleta + perfil de aluno em uma única chamada */
  createStudent(dto: { name: string; email: string; goal: string }): Observable<Student> {
    return this.http
      .post<{ id: string; user: { name: string; email: string }; goal: string; currentWeek: number; currentMonth: number; completionPercent?: number }>(
        `${this.base}/students`, dto,
      )
      .pipe(map(s => ({
        id:                s.id,
        name:              s.user.name,
        email:             s.user.email,
        goal:              s.goal,
        currentWeek:       s.currentWeek,
        currentMonth:      s.currentMonth,
        coachId:           '',
        completionPercent: s.completionPercent,
      })));
  }

  /** Coach: lista todos os alunos */
  getStudents(coachId?: string): Observable<Student[]> {
    const url = coachId
      ? `${this.base}/students?coachId=${coachId}`
      : `${this.base}/students`;
    return this.http
      .get<RawStudent[]>(url)
      .pipe(map(list => list.map(s => this.mapStudent(s))));
  }

  /** Coach: atualiza objetivo/progresso do aluno */
  updateStudent(id: string, dto: { goal?: string; currentWeek?: number; currentMonth?: number }): Observable<Student> {
    return this.http
      .patch<RawStudent>(`${this.base}/students/${id}`, dto)
      .pipe(map(s => this.mapStudent(s)));
  }

  /** Coach: desvincula o aluno (cancela a cobrança, tira da lista, corta o acesso) — a conta NÃO é apagada. */
  unlinkStudent(id: string): Observable<{ unlinked: boolean }> {
    return this.http.delete<{ unlinked: boolean }>(`${this.base}/students/${id}`);
  }

  /** Atleta: retorna o próprio perfil de aluno */
  getMyStudentProfile(): Observable<Student> {
    return this.http
      .get<RawStudent>(`${this.base}/students/me`)
      .pipe(map(s => this.mapStudent(s)));
  }

  /** Coach: retorna aluno + plano ativo */
  getStudentWithPlan(studentId: string): Observable<{ student: Student; plan: TrainingPlan | null }> {
    return this.http
      .get<{ student: RawStudent; plan: RawPlan | null }>(`${this.base}/students/${studentId}/plan`)
      .pipe(
        map(r => ({
          student: this.mapStudent(r.student),
          plan: r.plan ? this.mapPlan(r.plan) : null,
        })),
      );
  }

  // ── Training Plans ────────────────────────────────────────────────────────

  /** Retorna plano completo por ID */
  getPlanById(planId: string): Observable<TrainingPlan> {
    return this.http
      .get<RawPlan>(`${this.base}/training-plans/${planId}`)
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Inicializa 4 semanas × 6 dias para um plano sem semanas */
  initializePlan(planId: string): Observable<TrainingPlan> {
    return this.http
      .post<RawPlan>(`${this.base}/training-plans/${planId}/initialize`, {})
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Publica o plano para o atleta */
  publishPlan(planId: string): Observable<TrainingPlan> {
    return this.http
      .patch<RawPlan>(`${this.base}/training-plans/${planId}/publish`, {})
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Retorna todos os planos de um aluno */
  getPlansByStudent(studentId: string): Observable<TrainingPlan[]> {
    return this.http
      .get<RawPlan[]>(`${this.base}/training-plans/student/${studentId}`)
      .pipe(map(list => list.map(p => this.mapPlan(p))));
  }

  /** Cria novo plano de treino para um aluno */
  createPlan(studentId: string, title: string, month: number, startDate: string): Observable<TrainingPlan> {
    return this.http
      .post<RawPlan>(`${this.base}/training-plans`, { studentId, title, month, startDate })
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Coach: planos compartilhados (Core/LPO) — pertencem ao coach, valem pra todos os alunos com a categoria */
  getSharedPlans(category?: TrainingCategory): Observable<TrainingPlan[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.http
      .get<RawPlan[]>(`${this.base}/training-plans/shared${query}`)
      .pipe(map(list => list.map(p => this.mapPlan(p))));
  }

  /** Coach: cria plano compartilhado (só CORE ou LPO — Performance é sempre individual) */
  createSharedPlan(category: 'CORE' | 'LPO', title: string, month: number, startDate: string): Observable<TrainingPlan> {
    return this.http
      .post<RawPlan>(`${this.base}/training-plans/shared`, { category, title, month, startDate })
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Cria plano de treino a partir de um PDF, via extração por IA (rascunho, não publicado) */
  importPlanFromPdf(studentId: string, startDate: string, file: File): Observable<{ id: string }> {
    const formData = new FormData();
    formData.append('studentId', studentId);
    formData.append('startDate', startDate);
    formData.append('file', file);
    return this.http.post<{ id: string }>(`${this.base}/training-plans/import-pdf`, formData);
  }

  /** Retorna o primeiro plano do aluno (mais usado no front) */
  getFirstPlanByStudent(studentId: string): Observable<TrainingPlan | null> {
    return this.getPlansByStudent(studentId).pipe(
      map(plans => plans[0] ?? null),
    );
  }

  /** % real de conclusão por dia da semana (dayIndex 0-6), agregado entre os alunos do coach */
  getWeeklyCompletion(): Observable<{ dayIndex: number; percent: number }[]> {
    return this.http.get<{ dayIndex: number; percent: number }[]>(`${this.base}/training-plans/coach/weekly-completion`);
  }

  // ── Daily intake (hidratação / calorias) ────────────────────────────────

  logHydration(amountMl: number): Observable<void> {
    return this.http.post<void>(`${this.base}/daily-intake/hydration`, { amountMl });
  }

  logCalories(kcal: number): Observable<void> {
    return this.http.post<void>(`${this.base}/daily-intake/calories`, { kcal });
  }

  getTodayIntake(): Observable<{ hydrationMl: number; calories: number }> {
    return this.http.get<{ hydrationMl: number; calories: number }>(`${this.base}/daily-intake/today`);
  }

  /** Histórico de 14 dias de hidratação/calorias de um aluno — coach dono */
  getStudentIntakeHistory(studentId: string): Observable<{ date: string; hydrationMl: number; calories: number }[]> {
    return this.http.get<{ date: string; hydrationMl: number; calories: number }[]>(`${this.base}/daily-intake/student/${studentId}/history`);
  }

  // ── Recordes pessoais (PR/1RM) ──────────────────────────────────────────

  getMovements(): Observable<Movement[]> {
    return this.http.get<Movement[]>(`${this.base}/movements`);
  }

  createMovement(name: string, category: string): Observable<Movement> {
    return this.http.post<Movement>(`${this.base}/movements`, { name, category });
  }

  logPersonalRecord(movementId: string, loadKg?: number, reps?: number, note?: string): Observable<PersonalRecord> {
    return this.http.post<PersonalRecord>(`${this.base}/personal-records`, { movementId, loadKg, reps, note });
  }

  getMyPersonalRecords(): Observable<PersonalRecord[]> {
    return this.http.get<PersonalRecord[]>(`${this.base}/personal-records/me`);
  }

  getStudentPersonalRecordsHistory(studentId: string): Observable<PersonalRecord[]> {
    return this.http.get<PersonalRecord[]>(`${this.base}/personal-records/student/${studentId}/history`);
  }

  // ── Sessions (plan-builder) ───────────────────────────────────────────────

  addSession(dayId: string, name: string, type: string): Observable<Session> {
    return this.http
      .post<RawSession>(`${this.base}/training-plans/days/${dayId}/sessions`, { name, type, order: 0 })
      .pipe(map(s => this.mapSession(s)));
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/training-plans/sessions/${sessionId}`);
  }

  // ── Exercises (plan-builder) ──────────────────────────────────────────────

  addExercise(sessionId: string, dto: Partial<RawExercise>): Observable<Exercise> {
    return this.http
      .post<RawExercise>(`${this.base}/training-plans/sessions/${sessionId}/exercises`, dto)
      .pipe(map(e => this.mapExercise(e)));
  }

  updateExercise(exerciseId: string, dto: Partial<RawExercise>): Observable<Exercise> {
    return this.http
      .patch<RawExercise>(`${this.base}/training-plans/exercises/${exerciseId}`, dto)
      .pipe(map(e => this.mapExercise(e)));
  }

  deleteExercise(exerciseId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/training-plans/exercises/${exerciseId}`);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  getSession(id: string): Observable<Session> {
    return this.http
      .get<RawSession & { exercises: RawExercise[] }>(`${this.base}/sessions/${id}`)
      .pipe(map(s => this.mapSession(s)));
  }

  // ── Exercise Library ─────────────────────────────────────────────────────

  getLibrary(): Observable<ExerciseLibraryItem[]> {
    return this.http.get<ExerciseLibraryItem[]>(`${this.base}/exercise-library`);
  }

  createLibraryItem(dto: Partial<ExerciseLibraryItem>): Observable<ExerciseLibraryItem> {
    return this.http.post<ExerciseLibraryItem>(`${this.base}/exercise-library`, dto);
  }

  updateLibraryItem(id: string, dto: Partial<ExerciseLibraryItem>): Observable<ExerciseLibraryItem> {
    return this.http.patch<ExerciseLibraryItem>(`${this.base}/exercise-library/${id}`, dto);
  }

  deleteLibraryItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/exercise-library/${id}`);
  }

  uploadLibraryImage(id: string, file: File): Observable<ExerciseLibraryItem> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ExerciseLibraryItem>(`${this.base}/exercise-library/${id}/image`, formData);
  }

  removeLibraryImage(id: string): Observable<ExerciseLibraryItem> {
    return this.http.delete<ExerciseLibraryItem>(`${this.base}/exercise-library/${id}/image`);
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  getPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/payments`);
  }

  getPaymentSummary(): Observable<PaymentSummary> {
    return this.http.get<PaymentSummary>(`${this.base}/payments/summary`);
  }

  createPayment(dto: { studentId: string; amount: number; dueDate: string; description?: string }): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/payments`, dto);
  }

  markPaymentPaid(id: string): Observable<Payment> {
    return this.http.patch<Payment>(`${this.base}/payments/${id}/pay`, {});
  }

  deletePayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/payments/${id}`);
  }

  // ── Workout Logs ──────────────────────────────────────────────────────────

  logExercise(exerciseId: string, setsCompleted: number, notes?: string, durationSeconds?: number): Observable<WorkoutLog> {
    return this.http.post<WorkoutLog>(`${this.base}/workout-logs`, {
      exerciseId,
      setsCompleted,
      notes,
      durationSeconds,
    });
  }

  // ── Workout Sessions (tempo de execução) ─────────────────────────────────

  checkoutWorkoutSession(sessionId: string, startedAt: string, finishedAt: string): Observable<WorkoutSessionRecord> {
    return this.http.post<WorkoutSessionRecord>(`${this.base}/workout-sessions`, { sessionId, startedAt, finishedAt });
  }

  getMyWorkoutSessions(): Observable<WorkoutSessionRecord[]> {
    return this.http.get<WorkoutSessionRecord[]>(`${this.base}/workout-sessions/me`);
  }

  getStudentSessionSummary(studentId: string): Observable<SessionTimeSummary> {
    return this.http.get<SessionTimeSummary>(`${this.base}/workout-sessions/student/${studentId}/summary`);
  }

  getStudentSessionDetail(studentId: string, sessionId: string): Observable<SessionTimeDetail> {
    return this.http.get<SessionTimeDetail>(`${this.base}/workout-sessions/student/${studentId}/session/${sessionId}`);
  }

  getCoachAvgDuration(): Observable<CoachAvgDuration> {
    return this.http.get<CoachAvgDuration>(`${this.base}/workout-sessions/coach/avg-duration`);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  getInbox(): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/messages/inbox`);
  }

  getConversation(otherId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/messages/${otherId}`);
  }

  sendMessage(toId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/messages`, { toId, content });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/messages/unread`);
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  getNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(`${this.base}/notifications`);
  }

  getNotificationsUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/notifications/unread-count`);
  }

  markNotificationRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.base}/notifications/${id}/read`, {});
  }

  markAllNotificationsRead(): Observable<void> {
    return this.http.patch<void>(`${this.base}/notifications/read-all`, {});
  }

  /** Atleta: histórico completo de treinos */
  getWorkoutHistory(limit = 200): Observable<WorkoutLogEntry[]> {
    return this.http
      .get<RawWorkoutLog[]>(`${this.base}/workout-logs/history?limit=${limit}`)
      .pipe(map(list => list.map(l => this.mapWorkoutLogEntry(l))));
  }

  /** Coach: histórico completo de treinos de um aluno específico (dono via ownership check no backend) */
  getStudentWorkoutHistory(studentId: string, limit = 500): Observable<WorkoutLogEntry[]> {
    return this.http
      .get<RawWorkoutLog[]>(`${this.base}/workout-logs/student/${studentId}/history?limit=${limit}`)
      .pipe(map(list => list.map(l => this.mapWorkoutLogEntry(l))));
  }

  private mapWorkoutLogEntry(l: RawWorkoutLog): WorkoutLogEntry {
    return {
      id:           l.id,
      exerciseId:   l.exerciseId,
      exerciseName: l.exercise?.name ?? '',
      sessionName:  l.exercise?.session?.name ?? '',
      sessionType:  l.exercise?.session?.type ?? '',
      completedAt:  new Date(l.completedAt),
      setsCompleted: l.setsCompleted,
      notes:        l.notes ?? undefined,
    };
  }

  // ── Workout Skips ─────────────────────────────────────────────────────────

  /** Atleta: pula um exercicio ou uma sessao, com justificativa */
  skip(target: { exerciseId?: string; sessionId?: string }, reason: SkipReason, decision: SkipDecision, note?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/workout-skips`, { ...target, reason, decision, note });
  }

  /** Coach: contagem de skips pendentes por aluno */
  getPendingSkipCounts(): Observable<{ studentId: string; count: number }[]> {
    return this.http.get<{ studentId: string; count: number }[]>(`${this.base}/workout-skips/pending-count`);
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapStudent(s: RawStudent): Student {
    return {
      id:                s.id,
      name:              s.user.name,
      email:             s.user.email,
      goal:              s.goal,
      currentMonth:      s.currentMonth,
      currentWeek:       s.currentWeek,
      coachId:           s.coachId,
      completionPercent: s.completionPercent,
      avatarUrl:         s.avatarUrl,
      subscription:      s.subscription,
    };
  }

  private mapPlan(p: RawPlan): TrainingPlan {
    return {
      id:        p.id,
      studentId: p.studentId ?? null,
      category:  p.category ?? 'PERFORMANCE',
      scope:     p.scope ?? 'INDIVIDUAL',
      coachId:   p.coachId,
      month:     p.month,
      startDate: p.startDate,
      title:     p.title,
      published: p.published,
      weeks:     (p.weeks ?? []).map(w => ({
        id:         w.id,
        weekNumber: w.weekNumber,
        ...(w.locked ? { locked: true } : {}),
        days:       (w.days ?? []).map(d => ({
          id:         d.id,
          dayOfWeek:  d.dayOfWeek,
          dayIndex:   d.dayIndex,
          sessions:   (d.sessions ?? []).map(s => this.mapSession(s)),
        })),
      })),
    };
  }

  private mapSession(s: RawSession): Session {
    const exercises = (s.exercises ?? []).map(e => this.mapExercise(e));
    const allDone = exercises.length > 0 && exercises.every(e => e.completed);
    // workoutSkips vem do backend com take: 1, orderBy: createdAt desc — skips?.[0] é sempre o mais recente
    return {
      id:        s.id,
      name:      s.name,
      type:      s.type as Session['type'],
      order:     s.order,
      exercises,
      status:    this.computeStatus(allDone, s.workoutSkips),
    };
  }

  private mapExercise(e: RawExercise): Exercise {
    const done = !!e.workoutLogs && e.workoutLogs.length > 0;
    return {
      id:           e.id,
      name:         e.name,
      youtubeUrl:   e.youtubeUrl ?? undefined,
      sets:         e.sets ?? undefined,
      reps:         e.reps ?? undefined,
      duration:     e.duration ?? undefined,
      restSeconds:  e.restSeconds ?? undefined,
      loadPercent:  e.loadPercent ?? undefined,
      coachNotes:   e.coachNotes ?? undefined,
      completed:    done,
      status:       this.computeStatus(done, e.workoutSkips),
    };
  }

  private computeStatus(
    done: boolean,
    skips?: { decision: 'Postponed' | 'Abandoned' }[],
  ): 'done' | 'postponed' | 'abandoned' | 'none' {
    if (done) return 'done';
    const latest = skips?.[0];
    if (latest?.decision === 'Postponed') return 'postponed';
    if (latest?.decision === 'Abandoned') return 'abandoned';
    return 'none';
  }

  // ── Admin ────────────────────────────────────────────────────────────────

  getCoaches(): Observable<{
    id: string; name: string; email: string; aiImportEnabled: boolean; createdAt: string;
    platformFeePercent: number; studentCount: number; totalPaid: number; gatewayFee: number; platformCut: number; coachCut: number;
    pendingBreakdown: number; subscriptions: CoachSubscriptionSummary; alerts: CoachAlert[]; usage: CoachUsage;
  }[]> {
    return this.http.get<{
      id: string; name: string; email: string; aiImportEnabled: boolean; createdAt: string;
      platformFeePercent: number; studentCount: number; totalPaid: number; gatewayFee: number; platformCut: number; coachCut: number;
      pendingBreakdown: number; subscriptions: CoachSubscriptionSummary; alerts: CoachAlert[]; usage: CoachUsage;
    }[]>(`${this.base}/admin/coaches`);
  }

  /** Admin: financeiro por coach, mês atual e os 5 anteriores. */
  getAdminFinancial(): Observable<AdminFinancialOverview> {
    return this.http.get<AdminFinancialOverview>(`${this.base}/admin/financial`);
  }

  createCoach(name: string, email: string): Observable<{ id: string; name: string; email: string; welcomeSent: true }> {
    return this.http.post<{ id: string; name: string; email: string; welcomeSent: true }>(
      `${this.base}/admin/coaches`, { name, email },
    );
  }

  resetCoachPassword(id: string): Observable<{ sent: true }> {
    return this.http.post<{ sent: true }>(`${this.base}/admin/coaches/${id}/reset-password`, {});
  }

  toggleCoachAi(id: string, aiImportEnabled: boolean): Observable<{ id: string; aiImportEnabled: boolean }> {
    return this.http.patch<{ id: string; aiImportEnabled: boolean }>(
      `${this.base}/admin/coaches/${id}`, { aiImportEnabled },
    );
  }
  // ── Subscription plans (catálogo do coach) ────────────────────────────────

  /** Coach: catálogo próprio. Admin: informe coachId para o catálogo de um coach específico. */
  getSubscriptionPlans(coachId?: string): Observable<SubscriptionPlan[]> {
    const query = coachId ? `?coachId=${encodeURIComponent(coachId)}` : '';
    return this.http.get<SubscriptionPlan[]>(`${this.base}/subscription-plans${query}`);
  }

  createSubscriptionPlan(dto: {
    name: string; description?: string; priceCents: number; categories: TrainingCategory[];
    isFree?: boolean; freeConfig?: FreeConfig; active?: boolean;
  }, coachId?: string): Observable<SubscriptionPlan> {
    const query = coachId ? `?coachId=${encodeURIComponent(coachId)}` : '';
    return this.http.post<SubscriptionPlan>(`${this.base}/subscription-plans${query}`, dto);
  }

  updateSubscriptionPlan(id: string, dto: Partial<{
    name: string; description: string; priceCents: number; categories: TrainingCategory[];
    isFree: boolean; freeConfig: FreeConfig; active: boolean;
  }>): Observable<SubscriptionPlan> {
    return this.http.patch<SubscriptionPlan>(`${this.base}/subscription-plans/${id}`, dto);
  }

  // ── Subscriptions (atribuição ao aluno) ────────────────────────────────────

  getStudentSubscription(studentId: string): Observable<Subscription | null> {
    return this.http.get<Subscription | null>(`${this.base}/students/${studentId}/subscription`);
  }

  assignSubscription(studentId: string, dto: { planId: string; status?: Subscription['status']; trialEndsAt?: string }): Observable<Subscription> {
    return this.http.put<Subscription>(`${this.base}/students/${studentId}/subscription`, dto);
  }

  removeSubscription(studentId: string): Observable<{ removed: boolean }> {
    return this.http.delete<{ removed: boolean }>(`${this.base}/students/${studentId}/subscription`);
  }

  /** Aluno: a própria assinatura + o que ela libera hoje. */
  getMySubscription(): Observable<MySubscription> {
    return this.http.get<MySubscription>(`${this.base}/subscriptions/me`);
  }

  /** Situação da própria assinatura (só banco) — a tela do PIX consulta em intervalos esperando a confirmação. */
  getMyPaymentStatus(): Observable<MyPaymentStatus> {
    return this.http.get<MyPaymentStatus>(`${this.base}/subscriptions/me/payment-status`);
  }

  /** PIX (QR + copia e cola) da cobrança em aberto do próprio aluno. */
  getMyPix(): Observable<MyPix> {
    return this.http.get<MyPix>(`${this.base}/subscriptions/me/pix`);
  }

  /** Aluno: assina o plano (Free direto; pago cria a cobrança PIX no Asaas e devolve o link). */
  checkoutSubscription(planId: string, cpf?: string): Observable<CheckoutResult> {
    return this.http.put<CheckoutResult>(`${this.base}/subscriptions/checkout`, cpf ? { planId, cpf } : { planId });
  }

  /** Coach: carteira Asaas onde recebe a parte dele de cada cobrança. */
  getMyWallet(): Observable<CoachWallet> {
    return this.http.get<CoachWallet>(`${this.base}/subscriptions/wallet`);
  }

  setMyWallet(walletId: string): Observable<CoachWallet> {
    return this.http.put<CoachWallet>(`${this.base}/subscriptions/wallet`, { walletId });
  }

  /** Aluno: histórico real das próprias cobranças (Asaas). */
  getMyPayments(): Observable<MyGatewayPayment[]> {
    return this.http.get<MyGatewayPayment[]>(`${this.base}/subscriptions/me/payments`);
  }

  /** Coach: cobranças do Asaas dos próprios alunos, com a divisão real de cada uma. */
  getCoachGatewayPayments(): Observable<CoachGatewayPayment[]> {
    return this.http.get<CoachGatewayPayment[]>(`${this.base}/subscriptions/gateway-payments`);
  }

  /** Coach: mês corrente — bruto, taxa do Asaas, % da plataforma e o próprio líquido. */
  getMonthlyBreakdown(): Observable<MonthlyBreakdown> {
    return this.http.get<MonthlyBreakdown>(`${this.base}/subscriptions/monthly-breakdown`);
  }

  /** Coach: MRR/receita por plano, inadimplência e churn/LTV projetado — dado real, sem invenção. */
  getFinancialSummary(): Observable<FinancialSummary> {
    return this.http.get<FinancialSummary>(`${this.base}/subscriptions/financial-summary`);
  }

  // ── Admin: contrato do coach e configurações da plataforma ────────────────

  /** Admin: alunos ativos do coach (nome, plano, situação, entrada). Cada consulta fica registrada no servidor. */
  adminGetCoachStudents(coachId: string): Observable<AdminCoachStudent[]> {
    return this.http.get<AdminCoachStudent[]>(`${this.base}/admin/coaches/${coachId}/students`);
  }

  getCoachContract(coachId: string): Observable<CoachContract> {
    return this.http.get<CoachContract>(`${this.base}/admin/coaches/${coachId}/contract`);
  }

  setCoachContract(coachId: string, platformFeePercent: number): Observable<CoachContract> {
    return this.http.put<CoachContract>(`${this.base}/admin/coaches/${coachId}/contract`, { platformFeePercent });
  }

  getPlatformSettings(): Observable<PlatformSettings> {
    return this.http.get<PlatformSettings>(`${this.base}/admin/platform-settings`);
  }

  setPlatformSettings(enforceSubscriptionAccess: boolean, confirmLockout = false): Observable<PlatformSettings> {
    return this.http.patch<PlatformSettings>(`${this.base}/admin/platform-settings`, { enforceSubscriptionAccess, confirmLockout });
  }

  // ── Landing page do coach ───────────────────────────────────────────────

  /** Coach: o próprio perfil público (null se ainda não configurado) */
  getMyCoachProfile(): Observable<CoachProfile | null> {
    return this.http.get<CoachProfile | null>(`${this.base}/coach-profile`);
  }

  upsertCoachProfile(dto: UpdateCoachProfileInput): Observable<CoachProfile> {
    return this.http.put<CoachProfile>(`${this.base}/coach-profile`, dto);
  }

  publishCoachProfile(published: boolean): Observable<CoachProfile> {
    return this.http.patch<CoachProfile>(`${this.base}/coach-profile/publish`, { published });
  }

  uploadCoachBanner(file: File): Observable<CoachProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CoachProfile>(`${this.base}/coach-profile/banner`, formData);
  }

  uploadCoachPhoto(file: File): Observable<CoachProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CoachProfile>(`${this.base}/coach-profile/photo`, formData);
  }

  // ── Depoimentos ──────────────────────────────────────────────────────────

  getCoachTestimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${this.base}/coach-profile/testimonials`);
  }

  createTestimonial(dto: UpsertTestimonialInput): Observable<Testimonial> {
    return this.http.post<Testimonial>(`${this.base}/coach-profile/testimonials`, dto);
  }

  updateTestimonial(id: string, dto: UpsertTestimonialInput): Observable<Testimonial> {
    return this.http.patch<Testimonial>(`${this.base}/coach-profile/testimonials/${id}`, dto);
  }

  deleteTestimonial(id: string): Observable<{ removed: boolean }> {
    return this.http.delete<{ removed: boolean }>(`${this.base}/coach-profile/testimonials/${id}`);
  }

  // ── FAQ ──────────────────────────────────────────────────────────────────

  getCoachFaqItems(): Observable<FaqItem[]> {
    return this.http.get<FaqItem[]>(`${this.base}/coach-profile/faq`);
  }

  createFaqItem(dto: UpsertFaqItemInput): Observable<FaqItem> {
    return this.http.post<FaqItem>(`${this.base}/coach-profile/faq`, dto);
  }

  updateFaqItem(id: string, dto: UpsertFaqItemInput): Observable<FaqItem> {
    return this.http.patch<FaqItem>(`${this.base}/coach-profile/faq/${id}`, dto);
  }

  deleteFaqItem(id: string): Observable<{ removed: boolean }> {
    return this.http.delete<{ removed: boolean }>(`${this.base}/coach-profile/faq/${id}`);
  }

  // ── Consentimentos do aluno (LGPD) ──────────────────────────────────────────

  getConsents(): Observable<ConsentStatus> {
    return this.http.get<ConsentStatus>(`${this.base}/consents/me`);
  }

  /** Aceita os termos atuais e responde sobre saúde; devolve uma sessão NOVA (o token antigo segue barrado). */
  acceptConsents(healthConsent: boolean): Observable<{ access_token: string; user: User }> {
    return this.http.put<{ access_token: string; user: User }>(`${this.base}/consents/me`, { acceptTerms: true, healthConsent });
  }

  /** Coach: aceita o Termo do Coach; devolve uma sessão NOVA (o token antigo segue barrado). */
  acceptCoachTerms(): Observable<{ access_token: string; user: User }> {
    return this.http.put<{ access_token: string; user: User }>(`${this.base}/coach-terms/me`, { acceptTerms: true });
  }

  /** Esqueci minha senha: a resposta é sempre a mesma (não revela quem tem conta). */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/forgot-password`, { email });
  }

  /** Cria a senha nova pelo link recebido por e-mail. */
  resetPassword(token: string, password: string): Observable<{ reset: true }> {
    return this.http.post<{ reset: true }>(`${this.base}/auth/reset-password`, { token, password });
  }

  /** Confirma o e-mail pelo link (uso único), cria a senha e devolve a sessão. */
  verifyEmail(token: string, password: string): Observable<{ access_token: string; user: User }> {
    return this.http.post<{ access_token: string; user: User }>(`${this.base}/auth/verify-email`, { token, password });
  }

  /** Reenvia a confirmação: a resposta é sempre a mesma (não revela quem tem conta). */
  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/auth/resend-verification`, { email });
  }

  /** Coach: manda ao aluno o link por e-mail para criar uma senha nova. */
  sendStudentPasswordReset(studentId: string): Observable<{ sent: true }> {
    return this.http.post<{ sent: true }>(`${this.base}/students/${studentId}/password-reset`, {});
  }

  /** Aluno: exclui (anonimiza) a própria conta, confirmando a senha. */
  deleteMyAccount(password: string): Observable<{ deleted: boolean }> {
    return this.http.post<{ deleted: boolean }>(`${this.base}/account/delete`, { password });
  }

  /** Admin: acha o aluno pelo e-mail exato de um pedido de exclusão. */
  adminFindAthlete(email: string): Observable<AthleteLookup> {
    return this.http.get<AthleteLookup>(`${this.base}/admin/athletes`, { params: { email } });
  }

  /** Admin: exclui (anonimiza) a conta do aluno. */
  adminAnonymizeAthlete(id: string): Observable<{ deleted: boolean }> {
    return this.http.post<{ deleted: boolean }>(`${this.base}/admin/athletes/${id}/anonymize`, {});
  }

  setHealthConsent(healthConsent: boolean): Observable<{ healthConsent: boolean; healthConsentAt: string }> {
    return this.http.patch<{ healthConsent: boolean; healthConsentAt: string }>(`${this.base}/consents/me/health`, { healthConsent });
  }

  /** Visitante (sem auth): landing page pública do coach */
  /** Público: visitante vira aluno deste coach; entra depois de confirmar o e-mail (o link volta ao pagamento). */
  publicSignup(slug: string, dto: PublicSignupInput): Observable<PublicSignupResult> {
    return this.http.post<PublicSignupResult>(`${this.base}/public/coaches/${slug}/signup`, dto);
  }

  getPublicCoachProfile(slug: string): Observable<PublicCoachProfile> {
    return this.http.get<PublicCoachProfile>(`${this.base}/public/coaches/${slug}`);
  }

  createLead(slug: string, dto: CreateLeadInput): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${this.base}/public/coaches/${slug}/leads`, dto);
  }

  /** Aluno: cancela a própria assinatura */
  cancelMySubscription(): Observable<Subscription> {
    return this.http.delete<Subscription>(`${this.base}/subscriptions/me`);
  }
}
