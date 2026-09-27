import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CoachesComponent } from './coaches.component';
import { PlatformSettings } from '../../../core/models';

/** Cobre contrato (%) e o bloqueio por assinatura, adicionados na R3. */

const coach = { id: 'coach-1', name: 'Luan', email: 'luan@example.com', aiImportEnabled: true, createdAt: '2026-01-01T00:00:00.000Z' };

const settings = (over: Partial<PlatformSettings> = {}): PlatformSettings => ({
  enforceSubscriptionAccess: false, totalStudents: 5, studentsWithoutAccess: 0, ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getCoaches: vi.fn().mockReturnValue(of([coach])),
    getPlatformSettings: vi.fn().mockReturnValue(of(settings())),
    getCoachContract: vi.fn().mockReturnValue(of({ coachId: 'coach-1', platformFeePercent: 20 })),
    setCoachContract: vi.fn().mockReturnValue(of({ coachId: 'coach-1', platformFeePercent: 25 })),
    setPlatformSettings: vi.fn().mockReturnValue(of(settings({ enforceSubscriptionAccess: true }))),
    ...apiOver,
  };
  const component = new CoachesComponent(api as any, new FormBuilder());
  return { component, api };
}

describe('CoachesComponent — bloqueio por assinatura', () => {
  it('carrega as configurações ao iniciar', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getPlatformSettings).toHaveBeenCalled();
    expect(component.platformSettings()?.totalStudents).toBe(5);
    expect(component.loadingSettings()).toBe(false);
  });

  it('erro ao carregar mostra mensagem', () => {
    const { component } = build({ getPlatformSettings: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.settingsError()).toContain('Não foi possível carregar');
  });

  it('desligar não pede confirmação', () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ enforceSubscriptionAccess: true, studentsWithoutAccess: 3 }));
    const confirmSpy = vi.spyOn(window, 'confirm');

    component.toggleEnforcement();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.setPlatformSettings).toHaveBeenCalledWith(false, false);
  });

  it('ligar sem ninguém a perder não pede confirmação', () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ studentsWithoutAccess: 0 }));
    const confirmSpy = vi.spyOn(window, 'confirm');

    component.toggleEnforcement();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.setPlatformSettings).toHaveBeenCalledWith(true, true);
  });

  it('ligar com alunos sem acesso pede confirmação; cancelando não chama a API', () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ studentsWithoutAccess: 2 }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.toggleEnforcement();

    expect(api.setPlatformSettings).not.toHaveBeenCalled();
  });

  it('ligar confirmando manda confirmLockout=true', () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ studentsWithoutAccess: 2 }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.toggleEnforcement();

    expect(api.setPlatformSettings).toHaveBeenCalledWith(true, true);
  });

  it('erro ao atualizar mostra a mensagem do backend', () => {
    const { component } = build({
      setPlatformSettings: vi.fn().mockReturnValue(throwError(() => ({ error: { message: '2 aluno(s) ficariam sem acesso' } }))),
    });
    component.platformSettings.set(settings({ studentsWithoutAccess: 0 }));

    component.toggleEnforcement();

    expect(component.settingsError()).toBe('2 aluno(s) ficariam sem acesso');
    expect(component.updatingSettings()).toBe(false);
  });
});

describe('CoachesComponent — contrato (% da plataforma)', () => {
  it('abrir carrega o contrato do coach', () => {
    const { component, api } = build();
    component.openContract(coach);
    expect(api.getCoachContract).toHaveBeenCalledWith('coach-1');
    expect(component.contractTargetId()).toBe('coach-1');
    expect(component.contractFeePercent()).toBe(20);
  });

  it('clicar de novo no mesmo coach fecha (toggle)', () => {
    const { component } = build();
    component.openContract(coach);
    component.openContract(coach);
    expect(component.contractTargetId()).toBeNull();
  });

  it('salvar chama setCoachContract e fecha o painel', () => {
    const { component, api } = build();
    component.openContract(coach);
    component.contractFeePercent.set(25);

    component.saveContract(coach);

    expect(api.setCoachContract).toHaveBeenCalledWith('coach-1', 25);
    expect(component.contractTargetId()).toBeNull();
    expect(component.savingContractId()).toBeNull();
  });

  it('erro ao salvar mantém o painel aberto e mostra a mensagem', () => {
    const { component } = build({
      setCoachContract: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Coach não encontrado' } }))),
    });
    component.openContract(coach);

    component.saveContract(coach);

    expect(component.contractError()).toBe('Coach não encontrado');
    expect(component.contractTargetId()).toBe('coach-1');
    expect(component.savingContractId()).toBeNull();
  });
});
