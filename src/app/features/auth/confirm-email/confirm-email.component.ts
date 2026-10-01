import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { senhasIguais, tokenFromHash } from '../reset-password/reset-password.component';
import { AuthShellComponent } from '../../../shared/components/auth-shell/auth-shell.component';
import { NewPasswordFieldsComponent } from '../../../shared/components/new-password-fields/new-password-fields.component';
import { formatCents } from '../../../shared/utils/currency';
import { PublicCoachProfile } from '../../../core/models';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Coach e plano escolhidos na inscrição (`&c=slug&plano=id` no link). Só aceita slug e id no formato esperado — nada do
 * fragmento vira URL livre (nem para fora do site).
 */
export function signupTargetFromHash(hash: string): { slug: string; planId: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const slug = params.get('c');
  const plano = params.get('plano');
  if (!slug || !plano || !SLUG.test(slug) || slug.length > 60 || !UUID.test(plano)) return null;
  return { slug, planId: plano };
}

/** Para onde seguir depois de confirmar: o pagamento do plano escolhido na página do coach. */
export function continuePathFromHash(hash: string): string | null {
  const alvo = signupTargetFromHash(hash);
  return alvo ? `/c/${alvo.slug}/assinar/${alvo.planId}` : null;
}

type PublicPlan = PublicCoachProfile['plans'][number];

/**
 * Confirmação do e-mail pelo link + criação da senha (a inscrição não tem senha — decisão do dono, 2026-09-30: quem se
 * inscreve com o e-mail de outra pessoa nunca chega a ter senha). Só acontece ao enviar o formulário, nunca ao abrir a
 * página: antivírus de e-mail que abrem links sozinhos não gastam o link de uso único.
 */
@Component({
  selector: 'app-confirm-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, NewPasswordFieldsComponent],
  templateUrl: './confirm-email.component.html',
})
export class ConfirmEmailComponent implements OnInit {
  token = signal<string | null>(null);
  busy = signal(false);
  errorMsg = signal('');
  form: FormGroup;
  /** Plano e coach da inscrição (da página pública do coach). null = link sem plano ou não deu para buscar. */
  plan = signal<PublicPlan | null>(null);
  coachName = signal('');
  readonly fmtCents = formatCents;
  private continuePath: string | null = null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
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
    this.continuePath = continuePathFromHash(window.location.hash);
    const alvo = signupTargetFromHash(window.location.hash);
    // Tira o token da barra de endereço (histórico, prints, compartilhamento).
    if (window.location.hash) history.replaceState(null, '', window.location.pathname);
    if (alvo) this.loadSignupTarget(alvo.slug, alvo.planId);
  }

  /** Mostra o plano e o coach de verdade. Falhou: a tela segue sem o cartão (não impede confirmar). */
  private loadSignupTarget(slug: string, planId: string): void {
    this.api.getPublicCoachProfile(slug).subscribe({
      next: profile => {
        const plan = profile.plans.find(p => p.id === planId);
        if (!plan) return;
        this.plan.set(plan);
        this.coachName.set(profile.coachName);
      },
      error: () => undefined,
    });
  }

  confirm(): void {
    const token = this.token();
    if (!token || this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.verifyEmail(token, this.form.value.password as string).subscribe({
      next: res => {
        this.auth.startSession(res.access_token, res.user);
        this.busy.set(false);
        const home = res.user.role === 'coach' ? '/coach/dashboard' : res.user.role === 'admin' ? '/admin/coaches' : '/athlete/home';
        this.router.navigateByUrl(this.continuePath ?? home);
      },
      error: err => {
        this.busy.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível confirmar agora. Tente de novo em instantes.'));
      },
    });
  }
}
