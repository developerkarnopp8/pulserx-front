import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { LandingPageComponent } from './landing-page.component';
import { CoachProfile, Testimonial, FaqItem } from '../../../core/models';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

afterEach(() => vi.restoreAllMocks());

const profile = (over: Partial<CoachProfile> = {}): CoachProfile => ({
  id: 'p1', coachId: 'coach-1', slug: 'luan', bio: 'Treinador', bannerUrl: null, photoUrl: null,
  headline: null, subheadline: null, quote: null, achievementBadge: null, yearsExperience: null,
  athletesCount: null, npsScore: null, completionRate: null, whatsappNumber: null, videoUrl: null,
  guaranteeDays: null, guaranteeText: null, supportEmail: null, supportHours: null, pageCopy: null,
  published: false, ...over,
});

const testimonial = (over: Partial<Testimonial> = {}): Testimonial => ({
  id: 't1', authorName: 'Ana', authorRole: 'Atleta', rating: 5, content: 'Ótimo!', ...over,
});

const faqItem = (over: Partial<FaqItem> = {}): FaqItem => ({
  id: 'f1', question: 'Serve pra iniciante?', answer: 'Sim.', ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getMyCoachProfile: vi.fn().mockReturnValue(of(null)),
    upsertCoachProfile: vi.fn().mockReturnValue(of(profile())),
    publishCoachProfile: vi.fn().mockReturnValue(of(profile({ published: true }))),
    uploadCoachBanner: vi.fn().mockReturnValue(of(profile({ bannerUrl: 'https://x/banner.jpg' }))),
    uploadCoachPhoto: vi.fn().mockReturnValue(of(profile({ photoUrl: 'https://x/photo.jpg' }))),
    getCoachTestimonials: vi.fn().mockReturnValue(of([testimonial()])),
    createTestimonial: vi.fn().mockReturnValue(of(testimonial())),
    updateTestimonial: vi.fn().mockReturnValue(of(testimonial())),
    deleteTestimonial: vi.fn().mockReturnValue(of({ removed: true })),
    getCoachFaqItems: vi.fn().mockReturnValue(of([faqItem()])),
    createFaqItem: vi.fn().mockReturnValue(of(faqItem())),
    updateFaqItem: vi.fn().mockReturnValue(of(faqItem())),
    deleteFaqItem: vi.fn().mockReturnValue(of({ removed: true })),
    getSubscriptionPlans: vi.fn().mockReturnValue(of([])),
    getMyWallet: vi.fn().mockReturnValue(of({ walletId: null, valid: false })),
    ...apiOver,
  };
  const component = new LandingPageComponent(api as any, new FormBuilder());
  return { component, api };
}

describe('LandingPageComponent.ngOnInit', () => {
  it('sem perfil ainda: form fica vazio, loading libera, não carrega depoimentos/faq', async () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(component.profile()).toBeNull();
    expect(component.loading()).toBe(false);
    expect(api.getCoachTestimonials).not.toHaveBeenCalled();
    expect(api.getCoachFaqItems).not.toHaveBeenCalled();
  });

  it('com perfil existente: preenche o form com todos os campos e carrega depoimentos/faq', async () => {
    const { component, api } = build({
      getMyCoachProfile: vi.fn().mockReturnValue(of(profile({
        slug: 'luan-treinador', bio: 'Bio X', headline: 'H', subheadline: 'S', quote: 'Q',
        achievementBadge: 'Semifinals', yearsExperience: 12, athletesCount: 1400, npsScore: 92,
        completionRate: 88.4, whatsappNumber: '11999999999', videoUrl: 'https://youtu.be/abc',
      }))),
    });

    component.ngOnInit();

    expect(component.form.value).toMatchObject({
      slug: 'luan-treinador', bio: 'Bio X', headline: 'H', subheadline: 'S', quote: 'Q',
      achievementBadge: 'Semifinals', yearsExperience: 12, athletesCount: 1400, npsScore: 92,
      completionRate: 88.4, whatsappNumber: '11999999999', videoUrl: 'https://youtu.be/abc',
      guaranteeDays: null, guaranteeText: '', supportEmail: '', supportHours: '',
      howItWorksTitle: '', plansTitle: '', finalTitle: '', finalCtaLabel: '',
    });
    expect(component.form.value.pillars).toHaveLength(4);
    expect(api.getCoachTestimonials).toHaveBeenCalled();
    expect(api.getCoachFaqItems).toHaveBeenCalled();
    expect(component.testimonials()).toEqual([testimonial()]);
    expect(component.faqItems()).toEqual([faqItem()]);
  });

  it('perfil com campos opcionais null (incluindo bio): form usa string vazia/null (não quebra)', async () => {
    const { component } = build({ getMyCoachProfile: vi.fn().mockReturnValue(of(profile({ bio: null }))) });
    component.ngOnInit();
    expect(component.form.value.bio).toBe('');
    expect(component.form.value.headline).toBe('');
    expect(component.form.value.yearsExperience).toBeNull();
  });

  it('erro ao carregar: libera o loading', async () => {
    const { component } = build({ getMyCoachProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });
});

describe('LandingPageComponent.save', () => {
  it('form inválido: não chama a API, marca campos tocados', async () => {
    const { component, api } = build();
    component.form.patchValue({ slug: '' });
    component.save();
    expect(api.upsertCoachProfile).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });

  it('salva com strings trimadas e undefined pros campos vazios', async () => {
    const { component, api } = build();
    component.form.patchValue({ slug: 'luan', bio: '  Treinador  ', headline: '   ', yearsExperience: 12 });

    component.save();

    expect(api.upsertCoachProfile).toHaveBeenCalledWith({
      slug: 'luan', bio: 'Treinador', headline: undefined, subheadline: undefined, quote: undefined,
      achievementBadge: undefined, yearsExperience: 12, athletesCount: undefined, npsScore: undefined,
      completionRate: undefined, whatsappNumber: undefined, videoUrl: undefined,
      guaranteeDays: null, guaranteeText: null, supportEmail: null, supportHours: null, pageCopy: {},
    });
    expect(component.successMsg()).toBe('Salvo!');
    expect(component.saving()).toBe(false);
  });

  it('perfil novo (ainda não existia): recarrega depoimentos/faq depois de salvar', async () => {
    const { component, api } = build();
    component.form.patchValue({ slug: 'luan' });

    component.save();

    expect(api.getCoachTestimonials).toHaveBeenCalled();
    expect(api.getCoachFaqItems).toHaveBeenCalled();
  });

  it('perfil já existia: não recarrega depoimentos/faq de novo', async () => {
    const { component, api } = build();
    component.profile.set(profile());
    component.form.patchValue({ slug: 'luan' });

    component.save();

    expect(api.getCoachTestimonials).not.toHaveBeenCalled();
    expect(api.getCoachFaqItems).not.toHaveBeenCalled();
  });

  it('erro 409 (slug em uso): mensagem específica', async () => {
    const { component } = build({ upsertCoachProfile: vi.fn().mockReturnValue(throwError(() => ({ status: 409 }))) });
    component.form.patchValue({ slug: 'luan' });
    component.save();
    expect(component.errorMsg()).toContain('já está em uso');
  });

  it('outro erro: mensagem genérica', async () => {
    const { component } = build({ upsertCoachProfile: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))) });
    component.form.patchValue({ slug: 'luan' });
    component.save();
    expect(component.errorMsg()).toContain('Não foi possível salvar');
    expect(component.saving()).toBe(false);
  });
});

describe('LandingPageComponent — banner e foto', () => {
  it('onBannerFileSelected: arquivo dentro do limite fica selecionado', async () => {
    const { component } = build();
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' });
    component.onBannerFileSelected({ target: { files: [file] } } as unknown as Event);
    expect(component.selectedBannerFile()).toBe(file);
  });

  it('onBannerFileSelected: arquivo maior que 5MB é rejeitado com mensagem', async () => {
    const { component } = build();
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.jpg', { type: 'image/jpeg' });
    component.onBannerFileSelected({ target: { files: [bigFile] } } as unknown as Event);
    expect(component.selectedBannerFile()).toBeNull();
    expect(component.errorMsg()).toContain('5MB');
  });

  it('onBannerFileSelected: sem arquivo selecionado não quebra', async () => {
    const { component } = build();
    component.onBannerFileSelected({ target: { files: [] } } as unknown as Event);
    expect(component.selectedBannerFile()).toBeNull();
  });

  it('onPhotoFileSelected: arquivo dentro do limite fica selecionado', async () => {
    const { component } = build();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    component.onPhotoFileSelected({ target: { files: [file] } } as unknown as Event);
    expect(component.selectedPhotoFile()).toBe(file);
  });

  it('onPhotoFileSelected: arquivo maior que 5MB é rejeitado', async () => {
    const { component } = build();
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.jpg', { type: 'image/jpeg' });
    component.onPhotoFileSelected({ target: { files: [bigFile] } } as unknown as Event);
    expect(component.selectedPhotoFile()).toBeNull();
  });

  it('uploadBanner: sem arquivo, não chama a API', async () => {
    const { component, api } = build();
    component.uploadBanner();
    expect(api.uploadCoachBanner).not.toHaveBeenCalled();
  });

  it('uploadBanner: com arquivo, sobe e atualiza o perfil', async () => {
    const { component, api } = build();
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' });
    component.selectedBannerFile.set(file);
    component.uploadBanner();
    expect(api.uploadCoachBanner).toHaveBeenCalledWith(file);
    expect(component.profile()?.bannerUrl).toBe('https://x/banner.jpg');
    expect(component.selectedBannerFile()).toBeNull();
  });

  it('uploadBanner: erro mostra mensagem', async () => {
    const { component } = build({ uploadCoachBanner: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.selectedBannerFile.set(new File(['x'], 'banner.jpg', { type: 'image/jpeg' }));
    component.uploadBanner();
    expect(component.errorMsg()).toContain('JPG/PNG/WebP');
    expect(component.uploadingBanner()).toBe(false);
  });

  it('uploadPhoto: sem arquivo, não chama a API', async () => {
    const { component, api } = build();
    component.uploadPhoto();
    expect(api.uploadCoachPhoto).not.toHaveBeenCalled();
  });

  it('uploadPhoto: com arquivo, sobe e atualiza o perfil', async () => {
    const { component, api } = build();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    component.selectedPhotoFile.set(file);
    component.uploadPhoto();
    expect(api.uploadCoachPhoto).toHaveBeenCalledWith(file);
    expect(component.profile()?.photoUrl).toBe('https://x/photo.jpg');
    expect(component.selectedPhotoFile()).toBeNull();
  });

  it('uploadPhoto: erro mostra mensagem', async () => {
    const { component } = build({ uploadCoachPhoto: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.selectedPhotoFile.set(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }));
    component.uploadPhoto();
    expect(component.errorMsg()).toContain('JPG/PNG/WebP');
    expect(component.uploadingPhoto()).toBe(false);
  });
});

describe('LandingPageComponent.togglePublish', () => {
  it('sem perfil carregado: não chama a API', async () => {
    const { component, api } = build();
    component.togglePublish();
    expect(api.publishCoachProfile).not.toHaveBeenCalled();
  });

  it('com perfil: inverte o published atual', async () => {
    const { component, api } = build();
    component.profile.set(profile({ published: false }));
    component.togglePublish();
    expect(api.publishCoachProfile).toHaveBeenCalledWith(true);
    expect(component.profile()?.published).toBe(true);
  });

  it('erro ao publicar: mensagem de erro', async () => {
    const { component } = build({ publishCoachProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.profile.set(profile());
    component.togglePublish();
    expect(component.errorMsg()).toContain('visibilidade');
    expect(component.publishing()).toBe(false);
  });
});

describe('LandingPageComponent — depoimentos', () => {
  it('openNewTestimonialForm: reseta o form com rating 5 e abre', async () => {
    const { component } = build();
    component.testimonialForm.patchValue({ authorName: 'Lixo' });
    component.openNewTestimonialForm();
    expect(component.editingTestimonialId()).toBeNull();
    expect(component.testimonialForm.value.authorName).toBeFalsy();
    expect(component.testimonialForm.value.rating).toBe(5);
    expect(component.showTestimonialForm()).toBe(true);
  });

  it('editTestimonial: preenche o form com os dados do depoimento', async () => {
    const { component } = build();
    component.editTestimonial(testimonial({ authorRole: null }));
    expect(component.editingTestimonialId()).toBe('t1');
    expect(component.testimonialForm.value.authorRole).toBe('');
    expect(component.showTestimonialForm()).toBe(true);
  });

  it('cancelTestimonialForm: fecha e limpa o id de edição', async () => {
    const { component } = build();
    component.editTestimonial(testimonial());
    component.cancelTestimonialForm();
    expect(component.showTestimonialForm()).toBe(false);
    expect(component.editingTestimonialId()).toBeNull();
  });

  it('saveTestimonial: form inválido não chama a API', async () => {
    const { component, api } = build();
    component.testimonialForm.patchValue({ authorName: '' });
    component.saveTestimonial();
    expect(api.createTestimonial).not.toHaveBeenCalled();
    expect(component.testimonialForm.touched).toBe(true);
  });

  it('saveTestimonial: sem id de edição, cria e recarrega a lista', async () => {
    const { component, api } = build();
    component.openNewTestimonialForm();
    component.testimonialForm.patchValue({ authorName: '  Ana  ', authorRole: '  ', content: 'Muito bom' });

    component.saveTestimonial();

    expect(api.createTestimonial).toHaveBeenCalledWith({ authorName: 'Ana', authorRole: undefined, rating: 5, content: 'Muito bom' });
    expect(api.getCoachTestimonials).toHaveBeenCalled();
    expect(component.showTestimonialForm()).toBe(false);
  });

  it('saveTestimonial: com id de edição, atualiza', async () => {
    const { component, api } = build();
    component.editTestimonial(testimonial());
    component.testimonialForm.patchValue({ authorName: 'Ana 2', content: 'Editado' });

    component.saveTestimonial();

    expect(api.updateTestimonial).toHaveBeenCalledWith('t1', expect.objectContaining({ authorName: 'Ana 2', content: 'Editado' }));
  });

  it('saveTestimonial: erro mostra mensagem', async () => {
    const { component } = build({ createTestimonial: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.openNewTestimonialForm();
    component.testimonialForm.patchValue({ authorName: 'Ana', content: 'Muito bom' });
    component.saveTestimonial();
    expect(component.errorMsg()).toContain('depoimento');
    expect(component.savingTestimonial()).toBe(false);
  });

  it('removeTestimonial: sem confirmar não chama a API', async () => {
    const { component, api } = build();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    await component.removeTestimonial('t1');
    expect(api.deleteTestimonial).not.toHaveBeenCalled();
  });

  it('removeTestimonial: confirmando, apaga e recarrega', async () => {
    const { component, api } = build();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.removeTestimonial('t1');
    expect(api.deleteTestimonial).toHaveBeenCalledWith('t1');
    expect(api.getCoachTestimonials).toHaveBeenCalled();
  });
});

describe('LandingPageComponent — FAQ', () => {
  it('openNewFaqForm: reseta o form e abre', async () => {
    const { component } = build();
    component.faqForm.patchValue({ question: 'Lixo' });
    component.openNewFaqForm();
    expect(component.editingFaqId()).toBeNull();
    expect(component.faqForm.value.question).toBeFalsy();
    expect(component.showFaqForm()).toBe(true);
  });

  it('editFaqItem: preenche o form', async () => {
    const { component } = build();
    component.editFaqItem(faqItem());
    expect(component.editingFaqId()).toBe('f1');
    expect(component.faqForm.value.question).toBe('Serve pra iniciante?');
    expect(component.showFaqForm()).toBe(true);
  });

  it('cancelFaqForm: fecha e limpa o id de edição', async () => {
    const { component } = build();
    component.editFaqItem(faqItem());
    component.cancelFaqForm();
    expect(component.showFaqForm()).toBe(false);
    expect(component.editingFaqId()).toBeNull();
  });

  it('saveFaqItem: form inválido não chama a API', async () => {
    const { component, api } = build();
    component.faqForm.patchValue({ question: '' });
    component.saveFaqItem();
    expect(api.createFaqItem).not.toHaveBeenCalled();
    expect(component.faqForm.touched).toBe(true);
  });

  it('saveFaqItem: sem id de edição, cria e recarrega', async () => {
    const { component, api } = build();
    component.openNewFaqForm();
    component.faqForm.patchValue({ question: '  Q?  ', answer: '  A.  ' });

    component.saveFaqItem();

    expect(api.createFaqItem).toHaveBeenCalledWith({ question: 'Q?', answer: 'A.' });
    expect(api.getCoachFaqItems).toHaveBeenCalled();
    expect(component.showFaqForm()).toBe(false);
  });

  it('saveFaqItem: com id de edição, atualiza', async () => {
    const { component, api } = build();
    component.editFaqItem(faqItem());
    component.faqForm.patchValue({ question: 'Q2', answer: 'A2' });

    component.saveFaqItem();

    expect(api.updateFaqItem).toHaveBeenCalledWith('f1', { question: 'Q2', answer: 'A2' });
  });

  it('saveFaqItem: erro mostra mensagem', async () => {
    const { component } = build({ createFaqItem: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.openNewFaqForm();
    component.faqForm.patchValue({ question: 'Q?', answer: 'A.' });
    component.saveFaqItem();
    expect(component.errorMsg()).toContain('pergunta');
    expect(component.savingFaq()).toBe(false);
  });

  it('removeFaqItem: sem confirmar não chama a API', async () => {
    const { component, api } = build();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    await component.removeFaqItem('f1');
    expect(api.deleteFaqItem).not.toHaveBeenCalled();
  });

  it('removeFaqItem: confirmando, apaga e recarrega', async () => {
    const { component, api } = build();
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.removeFaqItem('f1');
    expect(api.deleteFaqItem).toHaveBeenCalledWith('f1');
    expect(api.getCoachFaqItems).toHaveBeenCalled();
  });
});

describe('LandingPageComponent — garantia, suporte e textos da página', () => {
  it('carrega garantia, suporte e textos salvos (inclusive os cards na posição certa)', async () => {
    const { component } = build({
      getMyCoachProfile: vi.fn().mockReturnValue(of(profile({
        guaranteeDays: 30, guaranteeText: 'Devolvo 100%', supportEmail: 'suporte@example.com', supportHours: 'Seg a sex',
        pageCopy: { howItWorksTitle: 'Meu método', finalCtaLabel: 'Bora', pillars: [{ title: '', text: '' }, { title: 'B', text: 'Texto B' }] },
      }))),
    });
    component.ngOnInit();
    expect(component.form.value).toMatchObject({
      guaranteeDays: 30, guaranteeText: 'Devolvo 100%', supportEmail: 'suporte@example.com', supportHours: 'Seg a sex',
      howItWorksTitle: 'Meu método', finalCtaLabel: 'Bora', plansTitle: '',
    });
    expect(component.form.value.pillars[1]).toEqual({ title: 'B', text: 'Texto B' });
    expect(component.form.value.pillars[3]).toEqual({ title: '', text: '' });
    expect(component.pillarControls).toHaveLength(4);
    expect(component.defaultPillars[0].title).toBeTruthy();
  });

  it('salva garantia/suporte (vazio vira null pra limpar) e os textos preenchidos', async () => {
    const { component, api } = build();
    component.form.patchValue({
      slug: 'luan', guaranteeDays: 15, guaranteeText: '  Sem letra miúda ', supportEmail: 'suporte@example.com',
      plansTitle: ' Planos ', pillars: [{ title: 'A', text: 'Texto A' }, { title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }],
    });
    component.save();
    expect(api.upsertCoachProfile).toHaveBeenCalledWith(expect.objectContaining({
      guaranteeDays: 15, guaranteeText: 'Sem letra miúda', supportEmail: 'suporte@example.com', supportHours: null,
      pageCopy: { plansTitle: 'Planos', pillars: [{ title: 'A', text: 'Texto A' }, { title: '', text: '' }, { title: '', text: '' }, { title: '', text: '' }] },
    }));
  });

  it('garantia fora de 1–365 ou e-mail inválido: não salva', async () => {
    const { component, api } = build();
    component.form.patchValue({ slug: 'luan', guaranteeDays: 400 });
    component.save();
    component.form.patchValue({ guaranteeDays: null, supportEmail: 'nao-e-email' });
    component.save();
    expect(api.upsertCoachProfile).not.toHaveBeenCalled();
  });
});


describe('LandingPageComponent — copiar link (Stitch mo12)', () => {
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('copia o link público e mostra "copiado" por 2 s', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { component } = build();
    component.copyPublicLink('luan-teste');
    expect(writeText).toHaveBeenCalledWith(`${component.publicUrlOrigin}/c/luan-teste`);
    await Promise.resolve();
    expect(component.linkCopied()).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(component.linkCopied()).toBe(false);
  });

  it('sem área de transferência (ou recusada): não quebra e não marca copiado', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('negado')) } });
    const { component } = build();
    component.copyPublicLink('x');
    await Promise.resolve(); await Promise.resolve();
    expect(component.linkCopied()).toBe(false);
    vi.stubGlobal('navigator', {});
    expect(() => component.copyPublicLink('x')).not.toThrow();
  });
});

describe('LandingPageComponent — aviso de recebimento (carteira Asaas)', () => {
  const pago = { id: 'p1', name: 'Core', active: true, isFree: false, priceCents: 14900 };
  const W = 'c0c1688f-636b-42c0-b6ee-7339182276b7';

  it('plano pago ativo e sem carteira: avisa antes de divulgar', () => {
    const { component } = build({ getSubscriptionPlans: vi.fn().mockReturnValue(of([pago])) });
    component.ngOnInit();
    expect(component.walletStatus()).toBe('missing');
    expect(component.walletWarning()).toBe(true);
  });

  it('carteira salva fora do formato: também avisa (como inválida)', () => {
    const { component } = build({
      getSubscriptionPlans: vi.fn().mockReturnValue(of([pago])),
      getMyWallet: vi.fn().mockReturnValue(of({ walletId: '00000000-0000-0000-0000-000000000000', valid: false })),
    });
    component.ngOnInit();
    expect(component.walletStatus()).toBe('invalid');
    expect(component.walletWarning()).toBe(true);
  });

  it('carteira válida, ou só planos grátis/inativos: sem aviso', () => {
    const ok = build({
      getSubscriptionPlans: vi.fn().mockReturnValue(of([pago])),
      getMyWallet: vi.fn().mockReturnValue(of({ walletId: W, valid: true })),
    });
    ok.component.ngOnInit();
    expect(ok.component.walletWarning()).toBe(false);

    const semPago = build({
      getSubscriptionPlans: vi.fn().mockReturnValue(of([
        { ...pago, isFree: true, priceCents: 0 }, { ...pago, active: false },
      ])),
    });
    semPago.component.ngOnInit();
    expect(semPago.component.hasPaidPlans()).toBe(false);
    expect(semPago.component.walletWarning()).toBe(false);
  });

  it('falha ao carregar planos ou carteira: sem aviso e a tela abre igual', () => {
    const { component } = build({
      getSubscriptionPlans: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
      getMyWallet: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
    });
    component.ngOnInit();
    expect(component.walletStatus()).toBeNull();
    expect(component.walletWarning()).toBe(false);
  });
});
