/** Card do bloco "Como funciona o acompanhamento". */
export interface LandingPillar {
  title: string;
  text: string;
}

/** Textos editáveis da landing como vêm da API (campo ausente = padrão). */
export interface LandingPageCopy {
  howItWorksTitle?: string;
  pillars?: LandingPillar[];
  plansTitle?: string;
  finalTitle?: string;
  finalCtaLabel?: string;
}

export interface ResolvedLandingCopy {
  howItWorksTitle: string;
  pillars: (LandingPillar & { icon: string })[];
  plansTitle: string;
  finalTitle: string;
  finalCtaLabel: string;
}

/** Ícone fixo por posição do card (o coach edita título e texto). */
export const PILLAR_ICONS = ['calendar_month', 'emoji_events', 'smart_display', 'smartphone'];

/**
 * Padrão dos 4 cards — só o que a plataforma FAZ de fato. (O texto antigo prometia que "o plano
 * recalcula a carga pelo seu PR", o que o sistema não faz: exercício do plano não é ligado ao PR.)
 */
export const DEFAULT_PILLARS: LandingPillar[] = [
  { title: 'Periodização cíclica', text: 'Treino organizado em ciclos e fases, com progressão planejada semana a semana.' },
  { title: 'Seus recordes no app', text: 'Registre seus PRs e acompanhe a evolução de carga de cada movimento.' },
  { title: 'Vídeo por exercício', text: 'Demonstração de cada movimento, pra treinar com técnica correta mesmo à distância.' },
  { title: 'No seu bolso', text: 'Treino, histórico e recordes acessíveis pelo app, a qualquer hora.' },
];

const clean = (v: string | undefined | null) => (typeof v === 'string' ? v.trim() : '');

/** Mescla o que o coach escreveu com os padrões. Card incompleto (sem título ou texto) usa o padrão daquela posição. */
export function resolveLandingCopy(copy: LandingPageCopy | null | undefined, coachName: string): ResolvedLandingCopy {
  const c = copy ?? {};
  const custom = Array.isArray(c.pillars) ? c.pillars : [];
  return {
    howItWorksTitle: clean(c.howItWorksTitle) || 'Como funciona o acompanhamento',
    pillars: DEFAULT_PILLARS.map((def, i) => {
      const p = custom[i];
      const useCustom = !!p && !!clean(p.title) && !!clean(p.text);
      return { icon: PILLAR_ICONS[i], title: useCustom ? clean(p.title) : def.title, text: useCustom ? clean(p.text) : def.text };
    }),
    plansTitle: clean(c.plansTitle) || 'Escolha seu plano',
    finalTitle: clean(c.finalTitle) || `Comece a treinar com ${coachName}`,
    finalCtaLabel: clean(c.finalCtaLabel) || `Quero treinar com ${coachName}`,
  };
}

/**
 * Monta o `pageCopy` a enviar pro backend a partir do formulário do editor: só campos preenchidos,
 * só cards completos. Sempre devolve um objeto (vazio = volta tudo ao padrão).
 */
export function buildPageCopy(form: {
  howItWorksTitle?: string | null;
  plansTitle?: string | null;
  finalTitle?: string | null;
  finalCtaLabel?: string | null;
  pillars?: { title?: string | null; text?: string | null }[];
}): LandingPageCopy {
  const out: LandingPageCopy = {};
  for (const key of ['howItWorksTitle', 'plansTitle', 'finalTitle', 'finalCtaLabel'] as const) {
    const v = clean(form[key]);
    if (v) out[key] = v;
  }
  const pillars = (form.pillars ?? [])
    .map(p => ({ title: clean(p.title), text: clean(p.text) }))
    .slice(0, 4);
  // Guarda a posição: card vazio no meio vira o padrão daquela posição (título/texto vazios).
  if (pillars.some(p => p.title && p.text)) out.pillars = pillars;
  return out;
}
