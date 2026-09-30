import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { PublicSignupComponent } from './signup.component';

const paid = { id: 'p-core', name: 'Core', description: 'Somente Core.', priceCents: 9900, categories: ['CORE'], isFree: false };
const free = { id: 'p-free', name: 'Free', description: null, priceCents: 0, categories: [], isFree: true };

function build(planId = 'p-core', over: { api?: Record<string, unknown>; user?: unknown } = {}) {
  const api = {
    getPublicCoachProfile: vi.fn().mockReturnValue(of({ coachName: 'Luan', plans: [paid, free] })),
    publicSignup: vi.fn().mockReturnValue(of({ pendingVerification: true, email: 'ana@example.com' })),
    resendVerification: vi.fn().mockReturnValue(of({ message: 'Se houver uma conta esperando confirmação com esse e-mail, enviamos um novo link.' })),
    checkoutSubscription: vi.fn().mockReturnValue(of({ subscription: {}, checkoutUrl: 'https://www.asaas.com/i/abc' })),
    ...over.api,
  };
  const auth = {
    currentUser: vi.fn().mockReturnValue(over.user ?? null),
    startSession: vi.fn(),
    login: vi.fn().mockReturnValue(of(undefined)),
  };
  const router = { navigate: vi.fn() };
  const route = { snapshot: { paramMap: new Map([['slug', 'luan'], ['planId', planId]]) } };
  const component = new PublicSignupComponent(route as any, router as any, api as any, auth as any, new FormBuilder());
  const redirect = vi.spyOn(component as any, 'redirectTo').mockImplementation(() => {});
  return { component, api, auth, router, redirect };
}

const fillAccount = (c: PublicSignupComponent, healthConsent = false) =>
  c.accountForm.setValue({ name: 'Ana Souza', email: 'ana@example.com', acceptTerms: true, healthConsent });

describe('PublicSignupComponent — carga', () => {
  it('carrega a página do coach e acha o plano escolhido', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getPublicCoachProfile).toHaveBeenCalledWith('luan');
    expect(component.plan()?.name).toBe('Core');
    expect(component.step()).toBe('account');
  });

  it('plano inexistente ou página fora do ar: "Plano não encontrado"', () => {
    const missing = build('outro');
    missing.component.ngOnInit();
    expect(missing.component.notFound()).toBe(true);

    const down = build('p-core', { api: { getPublicCoachProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))) } });
    down.component.ngOnInit();
    expect(down.component.notFound()).toBe(true);
    expect(down.component.loading()).toBe(false);
  });

  it('aluno já logado neste navegador pula direto pro pagamento', () => {
    const { component } = build('p-core', { user: { role: 'athlete', name: 'Ana' } });
    component.ngOnInit();
    expect(component.step()).toBe('payment');
  });
});

describe('PublicSignupComponent — conta nova', () => {
  it('formulário inválido não envia', () => {
    const { component, api } = build();
    component.ngOnInit();
    component.createAccount();
    expect(api.publicSignup).not.toHaveBeenCalled();
  });

  it('formulário de inscrição não tem senha (ela é criada no link do e-mail)', () => {
    const { component } = build();
    expect(component.accountForm.get('password')).toBeNull();
  });

  it('cria a conta SEM sessão e pede para confirmar o e-mail (o link volta ao pagamento)', () => {
    const { component, api, auth } = build();
    component.ngOnInit();
    fillAccount(component);
    component.createAccount();
    expect(api.publicSignup).toHaveBeenCalledWith('luan', {
      name: 'Ana Souza', email: 'ana@example.com', planId: 'p-core', acceptTerms: true, healthConsent: false,
    });
    expect(auth.startSession).not.toHaveBeenCalled();
    expect(component.step()).toBe('verify');
    expect(component.pendingEmail()).toBe('ana@example.com');
    expect(component.busy()).toBe(false);
  });

  it('marcou o compartilhamento de dados de saúde: manda healthConsent true (opcional, desmarcado por padrão)', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(component.accountForm.value.healthConsent).toBe(false);
    fillAccount(component, true);
    component.createAccount();
    expect(api.publicSignup).toHaveBeenCalledWith('luan', expect.objectContaining({ healthConsent: true }));
  });

  it('plano Free: também só assina depois de confirmar o e-mail', () => {
    const { component, api } = build('p-free');
    component.ngOnInit();
    fillAccount(component);
    component.createAccount();
    expect(api.checkoutSubscription).not.toHaveBeenCalled();
    expect(component.step()).toBe('verify');
  });

  it('reenviar a confirmação: usa o e-mail da inscrição e mostra a resposta; erro vira mensagem; clique ocupado é ignorado', () => {
    const { component, api } = build();
    component.ngOnInit();
    fillAccount(component);
    component.createAccount();
    component.resendVerification();
    expect(api.resendVerification).toHaveBeenCalledWith('ana@example.com');
    expect(component.infoMsg()).toBe('Se houver uma conta esperando confirmação com esse e-mail, enviamos um novo link.');
    expect(component.busy()).toBe(false);

    api.resendVerification.mockReturnValue(throwError(() => ({ status: 429 })));
    component.resendVerification();
    expect(component.infoMsg()).toBe('');
    expect(component.errorMsg()).toBe('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');

    api.resendVerification.mockClear();
    component.busy.set(true);
    component.resendVerification();
    expect(api.resendVerification).not.toHaveBeenCalled();
  });

  it('e-mail já tem conta: troca pro login com o e-mail preenchido', () => {
    const { component } = build('p-core', {
      api: { publicSignup: vi.fn().mockReturnValue(throwError(() => ({ status: 409, error: { code: 'EMAIL_EXISTS' } }))) },
    });
    component.ngOnInit();
    fillAccount(component);
    component.createAccount();
    expect(component.step()).toBe('login');
    expect(component.loginForm.value.email).toBe('ana@example.com');
  });

  it('outros erros: mensagem (429 pede pra aguardar)', () => {
    const tooMany = build('p-core', { api: { publicSignup: vi.fn().mockReturnValue(throwError(() => ({ status: 429 }))) } });
    tooMany.component.ngOnInit();
    fillAccount(tooMany.component);
    tooMany.component.createAccount();
    expect(tooMany.component.errorMsg()).toContain('Aguarde');

    const other = build('p-core', { api: { publicSignup: vi.fn().mockReturnValue(throwError(() => ({ status: 400, error: { message: ['senha curta'] } }))) } });
    other.component.ngOnInit();
    fillAccount(other.component);
    other.component.createAccount();
    expect(other.component.errorMsg()).toBe('senha curta');
    expect(other.component.busy()).toBe(false);
  });
});

describe('PublicSignupComponent — login de quem já tem conta', () => {
  it('formulário inválido não envia', () => {
    const { component, auth } = build();
    component.login();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('entra como atleta e segue pro pagamento', () => {
    const { component, auth } = build();
    component.ngOnInit();
    component.loginForm.setValue({ email: 'ana@example.com', password: 'x' });
    component.login();
    expect(auth.login).toHaveBeenCalledWith('ana@example.com', 'x', 'athlete');
    expect(component.step()).toBe('payment');
  });

  it('senha errada ou perfil de coach: mensagem', () => {
    const wrong = build();
    wrong.auth.login.mockReturnValue(throwError(() => ({ status: 401 })));
    wrong.component.loginForm.setValue({ email: 'ana@example.com', password: 'x' });
    wrong.component.login();
    expect(wrong.component.errorMsg()).toBe('E-mail ou senha incorretos.');

    const role = build();
    role.auth.login.mockReturnValue(throwError(() => new Error('Este e-mail pertence a um perfil diferente. Use o acesso Coach.')));
    role.component.loginForm.setValue({ email: 'luan@example.com', password: 'x' });
    role.component.login();
    expect(role.component.errorMsg()).toContain('perfil diferente');
  });

  it('senha certa mas e-mail não confirmado: vai para o passo de confirmar, com o e-mail digitado', () => {
    const { component, auth } = build();
    auth.login.mockReturnValue(throwError(() => ({ status: 403, error: { code: 'EMAIL_NOT_VERIFIED', message: 'Confirme seu e-mail.' } })));
    component.loginForm.setValue({ email: 'ana@example.com', password: 'x' });
    component.login();
    expect(component.step()).toBe('verify');
    expect(component.pendingEmail()).toBe('ana@example.com');
    expect(component.errorMsg()).toBe('');
  });
});

describe('PublicSignupComponent — pagamento', () => {
  it('CPF com máscara; incompleto não envia', () => {
    const { component, api } = build();
    component.ngOnInit();
    component.onCpfInput('5299822472');
    expect(component.cpf()).toBe('529.982.247-2');
    component.pay();
    expect(component.errorMsg()).toContain('CPF completo');
    expect(api.checkoutSubscription).not.toHaveBeenCalled();
  });

  it('CPF ok: gera a cobrança e vai pra fatura do Asaas (https)', () => {
    const { component, api, redirect } = build();
    component.ngOnInit();
    component.onCpfInput('52998224725');
    component.pay();
    expect(api.checkoutSubscription).toHaveBeenCalledWith('p-core', '529.982.247-25');
    expect(redirect).toHaveBeenCalledWith('https://www.asaas.com/i/abc');
  });

  it('link que não é https nunca é aberto: cai no app', () => {
    const { component, redirect, router } = build('p-core', {
      api: { checkoutSubscription: vi.fn().mockReturnValue(of({ subscription: {}, checkoutUrl: 'javascript:alert(1)' })) },
    });
    component.ngOnInit();
    component.onCpfInput('52998224725');
    component.pay();
    expect(redirect).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/athlete/home']);
  });

  it('conta de outro treinador (404): mensagem específica e fica no pagamento', () => {
    const { component } = build('p-core', { api: { checkoutSubscription: vi.fn().mockReturnValue(throwError(() => ({ status: 404 }))) } });
    component.ngOnInit();
    component.onCpfInput('52998224725');
    component.pay();
    expect(component.errorMsg()).toContain('outro treinador');
    expect(component.step()).toBe('payment');
  });

  it('clique duplo enquanto processa é ignorado', () => {
    const { component, api } = build();
    component.ngOnInit();
    component.onCpfInput('52998224725');
    component.busy.set(true);
    component.pay();
    expect(api.checkoutSubscription).not.toHaveBeenCalled();
  });

  it('redirectTo usa window.location.assign', () => {
    const { component, redirect } = build();
    redirect.mockRestore();
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { value: { assign }, writable: true, configurable: true });
    try {
      (component as any).redirectTo('https://www.asaas.com/i/abc');
      expect(assign).toHaveBeenCalledWith('https://www.asaas.com/i/abc');
    } finally {
      Object.defineProperty(window, 'location', { value: original, writable: true, configurable: true });
    }
  });
});
