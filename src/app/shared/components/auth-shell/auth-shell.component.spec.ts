import { AuthShellComponent } from './auth-shell.component';

describe('AuthShellComponent', () => {
  it('por padrão: sem botão voltar e sem marca d\'água; aceita os dois por entrada', () => {
    const c = new AuthShellComponent();
    expect(c.backLink).toBeNull();
    expect(c.watermark).toBe(false);
    c.backLink = '/login';
    c.watermark = true;
    expect(c.backLink).toBe('/login');
    expect(c.watermark).toBe(true);
  });
});
