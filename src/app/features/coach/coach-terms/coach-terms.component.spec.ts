import { of, throwError } from 'rxjs';
import { CoachTermsComponent } from './coach-terms.component';

function build(apiOver: Record<string, unknown> = {}) {
  const session = { access_token: 'tok-novo', user: { id: 'c1', role: 'coach', termsPending: false } };
  const api = { acceptCoachTerms: vi.fn().mockReturnValue(of(session)), ...apiOver };
  const auth = { startSession: vi.fn(), logout: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const component = new CoachTermsComponent(api as any, auth as any, router as any);
  return { component, api, auth, router, session };
}

describe('CoachTermsComponent — aceite do Termo do Coach', () => {
  it('mostra o mesmo texto da página pública /termo-coach', () => {
    const { component } = build();
    expect(component.doc.title).toBe('Termo do Coach');
    expect(component.doc.sections.length).toBeGreaterThan(5);
  });

  it('sem marcar "Li e aceito": não envia', () => {
    const { component, api } = build();
    expect(component.canSubmit).toBe(false);
    component.submit();
    expect(api.acceptCoachTerms).not.toHaveBeenCalled();
  });

  it('aceito: abre a sessão NOVA e vai para o painel', () => {
    const { component, api, auth, router, session } = build();
    component.accepted.set(true);
    component.submit();
    expect(api.acceptCoachTerms).toHaveBeenCalled();
    expect(auth.startSession).toHaveBeenCalledWith('tok-novo', session.user);
    expect(router.navigate).toHaveBeenCalledWith(['/coach/dashboard']);
  });

  it('enquanto salva, não envia de novo', () => {
    const { component, api } = build({ acceptCoachTerms: vi.fn().mockReturnValue({ subscribe: vi.fn() }) });
    component.accepted.set(true);
    component.submit();
    expect(component.canSubmit).toBe(false);
    component.submit();
    expect(api.acceptCoachTerms).toHaveBeenCalledTimes(1);
  });

  it('erro: mensagem em português, libera o botão e não abre sessão', () => {
    const { component, auth } = build({
      acceptCoachTerms: vi.fn().mockReturnValue(throwError(() => ({ status: 500, error: { message: 'Internal server error' } }))),
    });
    component.accepted.set(true);
    component.submit();
    expect(component.errorMsg()).toBe('Não foi possível registrar o aceite. Tente de novo.');
    expect(component.busy()).toBe(false);
    expect(auth.startSession).not.toHaveBeenCalled();
  });
});

describe('CoachTermsComponent — índice das cláusulas', () => {
  it('numera as cláusulas a partir do texto oficial, sem repetir o "1." no título', () => {
    const { component } = build();
    expect(component.clauses.length).toBe(component.doc.sections.length);
    expect(component.clauses[0]).toMatchObject({ id: 'clausula-1', num: '01', title: 'Quais dados você acessa' });
    expect(component.clauses.every(c => !/^\d+\./.test(c.title))).toBe(true);
    expect(component.clauses.every(c => Array.isArray(c.items))).toBe(true);
    expect(component.lastUpdated).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('ir para a cláusula: rola até ela e leva o foco', () => {
    const { component } = build();
    const el = document.createElement('article');
    el.id = 'clausula-3';
    el.tabIndex = -1;
    el.scrollIntoView = vi.fn();
    document.body.appendChild(el);
    component.goTo('clausula-3');
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(document.activeElement).toBe(el);
    el.remove();
    expect(() => component.goTo('nao-existe')).not.toThrow();
  });
});
