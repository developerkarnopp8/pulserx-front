import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ResetPasswordComponent, tokenFromHash } from './reset-password.component';

const TOKEN = 'a'.repeat(43);

function build(apiOver: Record<string, unknown> = {}) {
  const api = { resetPassword: vi.fn().mockReturnValue(of({ reset: true })), ...apiOver };
  return { component: new ResetPasswordComponent(api as any, new FormBuilder()), api };
}

describe('tokenFromHash', () => {
  it('lê o token do fragmento; formato estranho ou ausente → null', () => {
    expect(tokenFromHash(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash(`#x=1&token=${TOKEN}`)).toBe(TOKEN);
    expect(tokenFromHash('')).toBeNull();
    expect(tokenFromHash('#token=curto')).toBeNull();
    expect(tokenFromHash('#token=<script>alert(1)</script>')).toBeNull();
  });
});

describe('ResetPasswordComponent', () => {
  afterEach(() => history.replaceState(null, '', '/'));

  it('ao abrir: pega o token do link e o tira da barra de endereço', () => {
    history.replaceState(null, '', `/redefinir-senha#token=${TOKEN}`);
    const { component } = build();
    component.ngOnInit();
    expect(component.token()).toBe(TOKEN);
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe('/redefinir-senha');
  });

  it('sem token no link: fica sem token (a tela orienta a pedir outro) e não envia', () => {
    history.replaceState(null, '', '/redefinir-senha');
    const { component, api } = build();
    component.ngOnInit();
    expect(component.token()).toBeNull();
    component.form.setValue({ password: 'senha-forte', confirm: 'senha-forte' });
    component.submit();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('senha curta ou diferente da confirmação: não envia', () => {
    const { component, api } = build();
    component.token.set(TOKEN);
    component.form.setValue({ password: 'curta', confirm: 'curta' });
    component.submit();
    component.form.setValue({ password: 'senha-forte', confirm: 'outra-senha' });
    expect(component.form.hasError('diferentes')).toBe(true);
    component.submit();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('tudo certo: salva e mostra a confirmação', () => {
    const { component, api } = build();
    component.token.set(TOKEN);
    component.form.setValue({ password: 'senha-forte', confirm: 'senha-forte' });
    component.submit();
    expect(api.resetPassword).toHaveBeenCalledWith(TOKEN, 'senha-forte');
    expect(component.done()).toBe(true);
  });

  it('enquanto salva, não envia de novo', () => {
    const { component, api } = build({ resetPassword: vi.fn().mockReturnValue({ subscribe: vi.fn() }) });
    component.token.set(TOKEN);
    component.form.setValue({ password: 'senha-forte', confirm: 'senha-forte' });
    component.submit();
    component.submit();
    expect(api.resetPassword).toHaveBeenCalledTimes(1);
  });

  it('link vencido/usado: mostra a mensagem da API', () => {
    const { component } = build({
      resetPassword: vi.fn().mockReturnValue(throwError(() => ({ status: 400, error: { message: 'Link inválido ou expirado.' } }))),
    });
    component.token.set(TOKEN);
    component.form.setValue({ password: 'senha-forte', confirm: 'senha-forte' });
    component.submit();
    expect(component.errorMsg()).toBe('Link inválido ou expirado.');
    expect(component.done()).toBe(false);
    expect(component.busy()).toBe(false);
  });
});
