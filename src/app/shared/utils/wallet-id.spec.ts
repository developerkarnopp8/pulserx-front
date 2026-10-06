import { isValidWalletId, normalizeWalletId, walletState } from './wallet-id';

const W = 'c0c1688f-636b-42c0-b6ee-7339182276b7';

describe('Wallet ID do Asaas', () => {
  it('UUID de verdade: válido, mesmo com espaços nas pontas ou maiúsculas', () => {
    expect(isValidWalletId(W)).toBe(true);
    expect(isValidWalletId(`  ${W.toUpperCase()} `)).toBe(true);
    expect(normalizeWalletId(`  ${W.toUpperCase()} `)).toBe(W);
  });

  it.each([null, undefined, '', 'minha-carteira', 'c0c1688f636b42c0b6ee7339182276b7', '00000000-0000-0000-0000-000000000000'])(
    'inválido: %s', v => expect(isValidWalletId(v as any)).toBe(false),
  );

  it('situação: sem carteira, inválida (formato ou o servidor disse) ou salva', () => {
    expect(walletState(null, false)).toBe('missing');
    expect(walletState('00000000-0000-0000-0000-000000000000', undefined)).toBe('invalid');
    expect(walletState(W, false)).toBe('invalid');
    expect(walletState(W, true)).toBe('saved');
    expect(walletState(W, undefined)).toBe('saved');
  });
});
