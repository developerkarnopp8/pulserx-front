import { athleteScreenTitle } from './athlete-screen-title';

describe('athleteScreenTitle', () => {
  it.each([
    ['/athlete/home', 'Início'],
    ['/athlete/weekly', 'Treino'],
    ['/athlete/session/abc', 'Treino'],
    ['/athlete/aulas', 'Aulas'],
    ['/athlete/records', 'PRs'],
    ['/athlete/subscription', 'Perfil'],
    ['/athlete/history', 'Evolução'],
    ['/athlete/messages', 'Mensagens'],
  ])('%s → %s', (url, title) => {
    expect(athleteScreenTitle(url)).toBe(title);
  });

  it('ignora query string e fragmento', () => {
    expect(athleteScreenTitle('/athlete/records?x=1#y')).toBe('PRs');
  });

  it('rota desconhecida: sem título', () => {
    expect(athleteScreenTitle('/athlete/outra')).toBe('');
  });
});
