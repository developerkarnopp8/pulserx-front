import { of, throwError } from 'rxjs';
import { AthleteDeletionComponent } from './athlete-deletion.component';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

afterEach(() => vi.restoreAllMocks());

const achado = { id: 'u1', name: 'Ana', email: 'ana@example.com', createdAt: '2026-09-01', coachName: 'Luan', unlinked: false };

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    adminFindAthlete: vi.fn().mockReturnValue(of(achado)),
    adminAnonymizeAthlete: vi.fn().mockReturnValue(of({ deleted: true })),
    ...apiOver,
  };
  return { component: new AthleteDeletionComponent(api as any), api };
}

describe('AthleteDeletionComponent — admin exclui conta a pedido', () => {
  afterEach(() => vi.restoreAllMocks());

  it('busca pelo e-mail aparado; vazio não busca', async () => {
    const { component, api } = build();
    component.search();
    expect(api.adminFindAthlete).not.toHaveBeenCalled();
    component.email.set('  ana@example.com ');
    component.search();
    expect(api.adminFindAthlete).toHaveBeenCalledWith('ana@example.com');
    expect(component.found()).toEqual(achado);
    expect(component.busy()).toBe(false);
  });

  it('não achou: mostra a mensagem da API (ou a padrão)', async () => {
    const { component } = build({
      adminFindAthlete: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Nenhum aluno com este e-mail.' } }))),
    });
    component.email.set('x@example.com');
    component.search();
    expect(component.errorMsg()).toBe('Nenhum aluno com este e-mail.');
    expect(component.found()).toBeNull();

    const semMsg = build({ adminFindAthlete: vi.fn().mockReturnValue(throwError(() => new Error('rede'))) });
    semMsg.component.email.set('x@example.com');
    semMsg.component.search();
    expect(semMsg.component.errorMsg()).toBe('Não foi possível buscar. Tente de novo.');
  });

  it('excluir pede confirmação; sem confirmar, nada acontece', async () => {
    const { component, api } = build();
    component.email.set('ana@example.com');
    component.search();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    await component.anonymize();
    expect(api.adminAnonymizeAthlete).not.toHaveBeenCalled();
  });

  it('confirmado: exclui pelo id, limpa a tela e orienta a responder o titular', async () => {
    const { component, api } = build();
    component.email.set('ana@example.com');
    component.search();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.anonymize();
    expect(api.adminAnonymizeAthlete).toHaveBeenCalledWith('u1');
    expect(component.found()).toBeNull();
    expect(component.email()).toBe('');
    expect(component.doneMsg()).toContain('Conta excluída');
  });

  it('sem aluno achado ou ocupado: não exclui', async () => {
    const { component, api } = build();
    await component.anonymize();
    component.found.set(achado);
    component.busy.set(true);
    await component.anonymize();
    component.search();
    expect(api.adminAnonymizeAthlete).not.toHaveBeenCalled();
    expect(api.adminFindAthlete).not.toHaveBeenCalled();
  });

  it('erro ao excluir (ex.: Asaas recusou o cancelamento): mostra e mantém o aluno na tela', async () => {
    const { component } = build({
      adminAnonymizeAthlete: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Tente mais tarde' } }))),
    });
    component.found.set(achado);
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.anonymize();
    expect(component.errorMsg()).toBe('Tente mais tarde');
    expect(component.found()).toEqual(achado);

    const semMsg = build({ adminAnonymizeAthlete: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    semMsg.component.found.set(achado);
    await semMsg.component.anonymize();
    expect(semMsg.component.errorMsg()).toBe('Não foi possível excluir. Tente de novo.');
  });
});

describe('AthleteDeletionComponent — busca só por e-mail exato', () => {
  it('nome ou texto sem @: aviso em português e não busca (a busca não vira listagem)', () => {
    const { component, api } = build();
    for (const v of ['Gustavo Karnopp', 'ana@', 'ana@example']) {
      component.email.set(v);
      component.search();
      expect(component.errorMsg()).toContain('e-mail exato do aluno');
    }
    expect(api.adminFindAthlete).not.toHaveBeenCalled();
    expect(component.found()).toBeNull();
  });
});
