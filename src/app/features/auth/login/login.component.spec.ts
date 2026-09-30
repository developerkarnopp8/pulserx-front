import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';

function build(loginError: unknown) {
  const auth = { login: vi.fn().mockReturnValue(throwError(() => loginError)) };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { data: {} } };
  const api = { resendVerification: vi.fn().mockReturnValue(of({ message: 'Se houver uma conta esperando confirmação com esse e-mail, enviamos um novo link.' })) };
  const component = new LoginComponent(new FormBuilder(), auth as any, router as any, api as any, route as any);
  component.form.setValue({ email: 'ana@example.com', password: 'senha-errada' });
  return { component, router, api };
}

describe('LoginComponent — mensagens de erro', () => {
  it('senha errada (401): frase em português, nunca o texto técnico do Angular', () => {
    const { component, router } = build(new HttpErrorResponse({ status: 401, url: 'http://localhost:3000/api/auth/login' }));
    component.submit();
    expect(component.error()).toBe('E-mail ou senha incorretos.');
    expect(component.loading()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('muitas tentativas (429): pede para esperar', () => {
    const { component } = build(new HttpErrorResponse({ status: 429 }));
    component.submit();
    expect(component.error()).toBe('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
  });
});

describe('LoginComponent — e-mail ainda não confirmado', () => {
  const naoConfirmado = () => new HttpErrorResponse({
    status: 403,
    error: { code: 'EMAIL_NOT_VERIFIED', message: 'Confirme seu e-mail para entrar. Enviamos um link para a sua caixa de entrada.' },
  });

  it('mostra a frase da API e oferece reenviar; reenviar usa o e-mail digitado e mostra a resposta', () => {
    const { component, api } = build(naoConfirmado());
    component.submit();
    expect(component.error()).toBe('Confirme seu e-mail para entrar. Enviamos um link para a sua caixa de entrada.');
    expect(component.notVerified()).toBe(true);

    component.resendVerification();
    expect(api.resendVerification).toHaveBeenCalledWith('ana@example.com');
    expect(component.info()).toBe('Se houver uma conta esperando confirmação com esse e-mail, enviamos um novo link.');
    expect(component.notVerified()).toBe(false);
    expect(component.error()).toBe('');
    expect(component.loading()).toBe(false);

    // Nova tentativa de entrar limpa o aviso anterior.
    component.submit();
    expect(component.info()).toBe('');
  });

  it('outro 403 (sem o código) não oferece reenviar', () => {
    const { component } = build(new HttpErrorResponse({ status: 403, error: { message: 'Proibido aqui.' } }));
    component.submit();
    expect(component.notVerified()).toBe(false);
  });

  it('reenviar com erro: mensagem em português; clique durante carregamento é ignorado', () => {
    const { component, api } = build(naoConfirmado());
    api.resendVerification.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 429 })));
    component.resendVerification();
    expect(component.error()).toBe('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
    expect(component.loading()).toBe(false);

    api.resendVerification.mockClear();
    component.loading.set(true);
    component.resendVerification();
    expect(api.resendVerification).not.toHaveBeenCalled();
  });
});
