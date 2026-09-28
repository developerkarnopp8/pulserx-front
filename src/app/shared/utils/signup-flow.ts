/** Mensagem da API (Nest manda string ou lista de strings de validação). */
export function apiMessage(err: unknown, fallback: string): string {
  const msg = (err as { error?: { message?: unknown } })?.error?.message;
  if (Array.isArray(msg) && typeof msg[0] === 'string') return msg[0];
  return typeof msg === 'string' && msg ? msg : fallback;
}

/** Inscrição: o e-mail já tem conta → a tela troca pro "entre para continuar". */
export function isEmailExists(err: unknown): boolean {
  const e = err as { status?: number; error?: { code?: string } };
  return e?.status === 409 && e.error?.code === 'EMAIL_EXISTS';
}

/**
 * Checkout: 404 "Plano não encontrado" pra um aluno logado quer dizer que a conta dele é de OUTRO
 * coach (o plano é validado contra o coach do aluno) — decisão do dono: não dá pra assinar dois.
 */
export function checkoutErrorMessage(err: unknown): string {
  const status = (err as { status?: number })?.status;
  if (status === 404) {
    return 'Sua conta está vinculada a outro treinador. Não é possível assinar dois treinadores ao mesmo tempo.';
  }
  if (status === 429) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  return apiMessage(err, 'Não foi possível iniciar o pagamento agora. Tente de novo em instantes.');
}

/**
 * Só redireciona pra fatura se for https E do Asaas (produção ou sandbox). O link vem da nossa API;
 * a checagem de domínio é defesa em profundidade contra mandar o aluno pra site de terceiros.
 */
export function isSafeCheckoutUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && (hostname === 'asaas.com' || hostname.endsWith('.asaas.com'));
  } catch {
    return false;
  }
}

/** Apenas dígitos, no formato 000.000.000-00 enquanto digita. */
export function maskCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}
