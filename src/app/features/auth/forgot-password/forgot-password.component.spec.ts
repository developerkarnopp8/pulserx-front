import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ForgotPasswordComponent } from './forgot-password.component';

function build(apiOver: Record<string, unknown> = {}) {
  const api = { forgotPassword: vi.fn().mockReturnValue(of({ message: 'Se houver uma conta com esse e-mail, enviamos um link.' })), ...apiOver };
  return { component: new ForgotPasswordComponent(api as any, new FormBuilder()), api };
}

describe('ForgotPasswordComponent', () => {
  it('e-mail inválido: não envia', () => {
    const { component, api } = build();
    component.form.setValue({ email: 'ana' });
    component.submit();
    expect(api.forgotPassword).not.toHaveBeenCalled();
  });

  it('envia o e-mail e mostra a resposta genérica da API', () => {
    const { component, api } = build();
    component.form.setValue({ email: 'ana@example.com' });
    component.submit();
    expect(api.forgotPassword).toHaveBeenCalledWith('ana@example.com');
    expect(component.sentMsg()).toContain('Se houver uma conta');
    expect(component.busy()).toBe(false);
  });

  it('enquanto envia, não envia de novo', () => {
    const { component, api } = build({ forgotPassword: vi.fn().mockReturnValue({ subscribe: vi.fn() }) });
    component.form.setValue({ email: 'ana@example.com' });
    component.submit();
    component.submit();
    expect(api.forgotPassword).toHaveBeenCalledTimes(1);
  });

  it('muitas tentativas / erro: mensagem em português', () => {
    const { component } = build({ forgotPassword: vi.fn().mockReturnValue(throwError(() => ({ status: 429 }))) });
    component.form.setValue({ email: 'ana@example.com' });
    component.submit();
    expect(component.errorMsg()).toBe('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
    expect(component.busy()).toBe(false);
  });

  it('"tentar outro e-mail": volta ao formulário limpo', () => {
    const { component } = build();
    component.form.setValue({ email: 'ana@example.com' });
    component.submit();
    expect(component.sentMsg()).not.toBe('');
    component.tryAnotherEmail();
    expect(component.sentMsg()).toBe('');
    expect(component.errorMsg()).toBe('');
    expect(component.form.value.email).toBeNull();
  });
});
