import { Subject, of } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { NavigationEnd } from '@angular/router';
import { CoachShellComponent } from './coach-shell.component';

function build(initialUrl = '/coach/students') {
  const events = new Subject<unknown>();
  const router = { url: initialUrl, events, navigate: vi.fn() };
  const auth = { currentUser: vi.fn().mockReturnValue({ id: 'coach-1', name: 'Luan' }), logout: vi.fn() };
  const api = { getStudents: vi.fn().mockReturnValue(of([])) };
  const component = new CoachShellComponent(auth as any, api as any, router as any, new FormBuilder());
  const navigate = (url: string) => events.next(new NavigationEnd(1, url, url));
  return { component, navigate, api };
}

describe('CoachShellComponent — estrutura', () => {
  it('nome da tela na barra superior segue a URL (entrada direta e navegação)', () => {
    const { component, navigate } = build('/coach/students');
    component.ngOnInit();
    expect(component.screenTitle()).toBe('Alunos & Assinaturas');
    navigate('/coach/plan-builder/s1');
    expect(component.screenTitle()).toBe('Construtor de Treinos');
  });

  it('navegar fecha o menu do celular', () => {
    const { component, navigate } = build();
    component.ngOnInit();
    component.mobileMenuOpen.set(true);
    navigate('/coach/library');
    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('item ativo do menu: Planos também acende no Construtor', () => {
    const { component, navigate } = build('/coach/plan-builder/s1');
    component.ngOnInit();
    expect(component.isNavActive('/coach/plans')).toBe(true);
    expect(component.isNavActive('/coach/students')).toBe(false);
    navigate('/coach/financial');
    expect(component.isNavActive('/coach/financial')).toBe(true);
    expect(component.isNavActive('')).toBe(false);
  });

  it('carrega os alunos do coach logado (pro modal Novo Treino)', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getStudents).toHaveBeenCalledWith('coach-1');
  });
});
