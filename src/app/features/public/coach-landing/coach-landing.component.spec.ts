import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CoachLandingComponent } from './coach-landing.component';
import { PublicCoachProfile } from '../../../core/models';

const profile = (over: Partial<PublicCoachProfile> = {}): PublicCoachProfile => ({
  coachName: 'Luan', bio: 'Treinador', bannerUrl: null, plans: [], ...over,
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
