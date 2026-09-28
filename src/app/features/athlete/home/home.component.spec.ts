import { of, throwError } from 'rxjs';
import { HomeComponent } from './home.component';

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getMyStudentProfile: vi.fn().mockReturnValue(of({ id: 's1', currentWeek: 1 })),
    getPlansByStudent: vi.fn().mockReturnValue(of([])),
    getTodayIntake: vi.fn().mockReturnValue(of({ hydrationMl: 500, calories: 1200 })),
    getWorkoutHistory: vi.fn().mockReturnValue(of([])),
    getMyPersonalRecords: vi.fn().mockReturnValue(of([])),
    logHydration: vi.fn().mockReturnValue(of({})),
    logCalories: vi.fn().mockReturnValue(of({})),
    ...apiOver,
  };
  const auth = { currentUser: vi.fn().mockReturnValue({ name: 'Ana Souza' }) };
  const component = new HomeComponent(api as any, auth as any);
  return { component, api };
}

describe('HomeComponent — carga inicial', () => {
  afterEach(() => vi.useRealTimers());

  it('saudação conforme a hora', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 9));
    const morning = build().component; morning.ngOnInit();
    expect(morning.greeting()).toBe('Bom dia');

    vi.setSystemTime(new Date(2026, 8, 24, 15));
    const afternoon = build().component; afternoon.ngOnInit();
    expect(afternoon.greeting()).toBe('Boa tarde');

    vi.setSystemTime(new Date(2026, 8, 24, 20));
    const night = build().component; night.ngOnInit();
    expect(night.greeting()).toBe('Boa noite');
  });

  it('carrega hidratação/calorias de hoje', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.hydration()).toBe('0.50');
    expect(component.calories()).toBe(1200);
  });

  it('sem plano: não preenche sessões de hoje', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getPlansByStudent).toHaveBeenCalledWith('s1');
    expect(component.todaySessions()).toEqual([]);
    expect(component.dailyGoalPercent()).toBe(0);
  });

  it('com plano: usa as sessões de hoje do plano', () => {
    const plan = { id: 'p1', category: 'PERFORMANCE', scope: 'INDIVIDUAL', weeks: [] };
    const { component } = build({ getPlansByStudent: vi.fn().mockReturnValue(of([plan])) });
    component.ngOnInit();
    expect(component.todaySessions()).toEqual([]);
  });

  it('sequência e semana calculadas do histórico real de treinos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 10)); // quinta
    const logs = [new Date(2026, 8, 24, 8), new Date(2026, 8, 23, 8)].map(completedAt => ({ completedAt }));
    const { component, api } = build({ getWorkoutHistory: vi.fn().mockReturnValue(of(logs)) });
    component.ngOnInit();
    expect(api.getWorkoutHistory).toHaveBeenCalledWith(200);
    expect(component.streak()).toEqual({ days: 2, atLeast: false });
    expect(component.week()[3]).toEqual({ label: 'QUI', state: 'done' });
  });

  it('histórico cheio (200) e contínuo: marca a sequência como "no mínimo"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 10));
    const logs = Array.from({ length: 200 }, () => ({ completedAt: new Date(2026, 8, 24, 8) }));
    const { component } = build({ getWorkoutHistory: vi.fn().mockReturnValue(of(logs)) });
    component.ngOnInit();
    expect(component.streak()).toEqual({ days: 1, atLeast: true });
  });

  it('erro no histórico só esconde o card da sequência', () => {
    const { component } = build({ getWorkoutHistory: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.streak()).toBeNull();
    expect(component.calories()).toBe(1200);
  });

  it('PR mais recente vem dos recordes reais', () => {
    const rec = { id: 'r1', athleteId: 'a', movementId: 'm', loadKg: 84, achievedAt: '2026-09-10T10:00:00.000Z', movement: { name: 'Snatch' } };
    const { component } = build({ getMyPersonalRecords: vi.fn().mockReturnValue(of([rec])) });
    component.ngOnInit();
    expect(component.prsLoaded()).toBe(true);
    expect(component.latestPr()).toEqual({ record: rec, deltaKg: null });
  });

  it('sem recordes: card carregado sem PR (convida a registrar)', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.prsLoaded()).toBe(true);
    expect(component.latestPr()).toBeNull();
  });

  it('erro nos recordes: card de PR não aparece', () => {
    const { component } = build({ getMyPersonalRecords: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.prsLoaded()).toBe(false);
  });
});

describe('HomeComponent — meta diária e próxima sessão', () => {
  it('percentual de sessões concluídas e próxima pendente', () => {
    const { component } = build();
    component.todaySessions.set([
      { id: 'a', status: 'done' }, { id: 'b', status: 'none' }, { id: 'c', status: 'none' },
    ] as any);
    expect(component.dailyGoalPercent()).toBe(33);
    expect(component.isNextSession({ id: 'b' } as any)).toBe(true);
    expect(component.isNextSession({ id: 'c' } as any)).toBe(false);
  });

  it('sem pendentes: nenhuma é a próxima', () => {
    const { component } = build();
    component.todaySessions.set([{ id: 'a', status: 'done' }] as any);
    expect(component.isNextSession({ id: 'a' } as any)).toBe(false);
  });

  it('getWeekDay devolve o dia por extenso em pt-BR', () => {
    expect(typeof build().component.getWeekDay()).toBe('string');
  });
});

describe('HomeComponent — água e calorias', () => {
  it('addWater soma 250ml e ignora toque duplo enquanto grava', () => {
    const { component, api } = build();
    component.addWater();
    expect(api.logHydration).toHaveBeenCalledWith(250);
    expect(component.hydrationMl()).toBe(250);
    component.loggingWater.set(true);
    component.addWater();
    expect(api.logHydration).toHaveBeenCalledTimes(1);
  });

  it('addWater com erro libera o botão sem somar', () => {
    const { component } = build({ logHydration: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.addWater();
    expect(component.hydrationMl()).toBe(0);
    expect(component.loggingWater()).toBe(false);
  });

  it('abrir/cancelar o campo de calorias', () => {
    const { component } = build();
    component.calorieInput.set(300);
    component.openCalorieInput();
    expect(component.addingCalories()).toBe(true);
    expect(component.calorieInput()).toBeNull();
    component.cancelCalorieInput();
    expect(component.addingCalories()).toBe(false);
  });

  it('confirmCalories soma e fecha; ignora vazio, zero e negativo', () => {
    const { component, api } = build();
    component.calorieInput.set(null); component.confirmCalories();
    component.calorieInput.set(0); component.confirmCalories();
    component.calorieInput.set(-5); component.confirmCalories();
    expect(api.logCalories).not.toHaveBeenCalled();

    component.addingCalories.set(true);
    component.calorieInput.set(450);
    component.confirmCalories();
    expect(api.logCalories).toHaveBeenCalledWith(450);
    expect(component.calories()).toBe(450);
    expect(component.addingCalories()).toBe(false);
    expect(component.loggingCalories()).toBe(false);
  });

  it('confirmCalories ignora clique duplo enquanto grava', () => {
    const { component, api } = build();
    component.loggingCalories.set(true);
    component.calorieInput.set(450);
    component.confirmCalories();
    expect(api.logCalories).not.toHaveBeenCalled();
  });

  it('confirmCalories com erro libera o botão sem somar', () => {
    const { component } = build({ logCalories: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.calorieInput.set(450);
    component.confirmCalories();
    expect(component.calories()).toBe(0);
    expect(component.loggingCalories()).toBe(false);
  });
});
