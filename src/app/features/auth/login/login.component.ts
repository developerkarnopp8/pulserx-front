import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';
import { loginErrorMessage } from '../../../shared/utils/signup-flow';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  selectedRole = signal<UserRole>('coach');
  showPassword = signal(false);
  error = signal('');
  loading = signal(false);

  readonly highlights = [
    { icon: 'calendar_month', label: 'Planos por categoria — Core, LPO e Performance' },
    { icon: 'forum', label: 'Chat em tempo real com o aluno' },
    { icon: 'monitoring', label: 'Métricas reais de execução e progresso' },
  ];

  /** /login/root — acesso do admin, nunca linkado na UI pública (ver app.routes.ts). */
  rootOnly = signal(false);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });

    if (route.snapshot.data['rootOnly']) {
      this.rootOnly.set(true);
      this.selectedRole.set('admin');
    }
  }

  setRole(role: UserRole): void {
    this.selectedRole.set(role);
    this.error.set('');
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.form.value as { email: string; password: string };

    this.auth.login(email, password, this.selectedRole()).subscribe({
      next: () => {
        this.loading.set(false);
        const role = this.selectedRole();
        const destination = role === 'coach' ? '/coach/dashboard' : role === 'admin' ? '/admin/coaches' : '/athlete/home';
        this.router.navigate([destination]);
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(loginErrorMessage(err));
      },
    });
  }

  hasError(field: 'email' | 'password'): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}
