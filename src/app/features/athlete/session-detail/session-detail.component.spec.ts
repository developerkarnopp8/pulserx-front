import { of } from 'rxjs';
import { SessionDetailComponent } from './session-detail.component';

function build(session: unknown) {
  const route = { snapshot: { paramMap: { get: () => 's1' } } };
  const api = { getSession: vi.fn().mockReturnValue(of(session)), logExercise: vi.fn().mockReturnValue(of({})), skip: vi.fn() };
  const router = { navigate: vi.fn() };
  const component = new SessionDetailComponent(route as any, api as any, router as any);
  return { component, api };
}

describe('SessionDetailComponent — visual novo (Stitch mo04), só números reais', () => {
  it('sem sessão carregada: sem números e sem recado', () => {
    const { component } = build(null);
    expect(component.stats()).toBeNull();
    expect(component.coachNote()).toBeNull();
  });

  it('números e recado do coach vêm da prescrição', () => {
    const { component } = build({
      id: 's1', name: 'Snatch', type: 'LPO', order: 1, status: 'none',
      exercises: [
        { id: 'e1', name: 'A', sets: 3, loadPercent: 70, restSeconds: 90, completed: false, status: 'none' },
        { id: 'e2', name: 'B', sets: 4, coachNotes: 'Peito alto.', completed: false, status: 'none' },
      ],
    });
    component.ngOnInit();
    expect(component.stats()).toEqual({ exercises: 2, totalSets: 7, maxLoadPercent: 70, rest: { min: 90, max: 90 } });
    expect(component.coachNote()).toBe('Peito alto.');
    expect(component.typeLabel['LPO']).toBe('LPO');
    expect(component.restLabel({ min: 90, max: 90 })).toBe('90 s');
  });
});
