import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { LibraryComponent } from './library.component';
import { ExerciseLibraryItem } from '../../../core/models';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

afterEach(() => vi.restoreAllMocks());

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
  it('conta itens por categoria, ordenado alfabeticamente, "Sem categoria" incluso', async () => {
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

  it('"all": devolve tudo', async () => {
    const { component } = build(items);
    expect(component.filteredItems().map(i => i.id)).toEqual(['1', '2', '3']);
  });

  it('filtra pela aba de categoria ativa', async () => {
    const { component } = build(items);
    component.activeCategory.set('Core');
    expect(component.filteredItems().map(i => i.id)).toEqual(['3']);
  });

  it('busca por texto combina com a aba ativa', async () => {
    const { component } = build(items);
    component.activeCategory.set('LPO');
    component.searchQuery.set('clean');
    expect(component.filteredItems().map(i => i.id)).toEqual(['2']);
  });

  it('busca também casa pelo nome da categoria', async () => {
    const { component } = build(items);
    component.searchQuery.set('core');
    expect(component.filteredItems().map(i => i.id)).toEqual(['3']);
  });
});

describe('LibraryComponent.delete', () => {

  function withDelete(items: ExerciseLibraryItem[]) {
    const api = { getLibrary: vi.fn().mockReturnValue(of(items)), deleteLibraryItem: vi.fn().mockReturnValue(of({})) };
    const component = new LibraryComponent(api as any, new FormBuilder());
    component.ngOnInit();
    return { component, api };
  }

  it('item importado dos planos: avisa que continua nos planos e não volta', async () => {
    const confirmSpy = vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    const { component, api } = withDelete([item({ autoImported: true })]);
    await component.delete(component.items()[0]);
    expect(confirmSpy.mock.calls[0][0].message).toContain('continua nos planos');
    expect(api.deleteLibraryItem).toHaveBeenCalledWith('i1');
    expect(component.items()).toEqual([]);
  });

  it('item cadastrado à mão: confirmação simples; cancelar não apaga', async () => {
    const confirmSpy = vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    const { component, api } = withDelete([item({ autoImported: false })]);
    await component.delete(component.items()[0]);
    expect(confirmSpy.mock.calls[0][0].title).toBe('Remover "Snatch" da biblioteca?');
    expect(api.deleteLibraryItem).not.toHaveBeenCalled();
  });
});

describe('LibraryComponent — capa do exercício', () => {
  function withImageApi(over: Record<string, unknown> = {}) {
    const updated = item({ imageUrl: 'https://res.cloudinary.com/x/capa.webp' });
    const api = {
      getLibrary: vi.fn().mockReturnValue(of([item()])),
      uploadLibraryImage: vi.fn().mockReturnValue(of(updated)),
      removeLibraryImage: vi.fn().mockReturnValue(of(item({ imageUrl: null }))),
      ...over,
    };
    const component = new LibraryComponent(api as any, new FormBuilder());
    component.ngOnInit();
    return { component, api };
  }
  const fileEvent = (file?: File) => ({ target: { files: file ? [file] : [], value: 'x' } } as unknown as Event);

  it('envia a imagem do exercício em edição e atualiza card e formulário', async () => {
    const { component, api } = withImageApi();
    component.openEdit(component.items()[0]);
    const file = new File(['img'], 'capa.png', { type: 'image/png' });
    component.onImageSelected(fileEvent(file));
    expect(api.uploadLibraryImage).toHaveBeenCalledWith('i1', file);
    expect(component.items()[0].imageUrl).toContain('capa.webp');
    expect(component.editingItem()?.imageUrl).toContain('capa.webp');
    expect(component.uploadingImage()).toBe(false);
  });

  it('recusa tipo ou tamanho inválido antes de enviar', async () => {
    const { component, api } = withImageApi();
    component.openEdit(component.items()[0]);
    component.onImageSelected(fileEvent(new File(['x'], 'doc.pdf', { type: 'application/pdf' })));
    expect(component.imageError()).toContain('até 5MB');
    const big = new File(['x'], 'grande.png', { type: 'image/png' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    component.onImageSelected(fileEvent(big));
    expect(api.uploadLibraryImage).not.toHaveBeenCalled();
  });

  it('sem arquivo ou sem exercício em edição: não faz nada', async () => {
    const { component, api } = withImageApi();
    component.onImageSelected(fileEvent(new File(['img'], 'a.png', { type: 'image/png' })));
    component.openEdit(component.items()[0]);
    component.onImageSelected(fileEvent());
    component.closeDrawer();
    component.removeImage();
    expect(api.uploadLibraryImage).not.toHaveBeenCalled();
    expect(api.removeLibraryImage).not.toHaveBeenCalled();
  });

  it('erro no envio ou na remoção: mensagem e libera o botão', async () => {
    const { component } = withImageApi({
      uploadLibraryImage: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
      removeLibraryImage: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
    });
    component.openEdit(component.items()[0]);
    component.onImageSelected(fileEvent(new File(['img'], 'a.png', { type: 'image/png' })));
    expect(component.imageError()).toContain('Não foi possível enviar');
    component.removeImage();
    expect(component.imageError()).toContain('Não foi possível remover');
    expect(component.uploadingImage()).toBe(false);
  });

  it('remove a capa', async () => {
    const { component, api } = withImageApi();
    component.openEdit(component.items()[0]);
    component.removeImage();
    expect(api.removeLibraryImage).toHaveBeenCalledWith('i1');
    expect(component.items()[0].imageUrl).toBeNull();
  });
});
