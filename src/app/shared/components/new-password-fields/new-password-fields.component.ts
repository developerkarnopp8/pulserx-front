import { Component, Input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

/** Mínimo da senha (regra do servidor; decisão do dono, 2026-10-01: só o tamanho, sem exigir símbolo/maiúscula). */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Campos "senha nova" + "repetir a senha" do modelo Stitch mo01, com o critério real (8 caracteres) marcado ao vivo.
 * O formulário (controles `password` e `confirm`, validador `senhasIguais`) é do componente pai.
 */
@Component({
  selector: 'app-new-password-fields',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './new-password-fields.component.html',
})
export class NewPasswordFieldsComponent {
  @Input({ required: true }) form!: FormGroup;
  /** Prefixo dos ids (dois formulários na mesma tela não colidem). */
  @Input() idPrefix = 'np';
  show = signal(false);
  readonly min = MIN_PASSWORD_LENGTH;

  get password(): string {
    return (this.form.get('password')?.value as string) ?? '';
  }

  get longEnough(): boolean {
    return this.password.length >= MIN_PASSWORD_LENGTH;
  }

  /** As duas senhas iguais (e já há algo digitado na confirmação). */
  get matches(): boolean {
    const confirm = (this.form.get('confirm')?.value as string) ?? '';
    return confirm.length > 0 && confirm === this.password;
  }
}
