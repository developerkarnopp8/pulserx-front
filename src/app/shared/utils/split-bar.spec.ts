import { shareOfMax, splitSegments } from './split-bar';

describe('splitSegments', () => {
  it('sem valor conhecido: nenhuma fatia (não desenha barra fictícia)', () => {
    expect(splitSegments(0, 0, 0)).toEqual([]);
  });

  it('fatias na ordem Asaas, AEVON, coach, em % do total com 1 casa', () => {
    const s = splitSegments(1.99, 9.7, 87.31);
    expect(s.map(x => x.key)).toEqual(['gateway', 'platform', 'coach']);
    expect(s.map(x => x.percent)).toEqual([2, 9.8, 88.2]);
    expect(s[2]).toMatchObject({ label: 'Você', value: 87.31 });
  });
});

describe('shareOfMax', () => {
  it('maior vira 100 e os outros proporcionais', () => {
    expect(shareOfMax([19800, 9900, 0])).toEqual([100, 50, 0]);
  });

  it('vazio ou tudo zero: sem divisão por zero', () => {
    expect(shareOfMax([])).toEqual([]);
    expect(shareOfMax([0, 0])).toEqual([0, 0]);
  });
});
