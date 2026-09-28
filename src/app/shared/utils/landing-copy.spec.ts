import { DEFAULT_PILLARS, buildPageCopy, resolveLandingCopy } from './landing-copy';

describe('resolveLandingCopy', () => {
  it('sem textos do coach: tudo no padrão, com o nome do coach nas chamadas', () => {
    const r = resolveLandingCopy(null, 'Luan');
    expect(r.howItWorksTitle).toBe('Como funciona o acompanhamento');
    expect(r.plansTitle).toBe('Escolha seu plano');
    expect(r.finalTitle).toBe('Comece a treinar com Luan');
    expect(r.finalCtaLabel).toBe('Quero treinar com Luan');
    expect(r.pillars.map(p => p.title)).toEqual(DEFAULT_PILLARS.map(p => p.title));
    expect(r.pillars.map(p => p.icon)).toEqual(['calendar_month', 'emoji_events', 'smart_display', 'smartphone']);
  });

  it('o padrão não promete recálculo automático de carga (o sistema não faz)', () => {
    expect(JSON.stringify(DEFAULT_PILLARS).toLowerCase()).not.toContain('recalcula');
  });

  it('usa os textos do coach (sem espaços sobrando) e completa cards incompletos com o padrão da posição', () => {
    const r = resolveLandingCopy({
      howItWorksTitle: '  Meu método  ', plansTitle: 'Planos', finalTitle: 'Bora', finalCtaLabel: 'Quero',
      pillars: [{ title: 'LPO técnico', text: 'Correção por vídeo.' }, { title: 'Só título', text: '  ' }],
    }, 'Luan');
    expect(r.howItWorksTitle).toBe('Meu método');
    expect(r.finalCtaLabel).toBe('Quero');
    expect(r.pillars[0]).toEqual({ icon: 'calendar_month', title: 'LPO técnico', text: 'Correção por vídeo.' });
    expect(r.pillars[1].title).toBe(DEFAULT_PILLARS[1].title);
    expect(r.pillars).toHaveLength(4);
  });

  it('pillars que não é lista é ignorado', () => {
    expect(resolveLandingCopy({ pillars: 'x' as never }, 'Luan').pillars[0].title).toBe(DEFAULT_PILLARS[0].title);
  });
});

describe('buildPageCopy', () => {
  it('só campos preenchidos; formulário vazio vira objeto vazio (volta ao padrão)', () => {
    expect(buildPageCopy({ howItWorksTitle: '  ', plansTitle: null, pillars: [{ title: '', text: '' }] })).toEqual({});
    expect(buildPageCopy({})).toEqual({});
  });

  it('mantém a posição dos cards e corta em 4', () => {
    const out = buildPageCopy({
      finalTitle: ' Bora ',
      pillars: [{ title: '', text: '' }, { title: 'B', text: 'Texto B' }, { title: 'C', text: 'Texto C' }, { title: 'D', text: 'D' }, { title: 'E', text: 'E' }],
    });
    expect(out.finalTitle).toBe('Bora');
    expect(out.pillars).toEqual([{ title: '', text: '' }, { title: 'B', text: 'Texto B' }, { title: 'C', text: 'Texto C' }, { title: 'D', text: 'D' }]);
  });
});
