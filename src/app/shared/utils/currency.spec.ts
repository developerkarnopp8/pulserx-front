import { centsToReaisInput, formatCents, formatReais, reaisToCents } from './currency';

describe('formatCents', () => {
  it('0 → "Grátis"', () => {
    expect(formatCents(0)).toBe('Grátis');
  });

  it('formata em R$ com vírgula decimal', () => {
    // Intl usa espaço fino ( ) entre "R$" e o valor — normaliza pra comparar.
    const normalize = (s: string) => s.replace(/ /g, ' ');
    expect(normalize(formatCents(14900))).toBe('R$ 149,00');
    expect(normalize(formatCents(150))).toBe('R$ 1,50');
  });
});

describe('reaisToCents', () => {
  it('aceita vírgula ou ponto decimal', () => {
    expect(reaisToCents('149,90')).toBe(14990);
    expect(reaisToCents('149.90')).toBe(14990);
  });

  it('número já numérico', () => {
    expect(reaisToCents(10)).toBe(1000);
  });

  it('vazio ou inválido vira 0 (nunca NaN)', () => {
    expect(reaisToCents('')).toBe(0);
    expect(reaisToCents('abc')).toBe(0);
  });

  it('arredonda imprecisão de ponto flutuante', () => {
    expect(reaisToCents('19.9')).toBe(1990);
  });
});

describe('formatReais', () => {
  it('formata um valor já em reais (não centavos) em R$ com vírgula decimal', () => {
    // Intl usa espaço fino ( ) entre "R$" e o valor — normaliza pra comparar.
    const normalize = (s: string) => s.replace(/ /g, ' ');
    expect(normalize(formatReais(149))).toBe('R$ 149,00');
    expect(normalize(formatReais(1000.5))).toBe('R$ 1.000,50');
    expect(normalize(formatReais(0))).toBe('R$ 0,00');
  });
});

describe('centsToReaisInput', () => {
  it('sempre 2 casas decimais, com ponto (para <input type=number>)', () => {
    expect(centsToReaisInput(14900)).toBe('149.00');
    expect(centsToReaisInput(0)).toBe('0.00');
    expect(centsToReaisInput(150)).toBe('1.50');
  });
});
