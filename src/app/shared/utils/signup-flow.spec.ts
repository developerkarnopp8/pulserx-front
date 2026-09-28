import { apiMessage, checkoutErrorMessage, isEmailExists, isSafeCheckoutUrl, maskCpf } from './signup-flow';

describe('apiMessage', () => {
  it('string, lista (validação) ou fallback', () => {
    expect(apiMessage({ error: { message: 'CPF inválido' } }, 'x')).toBe('CPF inválido');
    expect(apiMessage({ error: { message: ['senha curta', 'outra'] } }, 'x')).toBe('senha curta');
    expect(apiMessage({ error: { message: '' } }, 'padrão')).toBe('padrão');
    expect(apiMessage(null, 'padrão')).toBe('padrão');
    expect(apiMessage({ error: { message: [1] } }, 'padrão')).toBe('padrão');
  });
});

describe('isEmailExists', () => {
  it('só 409 com code EMAIL_EXISTS', () => {
    expect(isEmailExists({ status: 409, error: { code: 'EMAIL_EXISTS' } })).toBe(true);
    expect(isEmailExists({ status: 409, error: {} })).toBe(false);
    expect(isEmailExists({ status: 400, error: { code: 'EMAIL_EXISTS' } })).toBe(false);
    expect(isEmailExists(undefined)).toBe(false);
  });
});

describe('checkoutErrorMessage', () => {
  it('404 = conta de outro treinador; 429 = aguarde; senão a mensagem da API ou padrão', () => {
    expect(checkoutErrorMessage({ status: 404 })).toContain('outro treinador');
    expect(checkoutErrorMessage({ status: 429 })).toContain('Aguarde');
    expect(checkoutErrorMessage({ status: 400, error: { message: 'Informe um CPF válido.' } })).toBe('Informe um CPF válido.');
    expect(checkoutErrorMessage({ status: 500 })).toContain('Não foi possível iniciar');
  });
});

describe('isSafeCheckoutUrl', () => {
  it('só https do Asaas (produção ou sandbox)', () => {
    expect(isSafeCheckoutUrl('https://www.asaas.com/i/abc')).toBe(true);
    expect(isSafeCheckoutUrl('https://sandbox.asaas.com/i/abc')).toBe(true);
    expect(isSafeCheckoutUrl('https://asaas.com/i/abc')).toBe(true);
    expect(isSafeCheckoutUrl('https://evil.com/i/abc')).toBe(false);
    expect(isSafeCheckoutUrl('https://asaas.com.evil.com/i/abc')).toBe(false);
    expect(isSafeCheckoutUrl('https://fakeasaas.com/i/abc')).toBe(false);
    expect(isSafeCheckoutUrl('http://www.asaas.com/i/abc')).toBe(false);
    expect(isSafeCheckoutUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeCheckoutUrl('não é url')).toBe(false);
    expect(isSafeCheckoutUrl(null)).toBe(false);
  });
});

describe('maskCpf', () => {
  it('formata enquanto digita e ignora o que não é dígito', () => {
    expect(maskCpf('529')).toBe('529');
    expect(maskCpf('5299')).toBe('529.9');
    expect(maskCpf('5299822')).toBe('529.982.2');
    expect(maskCpf('52998224725')).toBe('529.982.247-25');
    expect(maskCpf('529.982.247-25999')).toBe('529.982.247-25');
    expect(maskCpf('abc')).toBe('');
  });
});
