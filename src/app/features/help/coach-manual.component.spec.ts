import { COACH_MANUAL, COACH_MANUAL_UPDATED } from './coach-manual';
import { COACH_MANUAL_PDF, CoachManualComponent } from './coach-manual.component';

const setTitle = vi.fn();
const build = (data: Record<string, unknown> = {}) => new CoachManualComponent({ snapshot: { data } } as any, { setTitle } as any);

describe('CoachManualComponent', () => {
  afterEach(() => vi.restoreAllMocks());

  it('no painel: tema do app, com o PDF para baixar e todo o conteúdo do manual', () => {
    const c = build();
    expect(c.printable).toBe(false);
    expect(c.pdfUrl).toBe(COACH_MANUAL_PDF);
    expect(c.sections).toBe(COACH_MANUAL);
    expect(c.updated).toBe(COACH_MANUAL_UPDATED);
    expect(setTitle).toHaveBeenCalledWith('Manual do coach — PulseRx');
  });

  it('versão para imprimir: marcada pela rota', () => {
    expect(build({ printable: true }).printable).toBe(true);
  });

  it('índice rola até a seção sem mexer na URL', () => {
    const c = build();
    const scrollIntoView = vi.fn();
    vi.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as any);
    const event = { preventDefault: vi.fn() } as any;
    c.scrollToSection('recebimento', event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.getElementById).toHaveBeenCalledWith('recebimento');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('seção inexistente: não quebra', () => {
    vi.spyOn(document, 'getElementById').mockReturnValue(null);
    expect(() => build().scrollToSection('nao-existe', { preventDefault: vi.fn() } as any)).not.toThrow();
  });
});

describe('Conteúdo do manual', () => {
  it('ids únicos (o índice depende disso) e toda seção com passos', () => {
    const ids = COACH_MANUAL.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of COACH_MANUAL) expect(s.steps.length).toBeGreaterThan(0);
  });

  it('cobre o caminho do cadastro na ordem: acesso → recebimento → planos → treinos → página → alunos', () => {
    const ids = COACH_MANUAL.map(s => s.id);
    const ordem = ['acesso', 'recebimento', 'planos-assinatura', 'treinos', 'pagina', 'alunos'];
    expect(ordem.map(id => ids.indexOf(id))).toEqual([...ordem.map(id => ids.indexOf(id))].sort((a, b) => a - b));
    expect(ordem.every(id => ids.includes(id))).toBe(true);
  });

  it('nunca pede senha nem chave de API do Asaas ao coach', () => {
    const texto = JSON.stringify(COACH_MANUAL).toLowerCase();
    expect(texto).toContain('nunca passe a senha nem a chave de api');
    expect(texto).not.toMatch(/cole (a|sua) (senha|chave)/);
  });
});
