import { Component, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { NewPasswordFieldsComponent } from '../../../shared/components/new-password-fields/new-password-fields.component';

/** Lê o token do fragmento (#token=…) — o fragmento não vai ao servidor nem no cabeçalho Referer. */
export function tokenFromHash(hash: string): string | null {
  const m = /(?:^#|&)token=([A-Za-z0-9_-]{20,200})(?:&|$)/.exec(hash);
  return m ? m[1] : null;
}

export const senhasIguais = (g: AbstractControl): ValidationErrors | null =>
  g.get('password')?.value === g.get('confirm')?.value ? null : { diferentes: true };

/** Cria a senha nova pelo link recebido por e-mail (esqueci minha senha, coach pediu, ou boas-vindas). */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, NewPasswordFieldsComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  token = signal<string | null>(null);
  busy = signal(false);
  done = signal(false);
  errorMsg = signal('');

  constructor(
    private api: ApiService,
    fb: FormBuilder,
  ) {
    this.form = fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
        confirm: ['', Validators.required],
      },
      { validators: senhasIguais },
    );
  }

  ngOnInit(): void {
    this.token.set(tokenFromHash(window.location.hash));
    // Tira o token da barra de endereço (histórico, prints, compartilhamento).
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
  }

  submit(): void {
    const token = this.token();
    if (!token || this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.resetPassword(token, this.form.value.password as string).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível salvar a senha. Peça um novo link.'));
      },
    });
  }
}
