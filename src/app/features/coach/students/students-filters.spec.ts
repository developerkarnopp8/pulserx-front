import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { StudentsComponent } from './students.component';
import { Student, Subscription } from '../../../core/models';

/** Cobre os filtros/contadores por assinatura e a exportação CSV — a tabela nova de Alunos & Assinaturas. */

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'sub1', studentId: 's1', status: 'ACTIVE', startedAt: '2026-09-01T00:00:00.000Z',
  renewsAt: '2026-10-01T00:00:00.000Z', canceledAt: null, trialEndsAt: null,
  plan: { id: 'p1', name: 'Core', priceCents: 14900, categories: ['CORE'], isFree: false },
  ...over,
});

const student = (over: Partial<Student> = {}): Student => ({
  id: 's1', name: 'Ana', email: 'ana@example.com', goal: 'Força', currentMonth: 1, currentWeek: 1, coachId: 'coach-1',
  ...over,
});

function build(students: Student[] = []) {
  const api = {
    getStudents: vi.fn().mockReturnValue(of(students)),
    getPendingSkipCounts: vi.fn().mockReturnValue(of([])),
    getCoachAvgDuration: vi.fn().mockReturnValue(of({ byStudent: [] })),
  };
  const auth = { currentUser: () => ({ id: 'coach-1' }) };
  const component = new StudentsComponent(api as any, auth as any, new FormBuilder());
  component.ngOnInit();
  return { component, api };
}

describe('StudentsComponent — contadores reais por status de assinatura', () => {
  it('conta ativos/em teste/inadimplentes/sem plano corretamente', () => {
    const { component } = build([
      student({ id: 's1', subscription: sub({ status: 'ACTIVE' }) }),
      student({ id: 's2', subscription: sub({ status: 'ACTIVE' }) }),
      student({ id: 's3', subscription: sub({ status: 'TRIALING' }) }),
      student({ id: 's4', subscription: sub({ status: 'PAST_DUE' }) }),
      student({ id: 's5', subscription: undefined }),
      student({ id: 's6', subscription: sub({ status: 'CANCELED' }) }),
    ]);

    expect(component.activeCount()).toBe(2);
    expect(component.trialingCount()).toBe(1);
    expect(component.pastDueCount()).toBe(1);
    expect(component.noPlanCount()).toBe(2); // sem assinatura + cancelada
  });
});

describe('StudentsComponent.planTabs', () => {
  it('agrupa por plano, ignora quem está sem assinatura ou cancelado, ordena por quantidade', () => {
    const { component } = build([
      student({ id: 's1', subscription: sub({ status: 'ACTIVE', plan: { id: 'core', name: 'Core', priceCents: 9900, categories: ['CORE'], isFree: false } }) }),
      student({ id: 's2', subscription: sub({ status: 'ACTIVE', plan: { id: 'combo', name: 'Combo', priceCents: 19900, categories: ['CORE', 'LPO'], isFree: false } }) }),
      student({ id: 's3', subscription: sub({ status: 'TRIALING', plan: { id: 'combo', name: 'Combo', priceCents: 19900, categories: ['CORE', 'LPO'], isFree: false } }) }),
      student({ id: 's4', subscription: sub({ status: 'CANCELED', plan: { id: 'core', name: 'Core', priceCents: 9900, categories: ['CORE'], isFree: false } }) }),
      student({ id: 's5', subscription: undefined }),
    ]);

    expect(component.planTabs()).toEqual([
      { id: 'combo', name: 'Combo', count: 2 },
      { id: 'core', name: 'Core', count: 1 },
    ]);
  });
});

describe('StudentsComponent.filtered — abas de filtro', () => {
  const students = [
    student({ id: 's1', name: 'Ana', email: 'ana@x.com', subscription: sub({ status: 'ACTIVE', plan: { id: 'core', name: 'Core', priceCents: 9900, categories: ['CORE'], isFree: false } }) }),
    student({ id: 's2', name: 'Bia', email: 'bia@x.com', subscription: sub({ status: 'TRIALING' }) }),
    student({ id: 's3', name: 'Caio', email: 'caio@x.com', subscription: sub({ status: 'PAST_DUE' }) }),
    student({ id: 's4', name: 'Duda', email: 'duda@x.com', subscription: undefined }),
  ];

  it('"all": devolve todos', () => {
    const { component } = build(students);
    expect(component.filtered().length).toBe(4);
  });

  it('filtra por plano específico (ignora cancelados daquele plano)', () => {
    const { component } = build(students);
    component.filterTab.set('core');
    expect(component.filtered().map(s => s.id)).toEqual(['s1']);
  });

  it('"PAST_DUE" e "TRIALING" filtram por status', () => {
    const { component } = build(students);
    component.filterTab.set('PAST_DUE');
    expect(component.filtered().map(s => s.id)).toEqual(['s3']);
    component.filterTab.set('TRIALING');
    expect(component.filtered().map(s => s.id)).toEqual(['s2']);
  });

  it('"no_plan" pega quem não tem assinatura', () => {
    const { component } = build(students);
    component.filterTab.set('no_plan');
    expect(component.filtered().map(s => s.id)).toEqual(['s4']);
  });

  it('busca combina com o filtro de aba', () => {
    const { component } = build(students);
    component.filterTab.set('all');
    component.search.set('an');
    expect(component.filtered().map(s => s.id)).toEqual(['s1']);
  });
});

describe('StudentsComponent — status da assinatura (label/classe)', () => {
  it('sem assinatura ou cancelada: "Sem plano"', () => {
    const { component } = build();
    expect(component.subscriptionStatusLabel(student({ subscription: undefined }))).toBe('Sem plano');
    expect(component.subscriptionStatusLabel(student({ subscription: sub({ status: 'CANCELED' }) }))).toBe('Sem plano');
  });

  it('demais status usam o rótulo em pt-BR do modelo', () => {
    const { component } = build();
    expect(component.subscriptionStatusLabel(student({ subscription: sub({ status: 'ACTIVE' }) }))).toBe('Ativa');
    expect(component.subscriptionStatusLabel(student({ subscription: sub({ status: 'PAST_DUE' }) }))).toBe('Pagamento em atraso');
  });

  it('subscriptionStatusClass cobre os 4 status e o caso sem assinatura', () => {
    const { component } = build();
    expect(component.subscriptionStatusClass(student({ subscription: sub({ status: 'ACTIVE' }) }))).toContain('green');
    expect(component.subscriptionStatusClass(student({ subscription: sub({ status: 'TRIALING' }) }))).toContain('tertiary');
    expect(component.subscriptionStatusClass(student({ subscription: sub({ status: 'PAST_DUE' }) }))).toContain('error');
    expect(component.subscriptionStatusClass(student({ subscription: sub({ status: 'CANCELED' }) }))).toContain('surface-container');
    expect(component.subscriptionStatusClass(student({ subscription: undefined }))).toContain('surface-container');
  });
});

describe('StudentsComponent.formatDate', () => {
  it('null vira travessão; data formata em pt-BR', () => {
    const { component } = build();
    expect(component.formatDate(null)).toBe('—');
    expect(component.formatDate('2026-10-01T00:00:00.000Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('StudentsComponent.exportCsv', () => {
  afterEach(() => vi.restoreAllMocks());

  it('gera e dispara o download de um CSV com as linhas filtradas', () => {
    const { component } = build([
      student({ id: 's1', name: 'Ana', email: 'ana@x.com', subscription: sub() }),
    ]);

    const createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
    const revokeObjectURL = vi.fn();
    (globalThis as any).URL.createObjectURL = createObjectURL;
    (globalThis as any).URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.fn();
    const anchor = { click: clickSpy, href: '', download: '' } as unknown as HTMLAnchorElement;
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);

    component.exportCsv();

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(anchor.download).toContain('alunos-');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('nome com aspas é escapado corretamente no CSV (RFC 4180)', async () => {
    const { component } = build([
      student({ id: 's1', name: 'Ana "Rocket" Silva', subscription: undefined }),
    ]);

    let capturedBlob: Blob | undefined;
    (globalThis as any).URL.createObjectURL = vi.fn((blob: Blob) => { capturedBlob = blob; return 'blob:fake'; });
    (globalThis as any).URL.revokeObjectURL = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click: vi.fn(), href: '', download: '' } as unknown as HTMLAnchorElement);

    component.exportCsv();

    expect(capturedBlob).toBeInstanceOf(Blob);
    const text = await capturedBlob!.text();
    expect(text).toContain('Ana ""Rocket"" Silva');
  });
});
