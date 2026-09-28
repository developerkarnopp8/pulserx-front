import { Subject, of, throwError } from 'rxjs';
import { AthleteMessagesComponent } from './messages.component';

const ME = 'athlete-1';
const COACH = 'coach-1';

const msg = (over: Record<string, unknown> = {}) => ({
  id: 'm1', fromId: COACH, toId: ME, content: 'oi', createdAt: new Date().toISOString(),
  from: { id: COACH, name: 'Luan' }, to: { id: ME, name: 'Gustavo' },
  ...over,
});

function build(apiOver: Record<string, unknown> = {}) {
  const newMessage$ = new Subject<any>();
  const api = {
    getInbox: vi.fn().mockReturnValue(of([msg()])),
    getMyStudentProfile: vi.fn().mockReturnValue(of({ coachId: COACH })),
    getConversation: vi.fn().mockReturnValue(of([msg()])),
    sendMessage: vi.fn().mockReturnValue(of(msg({ id: 'm2', fromId: ME, toId: COACH, content: 'Teste' }))),
    ...apiOver,
  };
  const auth = { currentUser: vi.fn().mockReturnValue({ id: ME }) };
  const socket = { newMessage$ };
  const component = new AthleteMessagesComponent(api as any, auth as any, socket as any);
  return { component, api, newMessage$ };
}

describe('AthleteMessagesComponent — tempo real', () => {
  it('mensagem do coach pra mim entra na conversa', () => {
    const { component, newMessage$ } = build();
    component.ngOnInit();
    newMessage$.next(msg({ id: 'm9', content: 'bom treino' }));
    expect(component.messages().map(m => m.id)).toEqual(['m1', 'm9']);
  });

  it('a própria mensagem enviada aparece UMA vez, mesmo que um evento com ela chegue pelo socket', () => {
    const { component, newMessage$ } = build();
    component.ngOnInit();
    component.newMsg = 'Teste';
    component.send();
    // evento que seria entregue ao coach (socket de outra sessão na mesma aba)
    newMessage$.next(msg({ id: 'm2', fromId: ME, toId: COACH, content: 'Teste' }));
    expect(component.messages().filter(m => m.id === 'm2')).toHaveLength(1);
  });

  it('mensagem de OUTRO aluno pro coach nunca aparece na minha conversa', () => {
    const { component, newMessage$ } = build();
    component.ngOnInit();
    newMessage$.next(msg({ id: 'x', fromId: 'outro-aluno', toId: COACH, content: 'segredo' }));
    newMessage$.next(msg({ id: 'y', fromId: COACH, toId: 'outro-aluno', content: 'resposta' }));
    expect(component.messages().map(m => m.id)).toEqual(['m1']);
  });

  it('ngOnDestroy para de ouvir o socket', () => {
    const { component, newMessage$ } = build();
    component.ngOnInit();
    component.ngOnDestroy();
    newMessage$.next(msg({ id: 'm9' }));
    expect(component.messages().map(m => m.id)).toEqual(['m1']);
  });
});

describe('AthleteMessagesComponent — carga', () => {
  it('descobre o coach pela inbox (mensagem enviada por mim usa o destinatário)', () => {
    const { component, api } = build({ getInbox: vi.fn().mockReturnValue(of([msg({ fromId: ME, from: { id: ME, name: 'Gustavo' }, to: { id: COACH, name: 'Luan' } })])) });
    component.ngOnInit();
    expect(component.coachId()).toBe(COACH);
    expect(component.coachName()).toBe('Luan');
    expect(api.getConversation).toHaveBeenCalledWith(COACH);
    expect(component.loading()).toBe(false);
  });

  it('inbox vazia: usa o coach do perfil de aluno', () => {
    const { component, api } = build({ getInbox: vi.fn().mockReturnValue(of([])) });
    component.ngOnInit();
    expect(api.getMyStudentProfile).toHaveBeenCalled();
    expect(component.coachId()).toBe(COACH);
  });

  it('erros de carga liberam o loading', () => {
    const inboxErr = build({ getInbox: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    inboxErr.component.ngOnInit();
    expect(inboxErr.component.loading()).toBe(false);

    const profileErr = build({
      getInbox: vi.fn().mockReturnValue(of([])),
      getMyStudentProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))),
    });
    profileErr.component.ngOnInit();
    expect(profileErr.component.loading()).toBe(false);

    const convErr = build({ getConversation: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    convErr.component.ngOnInit();
    expect(convErr.component.loading()).toBe(false);
  });
});

describe('AthleteMessagesComponent — envio', () => {
  it('não envia vazio, sem coach ou enquanto envia', () => {
    const { component, api } = build({ getInbox: vi.fn().mockReturnValue(of([])), getMyStudentProfile: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    component.newMsg = 'oi';
    component.send(); // sem coach
    component.coachId.set(COACH);
    component.newMsg = '   ';
    component.send(); // vazio
    component.newMsg = 'oi';
    component.sending.set(true);
    component.send(); // enviando
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('erro no envio libera o botão', () => {
    const { component } = build({ sendMessage: vi.fn().mockReturnValue(throwError(() => new Error('x'))) });
    component.ngOnInit();
    component.newMsg = 'oi';
    component.send();
    expect(component.sending()).toBe(false);
  });

  it('Enter envia; Shift+Enter e outras teclas não', () => {
    const { component, api } = build();
    component.ngOnInit();
    component.newMsg = 'oi';
    component.onEnter({ key: 'Enter', shiftKey: true, preventDefault: vi.fn() } as any);
    component.onEnter({ key: 'a', shiftKey: false, preventDefault: vi.fn() } as any);
    expect(api.sendMessage).not.toHaveBeenCalled();
    const ev = { key: 'Enter', shiftKey: false, preventDefault: vi.fn() };
    component.onEnter(ev as any);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(api.sendMessage).toHaveBeenCalledWith(COACH, 'oi');
  });
});

describe('AthleteMessagesComponent — datas e rolagem', () => {
  it('formatDate: Hoje / Ontem / data curta; formatTime em HH:mm', () => {
    const { component } = build();
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    expect(component.formatDate(now.toISOString())).toBe('Hoje');
    expect(component.formatDate(yesterday.toISOString())).toBe('Ontem');
    expect(component.formatDate('2020-01-15T12:00:00.000Z')).toMatch(/15/);
    expect(component.formatTime('2026-09-28T13:11:00.000Z')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('agrupa mensagens por dia', () => {
    const { component } = build();
    const today = new Date().toISOString();
    component.messages.set([
      msg({ id: 'a', createdAt: '2020-01-15T12:00:00.000Z' }),
      msg({ id: 'b', createdAt: today }),
      msg({ id: 'c', createdAt: today }),
    ] as any);
    const groups = component.groupedMessages();
    expect(groups).toHaveLength(2);
    expect(groups[1]).toMatchObject({ date: 'Hoje' });
    expect(groups[1].messages.map(m => m.id)).toEqual(['b', 'c']);
  });

  it('rolagem até o fim: usa o elemento quando existe e não quebra sem ele', () => {
    const { component } = build();
    expect(() => component.ngAfterViewChecked()).not.toThrow();
    const scrollIntoView = vi.fn();
    component.chatEnd = { nativeElement: { scrollIntoView } } as any;
    component.ngAfterViewChecked();
    expect(scrollIntoView).toHaveBeenCalled();
    component.chatEnd = { nativeElement: { scrollIntoView: () => { throw new Error('x'); } } } as any;
    expect(() => component.ngAfterViewChecked()).not.toThrow();
  });
});
