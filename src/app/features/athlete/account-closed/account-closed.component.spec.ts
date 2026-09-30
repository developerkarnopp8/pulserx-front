import { AccountClosedComponent } from './account-closed.component';

describe('AccountClosedComponent', () => {
  it('expõe o auth para o botão Sair', () => {
    const auth = { logout: vi.fn() };
    const component = new AccountClosedComponent(auth as any);
    component.auth.logout();
    expect(auth.logout).toHaveBeenCalled();
  });
});
