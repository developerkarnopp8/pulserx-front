import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { apiMessage } from '../../../shared/utils/signup-flow';

/** "Esqueci minha senha": pede o link por e-mail. A resposta é sempre a mesma (não revela quem tem conta). */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  form: FormGroup;
  busy = signal(false);
  sentMsg = signal('');
  errorMsg = signal('');

  constructor(
    private api: ApiService,
    fb: FormBuilder,
  ) {
    this.form = fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  submit(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.forgotPassword((this.form.value.email as string).trim()).subscribe({
      next: res => {
        this.busy.set(false);
        this.sentMsg.set(res.message);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível enviar agora. Tente de novo em instantes.'));
      },
    });
  }
}
