import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PublicCoachProfile } from '../../../core/models';
import { formatCents } from '../../../shared/utils/currency';
import { apiMessage, checkoutErrorMessage, isEmailExists, isSafeCheckoutUrl, maskCpf } from '../../../shared/utils/signup-flow';

type Step = 'account' | 'login' | 'payment';
type PublicPlan = PublicCoachProfile['plans'][number];

/**
 * Inscrição + pagamento a partir da landing do coach (`/c/:slug/assinar/:planId`).
 * Conta nova (ou login se o e-mail já existir) → plano Free entra direto; plano pago pede o CPF
 * e manda pra fatura PIX do Asaas. Toda regra (coach da página, plano ativo, dono) é do backend.
 */
@Component({
  selector: 'app-public-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
})
export class PublicSignupComponent implements OnInit {
  slug = '';
  planId = '';

  profile  = signal<PublicCoachProfile | null>(null);
  loading  = signal(true);
  notFound = signal(false);
  step     = signal<Step>('account');
  busy     = signal(false);
  errorMsg = signal('');

  plan = computed<PublicPlan | null>(() => this.profile()?.plans.find(p => p.id === this.planId) ?? null);
  readonly fmtCents = formatCents;

  accountForm: FormGroup;
  loginForm: FormGroup;
  cpf = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
    fb: FormBuilder,
  ) {
    this.accountForm = fb.group({
      name:        ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
      email:       ['', [Validators.required, Validators.email]],
      password:    ['', [Validators.required, Validators.minLength(8), Validators.maxLength(100)]],
      acceptTerms: [false, Validators.requiredTrue],
    });
    this.loginForm = fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.planId = this.route.snapshot.paramMap.get('planId') ?? '';
    this.api.getPublicCoachProfile(this.slug).subscribe({
      next: profile => {
        this.profile.set(profile);
        this.loading.set(false);
        if (!this.plan()) { this.notFound.set(true); return; }
        // Aluno já logado neste navegador: pula direto pro pagamento.
        if (this.auth.currentUser()?.role === 'athlete') this.afterAuthenticated();
      },
      error: () => { this.loading.set(false); this.notFound.set(true); },
    });
  }

  createAccount(): void {
    if (this.accountForm.invalid || this.busy()) { this.accountForm.markAllAsTouched(); return; }
    const v = this.accountForm.value;
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.publicSignup(this.slug, { name: v.name, email: v.email, password: v.password, planId: this.planId, acceptTerms: true }).subscribe({
      next: res => {
        this.auth.startSession(res.access_token, res.user);
        this.busy.set(false);
        this.afterAuthenticated();
      },
      error: err => {
        this.busy.set(false);
        if (isEmailExists(err)) {
          this.loginForm.patchValue({ email: v.email });
          this.step.set('login');
          return;
        }
        this.errorMsg.set(err?.status === 429
          ? 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
          : apiMessage(err, 'Não foi possível criar sua conta agora. Tente de novo.'));
      },
    });
  }

  login(): void {
    if (this.loginForm.invalid || this.busy()) { this.loginForm.markAllAsTouched(); return; }
    const v = this.loginForm.value;
    this.busy.set(true);
    this.errorMsg.set('');
    this.auth.login(v.email, v.password, 'athlete').subscribe({
      next: () => { this.busy.set(false); this.afterAuthenticated(); },
      error: err => {
        this.busy.set(false);
        // Erro de perfil (e-mail de coach/admin) vem do próprio AuthService, já em português.
        this.errorMsg.set(err instanceof Error && !('status' in err) ? err.message : 'E-mail ou senha incorretos.');
      },
    });
  }

  /** Conta pronta: Free assina na hora e entra no app; pago vai pro passo do CPF/pagamento. */
  private afterAuthenticated(): void {
    if (this.plan()?.isFree) {
      this.pay();
      return;
    }
    this.step.set('payment');
  }

  onCpfInput(value: string): void {
    this.cpf.set(maskCpf(value));
  }

  pay(): void {
    if (this.busy()) return;
    const needsCpf = !this.plan()?.isFree;
    if (needsCpf && this.cpf().replace(/\D/g, '').length !== 11) {
      this.errorMsg.set('Informe seu CPF completo (11 dígitos) para gerar a cobrança.');
      return;
    }
    this.busy.set(true);
    this.errorMsg.set('');
    this.api.checkoutSubscription(this.planId, needsCpf ? this.cpf() : undefined).subscribe({
      next: res => {
        this.busy.set(false);
        if (isSafeCheckoutUrl(res.checkoutUrl)) {
          this.redirectTo(res.checkoutUrl);
          return;
        }
        this.router.navigate(['/athlete/home']);
      },
      error: err => {
        this.busy.set(false);
        this.step.set('payment');
        this.errorMsg.set(checkoutErrorMessage(err));
      },
    });
  }

  /** Vai pra fatura do Asaas (fora do app). Separado pra teste. */
  protected redirectTo(url: string): void {
    window.location.assign(url);
  }
}
