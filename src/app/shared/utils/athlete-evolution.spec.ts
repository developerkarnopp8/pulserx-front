import { prProgressions, sparklinePoints, weeklyTrainingDays } from './athlete-evolution';
import { PersonalRecord } from '../../core/models';

// Quinta 24/09/2026 — semana atual começa na segunda 21/09
const TODAY = new Date(2026, 8, 24, 10);
const at = (d: number, h = 8, m = 8) => new Date(2026, m, d, h);

describe('weeklyTrainingDays', () => {
  it('8 semanas por padrão, da mais antiga pra atual, rótulo da segunda-feira', () => {
    const weeks = weeklyTrainingDays([], TODAY);
    expect(weeks).toHaveLength(8);
    expect(weeks.at(-1)!.label).toBe('21/09');
    expect(weeks[0].label).toBe('03/08');
    expect(weeks.every(w => w.days === 0)).toBe(true);
  });

  it('conta dias distintos (vários treinos no mesmo dia = 1)', () => {
    const weeks = weeklyTrainingDays([at(21), at(21, 18), at(22), at(24)], TODAY, 2);
    expect(weeks.map(w => w.days)).toEqual([0, 3]);
  });

  it('domingo pertence à semana que começou na segunda anterior', () => {
    const weeks = weeklyTrainingDays([at(20), at(14)], TODAY, 2); // dom 20/09 e seg 14/09
    expect(weeks.map(w => [w.label, w.days])).toEqual([['14/09', 2], ['21/09', 0]]);
  });

  it('treino fora da janela é ignorado', () => {
    expect(weeklyTrainingDays([at(1, 8, 0)], TODAY, 4).every(w => w.days === 0)).toBe(true);
  });
});

const rec = (movementId: string, loadKg: number | undefined, achievedAt: string, name = movementId): PersonalRecord => ({
  id: `${movementId}-${achievedAt}`, athleteId: 'a', movementId, loadKg, reps: 1, achievedAt,
  movement: { id: movementId, name, category: 'LPO' },
});

describe('prProgressions', () => {
  it('vazio ou sem carga: nada', () => {
    expect(prProgressions([])).toEqual([]);
    expect(prProgressions([rec('snatch', undefined, '2026-09-01'), rec('snatch', 0, '2026-09-02')])).toEqual([]);
  });

  it('escada de PRs: só entra o que superou o melhor anterior; ganho do primeiro ao atual', () => {
    const [p] = prProgressions([
      rec('snatch', 80, '2026-09-01'),
      rec('snatch', 78, '2026-09-05'),
      rec('snatch', 80, '2026-09-08'),
      rec('snatch', 84.5, '2026-09-20'),
    ]);
    expect(p.points.map(x => x.loadKg)).toEqual([80, 84.5]);
    expect(p).toMatchObject({ bestKg: 84.5, firstKg: 80, gainKg: 4.5, lastPrAt: '2026-09-20', movementName: 'snatch', category: 'LPO' });
  });

  it('um registro só: ganho 0', () => {
    expect(prProgressions([rec('clean', 100, '2026-09-01')])[0].gainKg).toBe(0);
  });

  it('um por movimento, PR mais recente primeiro; ordem de chegada não importa', () => {
    const list = prProgressions([
      rec('squat', 140, '2026-09-10'),
      rec('snatch', 84, '2026-09-20'),
      rec('squat', 120, '2026-08-01'),
    ]);
    expect(list.map(p => p.movementId)).toEqual(['snatch', 'squat']);
    expect(list[1].points.map(x => x.loadKg)).toEqual([120, 140]);
  });

  it('ganho sem ruído de ponto flutuante', () => {
    const [p] = prProgressions([rec('x', 0.1, '2026-09-01'), rec('x', 0.3, '2026-09-02')]);
    expect(p.gainKg).toBe(0.2);
  });
});

describe('sparklinePoints', () => {
  it('vazio: nenhum ponto', () => {
    expect(sparklinePoints([], 100, 20)).toEqual([]);
  });

  it('um ponto fica no meio', () => {
    expect(sparklinePoints([50], 100, 20)).toEqual([{ x: 50, y: 10 }]);
  });

  it('valores iguais: linha no meio', () => {
    expect(sparklinePoints([5, 5], 100, 20).map(p => p.y)).toEqual([10, 10]);
  });

  it('menor embaixo, maior em cima, x espalhado com respiro', () => {
    expect(sparklinePoints([10, 20], 100, 20, 4)).toEqual([{ x: 4, y: 16 }, { x: 96, y: 4 }]);
  });
});
