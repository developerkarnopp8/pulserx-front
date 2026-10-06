import { of, throwError } from 'rxjs';
import { AulasComponent } from './aulas.component';

const YT = (id: string) => `https://www.youtube.com/watch?v=${id}`;

const plan = (category: string, name: string, id: string) => ({
  id: `p-${category}`, studentId: null, category, scope: 'SHARED', coachId: 'c1', month: 1,
  startDate: '2026-09-01', title: 'Plano', published: true,
  weeks: [{ id: 'w', weekNumber: 1, days: [{ id: 'd', dayOfWeek: 'Terça', dayIndex: 1, sessions: [{
    id: 's', name: 'Sessão', type: 'LPO', order: 1, status: 'none',
    exercises: [{ id: 'e', name, youtubeUrl: YT(id), completed: false, status: 'none' }],
  }] }] }],
});

function build(apiOver: Record<string, unknown> = {}) {
  const api = {
    getMyStudentProfile: vi.fn().mockReturnValue(of({ id: 's1' })),
    getPlansByStudent: vi.fn().mockReturnValue(of([plan('LPO', 'Snatch', 'aaaaaaaaaaa'), plan('CORE', 'Prancha', 'bbbbbbbbbbb')])),
    ...apiOver,
  };
  return { component: new AulasComponent(api as any), api };
}

describe('AulasComponent', () => {
  it('carrega os planos do próprio aluno e agrupa os vídeos', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getPlansByStudent).toHaveBeenCalledWith('s1');
    expect(component.groups().map(g => g.label)).toEqual(['LPO', 'Core']);
    expect(component.totalVideos()).toBe(2);
    expect(component.loading()).toBe(false);
  });

  it('filtro por categoria e volta pra todas', () => {
    const { component } = build();
    component.ngOnInit();
    component.select('CORE');
    expect(component.visibleGroups().map(g => g.label)).toEqual(['Core']);
    component.select(null);
    expect(component.visibleGroups()).toHaveLength(2);
  });

  it('sem vídeo nenhum: total 0 (tela mostra estado vazio)', () => {
    const { component } = build({ getPlansByStudent: vi.fn().mockReturnValue(of([])) });
    component.ngOnInit();
    expect(component.totalVideos()).toBe(0);
  });

  it('erro no perfil ou nos planos: mensagem e libera o loading', () => {
    const profileErr = build({ getMyStudentProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    profileErr.component.ngOnInit();
    expect(profileErr.component.errorMsg()).toContain('Não foi possível carregar');
    expect(profileErr.component.loading()).toBe(false);

    const plansErr = build({ getPlansByStudent: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    plansErr.component.ngOnInit();
    expect(plansErr.component.errorMsg()).toContain('Não foi possível carregar');
  });
});

describe('AulasComponent — busca (Stitch mo05)', () => {
  it('busca filtra por exercício e some com o grupo vazio; categoria + busca combinam', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.visibleCount()).toBe(2);
    component.query.set('snat');
    expect(component.visibleGroups().map(g => g.label)).toEqual(['LPO']);
    expect(component.visibleCount()).toBe(1);
    component.select('CORE');
    expect(component.visibleCount()).toBe(0);
    component.query.set('');
    expect(component.visibleCount()).toBe(1);
  });
});
