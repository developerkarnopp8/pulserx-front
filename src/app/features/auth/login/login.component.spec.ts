import { FormBuilder } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';
import { LoginComponent } from './login.component';

function build(loginError: unknown) {
  const auth = { login: vi.fn().mockReturnValue(throwError(() => loginError)) };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { data: {} } };
  const component = new LoginComponent(new FormBuilder(), auth as any, router as any, route as any);
  component.form.setValue({ email: 'ana@example.com', password: 'senha-errada' });
  return { component, router };
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
