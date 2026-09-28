import { LegalPageComponent } from './legal-page.component';
import { LEGAL_COMPANY, LEGAL_DOCS } from './legal-content';

const location = { back: vi.fn() };
const page = (doc?: string) => new LegalPageComponent({ snapshot: { data: doc ? { doc } : {} } } as any, location as any);

describe('LegalPageComponent', () => {
  it.each(['termos', 'privacidade', 'cookies', 'reembolso'])('mostra o documento "%s" da rota', key => {
    expect(page(key).doc().key).toBe(key);
  });

  it('sem documento na rota (ou desconhecido) cai nos Termos', () => {
    expect(page().doc().key).toBe('termos');
    expect(page('outro').doc().key).toBe('termos');
  });

  it('Voltar usa o histórico do navegador', () => {
    page('termos').back();
    expect(location.back).toHaveBeenCalled();
  });

  it('canGoBack segue o tamanho do histórico (aba nova = sem histórico)', () => {
    const spy = vi.spyOn(window.history, 'length', 'get');
    spy.mockReturnValue(1);
    expect(page('termos').canGoBack).toBe(false);
    spy.mockReturnValue(3);
    expect(page('termos').canGoBack).toBe(true);
    spy.mockRestore();
  });

  it('lista os 4 documentos pra navegação', () => {
    expect(page('termos').links.map(l => l.key)).toEqual(['termos', 'privacidade', 'cookies', 'reembolso']);
  });
});

describe('Conteúdo legal', () => {
  it('todo documento tem título, introdução e seções com texto', () => {
    for (const doc of Object.values(LEGAL_DOCS)) {
      expect(doc.title).toBeTruthy();
      expect(doc.intro).toBeTruthy();
      expect(doc.sections.length).toBeGreaterThan(0);
      for (const s of doc.sections) expect(s.paragraphs.length + (s.items?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('identifica a empresa real e o contato nos Termos e na Privacidade', () => {
    for (const key of ['termos', 'privacidade'] as const) {
      expect(LEGAL_DOCS[key].intro).toContain(LEGAL_COMPANY.cnpj);
    }
    expect(JSON.stringify(LEGAL_DOCS.privacidade)).toContain(LEGAL_COMPANY.email);
  });

  it('declara o arrependimento de 7 dias (CDC art. 49) e os terceiros que recebem dados', () => {
    expect(JSON.stringify(LEGAL_DOCS.reembolso)).toContain('art. 49');
    const privacy = JSON.stringify(LEGAL_DOCS.privacidade);
    for (const vendor of ['Asaas', 'Hostinger', 'Cloudinary', 'Resend', 'Anthropic', 'YouTube', 'Google Fonts']) {
      expect(privacy).toContain(vendor);
    }
  });
});
