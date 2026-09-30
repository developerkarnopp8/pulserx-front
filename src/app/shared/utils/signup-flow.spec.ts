import { apiMessage, checkoutErrorMessage, isEmailExists, isSafeCheckoutUrl, loginErrorMessage, maskCpf } from './signup-flow';

describe('apiMessage', () => {
  it('string, lista (validação) ou fallback', () => {
    expect(apiMessage({ error: { message: 'CPF inválido' } }, 'x')).toBe('CPF inválido');
    expect(apiMessage({ error: { message: ['senha curta', 'outra'] } }, 'x')).toBe('senha curta');
    expect(apiMessage({ error: { message: '' } }, 'padrão')).toBe('padrão');
    expect(apiMessage(null, 'padrão')).toBe('padrão');
    expect(apiMessage({ error: { message: [1] } }, 'padrão')).toBe('padrão');
  });

  it('nunca mostra texto técnico em inglês (o dono viu "Http failure response…" no login)', () => {
    for (const msg of ['Unauthorized', 'Forbidden resource', 'Not Found', 'Internal server error',
      'ThrottlerException: Too Many Requests', 'Cannot GET /api/x', 'Http failure response for x: 500', 'Invalid credentials']) {
      expect(apiMessage({ status: 400, error: { message: msg } }, 'padrão')).toBe('padrão');
    }
    expect(apiMessage({ status: 400, error: { message: ['email must be an email'] } }, 'padrão')).toBe('padrão');
    expect(apiMessage({ status: 400, error: { message: 'healthConsent should not be empty' } }, 'padrão')).toBe('padrão');
  });

  it('frase própria por tipo de problema quando a API não escreveu uma', () => {
    expect(apiMessage({ status: 0 }, 'x')).toBe('Sem conexão com o servidor. Confira sua internet e tente de novo.');
    expect(apiMessage({ status: 429, error: { message: 'ThrottlerException: Too Many Requests' } }, 'x'))
      .toBe('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
    expect(apiMessage({ status: 401, error: { message: 'Unauthorized' } }, 'x')).toBe('Sua sessão terminou. Entre novamente.');
    expect(apiMessage({ status: 403, error: { message: 'Forbidden resource' } }, 'x')).toBe('Você não tem permissão para fazer isso.');
    expect(apiMessage({ status: 500, error: { message: 'Internal server error' } }, 'padrão')).toBe('padrão');
  });

  it('mensagem em português da API tem prioridade, inclusive em 401/403', () => {
    expect(apiMessage({ status: 401, error: { message: 'Senha incorreta.' } }, 'x')).toBe('Senha incorreta.');
    expect(apiMessage({ status: 403, error: { message: 'Você não tem acesso a este aluno.' } }, 'x')).toBe('Você não tem acesso a este aluno.');
  });
});

describe('loginErrorMessage', () => {
  it('401 = e-mail ou senha incorretos; perfil errado mantém o texto nosso; resto passa pelo apiMessage', () => {
    expect(loginErrorMessage({ status: 401, message: 'Http failure response for x: 401 Unauthorized' })).toBe('E-mail ou senha incorretos.');
    expect(loginErrorMessage(new Error('Este e-mail pertence a um perfil diferente. Use o acesso Coach.')))
      .toBe('Este e-mail pertence a um perfil diferente. Use o acesso Coach.');
    expect(loginErrorMessage({ status: 429 })).toBe('Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.');
    expect(loginErrorMessage({ status: 0 })).toBe('Sem conexão com o servidor. Confira sua internet e tente de novo.');
    expect(loginErrorMessage({ status: 500, message: 'Http failure response' })).toBe('Não foi possível entrar agora. Tente de novo em instantes.');
    expect(loginErrorMessage(null)).toBe('Não foi possível entrar agora. Tente de novo em instantes.');
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
