import { filterMovements, normalizeSearch } from './movement-filter';

const item = (name: string, category: string) => ({ movement: { name, category } });
const items = [item('Back Squat', 'Força'), item('Front Squat', 'Força'), item('Snatch', 'LPO'), item('Pull-up', 'Ginástica')];

describe('normalizeSearch', () => {
  it('tira acento, maiúscula e espaço sobrando', () => {
    expect(normalizeSearch('  Força   Máxima ')).toBe('forca maxima');
  });
});

describe('filterMovements', () => {
  it('sem busca e sem grupo: tudo', () => {
    expect(filterMovements(items, '', null)).toEqual(items);
  });

  it('busca por parte do nome, sem diferenciar maiúscula', () => {
    expect(filterMovements(items, 'SQUAT', null).map(i => i.movement.name)).toEqual(['Back Squat', 'Front Squat']);
  });

  it('grupo exato', () => {
    expect(filterMovements(items, '', 'LPO').map(i => i.movement.name)).toEqual(['Snatch']);
  });

  it('busca + grupo combinados; nada encontrado = lista vazia', () => {
    expect(filterMovements(items, 'squat', 'Força')).toHaveLength(2);
    expect(filterMovements(items, 'squat', 'LPO')).toEqual([]);
  });

  it('busca só com espaços equivale a sem busca', () => {
    expect(filterMovements(items, '   ', null)).toHaveLength(4);
  });
});
