import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { CoachesComponent } from './coaches.component';
import { PlatformSettings } from '../../../core/models';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

afterEach(() => vi.restoreAllMocks());

/** Cobre contrato (%) e o bloqueio por assinatura, adicionados na R3. */

const coach = {
  id: 'coach-1', name: 'Luan', email: 'luan@example.com', aiImportEnabled: true, createdAt: '2026-01-01T00:00:00.000Z',
  platformFeePercent: 10, studentCount: 100, totalPaid: 10000, gatewayFee: 0, platformCut: 1000, coachCut: 9000, pendingBreakdown: 0,
  subscriptions: { active: 0, trialing: 0, pastDue: 0, canceled: 0, withoutPlan: 0, mrrCents: 0 },
  alerts: [] as any[],
  usage: { plans: 0, aiImportedPlans: 0, completedWorkouts30d: 0, lastLoginAt: null, lastPlanUpdateAt: null },
};

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
  it('carrega as configurações ao iniciar', async () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getPlatformSettings).toHaveBeenCalled();
    expect(component.platformSettings()?.totalStudents).toBe(5);
    expect(component.loadingSettings()).toBe(false);
  });

  it('erro ao carregar mostra mensagem', async () => {
    const { component } = build({ getPlatformSettings: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    expect(component.settingsError()).toContain('Não foi possível carregar');
  });

  it('desligar não pede confirmação', async () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ enforceSubscriptionAccess: true, studentsWithoutAccess: 3 }));
    const confirmSpy = vi.spyOn(confirmDialog, 'ask');

    await component.toggleEnforcement();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.setPlatformSettings).toHaveBeenCalledWith(false, false);
  });

  it('ligar sem ninguém a perder não pede confirmação', async () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ studentsWithoutAccess: 0 }));
    const confirmSpy = vi.spyOn(confirmDialog, 'ask');

    await component.toggleEnforcement();

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(api.setPlatformSettings).toHaveBeenCalledWith(true, true);
  });

  it('ligar com alunos sem acesso pede confirmação; cancelando não chama a API', async () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ studentsWithoutAccess: 2 }));
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);

    await component.toggleEnforcement();

    expect(api.setPlatformSettings).not.toHaveBeenCalled();
  });

  it('ligar confirmando manda confirmLockout=true', async () => {
    const { component, api } = build();
    component.platformSettings.set(settings({ studentsWithoutAccess: 2 }));
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);

    await component.toggleEnforcement();

    expect(api.setPlatformSettings).toHaveBeenCalledWith(true, true);
  });

  it('erro ao atualizar mostra a mensagem do backend', async () => {
    const { component } = build({
      setPlatformSettings: vi.fn().mockReturnValue(throwError(() => ({ error: { message: '2 aluno(s) ficariam sem acesso' } }))),
    });
    component.platformSettings.set(settings({ studentsWithoutAccess: 0 }));

    await component.toggleEnforcement();

    expect(component.settingsError()).toBe('2 aluno(s) ficariam sem acesso');
    expect(component.updatingSettings()).toBe(false);
  });
});

describe('CoachesComponent — contrato (% da plataforma)', () => {
  it('abrir carrega o contrato do coach', async () => {
    const { component, api } = build();
    component.openContract(coach);
    expect(api.getCoachContract).toHaveBeenCalledWith('coach-1');
    expect(component.contractTargetId()).toBe('coach-1');
    expect(component.contractFeePercent()).toBe(20);
  });

  it('clicar de novo no mesmo coach fecha (toggle)', async () => {
    const { component } = build();
    component.openContract(coach);
    component.openContract(coach);
    expect(component.contractTargetId()).toBeNull();
  });

  it('salvar chama setCoachContract e fecha o painel', async () => {
    const { component, api } = build();
    component.openContract(coach);
    component.contractFeePercent.set(25);

    component.saveContract(coach);

    expect(api.setCoachContract).toHaveBeenCalledWith('coach-1', 25);
    expect(component.contractTargetId()).toBeNull();
    expect(component.savingContractId()).toBeNull();
  });

  it('salvar com sucesso recarrega a lista — sem isso a % ficava desatualizada na linha até um F5', async () => {
    const { component, api } = build();
    component.ngOnInit();
    api.getCoaches.mockClear();

    component.openContract(coach);
    component.saveContract(coach);

    expect(api.getCoaches).toHaveBeenCalledTimes(1);
  });

  it('erro ao salvar NÃO recarrega a lista', async () => {
    const { component, api } = build({
      setCoachContract: vi.fn().mockReturnValue(throwError(() => ({ error: { message: 'Coach não encontrado' } }))),
    });
    component.ngOnInit();
    api.getCoaches.mockClear();

    component.openContract(coach);
    component.saveContract(coach);

    expect(api.getCoaches).not.toHaveBeenCalled();
  });

  it('erro ao salvar mantém o painel aberto e mostra a mensagem', async () => {
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

describe('CoachesComponent.platformTotals — governança/repasses', () => {
  it('soma alunos/receita/repasse real de todos os coaches carregados', async () => {
    const coach2 = { ...coach, id: 'coach-2', studentCount: 50, totalPaid: 5000, platformCut: 150, coachCut: 4850 };
    const { component } = build({ getCoaches: vi.fn().mockReturnValue(of([coach, coach2])) });
    component.ngOnInit();

    expect(component.platformTotals()).toEqual({
      studentCount: 150, totalPaid: 15000, platformCut: 1150, coachCut: 13850,
    });
  });

  it('sem nenhum coach: tudo zero, não quebra', async () => {
    const { component } = build({ getCoaches: vi.fn().mockReturnValue(of([])) });
    component.ngOnInit();

    expect(component.platformTotals()).toEqual({ studentCount: 0, totalPaid: 0, platformCut: 0, coachCut: 0 });
  });
});

describe('CoachesComponent — resetar senha e copiar', () => {
  const coachAlvo = { id: 'coach-1', name: 'Luan', email: 'luan@example.com' } as any;

  it('pede confirmação na caixa do app; sem confirmar, não reseta', async () => {
    const { component, api } = build({ resetCoachPassword: vi.fn() });
    const ask = vi.spyOn(confirmDialog, 'ask').mockResolvedValue(false);
    await component.resetPassword(coachAlvo);
    expect(ask.mock.calls[0][0]).toMatchObject({ title: 'Resetar a senha de Luan?', danger: true });
    expect((api as any).resetCoachPassword).not.toHaveBeenCalled();
  });

  it('confirmado: mostra a senha nova; copiar leva e-mail + senha prontos para enviar', async () => {
    const { component } = build({ resetCoachPassword: vi.fn().mockReturnValue(of({ password: 'Nova-Senha-123' })) });
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    await component.resetPassword(coachAlvo);
    expect(component.revealedPassword()).toEqual({ email: 'luan@example.com', password: 'Nova-Senha-123' });
    expect(scroll).toHaveBeenCalled();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await component.copyRevealedPassword();
    expect(writeText).toHaveBeenCalledWith('Acesso ao PulseRx\nE-mail: luan@example.com\nSenha: Nova-Senha-123');
    expect(component.copyMsg()).toBe('Copiado! Cole na conversa com o coach.');

    component.dismissRevealedPassword();
    expect(component.revealedPassword()).toBeNull();
    expect(component.copyMsg()).toBe('');
  });

  it('copiar falhou (navegador bloqueou): orienta a copiar à mão; sem senha na tela, não faz nada', async () => {
    const { component } = build();
    const writeText = vi.fn().mockRejectedValue(new Error('negado'));
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await component.copyRevealedPassword();
    expect(writeText).not.toHaveBeenCalled();
    component.revealedPassword.set({ email: 'a@example.com', password: 'x' });
    await component.copyRevealedPassword();
    expect(component.copyMsg()).toBe('Não deu para copiar automaticamente: selecione a senha e copie.');
  });

  it('erro ao resetar: mensagem traduzida, sem texto técnico', async () => {
    const { component } = build({ resetCoachPassword: vi.fn().mockReturnValue(throwError(() => ({ status: 500, error: { message: 'Internal server error' } }))) });
    vi.spyOn(confirmDialog, 'ask').mockResolvedValue(true);
    await component.resetPassword(coachAlvo);
    expect(component.listErrorMsg()).toBe('Erro ao resetar a senha. Tente novamente.');
    expect(component.resettingId()).toBeNull();
  });
});

describe('CoachesComponent — erros com mensagem traduzida', () => {
  const erroEmIngles = () => throwError(() => ({ status: 500, error: { message: 'Internal server error' } }));

  it('falha ao carregar a lista', () => {
    const { component } = build({ getCoaches: vi.fn().mockReturnValue(erroEmIngles()) });
    component.ngOnInit();
    expect(component.listErrorMsg()).toBe('Erro ao carregar a lista de coaches.');
  });

  it('falha ao criar coach: mensagem da API em português aparece', () => {
    const { component } = build({
      createCoach: vi.fn().mockReturnValue(throwError(() => ({ status: 409, error: { message: 'E-mail já cadastrado' } }))),
    });
    component.form.setValue({ name: 'Novo', email: 'novo@example.com' });
    component.createCoach();
    expect(component.errorMsg()).toBe('E-mail já cadastrado');
    expect(component.saving()).toBe(false);
  });

  it('falha ao trocar a permissão de IA', () => {
    const { component } = build({ toggleCoachAi: vi.fn().mockReturnValue(erroEmIngles()) });
    component.toggleAi(coach as any);
    expect(component.listErrorMsg()).toBe('Erro ao atualizar a permissão de IA. Tente novamente.');
  });
});

describe('CoachesComponent — detalhes (assinaturas e uso) e alertas', () => {
  it('Detalhes abre e fecha por coach; abrir outro troca', () => {
    const { component } = build();
    component.toggleDetails(coach as any);
    expect(component.detailsId()).toBe('coach-1');
    component.toggleDetails({ ...coach, id: 'coach-2' } as any);
    expect(component.detailsId()).toBe('coach-2');
    component.toggleDetails({ ...coach, id: 'coach-2' } as any);
    expect(component.detailsId()).toBeNull();
  });

  it('data em pt-BR; sem dado mostra "sem registro" (ou o texto pedido)', () => {
    const { component } = build();
    expect(component.formatDate('2026-09-30T15:00:00.000Z')).toBe('30/09/2026');
    expect(component.formatDate(null)).toBe('sem registro');
    expect(component.formatDate(null, '—')).toBe('—');
  });

  it('rótulo em português para cada alerta', () => {
    const { component } = build();
    expect(component.alertLabel.NO_CONTRACT).toBe('Sem % de contrato');
    expect(component.alertLabel.NO_WALLET).toBe('Sem carteira Asaas');
    expect(component.alertLabel.PAGE_UNPUBLISHED).toBe('Página despublicada');
  });
});
