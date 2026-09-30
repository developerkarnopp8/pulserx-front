/** Textos padrão do Nest/Angular em inglês — nunca vão para a tela (o dono viu "Http failure response…" no login). */
const TEXTO_PADRAO_EM_INGLES =
  /^(Unauthorized|Forbidden|Forbidden resource|Not Found|Bad Request|Conflict|Internal server error|Too Many Requests|Invalid credentials)$|^ThrottlerException|^Cannot (GET|POST|PUT|PATCH|DELETE) |^Http failure/i;
/** Validação do class-validator sem mensagem própria ("email must be an email"). */
const VALIDACAO_EM_INGLES = /^[\w.]+ (must|should) /;

/**
 * Mensagem de erro para mostrar ao usuário, sempre em português: a da API quando ela escreveu uma (Nest manda
 * string ou lista de strings de validação); senão, uma frase pelo tipo do problema; por fim, o `fallback` da tela.
 */
export function apiMessage(err: unknown, fallback: string): string {
  const e = err as { status?: number; error?: { message?: unknown } } | null;
  if (e?.status === 0) return 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
  if (e?.status === 429) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  const raw = e?.error?.message;
  const msg = Array.isArray(raw) ? raw[0] : raw;
  if (typeof msg === 'string' && msg && !TEXTO_PADRAO_EM_INGLES.test(msg) && !VALIDACAO_EM_INGLES.test(msg)) return msg;
  if (e?.status === 401) return 'Sua sessão terminou. Entre novamente.';
  if (e?.status === 403) return 'Você não tem permissão para fazer isso.';
  return fallback;
}

/** Login: senha/e-mail errados (401) têm frase própria; o "perfil errado" já vem com texto nosso (Error sem status). */
export function loginErrorMessage(err: unknown): string {
  const e = err as { status?: number; message?: string } | null;
  if (e instanceof Error && !('status' in e)) return e.message;
  if (e?.status === 401) return 'E-mail ou senha incorretos.';
  return apiMessage(err, 'Não foi possível entrar agora. Tente de novo em instantes.');
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
