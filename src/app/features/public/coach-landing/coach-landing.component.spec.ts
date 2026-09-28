import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CoachLandingComponent } from './coach-landing.component';
import { PublicCoachProfile } from '../../../core/models';

const profile = (over: Partial<PublicCoachProfile> = {}): PublicCoachProfile => ({
  coachName: 'Luan', bio: 'Treinador', bannerUrl: null, photoUrl: null, headline: null,
  subheadline: null, quote: null, achievementBadge: null, yearsExperience: null, athletesCount: null,
  npsScore: null, completionRate: null, whatsappNumber: null, videoUrl: null,
  guaranteeDays: null, guaranteeText: null, supportEmail: null, supportHours: null, pageCopy: null,
  plans: [], testimonials: [], faqItems: [], ...over,
});

function build(apiOver: Record<string, unknown> = {}, slug = 'luan') {
  const api = {
    getPublicCoachProfile: vi.fn().mockReturnValue(of(profile())),
    createLead: vi.fn().mockReturnValue(of({ id: 'lead1' })),
    ...apiOver,
  };
  const route = { snapshot: { paramMap: { get: () => slug } } };
  const component = new CoachLandingComponent(api as any, route as any, new FormBuilder());
  return { component, api };
}

describe('CoachLandingComponent.ngOnInit', () => {
  it('carrega o perfil pelo slug da rota', () => {
    const { component, api } = build({}, 'luan-treinador');
    component.ngOnInit();
    expect(api.getPublicCoachProfile).toHaveBeenCalledWith('luan-treinador');
    expect(component.profile()?.coachName).toBe('Luan');
    expect(component.loading()).toBe(false);
    expect(component.notFound()).toBe(false);
  });

  it('sem slug na rota (paramMap retorna null): usa string vazia', () => {
    const api = { getPublicCoachProfile: vi.fn().mockReturnValue(of(profile())), createLead: vi.fn() };
    const route = { snapshot: { paramMap: { get: () => null } } };
    const component = new CoachLandingComponent(api as any, route as any, new FormBuilder());

    component.ngOnInit();

    expect(api.getPublicCoachProfile).toHaveBeenCalledWith('');
  });

  it('slug inexistente/despublicado (404): mostra notFound', () => {
    const { component } = build({ getPublicCoachProfile: vi.fn().mockReturnValue(throwError(() => ({ status: 404 }))) });
    component.ngOnInit();
    expect(component.notFound()).toBe(true);
    expect(component.loading()).toBe(false);
  });
});

describe('CoachLandingComponent.whatsappLink', () => {
  it('sem número: null', () => {
    const { component } = build({}, 'luan');
    component.ngOnInit();
    expect(component.whatsappLink).toBeNull();
  });

  it('com número: monta o link wa.me removendo caracteres não-numéricos', () => {
    const { component } = build({ getPublicCoachProfile: vi.fn().mockReturnValue(of(profile({ whatsappNumber: '+55 (11) 99999-9999' }))) });
    component.ngOnInit();
    expect(component.whatsappLink).toBe('https://wa.me/5511999999999');
  });
});

describe('CoachLandingComponent.scrollToSection', () => {
  it('previne o comportamento padrão do link (nunca deixa o navegador resolver o href)', () => {
    const { component } = build();
    const event = { preventDefault: vi.fn() } as unknown as Event;
    component.scrollToSection('contato', event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('rola até o elemento com o id informado', () => {
    const { component } = build();
    const el = document.createElement('div');
    el.id = 'contato';
    const scrollIntoView = vi.fn();
    el.scrollIntoView = scrollIntoView;
    document.body.appendChild(el);

    component.scrollToSection('contato', { preventDefault: vi.fn() } as unknown as Event);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    document.body.removeChild(el);
  });

  it('elemento inexistente: não quebra', () => {
    const { component } = build();
    expect(() => component.scrollToSection('nao-existe', { preventDefault: vi.fn() } as unknown as Event)).not.toThrow();
  });
});

describe('CoachLandingComponent.isFeaturedPlan', () => {
  it('com exatamente 3 planos, destaca só o do meio (índice 1)', () => {
    const { component } = build();
    expect(component.isFeaturedPlan(0, 3)).toBe(false);
    expect(component.isFeaturedPlan(1, 3)).toBe(true);
    expect(component.isFeaturedPlan(2, 3)).toBe(false);
  });

  it('com número de planos diferente de 3, nunca destaca', () => {
    const { component } = build();
    expect(component.isFeaturedPlan(1, 2)).toBe(false);
    expect(component.isFeaturedPlan(1, 4)).toBe(false);
    expect(component.isFeaturedPlan(0, 1)).toBe(false);
  });
});

describe('CoachLandingComponent.sendLead', () => {
  it('form inválido (sem nome/e-mail): não chama a API', () => {
    const { component, api } = build();
    component.sendLead();
    expect(api.createLead).not.toHaveBeenCalled();
    expect(component.leadForm.touched).toBe(true);
  });

  it('envia com nome trimado e phone/message vazios viram undefined', () => {
    const { component, api } = build({}, 'luan');
    component.ngOnInit();
    component.leadForm.patchValue({ name: '  Ana  ', email: 'ana@x.com', phone: '   ', message: '   ' });

    component.sendLead();

    expect(api.createLead).toHaveBeenCalledWith('luan', { name: 'Ana', email: 'ana@x.com', phone: undefined, message: undefined });
    expect(component.sent()).toBe(true);
    expect(component.sending()).toBe(false);
  });

  it('envia com phone/message preenchidos', () => {
    const { component, api } = build({}, 'luan');
    component.ngOnInit();
    component.leadForm.patchValue({ name: 'Ana', email: 'ana@x.com', phone: '11999999999', message: 'Quero treinar' });

    component.sendLead();

    expect(api.createLead).toHaveBeenCalledWith('luan', { name: 'Ana', email: 'ana@x.com', phone: '11999999999', message: 'Quero treinar' });
  });

  it('erro ao enviar: mostra mensagem, não marca como enviado', () => {
    const { component } = build({ createLead: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.leadForm.patchValue({ name: 'Ana', email: 'ana@x.com' });

    component.sendLead();

    expect(component.errorMsg()).toContain('Não foi possível enviar');
    expect(component.sent()).toBe(false);
    expect(component.sending()).toBe(false);
  });
});

describe('CoachLandingComponent — textos da página', () => {
  it('usa os textos do coach e completa com o padrão', () => {
    const { component } = build({
      getPublicCoachProfile: vi.fn().mockReturnValue(of(profile({ coachName: 'Luan', pageCopy: { plansTitle: 'Planos do Luan' } }))),
    });
    component.ngOnInit();
    expect(component.copy().plansTitle).toBe('Planos do Luan');
    expect(component.copy().finalCtaLabel).toBe('Quero treinar com Luan');
    expect(component.copy().pillars).toHaveLength(4);
  });
});

