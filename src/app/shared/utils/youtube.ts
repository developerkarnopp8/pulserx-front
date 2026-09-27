/**
 * Extrai o id de um vídeo do YouTube de qualquer formato de URL usado no app
 * (watch?v=, youtu.be/, shorts/, embed/, com ou sem parâmetros extras como
 * timestamp/playlist). Retorna null se não for uma URL do YouTube reconhecida —
 * nunca embutir um iframe a partir de um id não validado (evita usar `youtubeUrl`
 * pra apontar pra outro domínio via iframe).
 */
export function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  const ID_RE = /^[\w-]{11}$/;

  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return ID_RE.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      const id = parsed.searchParams.get('v');
      return id && ID_RE.test(id) ? id : null;
    }
    const match = parsed.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})/);
    if (match) return match[2];
  }

  return null;
}

/** URL segura pra usar num iframe (sem cookies de terceiros por padrão — youtube-nocookie.com). */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
