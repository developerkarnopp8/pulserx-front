import { Component, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { NewPasswordFieldsComponent } from '../../../shared/components/new-password-fields/new-password-fields.component';
import { senhasIguais } from '../reset-password/reset-password.component';

/** Para onde o "voltar" leva, conforme o perfil (aluno volta ao Perfil, onde fica o link). */
export function backLinkFor(role: UserRole | null | undefined): string {
  if (role === 'coach') return '/coach/dashboard';
  if (role === 'admin') return '/admin/coaches';
  return '/athlete/subscription';
}

/**
 * Alterar a própria senha estando logado (coach, aluno ou admin): confirma a atual e escolhe a nova. A API devolve uma
 * sessão nova — quem trocou continua logado aqui; as sessões abertas em outros aparelhos são encerradas.
 */
@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, NewPasswordFieldsComponent],
  templateUrl: './change-password.component.html',
})
export class ChangePasswordComponent {
  form: FormGroup;
  busy = signal(false);
  done = signal(false);
  errorMsg = signal('');
  showCurrent = signal(false);
  backLink = computed(() => backLinkFor(this.auth.currentUser()?.role));

  constructor(
    private api: ApiService,
    private auth: AuthService,
    fb: FormBuilder,
  ) {
    this.form = fb.group(
      {
        current: ['', [Validators.required, Validators.maxLength(128)]],
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
        confirm: ['', Validators.required],
      },
      { validators: senhasIguais },
    );
  }

  submit(): void {
    if (this.form.invalid || this.busy()) {
      this.form.markAllAsTouched();
      return;
    }
    const { current, password } = this.form.value as { current: string; password: string };
    if (current === password) {
      this.errorMsg.set('A senha nova precisa ser diferente da atual.');
      return;
    }
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.changePassword(current, password).subscribe({
      next: res => {
        this.auth.startSession(res.access_token, res.user);
        this.form.reset();
        this.busy.set(false);
        this.done.set(true);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível alterar a senha agora. Tente de novo em instantes.'));
      },
    });
  }
}
