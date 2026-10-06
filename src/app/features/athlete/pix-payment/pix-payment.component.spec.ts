import { of, throwError } from 'rxjs';
import { PIX_POLL_MAX_MS, PIX_POLL_MS, PixPaymentComponent } from './pix-payment.component';

const pix = {
  amount: 149.9, dueDate: '2026-10-06T00:00:00.000Z', planName: 'Core', coachName: 'Luan',
  qrCodeImage: 'iVBORw0KGgo=', pixCode: '00020126pix', expiresAt: '2026-10-06 23:59:59', invoiceUrl: 'https://sandbox.asaas.com/i/abc',
};
const pending = { coachName: 'Luan', status: 'PAST_DUE', plan: { name: 'Core', priceCents: 14990, isFree: false }, hasOpenPayment: true, lastPaidAt: null };
const paid = { ...pending, status: 'ACTIVE', hasOpenPayment: false, lastPaidAt: '2026-10-06T15:00:00Z' };

function build(over: Record<string, unknown> = {}) {
  const api = {
    getMyPix: vi.fn().mockReturnValue(of(pix)),
    getMyPaymentStatus: vi.fn().mockReturnValue(of(pending)),
    ...over,
  };
  const router = { navigate: vi.fn() };
  const component = new PixPaymentComponent(api as any, router as any);
  const redirect = vi.spyOn(component as any, 'redirectTo').mockImplementation(() => {});
  return { component, api, router, redirect };
}

describe('PixPaymentComponent', () => {
  beforeEach(() => vi.useFakeTimers({ now: Date.parse('2026-10-06T15:00:00Z') }));
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('carrega o PIX: imagem só como data:image/png, contagem regressiva até a validade (Brasília) e resumo', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.qrSrc()).toBe('data:image/png;base64,iVBORw0KGgo=');
    // 23:59:59 de Brasília = 02:59:59Z do dia seguinte → faltam 11:59:59 às 15:00Z.
    expect(component.remaining()).toBe('11:59:59');
    expect(component.expired()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(component.remaining()).toBe('11:59:58');
    expect(component.fmtAmount(149.9)).toMatch(/R\$\s?149,90/);
    component.ngOnDestroy();
  });

  it('pergunta a cada 5 s; pagamento confirmado → tela de assinatura ativa', () => {
    const { component, api, router } = build();
    component.ngOnInit();
    vi.advanceTimersByTime(PIX_POLL_MS);
    expect(api.getMyPaymentStatus).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
    api.getMyPaymentStatus.mockReturnValue(of(paid));
    vi.advanceTimersByTime(PIX_POLL_MS);
    expect(router.navigate).toHaveBeenCalledWith(['/assinatura/confirmada']);
    component.ngOnDestroy();
  });

  it('aba em segundo plano não pergunta; erro de rede é ignorado (a próxima rodada tenta)', () => {
    const { component, api } = build({ getMyPaymentStatus: vi.fn().mockReturnValue(throwError(() => ({ status: 0 }))) });
    component.ngOnInit();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    vi.advanceTimersByTime(PIX_POLL_MS);
    expect(api.getMyPaymentStatus).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    vi.advanceTimersByTime(PIX_POLL_MS);
    expect(api.getMyPaymentStatus).toHaveBeenCalledTimes(1);
    expect(component.checking()).toBe(false);
    expect(component.errorMsg()).toBe('');
    component.ngOnDestroy();
  });

  it('para de perguntar depois de 30 min; "Já paguei" ainda não confirmado avisa e volta a perguntar', () => {
    const { component, api } = build();
    component.ngOnInit();
    vi.advanceTimersByTime(PIX_POLL_MAX_MS + PIX_POLL_MS);
    expect(component.pollStopped()).toBe(true);
    const calls = api.getMyPaymentStatus.mock.calls.length;
    vi.advanceTimersByTime(PIX_POLL_MS * 3);
    expect(api.getMyPaymentStatus.mock.calls.length).toBe(calls);

    component.checkStatus(true);
    expect(component.errorMsg()).toContain('Ainda não recebemos a confirmação');
    expect(component.pollStopped()).toBe(false);
    vi.advanceTimersByTime(PIX_POLL_MS);
    expect(api.getMyPaymentStatus.mock.calls.length).toBe(calls + 2);
    component.ngOnDestroy();
  });

  it('clique repetido enquanto consulta é ignorado', () => {
    const { component, api } = build();
    component.checking.set(true);
    component.checkStatus(true);
    expect(api.getMyPaymentStatus).not.toHaveBeenCalled();
  });

  it('QR vencido: marca como vencido', () => {
    const { component } = build({ getMyPix: vi.fn().mockReturnValue(of({ ...pix, expiresAt: '2026-10-06 11:00:00' })) });
    component.ngOnInit();
    expect(component.expired()).toBe(true);
    expect(component.remaining()).toBe('0:00');
    component.ngOnDestroy();
  });

  it('sem validade informada: sem contagem e nunca "vencido"', () => {
    const { component } = build({ getMyPix: vi.fn().mockReturnValue(of({ ...pix, expiresAt: null })) });
    component.ngOnInit();
    expect(component.remaining()).toBeNull();
    expect(component.expired()).toBe(false);
    component.ngOnDestroy();
  });

  it('nenhuma cobrança em aberto (404): tela "Nada a pagar"', () => {
    const { component } = build({ getMyPix: vi.fn().mockReturnValue(throwError(() => ({ status: 404 }))) });
    component.ngOnInit();
    expect(component.nothingOpen()).toBe(true);
    expect(component.pix()).toBeNull();
  });

  it('Asaas fora do ar: mostra o texto em português do servidor; sem texto, a frase padrão', () => {
    const comTexto = build({ getMyPix: vi.fn().mockReturnValue(throwError(() => ({ status: 503, error: { message: 'O serviço de pagamentos está indisponível no momento.' } }))) });
    comTexto.component.ngOnInit();
    expect(comTexto.component.nothingOpen()).toBe(false);
    expect(comTexto.component.errorMsg()).toBe('O serviço de pagamentos está indisponível no momento.');

    const semTexto = build({ getMyPix: vi.fn().mockReturnValue(throwError(() => ({ status: 503 }))) });
    semTexto.component.ngOnInit();
    expect(semTexto.component.errorMsg()).toContain('Não foi possível gerar o PIX agora');
  });

  it('copiar o código: usa a área de transferência e mostra "copiado" por 3 s', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { component } = build();
    component.ngOnInit();
    await component.copyCode();
    expect(writeText).toHaveBeenCalledWith('00020126pix');
    expect(component.copied()).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(component.copied()).toBe(false);
    component.ngOnDestroy();
  });

  it('copiar sem permissão: orienta a copiar manualmente; sem PIX carregado não faz nada', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('negado'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { component } = build();
    await component.copyCode();
    expect(writeText).not.toHaveBeenCalled();
    component.ngOnInit();
    await component.copyCode();
    expect(component.errorMsg()).toContain('copie manualmente');
    component.ngOnDestroy();
  });

  it('fatura do Asaas só abre link https do Asaas', () => {
    const ok = build();
    ok.component.ngOnInit();
    ok.component.openInvoice();
    expect(ok.redirect).toHaveBeenCalledWith('https://sandbox.asaas.com/i/abc');
    ok.component.ngOnDestroy();

    const evil = build({ getMyPix: vi.fn().mockReturnValue(of({ ...pix, invoiceUrl: 'https://evil.com/asaas.com' })) });
    evil.component.ngOnInit();
    expect(evil.component.invoiceUrl()).toBeNull();
    evil.component.openInvoice();
    expect(evil.redirect).not.toHaveBeenCalled();
    evil.component.ngOnDestroy();
  });

  it('QR que não é base64 nunca vira imagem', () => {
    const { component } = build({ getMyPix: vi.fn().mockReturnValue(of({ ...pix, qrCodeImage: 'javascript:alert(1)' })) });
    component.ngOnInit();
    expect(component.qrSrc()).toBeNull();
    component.ngOnDestroy();
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
