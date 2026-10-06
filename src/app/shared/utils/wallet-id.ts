/**
 * Wallet ID do Asaas (onde o coach recebe a parte dele de cada cobrança): um UUID `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
 * letras a–f e números. Mesma regra do backend (`common/wallet-id.ts`) — aqui é só para avisar antes de enviar.
 */
const WALLET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NIL_WALLET = '00000000-0000-0000-0000-000000000000';

/** Tira espaços das pontas (a cópia do painel costuma trazer) e padroniza em minúsculas. */
export function normalizeWalletId(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidWalletId(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = normalizeWalletId(value);
  return WALLET_ID_PATTERN.test(v) && v !== NIL_WALLET;
}

/** Situação da carteira do coach, para a tela e para o aviso da página pública. */
export type WalletState = 'missing' | 'invalid' | 'saved';

export function walletState(walletId: string | null | undefined, valid: boolean | undefined): WalletState {
  if (!walletId) return 'missing';
  return valid === false || !isValidWalletId(walletId) ? 'invalid' : 'saved';
}
