import { of, throwError } from 'rxjs';
import { RecordsComponent } from './records.component';

const mv = (id: string, category: string, name = id) => ({ id, name, category });
const rec = (movementId: string, loadKg?: number, reps?: number, achievedAt = '2026-09-01T10:00:00.000Z') =>
  ({ id: `${movementId}-${loadKg}-${reps}`, athleteId: 'a', movementId, loadKg, reps, achievedAt, movement: mv(movementId, 'LPO') });

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getMovements: vi.fn().mockReturnValue(of([mv('squat', 'Strength'), mv('snatch', 'LPO'), mv('clean', 'LPO')])),
    getMyPersonalRecords: vi.fn().mockReturnValue(of([])),
    logPersonalRecord: vi.fn().mockReturnValue(of(rec('snatch', 90))),
    createMovement: vi.fn().mockReturnValue(of(mv('zercher', 'Força', 'Zercher Squat'))),
    ...apiOver,
  };
  return { component: new RecordsComponent(api as any), api };
}

describe('RecordsComponent — carga', () => {
  it('agrupa movimentos por categoria (ordem alfabética) e abre a primeira', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.groupedMovements().map(([cat]) => cat)).toEqual(['LPO', 'Strength']);
    expect(component.isCategoryExpanded('LPO')).toBe(true);
    expect(component.isCategoryExpanded('Strength')).toBe(false);
  });

  it('catálogo vazio: sem grupos e sem categoria aberta (tela mostra estado vazio)', () => {
    const { component } = build({ getMovements: vi.fn().mockReturnValue(of([])) });
    component.ngOnInit();
    expect(component.groupedMovements()).toEqual([]);
    expect(component.expandedCategories().size).toBe(0);
    expect(component.errorMsg()).toBe('');
  });

  it('erro ao carregar movimentos: sai do carregando e mostra mensagem', () => {
    const { component } = build({ getMovements: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.errorMsg()).toContain('Não foi possível carregar');
  });

  it('melhor carga/reps e último registro por movimento; ignora zero e vazio', () => {
    const { component } = build({
      getMyPersonalRecords: vi.fn().mockReturnValue(of([
        rec('snatch', 80, 1, '2026-09-01T10:00:00.000Z'),
        rec('snatch', 85, undefined, '2026-09-10T10:00:00.000Z'),
        rec('snatch', 0, 3, '2026-09-05T10:00:00.000Z'),
      ])),
    });
    component.ngOnInit();
    const snatch = component.movementsWithPR().find(m => m.movement.id === 'snatch')!;
    expect(snatch).toMatchObject({ bestLoadKg: 85, bestReps: 3, lastAchievedAt: '2026-09-10T10:00:00.000Z' });
    const clean = component.movementsWithPR().find(m => m.movement.id === 'clean')!;
    expect(clean).toMatchObject({ bestLoadKg: undefined, bestReps: undefined, lastAchievedAt: undefined });
  });

  it('toggleCategory abre e fecha', () => {
    const { component } = build();
    component.toggleCategory('Strength');
    expect(component.isCategoryExpanded('Strength')).toBe(true);
    component.toggleCategory('Strength');
    expect(component.isCategoryExpanded('Strength')).toBe(false);
  });
});

describe('RecordsComponent — registrar PR', () => {
  afterEach(() => vi.useRealTimers());

  it('abrir limpa o formulário; fechar esconde', () => {
    const { component } = build();
    component.formLoadKg.set(50); component.formReps.set(2); component.formNote.set('x');
    component.openForm(mv('snatch', 'LPO') as any);
    expect(component.showForm()?.id).toBe('snatch');
    expect([component.formLoadKg(), component.formReps(), component.formNote()]).toEqual([null, null, '']);
    component.closeForm();
    expect(component.showForm()).toBeNull();
  });

  it('não envia sem movimento, sem carga/reps ou enquanto salva', () => {
    const { component, api } = build();
    component.submitForm(); // sem movimento
    component.openForm(mv('snatch', 'LPO') as any);
    expect(component.canSubmitForm).toBe(false);
    component.submitForm(); // sem valores
    component.formReps.set(3);
    component.saving.set(true);
    component.submitForm(); // salvando
    expect(api.logPersonalRecord).not.toHaveBeenCalled();
  });

  it('salva: envia valores, põe no topo, marca "Novo!" por 3s e fecha', () => {
    vi.useFakeTimers();
    const { component, api } = build();
    component.openForm(mv('snatch', 'LPO') as any);
    component.formLoadKg.set(90);
    component.formNote.set('  bom dia  ');
    component.submitForm();
    expect(api.logPersonalRecord).toHaveBeenCalledWith('snatch', 90, undefined, 'bom dia');
    expect(component.records()[0].loadKg).toBe(90);
    expect(component.justRecordedId()).toBe('snatch');
    expect(component.showForm()).toBeNull();
    vi.advanceTimersByTime(3000);
    expect(component.justRecordedId()).toBeNull();
  });

  it('nota em branco vai como undefined; erro libera o botão', () => {
    const { component, api } = build({ logPersonalRecord: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.openForm(mv('snatch', 'LPO') as any);
    component.formReps.set(5);
    component.submitForm();
    expect(api.logPersonalRecord).toHaveBeenCalledWith('snatch', undefined, 5, undefined);
    expect(component.saving()).toBe(false);
    expect(component.showForm()?.id).toBe('snatch');
  });
});

describe('RecordsComponent — busca e grupo', () => {
  it('grupos disponíveis vêm do catálogo carregado, em ordem', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.availableCategories()).toEqual(['LPO', 'Strength']);
  });

  it('busca filtra e abre todo grupo com resultado', () => {
    const { component } = build();
    component.ngOnInit();
    component.search.set('SQU');
    expect(component.isFiltering()).toBe(true);
    expect(component.groupedMovements().map(([cat, list]) => [cat, list.map(i => i.movement.id)])).toEqual([['Strength', ['squat']]]);
    expect(component.isCategoryExpanded('Strength')).toBe(true);
  });

  it('grupo selecionado filtra; "Todos" (null) volta', () => {
    const { component } = build();
    component.ngOnInit();
    component.selectedCategory.set('LPO');
    expect(component.groupedMovements().map(([cat]) => cat)).toEqual(['LPO']);
    component.selectedCategory.set(null);
    expect(component.isFiltering()).toBe(false);
    expect(component.groupedMovements()).toHaveLength(2);
  });
});

describe('RecordsComponent — novo movimento', () => {
  it('abrir pré-preenche com a busca e o grupo selecionado', () => {
    const { component } = build();
    component.search.set('  Zercher ');
    component.selectedCategory.set('Core');
    component.newMovementError.set('antigo');
    component.openNewMovement();
    expect(component.showNewMovement()).toBe(true);
    expect(component.newMovementName()).toBe('Zercher');
    expect(component.newMovementCategory()).toBe('Core');
    expect(component.newMovementError()).toBe('');
    component.closeNewMovement();
    expect(component.showNewMovement()).toBe(false);
  });

  it('sem grupo selecionado, sugere Força', () => {
    const { component } = build();
    component.openNewMovement();
    expect(component.newMovementCategory()).toBe('Força');
  });

  it('cria, entra no catálogo, limpa a busca e já abre o registro do PR', () => {
    const { component, api } = build();
    component.ngOnInit();
    component.search.set('zer');
    component.openNewMovement();
    component.newMovementName.set(' Zercher Squat ');
    component.createMovement();
    expect(api.createMovement).toHaveBeenCalledWith('Zercher Squat', 'Força');
    expect(component.movements().some(m => m.id === 'zercher')).toBe(true);
    expect(component.showNewMovement()).toBe(false);
    expect(component.search()).toBe('');
    expect(component.showForm()?.id).toBe('zercher');
  });

  it('não envia nome vazio nem clique duplo', () => {
    const { component, api } = build();
    component.newMovementName.set('   ');
    component.createMovement();
    component.newMovementName.set('X');
    component.creatingMovement.set(true);
    component.createMovement();
    expect(api.createMovement).not.toHaveBeenCalled();
  });

  it('erro da API: mostra a mensagem dela (ex.: nome repetido) e mantém o formulário', () => {
    const { component } = build({
      createMovement: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Já existe um movimento com esse nome no seu catálogo.' } }))),
    });
    component.openNewMovement();
    component.newMovementName.set('Back Squat');
    component.createMovement();
    expect(component.newMovementError()).toContain('Já existe');
    expect(component.showNewMovement()).toBe(true);
    expect(component.creatingMovement()).toBe(false);
  });

  it('erro de validação em lista usa a primeira; sem mensagem usa o texto padrão', () => {
    const listErr = build({ createMovement: vi.fn().mockReturnValue(throwError(() => ({ error: { message: ['nome longo demais'] } }))) });
    listErr.component.newMovementName.set('X');
    listErr.component.createMovement();
    expect(listErr.component.newMovementError()).toBe('nome longo demais');

    const noMsg = build({ createMovement: vi.fn().mockReturnValue(throwError(() => ({}))) });
    noMsg.component.newMovementName.set('X');
    noMsg.component.createMovement();
    expect(noMsg.component.newMovementError()).toBe('Não foi possível cadastrar o movimento.');
  });
});
