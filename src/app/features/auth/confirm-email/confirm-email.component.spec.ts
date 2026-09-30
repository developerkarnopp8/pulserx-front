import { of, throwError } from 'rxjs';
import { ConfirmEmailComponent, continuePathFromHash } from './confirm-email.component';

const TOKEN = 'a'.repeat(43);
const PLANO = '3f2b1c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

describe('continuePathFromHash — para onde seguir depois de confirmar', () => {
  it('slug e plano no formato certo → pagamento do plano', () => {
    expect(continuePathFromHash(`#token=${TOKEN}&c=luan-teste&plano=${PLANO}`)).toBe(`/c/luan-teste/assinar/${PLANO}`);
  });

  it.each([
    ['sem plano', `#token=${TOKEN}&c=luan`],
    ['sem slug', `#token=${TOKEN}&plano=${PLANO}`],
    ['slug com barra (tentativa de sair do caminho)', `#token=${TOKEN}&c=..%2Fadmin&plano=${PLANO}`],
    ['slug de outro site', `#token=${TOKEN}&c=%2F%2Fevil.com&plano=${PLANO}`],
    ['slug maiúsculo', `#token=${TOKEN}&c=Luan&plano=${PLANO}`],
    ['slug longo demais', `#token=${TOKEN}&c=${'a'.repeat(61)}&plano=${PLANO}`],
    ['plano que não é id', `#token=${TOKEN}&c=luan&plano=x`],
    ['nada', ''],
  ])('%s → nenhum', (_caso, hash) => {
    expect(continuePathFromHash(hash)).toBeNull();
  });
});

function build(hash: string, api: Record<string, unknown> = {}) {
  window.location.hash = hash;
  const replace = vi.spyOn(history, 'replaceState');
  const apiMock = {
    verifyEmail: vi.fn().mockReturnValue(of({ access_token: 'sessao', user: { id: 'u1', role: 'athlete' } })),
    ...api,
  };
  const auth = { startSession: vi.fn() };
  const router = { navigateByUrl: vi.fn() };
  const component = new ConfirmEmailComponent(apiMock as any, auth as any, router as any);
  component.ngOnInit();
  return { component, api: apiMock, auth, router, replace };
}

describe('ConfirmEmailComponent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lê o token, tira o link da barra de endereço e NÃO confirma sozinho (só no clique)', () => {
    const { component, api, replace } = build(`#token=${TOKEN}`);
    expect(component.token()).toBe(TOKEN);
    expect(replace).toHaveBeenCalledWith(null, '', window.location.pathname);
    expect(api.verifyEmail).not.toHaveBeenCalled();
  });

  it('confirmar: abre a sessão e volta ao pagamento do plano escolhido', () => {
    const { component, api, auth, router } = build(`#token=${TOKEN}&c=luan&plano=${PLANO}`);
    component.confirm();
    expect(api.verifyEmail).toHaveBeenCalledWith(TOKEN);
    expect(auth.startSession).toHaveBeenCalledWith('sessao', { id: 'u1', role: 'athlete' });
    expect(router.navigateByUrl).toHaveBeenCalledWith(`/c/luan/assinar/${PLANO}`);
    expect(component.busy()).toBe(false);
  });

  it.each([
    ['athlete', '/athlete/home'],
    ['coach', '/coach/dashboard'],
    ['admin', '/admin/coaches'],
  ])('sem plano no link: %s vai para a tela inicial dele', (role, destino) => {
    const { component, router } = build(`#token=${TOKEN}`, {
      verifyEmail: vi.fn().mockReturnValue(of({ access_token: 's', user: { id: 'u1', role } })),
    });
    component.confirm();
    expect(router.navigateByUrl).toHaveBeenCalledWith(destino);
  });

  it('link inválido/expirado: mostra a mensagem da API e não abre sessão', () => {
    const { component, auth } = build(`#token=${TOKEN}`, {
      verifyEmail: vi.fn().mockReturnValue(throwError(() => ({ status: 400, error: { message: 'Link inválido ou expirado.' } }))),
    });
    component.confirm();
    expect(component.errorMsg()).toBe('Link inválido ou expirado.');
    expect(component.busy()).toBe(false);
    expect(auth.startSession).not.toHaveBeenCalled();
  });

  it('sem token (ou já confirmando): o clique não faz nada; sem fragmento, não mexe na barra', () => {
    const semToken = build('');
    expect(semToken.replace).not.toHaveBeenCalled();
    semToken.component.confirm();
    expect(semToken.api.verifyEmail).not.toHaveBeenCalled();

    const ocupado = build(`#token=${TOKEN}`);
    ocupado.component.busy.set(true);
    ocupado.component.confirm();
    expect(ocupado.api.verifyEmail).not.toHaveBeenCalled();
  });
});
