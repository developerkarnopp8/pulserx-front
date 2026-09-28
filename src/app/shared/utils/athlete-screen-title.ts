/** Nome da tela do app do atleta mostrado no cabeçalho, a partir da URL atual. */
const TITLES: [prefix: string, title: string][] = [
  ['/athlete/home', 'Início'],
  ['/athlete/weekly', 'Treino'],
  ['/athlete/session/', 'Treino'],
  ['/athlete/aulas', 'Aulas'],
  ['/athlete/records', 'PRs'],
  ['/athlete/subscription', 'Perfil'],
  ['/athlete/history', 'Evolução'],
  ['/athlete/messages', 'Mensagens'],
];

export function athleteScreenTitle(url: string): string {
  const path = url.split(/[?#]/)[0];
  return TITLES.find(([prefix]) => path.startsWith(prefix))?.[1] ?? '';
}
