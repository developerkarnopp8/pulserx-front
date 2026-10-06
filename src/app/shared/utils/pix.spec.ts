import { isSubscriptionReleased, pixExpiresAtMs, pixImageSrc, pixRemaining } from './pix';

describe('pixImageSrc', () => {
  it('base64 válido vira data:image/png', () => {
    expect(pixImageSrc('iVBORw0KGgo=')).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it.each([null, undefined, '', 'javascript:alert(1)', 'abc"><script>', 'a b'])('conteúdo que não é base64 (%s): null', v => {
    expect(pixImageSrc(v as any)).toBeNull();
  });
});

describe('pixExpiresAtMs', () => {
  it('lê o formato do Asaas no horário de Brasília (-03:00)', () => {
    expect(pixExpiresAtMs('2026-10-06 23:59:59')).toBe(Date.parse('2026-10-07T02:59:59Z'));
    expect(pixExpiresAtMs('2026-10-06T23:59:59')).toBe(Date.parse('2026-10-07T02:59:59Z'));
  });

  it.each([null, undefined, '', '06/10/2026 23:59', '2026-13-45 99:99:99'])('fora do formato (%s): null', v => {
    expect(pixExpiresAtMs(v as any)).toBeNull();
  });
});

describe('pixRemaining', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');

  it('menos de 1 hora: min:seg', () => {
    expect(pixRemaining(now + (14 * 60 + 26) * 1000, now)).toBe('14:26');
    expect(pixRemaining(now + 5 * 1000, now)).toBe('0:05');
  });

  it('1 hora ou mais: h:min:seg', () => {
    expect(pixRemaining(now + (5 * 3600 + 3 * 60 + 9) * 1000, now)).toBe('5:03:09');
  });

  it('já venceu: 0:00; sem validade: null', () => {
    expect(pixRemaining(now - 1000, now)).toBe('0:00');
    expect(pixRemaining(null, now)).toBeNull();
  });
});

describe('isSubscriptionReleased', () => {
  it('ativa ou em teste e sem cobrança em aberto: liberada', () => {
    expect(isSubscriptionReleased('ACTIVE', false)).toBe(true);
    expect(isSubscriptionReleased('TRIALING', false)).toBe(true);
  });

  it('em aberto, inadimplente, cancelada ou sem assinatura: não', () => {
    expect(isSubscriptionReleased('ACTIVE', true)).toBe(false);
    expect(isSubscriptionReleased('PAST_DUE', false)).toBe(false);
    expect(isSubscriptionReleased('CANCELED', false)).toBe(false);
    expect(isSubscriptionReleased(null, false)).toBe(false);
  });
});
