import { FormBuilder, Validators } from '@angular/forms';
import { MIN_PASSWORD_LENGTH, NewPasswordFieldsComponent } from './new-password-fields.component';

function build() {
  const form = new FormBuilder().group({ password: ['', [Validators.required]], confirm: [''] });
  const c = new NewPasswordFieldsComponent();
  c.form = form;
  return { c, form };
}

describe('NewPasswordFieldsComponent', () => {
  it('regra real: mínimo de 8 caracteres (sem exigir símbolo/maiúscula)', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    const { c, form } = build();
    expect(c.min).toBe(8);
    form.patchValue({ password: '1234567' });
    expect(c.longEnough).toBe(false);
    form.patchValue({ password: '12345678' });
    expect(c.longEnough).toBe(true);
  });

  it('confirmação: só "bate" quando há algo digitado e é igual', () => {
    const { c, form } = build();
    expect(c.matches).toBe(false);
    form.patchValue({ password: 'senha-forte', confirm: 'senha-fort' });
    expect(c.matches).toBe(false);
    form.patchValue({ confirm: 'senha-forte' });
    expect(c.matches).toBe(true);
  });

  it('campos sem valor (null) contam como vazios', () => {
    const { c, form } = build();
    form.setValue({ password: null, confirm: null });
    expect(c.password).toBe('');
    expect(c.longEnough).toBe(false);
    expect(c.matches).toBe(false);
  });

  it('mostrar/esconder a senha', () => {
    const { c } = build();
    expect(c.show()).toBe(false);
    c.show.set(true);
    expect(c.show()).toBe(true);
  });
});
