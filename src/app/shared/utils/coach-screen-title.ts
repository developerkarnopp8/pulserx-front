/** Nome da tela do painel do coach mostrado na barra superior, a partir da URL atual. */
const TITLES: [prefix: string, title: string][] = [
  ['/coach/dashboard', 'Dashboard'],
  ['/coach/students', 'Alunos & Assinaturas'],
  ['/coach/plan-builder', 'Construtor de Treinos'],
  ['/coach/plans', 'Planos'],
  ['/coach/library', 'Biblioteca'],
  ['/coach/messages', 'Mensagens'],
  ['/coach/financial', 'Financeiro'],
  ['/coach/subscriptions', 'Assinaturas'],
  ['/coach/landing-page', 'Minha Página'],
];

export function coachScreenTitle(url: string): string {
  const path = url.split(/[?#]/)[0];
  return TITLES.find(([prefix]) => path.startsWith(prefix))?.[1] ?? '';
}
