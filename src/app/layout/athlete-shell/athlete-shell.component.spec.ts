import { Subject } from 'rxjs';
import { NavigationEnd } from '@angular/router';
import { AthleteShellComponent } from './athlete-shell.component';

function build(initialUrl = '/athlete/home') {
  const events = new Subject<unknown>();
  const newMessage$ = new Subject<unknown>();
  const router = { url: initialUrl, events };
  const auth = { logout: vi.fn(), currentUser: vi.fn().mockReturnValue(null) };
  const component = new AthleteShellComponent(auth as any, { newMessage$ } as any, router as any);
  const navigate = (url: string) => { router.url = url; events.next(new NavigationEnd(1, url, url)); };
  return { component, auth, router, navigate, newMessage$ };
}

describe('AthleteShellComponent', () => {
  it('6 abas na ordem do mockup; Mensagens não está na barra', () => {
    const { component } = build();
    expect(component.tabs.map(t => t.label)).toEqual(['Início', 'Treino', 'Aulas', 'PRs', 'Perfil', 'Evolução']);
    expect(component.tabs.some(t => t.path === '/athlete/messages')).toBe(false);
  });

  it('título da tela: na entrada direta e a cada navegação', () => {
    const { component, navigate } = build('/athlete/records');
    component.ngOnInit();
    expect(component.screenTitle()).toBe('PRs');
    navigate('/athlete/aulas');
    expect(component.screenTitle()).toBe('Aulas');
  });

  it('treino ativo é tela cheia (esconde cabeçalho e barra)', () => {
    const { component, navigate } = build('/athlete/active/s1');
    component.ngOnInit();
    expect(component.fullScreen()).toBe(true);
    navigate('/athlete/home');
    expect(component.fullScreen()).toBe(false);
  });

  it('mensagem nova conta como não lida fora do chat e zera ao abrir o chat', () => {
    const { component, navigate, newMessage$, router } = build('/athlete/home');
    component.ngOnInit();
    newMessage$.next({});
    newMessage$.next({});
    expect(component.unreadMsgs()).toBe(2);
    navigate('/athlete/messages');
    expect(component.unreadMsgs()).toBe(0);
    router.url = '/athlete/messages';
    newMessage$.next({});
    expect(component.unreadMsgs()).toBe(0);
  });

  it('ngOnDestroy para de ouvir; logout delega ao AuthService', () => {
    const { component, newMessage$, auth } = build();
    component.ngOnInit();
    component.ngOnDestroy();
    newMessage$.next({});
    expect(component.unreadMsgs()).toBe(0);
    component.logout();
    expect(auth.logout).toHaveBeenCalled();
  });
});
