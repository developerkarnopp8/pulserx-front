import { AppNotification, Student } from '../../core/models';
import { NOTIFICATION_FEED, attentionList, initials, latestNotifications } from './coach-dashboard';

const st = (id: string, name: string, status?: string) =>
  ({ id, name, email: '', goal: '', currentMonth: 1, currentWeek: 1, coachId: 'c', subscription: status ? { status } : null }) as unknown as Student;

describe('coach-dashboard', () => {
  it('atenção: pulos pendentes e mensalidade vencida; mais pulos primeiro, depois nome', () => {
    const list = attentionList(
      [st('a', 'Bruno'), st('b', 'Ana', 'PAST_DUE'), st('c', 'Carla', 'ACTIVE'), st('d', 'Dani', 'PAST_DUE')],
      [{ studentId: 'a', count: 1 }, { studentId: 'd', count: 3 }, { studentId: 'c', count: 0 }],
    );
    expect(list.map(i => i.student.id)).toEqual(['d', 'a', 'b']);
    expect(list[0].reasons).toEqual([{ kind: 'skips', count: 3 }, { kind: 'past_due' }]);
    expect(list[2].reasons).toEqual([{ kind: 'past_due' }]);
    expect(attentionList([st('x', 'X')], [])).toEqual([]);
  });

  it('feed: mais recentes primeiro, no máximo N; todo tipo tem ícone', () => {
    const n = (id: string, createdAt: string) => ({ id, type: 'new_pr', title: id, read: false, createdAt }) as AppNotification;
    const list = [n('a', '2026-10-01'), n('b', '2026-10-03'), n('c', '2026-10-02')];
    expect(latestNotifications(list, 2).map(x => x.id)).toEqual(['b', 'c']);
    expect(latestNotifications(list).length).toBe(3);
    expect(Object.values(NOTIFICATION_FEED).every(v => v.icon && v.label)).toBe(true);
  });

  it('iniciais', () => {
    expect(initials('Ana Souza Lima')).toBe('AS');
    expect(initials('  bruno ')).toBe('B');
  });
});
