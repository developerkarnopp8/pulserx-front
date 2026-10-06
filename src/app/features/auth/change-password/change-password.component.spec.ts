import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ChangePasswordComponent, backLinkFor } from './change-password.component';

function build(over: Record<string, unknown> = {}, role: string | null = 'coach') {
  const api = {
    changePassword: vi.fn().mockReturnValue(of({ access_token: 'novo-token', user: { id: 'u1', role } })),
    ...over,
  };
  const auth = {
    currentUser: vi.fn().mockReturnValue(role ? { id: 'u1', role } : null),
    startSession: vi.fn(),
  };
  const component = new ChangePasswordComponent(api as any, auth as any, new FormBuilder());
  return { component, api, auth };
}

const preencher = (c: ChangePasswordComponent, current = 'senha-atual', nova = 'senha-nova-123', confirm = nova) =>
  c.form.setValue({ current, password: nova, confirm });

describe('backLinkFor', () => {
  it('volta para a tela inicial de cada perfil (aluno: Perfil)', () => {
    expect(backLinkFor('coach')).toBe('/coach/dashboard');
    expect(backLinkFor('admin')).toBe('/admin/coaches');
    expect(backLinkFor('athlete')).toBe('/athlete/subscription');
    expect(backLinkFor(null)).toBe('/athlete/subscription');
  });
});

describe('ChangePasswordComponent', () => {
  it('troca a senha, guarda a sessão nova (continua logado) e mostra "Senha alterada"', () => {
    const { component, api, auth } = build();
    expect(component.backLink()).toBe('/coach/dashboard');
    preencher(component);
    component.submit();
    expect(api.changePassword).toHaveBeenCalledWith('senha-atual', 'senha-nova-123');
    expect(auth.startSession).toHaveBeenCalledWith('novo-token', { id: 'u1', role: 'coach' });
    expect(component.done()).toBe(true);
    expect(component.busy()).toBe(false);
    expect(component.form.value.current).toBeNull();
  });

  it('formulário incompleto, curto ou com confirmação diferente: não envia', () => {
    const { component, api } = build();
    component.submit();
    preencher(component, 'atual', 'curta');
    component.submit();
    preencher(component, 'atual', 'senha-nova-123', 'outra-coisa-123');
    component.submit();
    expect(api.changePassword).not.toHaveBeenCalled();
    expect(component.form.get('current')?.touched).toBe(true);
  });

  it('senha nova igual à atual: avisa sem chamar a API', () => {
    const { component, api } = build();
    preencher(component, 'mesma-senha-1', 'mesma-senha-1');
    component.submit();
    expect(component.errorMsg()).toContain('diferente da atual');
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it('senha atual errada: mostra a mensagem do servidor e não mexe na sessão', () => {
    const { component, auth } = build({
      changePassword: vi.fn().mockReturnValue(throwError(() => ({ status: 400, error: { message: 'Senha atual incorreta.' } }))),
    });
    preencher(component);
    component.submit();
    expect(component.errorMsg()).toBe('Senha atual incorreta.');
    expect(auth.startSession).not.toHaveBeenCalled();
    expect(component.done()).toBe(false);
    expect(component.busy()).toBe(false);
  });

  it('muitas tentativas (429) ou sem conexão: frase própria', () => {
    const { component } = build({ changePassword: vi.fn().mockReturnValue(throwError(() => ({ status: 429 }))) });
    preencher(component);
    component.submit();
    expect(component.errorMsg()).toContain('Muitas tentativas');
  });

  it('clique repetido enquanto salva é ignorado', () => {
    const { component, api } = build();
    preencher(component);
    component.busy.set(true);
    component.submit();
    expect(api.changePassword).not.toHaveBeenCalled();
  });
});
