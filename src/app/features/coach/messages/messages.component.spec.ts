import { CoachMessagesComponent } from './messages.component';

describe('CoachMessagesComponent — filtro e busca (Stitch mo10)', () => {
  function build() {
    const c = new CoachMessagesComponent({} as any, { currentUser: () => ({ id: 'coach' }) } as any, {} as any);
    c.conversations.set([
      { athleteId: 'a', athleteName: 'Ana Souza', lastMessage: 'oi', lastAt: '2026-10-06', unread: 2 },
      { athleteId: 'b', athleteName: 'Bruno Lima', lastMessage: 'ok', lastAt: '2026-10-05', unread: 0 },
      { athleteId: 'c', athleteName: 'Carla Ana', lastMessage: 'x', lastAt: '2026-10-04', unread: 1 },
    ]);
    return c;
  }

  it('total de não lidas soma todas as conversas', () => {
    expect(build().totalUnread()).toBe(3);
  });

  it('"não lidas" mostra só as com mensagem pendente; busca por nome sem caixa', () => {
    const c = build();
    expect(c.filteredConversations().length).toBe(3);
    c.convFilter.set('unread');
    expect(c.filteredConversations().map(x => x.athleteId)).toEqual(['a', 'c']);
    c.convSearch.set('  ANA ');
    expect(c.filteredConversations().map(x => x.athleteId)).toEqual(['a', 'c']);
    c.convFilter.set('all');
    c.convSearch.set('bruno');
    expect(c.filteredConversations().map(x => x.athleteId)).toEqual(['b']);
  });
});
