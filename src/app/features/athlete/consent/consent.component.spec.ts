import { of, throwError } from 'rxjs';
import { ConsentComponent } from './consent.component';
import { ConsentStatus } from '../../../core/models';

const status = (over: Partial<ConsentStatus> = {}): ConsentStatus => ({
  termsVersion: '2026-09-30',
  termsAccepted: false,
  healthConsent: null,
  healthConsentAt: null,
  ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const session = { access_token: 'tok-novo', user: { id: 'u1', role: 'athlete', termsPending: false, healthConsent: true } };
  const api = {
    getConsents: vi.fn().mockReturnValue(of(status())),
    acceptConsents: vi.fn().mockReturnValue(of(session)),
    ...apiOver,
  };
  const auth = { startSession: vi.fn(), logout: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const component = new ConsentComponent(api as any, auth as any, router as any);
  return { component, api, auth, router, session };
}

describe('ConsentComponent — carga', () => {
  it('termos pendentes e saúde sem resposta: começa tudo desmarcado', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.acceptTerms()).toBe(false);
    expect(component.health()).toBeNull();
    expect(component.canSubmit).toBe(false);
  });

  it('já aceitou os termos e respondeu sobre saúde: traz as respostas marcadas', () => {
    const { component } = build({ getConsents: vi.fn().mockReturnValue(of(status({ termsAccepted: true, healthConsent: false }))) });
    component.ngOnInit();
    expect(component.acceptTerms()).toBe(true);
    expect(component.health()).toBe(false);
    expect(component.canSubmit).toBe(true);
  });

  it('erro ao carregar: libera a tela e mostra a mensagem da API (ou a padrão)', () => {
    const comMsg = build({ getConsents: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Fora do ar' } }))) });
    comMsg.component.ngOnInit();
    expect(comMsg.component.loading()).toBe(false);
    expect(comMsg.component.errorMsg()).toBe('Fora do ar');

    const semMsg = build({ getConsents: vi.fn().mockReturnValue(throwError(() => new Error('rede'))) });
    semMsg.component.ngOnInit();
    expect(semMsg.component.errorMsg()).toBe('Não foi possível carregar. Tente de novo.');
  });
});

describe('ConsentComponent — enviar', () => {
  it('exige aceitar os termos E responder sobre saúde (sim ou não)', () => {
    const { component, api } = build();
    component.ngOnInit();
    component.health.set(true);
    expect(component.canSubmit).toBe(false);
    component.submit();
    expect(api.acceptConsents).not.toHaveBeenCalled();

    component.acceptTerms.set(true);
    component.health.set(null);
    expect(component.canSubmit).toBe(false);
  });

  it.each([true, false])('saúde = %s: grava, abre a sessão NOVA e vai pra home', health => {
    const { component, api, auth, router, session } = build();
    component.ngOnInit();
    component.acceptTerms.set(true);
    component.health.set(health);
    component.submit();
    expect(api.acceptConsents).toHaveBeenCalledWith(health);
    expect(auth.startSession).toHaveBeenCalledWith('tok-novo', session.user);
    expect(router.navigate).toHaveBeenCalledWith(['/athlete/home']);
  });

  it('enquanto salva, não deixa enviar de novo', () => {
    const { component, api } = build({ acceptConsents: vi.fn().mockReturnValue({ subscribe: vi.fn() }) });
    component.ngOnInit();
    component.acceptTerms.set(true);
    component.health.set(true);
    component.submit();
    expect(component.busy()).toBe(true);
    expect(component.canSubmit).toBe(false);
    component.submit();
    expect(api.acceptConsents).toHaveBeenCalledTimes(1);
  });

  it('erro ao salvar: validação em inglês do servidor vira a frase em português; libera o botão e não abre sessão', () => {
    const { component, auth, router } = build({
      acceptConsents: vi.fn().mockReturnValue(throwError(() => ({ error: { message: ['acceptTerms must be equal to true'] } }))),
    });
    component.ngOnInit();
    component.acceptTerms.set(true);
    component.health.set(false);
    component.submit();
    expect(component.busy()).toBe(false);
    expect(component.errorMsg()).toBe('Não foi possível salvar. Tente de novo.');
    expect(auth.startSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('erro sem mensagem: usa a padrão', () => {
    const { component } = build({ acceptConsents: vi.fn().mockReturnValue(throwError(() => new Error('rede'))) });
    component.ngOnInit();
    component.acceptTerms.set(true);
    component.health.set(true);
    component.submit();
    expect(component.errorMsg()).toBe('Não foi possível salvar. Tente de novo.');
  });
});
