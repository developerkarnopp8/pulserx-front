import { confirmDialog } from './confirm-dialog';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('confirmDialog — caixa de confirmação do app', () => {
  afterEach(() => confirmDialog.answer(false));

  it('pergunta e devolve a resposta; fecha ao responder', async () => {
    const sim = confirmDialog.ask({ title: 'Remover?', message: 'Some da lista.', danger: true });
    expect(confirmDialog.current()).toMatchObject({ title: 'Remover?', message: 'Some da lista.', danger: true });
    confirmDialog.answer(true);
    await expect(sim).resolves.toBe(true);
    expect(confirmDialog.current()).toBeNull();

    const nao = confirmDialog.ask({ title: 'De novo?', message: 'x' });
    confirmDialog.answer(false);
    await expect(nao).resolves.toBe(false);
  });

  it('uma pergunta por vez: a anterior aberta conta como "não"', async () => {
    const primeira = confirmDialog.ask({ title: '1', message: 'a' });
    const segunda = confirmDialog.ask({ title: '2', message: 'b' });
    await expect(primeira).resolves.toBe(false);
    expect(confirmDialog.current()?.title).toBe('2');
    confirmDialog.answer(true);
    await expect(segunda).resolves.toBe(true);
  });

  it('responder sem pergunta aberta não faz nada', () => {
    expect(() => confirmDialog.answer(true)).not.toThrow();
    expect(confirmDialog.current()).toBeNull();
  });

  it('Esc no componente responde "não"', async () => {
    const component = new ConfirmDialogComponent();
    const resposta = confirmDialog.ask({ title: 'Sair?', message: 'x' });
    component.onEscape();
    await expect(resposta).resolves.toBe(false);
    expect(component.dialog).toBe(confirmDialog);
  });
});
