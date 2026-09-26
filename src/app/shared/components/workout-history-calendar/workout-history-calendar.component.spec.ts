import { WorkoutHistoryCalendarComponent } from './workout-history-calendar.component';
import { WorkoutLogEntry } from '../../../core/services/api.service';

const log = (completedAt: Date): WorkoutLogEntry => ({
  id: 'log-1', exerciseId: 'ex-1', exerciseName: 'Agachamento',
  sessionName: 'Sessão 1', sessionType: 'Strength', completedAt, setsCompleted: 3,
});

// A lógica de streak/conclusão/calendário em si já é coberta exaustivamente em
// workout-history-calendar.spec.ts (util pura) — aqui só confere que o componente liga
// o @Input() logs aos computeds e repassa avgSessionSeconds pro formatador.
describe('WorkoutHistoryCalendarComponent', () => {
  it('sem logs: streak e conclusão zerados, calendário vazio de dias concluídos', () => {
    const comp = new WorkoutHistoryCalendarComponent();
    comp.logs = [];

    expect(comp.streak()).toBe(0);
    expect(comp.calendar().every(d => !d.completed)).toBe(true);
  });

  it('reage a novos logs (signal atualizado via setter)', () => {
    const comp = new WorkoutHistoryCalendarComponent();
    const today = new Date();

    comp.logs = [log(today)];

    expect(comp.streak()).toBeGreaterThanOrEqual(1);
    expect(comp.monthCompletion()).toBeGreaterThan(0);
  });

  it('logs undefined/null não quebra (vira lista vazia)', () => {
    const comp = new WorkoutHistoryCalendarComponent();
    comp.logs = undefined as unknown as WorkoutLogEntry[];

    expect(comp.streak()).toBe(0);
  });

  it('formata avgSessionSeconds com o mesmo formatador do histórico do atleta', () => {
    const comp = new WorkoutHistoryCalendarComponent();
    comp.avgSessionSeconds = 3900;

    expect(comp.fmtDuration(comp.avgSessionSeconds)).toBe('1h 05');
  });

  it('getMonthName devolve mês/ano em português', () => {
    const comp = new WorkoutHistoryCalendarComponent();
    expect(comp.getMonthName().length).toBeGreaterThan(0);
  });
});
