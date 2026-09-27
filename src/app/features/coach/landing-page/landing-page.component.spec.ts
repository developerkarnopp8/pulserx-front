import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { LandingPageComponent } from './landing-page.component';
import { CoachProfile } from '../../../core/models';

const profile = (over: Partial<CoachProfile> = {}): CoachProfile => ({
  id: 'p1', coachId: 'coach-1', slug: 'luan', bio: 'Treinador', bannerUrl: null, published: false, ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getMyCoachProfile: vi.fn().mockReturnValue(of(null)),
    upsertCoachProfile: vi.fn().mockReturnValue(of(profile())),
    publishCoachProfile: vi.fn().mockReturnValue(of(profile({ published: true }))),
    uploadCoachBanner: vi.fn().mockReturnValue(of(profile({ bannerUrl: 'https://x/banner.jpg' }))),
    ...apiOver,
  };
  const component = new LandingPageComponent(api as any, new FormBuilder());
  return { component, api };
}

describe('LandingPageComponent.ngOnInit', () => {
  it('sem perfil ainda: form fica vazio, loading libera', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.profile()).toBeNull();
    expect(component.loading()).toBe(false);
  });

  it('com perfil existente: preenche o form com slug/bio', () => {
    const { component } = build({ getMyCoachProfile: vi.fn().mockReturnValue(of(profile({ slug: 'luan-treinador', bio: 'Bio X' }))) });
    component.ngOnInit();
    expect(component.form.value).toEqual({ slug: 'luan-treinador', bio: 'Bio X' });
  });

  it('perfil com bio null: form usa string vazia (não quebra)', () => {
    const { component } = build({ getMyCoachProfile: vi.fn().mockReturnValue(of(profile({ bio: null }))) });
    component.ngOnInit();
    expect(component.form.value.bio).toBe('');
  });

  it('erro ao carregar: libera o loading', () => {
    const { component } = build({ getMyCoachProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.loading()).toBe(false);
  });
});

describe('LandingPageComponent.save', () => {
  it('form inválido: não chama a API, marca campos tocados', () => {
    const { component, api } = build();
    component.form.patchValue({ slug: '' });
    component.save();
    expect(api.upsertCoachProfile).not.toHaveBeenCalled();
    expect(component.form.touched).toBe(true);
  });

  it('salva com bio trimada (slug já vem sem espaço, o padrão não aceita espaço)', () => {
    const { component, api } = build();
    component.form.patchValue({ slug: 'luan', bio: '  Treinador de CrossFit  ' });
    component.save();
    expect(api.upsertCoachProfile).toHaveBeenCalledWith('luan', 'Treinador de CrossFit');
    expect(component.successMsg()).toBe('Salvo!');
    expect(component.saving()).toBe(false);
  });

  it('bio vazia após trim: manda undefined', () => {
    const { component, api } = build();
    component.form.patchValue({ slug: 'luan', bio: '   ' });
    component.save();
    expect(api.upsertCoachProfile).toHaveBeenCalledWith('luan', undefined);
  });

  it('erro 409 (slug em uso): mensagem específica', () => {
    const { component } = build({ upsertCoachProfile: vi.fn().mockReturnValue(throwError(() => ({ status: 409 }))) });
    component.form.patchValue({ slug: 'luan' });
    component.save();
    expect(component.errorMsg()).toContain('já está em uso');
  });

  it('outro erro: mensagem genérica', () => {
    const { component } = build({ upsertCoachProfile: vi.fn().mockReturnValue(throwError(() => ({ status: 500 }))) });
    component.form.patchValue({ slug: 'luan' });
    component.save();
    expect(component.errorMsg()).toContain('Não foi possível salvar');
    expect(component.saving()).toBe(false);
  });
});

describe('LandingPageComponent — banner', () => {
  it('onBannerFileSelected: arquivo dentro do limite fica selecionado', () => {
    const { component } = build();
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onBannerFileSelected(event);
    expect(component.selectedBannerFile()).toBe(file);
  });

  it('onBannerFileSelected: arquivo maior que 5MB é rejeitado com mensagem, sem selecionar', () => {
    const { component } = build();
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'grande.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [bigFile] } } as unknown as Event;
    component.onBannerFileSelected(event);
    expect(component.selectedBannerFile()).toBeNull();
    expect(component.errorMsg()).toContain('5MB');
  });

  it('onBannerFileSelected: sem arquivo selecionado (cancelou o picker) não quebra', () => {
    const { component } = build();
    const event = { target: { files: [] } } as unknown as Event;
    component.onBannerFileSelected(event);
    expect(component.selectedBannerFile()).toBeNull();
  });

  it('uploadBanner: sem arquivo selecionado, não chama a API', () => {
    const { component, api } = build();
    component.uploadBanner();
    expect(api.uploadCoachBanner).not.toHaveBeenCalled();
  });

  it('uploadBanner: com arquivo, sobe e atualiza o perfil', () => {
    const { component, api } = build();
    const file = new File(['x'], 'banner.jpg', { type: 'image/jpeg' });
    component.selectedBannerFile.set(file);

    component.uploadBanner();

    expect(api.uploadCoachBanner).toHaveBeenCalledWith(file);
    expect(component.profile()?.bannerUrl).toBe('https://x/banner.jpg');
    expect(component.selectedBannerFile()).toBeNull();
    expect(component.successMsg()).toBe('Banner atualizado!');
  });

  it('uploadBanner: erro mostra mensagem explicando o formato aceito', () => {
    const { component } = build({ uploadCoachBanner: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.selectedBannerFile.set(new File(['x'], 'banner.jpg', { type: 'image/jpeg' }));

    component.uploadBanner();

    expect(component.errorMsg()).toContain('JPG/PNG/WebP');
    expect(component.uploadingBanner()).toBe(false);
  });
});

describe('LandingPageComponent.togglePublish', () => {
  it('sem perfil carregado: não chama a API', () => {
    const { component, api } = build();
    component.togglePublish();
    expect(api.publishCoachProfile).not.toHaveBeenCalled();
  });

  it('com perfil: inverte o published atual', () => {
    const { component, api } = build();
    component.profile.set(profile({ published: false }));

    component.togglePublish();

    expect(api.publishCoachProfile).toHaveBeenCalledWith(true);
    expect(component.profile()?.published).toBe(true);
    expect(component.publishing()).toBe(false);
  });

  it('erro ao publicar: mensagem de erro, libera o botão', () => {
    const { component } = build({ publishCoachProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.profile.set(profile());

    component.togglePublish();

    expect(component.errorMsg()).toContain('visibilidade');
    expect(component.publishing()).toBe(false);
  });
});
