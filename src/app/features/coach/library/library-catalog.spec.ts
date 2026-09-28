import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { LibraryComponent } from './library.component';
import { ExerciseLibraryItem } from '../../../core/models';

/** Cobre o catálogo em grade: abas de categoria, busca combinada e thumbnail real do YouTube. */

const item = (over: Partial<ExerciseLibraryItem> = {}): ExerciseLibraryItem => ({
  id: 'i1', coachId: 'coach-1', name: 'Snatch', category: 'LPO', youtubeUrl: undefined,
  sets: undefined, reps: undefined, duration: undefined, restSeconds: 90, loadPercent: undefined, notes: undefined,
  createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

function build(items: ExerciseLibraryItem[] = []) {
  const api = { getLibrary: vi.fn().mockReturnValue(of(items)) };
  const component = new LibraryComponent(api as any, new FormBuilder());
  component.ngOnInit();
  return { component, api };
}

describe('LibraryComponent.categoryTabs', () => {
  it('conta itens por categoria, ordenado alfabeticamente, "Sem categoria" incluso', () => {
    const { component } = build([
      item({ id: '1', category: 'LPO' }),
      item({ id: '2', category: 'LPO' }),
      item({ id: '3', category: 'Core' }),
      item({ id: '4', category: undefined }),
    ]);

    expect(component.categoryTabs()).toEqual([
      { name: 'Core', count: 1 },
      { name: 'LPO', count: 2 },
      { name: 'Sem categoria', count: 1 },
    ]);
  });
});

describe('LibraryComponent.filteredItems', () => {
  const items = [
    item({ id: '1', name: 'Snatch', category: 'LPO' }),
    item({ id: '2', name: 'Clean', category: 'LPO' }),
    item({ id: '3', name: 'Plank', category: 'Core' }),
  ];

  it('"all": devolve tudo', () => {
    const { component } = build(items);
    expect(component.filteredItems().map(i => i.id)).toEqual(['1', '2', '3']);
  });

  it('filtra pela aba de categoria ativa', () => {
    const { component } = build(items);
    component.activeCategory.set('Core');
    expect(component.filteredItems().map(i => i.id)).toEqual(['3']);
  });

  it('busca por texto combina com a aba ativa', () => {
    const { component } = build(items);
    component.activeCategory.set('LPO');
    component.searchQuery.set('clean');
    expect(component.filteredItems().map(i => i.id)).toEqual(['2']);
  });

  it('busca também casa pelo nome da categoria', () => {
    const { component } = build(items);
    component.searchQuery.set('core');
    expect(component.filteredItems().map(i => i.id)).toEqual(['3']);
  });
});
