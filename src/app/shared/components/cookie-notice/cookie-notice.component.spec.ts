import { COOKIE_NOTICE_KEY, CookieNoticeComponent } from './cookie-notice.component';

describe('CookieNoticeComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('aparece na primeira visita e some pra sempre depois do "Entendi"', () => {
    const first = new CookieNoticeComponent();
    expect(first.visible()).toBe(true);
    first.dismiss();
    expect(first.visible()).toBe(false);
    expect(localStorage.getItem(COOKIE_NOTICE_KEY)).toBe('1');
    expect(new CookieNoticeComponent().visible()).toBe(false);
  });

  it('armazenamento bloqueado (modo privado): mostra e dispensa sem quebrar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const c = new CookieNoticeComponent();
    expect(c.visible()).toBe(true);
    expect(() => c.dismiss()).not.toThrow();
    expect(c.visible()).toBe(false);
  });
});
