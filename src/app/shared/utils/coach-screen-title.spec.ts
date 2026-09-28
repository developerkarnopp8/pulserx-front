import { coachScreenTitle } from './coach-screen-title';

describe('coachScreenTitle', () => {
  it.each([
    ['/coach/dashboard', 'Dashboard'],
    ['/coach/students', 'Alunos & Assinaturas'],
    ['/coach/plan-builder/abc', 'Construtor de Treinos'],
    ['/coach/plan-builder/shared/p1', 'Construtor de Treinos'],
    ['/coach/plans', 'Planos'],
    ['/coach/library', 'Biblioteca'],
    ['/coach/messages', 'Mensagens'],
    ['/coach/financial', 'Financeiro'],
    ['/coach/subscriptions', 'Assinaturas'],
    ['/coach/landing-page', 'Minha Página'],
  ])('%s → %s', (url, title) => {
    expect(coachScreenTitle(url)).toBe(title);
  });

  it('ignora query string e fragmento; rota desconhecida sem título', () => {
    expect(coachScreenTitle('/coach/students?x=1#y')).toBe('Alunos & Assinaturas');
    expect(coachScreenTitle('/coach/outra')).toBe('');
  });
});
