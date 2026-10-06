/**
 * Regras puras da tela do PIX (pagar dentro do app): validade do QR e a imagem que vem do Asaas.
 */

/** Só caracteres de base64: nada do que vem da API vira URL sem passar por aqui. */
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** `data:` da imagem do QR (PNG em base64 vindo do Asaas); `null` se o conteúdo não for base64. */
export function pixImageSrc(base64: string | null | undefined): string | null {
  if (!base64 || !BASE64.test(base64)) return null;
  return `data:image/png;base64,${base64}`;
}

/**
 * Validade do QR ("AAAA-MM-DD HH:mm:ss", horário de Brasília, como o Asaas manda) em milissegundos desde 1970.
 * `null` se não veio ou não está no formato.
 */
export function pixExpiresAtMs(expiresAt: string | null | undefined): number | null {
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(expiresAt ?? '');
  if (!m) return null;
  const ms = Date.parse(`${m[1]}T${m[2]}-03:00`);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Tempo que falta para o QR vencer: "14:26" (min:seg) ou "5:03:09" (h:min:seg). `null` sem validade conhecida;
 * "0:00" quando já venceu.
 */
export function pixRemaining(expiresAtMs: number | null, nowMs: number): string | null {
  if (expiresAtMs === null) return null;
  const total = Math.max(0, Math.floor((expiresAtMs - nowMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Assinatura liberada: ativa (ou em teste) e sem cobrança em aberto. */
export function isSubscriptionReleased(status: string | null | undefined, hasOpenPayment: boolean): boolean {
  return (status === 'ACTIVE' || status === 'TRIALING') && !hasOpenPayment;
}
