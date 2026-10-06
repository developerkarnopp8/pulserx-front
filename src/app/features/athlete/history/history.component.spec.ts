import { of, throwError } from 'rxjs';
import { HistoryComponent } from './history.component';

const log = (completedAt: Date) => ({ id: 'l', exerciseId: 'e', exerciseName: 'X', sessionName: 'S', sessionType: 'LPO', completedAt, setsCompleted: 3 });
const pr = (movementId: string, loadKg: number, achievedAt: string) =>
  ({ id: `${movementId}${loadKg}`, athleteId: 'a', movementId, loadKg, achievedAt, movement: { id: movementId, name: movementId, category: 'LPO' } });

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getWorkoutHistory: vi.fn().mockReturnValue(of([])),
    getMyWorkoutSessions: vi.fn().mockReturnValue(of([])),
    getMyPersonalRecords: vi.fn().mockReturnValue(of([])),
    ...apiOver,
  };
  return { component: new HistoryComponent(api as any), api };
}

describe('HistoryComponent (Evolução)', () => {
  afterEach(() => vi.useRealTimers());

  it('carrega histórico (200), sessões e PRs do próprio atleta', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getWorkoutHistory).toHaveBeenCalledWith(200);
    expect(api.getMyWorkoutSessions).toHaveBeenCalled();
    expect(api.getMyPersonalRecords).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
  });

  it('sequência, semanas e média a partir do histórico real', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 10));
    const logs = [new Date(2026, 8, 24, 8), new Date(2026, 8, 23, 8), new Date(2026, 8, 16, 8)].map(log);
    const { component } = build({ getWorkoutHistory: vi.fn().mockReturnValue(of(logs)) });
    component.ngOnInit();
    expect(component.streak()).toEqual({ days: 2, atLeast: false });
    expect(component.weeks().map(w => w.days).slice(-2)).toEqual([1, 2]);
    expect(component.weeklyAverage()).toBe(0.4); // 3 dias / 8 semanas = 0,375
  });

  it('histórico cheio (200) marca a sequência como "no mínimo"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 24, 10));
    const logs = Array.from({ length: 200 }, () => log(new Date(2026, 8, 24, 8)));
    const { component } = build({ getWorkoutHistory: vi.fn().mockReturnValue(of(logs)) });
    component.ngOnInit();
    expect(component.streak().atLeast).toBe(true);
  });

  it('erro no histórico: mensagem; erros em sessões/PRs não derrubam a tela', () => {
    const histErr = build({ getWorkoutHistory: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    histErr.component.ngOnInit();
    expect(histErr.component.errorMsg()).toContain('Não foi possível carregar');
    expect(histErr.component.loading()).toBe(false);

    const others = build({
      getMyWorkoutSessions: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
      getMyPersonalRecords: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
    });
    others.component.ngOnInit();
    expect(others.component.errorMsg()).toBe('');
    expect(others.component.progressions()).toEqual([]);
  });

  it('sessão média em segundos → texto; sem sessão "—"', () => {
    const { component } = build({
      getMyWorkoutSessions: vi.fn().mockReturnValue(of([{ elapsedSeconds: 1800 }, { elapsedSeconds: 3000 }])),
    });
    expect(component.avgSessionSeconds()).toBe(0);
    component.ngOnInit();
    expect(component.avgSessionSeconds()).toBe(2400);
    expect(component.formatDuration(component.avgSessionSeconds())).toBe('40 min');
    expect(component.formatDuration(0)).toBe('—');
    expect(component.formatDuration(3900)).toBe('1h05');
  });

  it('altura da barra: 0 vazio, mínimo visível com 1 dia, 100% com 7', () => {
    const { component } = build();
    expect(component.barHeight(0)).toBe(0);
    expect(component.barHeight(1)).toBe(14);
    expect(component.barHeight(7)).toBe(100);
  });

  it('evolução de PR com linha (caminho SVG) e ponto final', () => {
    const { component } = build({
      getMyPersonalRecords: vi.fn().mockReturnValue(of([pr('snatch', 80, '2026-09-01'), pr('snatch', 85, '2026-09-10')])),
    });
    component.ngOnInit();
    const [p] = component.progressions();
    expect(p.gainKg).toBe(5);
    expect(component.sparkPath(p)).toBe('M4.0 24.0 L92.0 4.0');
    expect(component.sparkLast(p)).toEqual({ x: 92, y: 4 });
  });
});

describe('HistoryComponent — card do movimento (Stitch mo05)', () => {
  const rec = (movementId: string, loadKg: number, achievedAt: string) =>
    ({ id: `${movementId}-${loadKg}`, athleteId: 'a', movementId, loadKg, achievedAt, movement: { id: movementId, name: movementId, category: 'LPO' } });

  it('abre o primeiro movimento; troca pelo escolhido; % de ganho da primeira marca', () => {
    const { component } = buildEvo([
      rec('snatch', 80, '2026-09-01T10:00:00.000Z'), rec('snatch', 100, '2026-09-10T10:00:00.000Z'),
      rec('clean', 100, '2026-09-02T10:00:00.000Z'),
    ]);
    const first = component.selected()!;
    expect(component.progressions().length).toBe(2);
    component.selectedMovementId.set('snatch');
    expect(component.selected()?.movementId).toBe('snatch');
    expect(component.gainPercent()).toBe(25);
    expect(component.bigPoints(component.selected()!).length).toBe(2);
    expect(component.bigPath(component.selected()!)).toMatch(/^M.* L/);
    component.selectedMovementId.set('clean');
    expect(component.gainPercent()).toBe(0);
    component.selectedMovementId.set('nao-existe');
    expect(component.selected()?.movementId).toBe(first.movementId);
  });

  it('sem PR: sem card e ganho 0', () => {
    const { component } = buildEvo([]);
    expect(component.selected()).toBeNull();
    expect(component.gainPercent()).toBe(0);
  });
});

function buildEvo(records: unknown[]) {
  const api = {
    getWorkoutHistory: vi.fn().mockReturnValue(of([])),
    getMyWorkoutSessions: vi.fn().mockReturnValue(of([])),
    getMyPersonalRecords: vi.fn().mockReturnValue(of(records)),
  };
  const component = new HistoryComponent(api as any);
  component.ngOnInit();
  return { component };
}
