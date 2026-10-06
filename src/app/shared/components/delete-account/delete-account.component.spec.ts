import { of, throwError } from 'rxjs';
import { DeleteAccountComponent } from './delete-account.component';

function build(apiOver: Record<string, unknown> = {}) {
  const api = { deleteMyAccount: vi.fn().mockReturnValue(of({ deleted: true })), ...apiOver };
  const auth = { logout: vi.fn() };
  const component = new DeleteAccountComponent(api as any, auth as any);
  return { component, api, auth };
}

describe('DeleteAccountComponent — excluir a própria conta', () => {
  it('abre e fecha limpando senha, confirmação e erro', () => {
    const { component } = build();
    component.toggle();
    expect(component.open()).toBe(true);
    component.password.set('x');
    component.confirmed.set(true);
    component.showPassword.set(true);
    component.errorMsg.set('erro');
    component.toggle();
    expect(component.showPassword()).toBe(false);
    expect(component.open()).toBe(false);
    expect(component.password()).toBe('');
    expect(component.confirmed()).toBe(false);
    expect(component.errorMsg()).toBe('');
  });

  it('exige a senha E a confirmação explícita', () => {
    const { component, api } = build();
    component.password.set('senha');
    expect(component.canSubmit).toBe(false);
    component.submit();
    expect(api.deleteMyAccount).not.toHaveBeenCalled();
    component.password.set('');
    component.confirmed.set(true);
    expect(component.canSubmit).toBe(false);
  });

  it('senha + confirmação: exclui e sai da conta', () => {
    const { component, api, auth } = build();
    component.password.set('senha');
    component.confirmed.set(true);
    component.submit();
    expect(api.deleteMyAccount).toHaveBeenCalledWith('senha');
    expect(auth.logout).toHaveBeenCalled();
  });

  it('enquanto exclui, não envia de novo', () => {
    const { component, api } = build({ deleteMyAccount: vi.fn().mockReturnValue({ subscribe: vi.fn() }) });
    component.password.set('senha');
    component.confirmed.set(true);
    component.submit();
    expect(component.canSubmit).toBe(false);
    component.submit();
    expect(api.deleteMyAccount).toHaveBeenCalledTimes(1);
  });

  it('senha errada: mostra a mensagem da API, limpa a senha e continua logado', () => {
    const { component, auth } = build({
      deleteMyAccount: vi.fn().mockReturnValue(throwError(() => ({ status: 401, error: { message: 'Senha incorreta.' } }))),
    });
    component.password.set('errada');
    component.confirmed.set(true);
    component.submit();
    expect(component.errorMsg()).toBe('Senha incorreta.');
    expect(component.password()).toBe('');
    expect(component.busy()).toBe(false);
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('erro sem mensagem: usa a padrão', () => {
    const { component } = build({ deleteMyAccount: vi.fn().mockReturnValue(throwError(() => new Error('rede'))) });
    component.password.set('senha');
    component.confirmed.set(true);
    component.submit();
    expect(component.errorMsg()).toBe('Não foi possível excluir a conta. Tente de novo.');
  });
});
