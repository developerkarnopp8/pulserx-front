import { TrainingPlan } from '../../core/models';
import { WorkoutLogEntry } from '../../core/services/api.service';

const docInstances: any[] = [];
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(function () {
    const instance = { setFontSize: vi.fn(), text: vi.fn(), save: vi.fn(), lastAutoTable: undefined as any };
    docInstances.push(instance);
    return instance;
  }),
}));

const autoTableMock = vi.fn((doc: any, _opts: any) => {
  doc.lastAutoTable = { finalY: (doc.lastAutoTable?.finalY ?? 32) + 50 };
});
vi.mock('jspdf-autotable', () => ({ default: (...args: unknown[]) => autoTableMock(...(args as [any, any])) }));

import { exportWeekToPdf, exportMonthToPdf } from './plan-pdf-export';

function plan(over: Partial<TrainingPlan> = {}): TrainingPlan {
  return {
    id: 'p1', studentId: 's1', category: 'PERFORMANCE', scope: 'INDIVIDUAL',
    coachId: 'c1', month: 1, startDate: '2026-03-09T00:00:00.000Z', title: 'Plano X', published: true,
    weeks: [{
      id: 'w1', weekNumber: 1,
      days: [{
        id: 'd1', dayOfWeek: 'Segunda', dayIndex: 1,
        sessions: [{
          id: 'sess1', name: 'Força', type: 'Strength', order: 1, status: 'none',
          exercises: [
            { id: 'ex1', name: 'Back Squat', sets: 5, reps: '5', loadPercent: 80, coachNotes: 'foco na técnica', completed: false, status: 'none' },
            { id: 'ex2', name: 'Pull-up', completed: false, status: 'none' },
          ],
        }],
      }],
    }],
    ...over,
  };
}

const log = (over: Partial<WorkoutLogEntry> = {}): WorkoutLogEntry => ({
  id: 'log1', exerciseId: 'ex1', exerciseName: 'Back Squat', sessionName: 'Força', sessionType: 'Strength',
  completedAt: new Date('2026-03-09T12:00:00.000Z'), setsCompleted: 5, notes: undefined,
  ...over,
});

describe('exportWeekToPdf', () => {
  beforeEach(() => { docInstances.length = 0; autoTableMock.mockClear(); });

  it('semana inexistente: não gera PDF (sem instanciar jsPDF)', () => {
    exportWeekToPdf(plan(), 99, 'Ana', []);
    expect(docInstances).toHaveLength(0);
  });

  it('semana existente: gera o doc, chama autoTable e salva com o nome certo', () => {
    exportWeekToPdf(plan(), 1, 'Ana', []);

    expect(docInstances).toHaveLength(1);
    expect(docInstances[0].text).toHaveBeenCalledWith('Ana', 14, 18);
    expect(docInstances[0].text).toHaveBeenCalledWith('Plano X — Semana 1', 14, 26);
    expect(autoTableMock).toHaveBeenCalledWith(docInstances[0], expect.objectContaining({ startY: 32 }));
    expect(docInstances[0].save).toHaveBeenCalledWith('Plano X - Semana 1.pdf');
  });

  it('monta linha com exercício completo (sets/reps/loadPercent/coachNotes presentes)', () => {
    exportWeekToPdf(plan(), 1, 'Ana', []);
    const body = autoTableMock.mock.calls[0][1].body;
    expect(body[0]).toEqual(['Segunda (09/03)', 'Força', 'Back Squat', '5', '5', '80%', 'foco na técnica']);
  });

  it('exercício sem sets/loadPercent/coachNotes/reps: usa os fallbacks (-, "")', () => {
    exportWeekToPdf(plan(), 1, 'Ana', []);
    const body = autoTableMock.mock.calls[0][1].body;
    expect(body[1]).toEqual(['Segunda (09/03)', 'Força', 'Pull-up', '-', '-', '-', '']);
  });

  it('log do mesmo exercício e mesmo dia: adiciona linha "✓ feito" com sets e nota', () => {
    exportWeekToPdf(plan(), 1, 'Ana', [log({ notes: 'Fácil hoje' })]);
    const body = autoTableMock.mock.calls[0][1].body;
    const doneRow = body.find((r: string[]) => r[2]?.includes('✓ feito'));
    expect(doneRow[2]).toBe('✓ feito — 5 sets, Fácil hoje');
  });

  it('log sem notes: linha "✓ feito" sem a vírgula extra', () => {
    exportWeekToPdf(plan(), 1, 'Ana', [log({ notes: undefined })]);
    const body = autoTableMock.mock.calls[0][1].body;
    const doneRow = body.find((r: string[]) => r[2]?.includes('✓ feito'));
    expect(doneRow[2]).toBe('✓ feito — 5 sets');
  });

  it('log de outro exercício ou outro dia: não adiciona linha extra', () => {
    exportWeekToPdf(plan(), 1, 'Ana', [log({ exerciseId: 'outro-exercicio' })]);
    const body = autoTableMock.mock.calls[0][1].body;
    expect(body.some((r: string[]) => r[2]?.includes('✓ feito'))).toBe(false);
  });
});

describe('exportMonthToPdf', () => {
  beforeEach(() => { docInstances.length = 0; autoTableMock.mockClear(); });

  it('itera todas as semanas, avançando startY pelo finalY da tabela anterior, e salva o arquivo completo', () => {
    const twoWeekPlan = plan({
      weeks: [
        ...plan().weeks,
        { id: 'w2', weekNumber: 2, days: [] },
      ],
    });

    exportMonthToPdf(twoWeekPlan, 'Ana', []);

    expect(autoTableMock).toHaveBeenCalledTimes(2);
    expect(autoTableMock.mock.calls[0][1].startY).toBe(32);
    expect(autoTableMock.mock.calls[1][1].startY).toBe(90); // finalY mockado (32+50=82) + 8
    expect(docInstances[0].save).toHaveBeenCalledWith('Plano X - Completo.pdf');
  });
});
