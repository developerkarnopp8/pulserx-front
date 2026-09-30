import { cardBrandLabel } from './card-brand';

describe('cardBrandLabel', () => {
  it.each([
    ['MASTERCARD', 'Mastercard'],
    ['visa', 'Visa'],
    [' ELO ', 'Elo'],
    ['AMEX', 'Amex'],
    ['HIPERCARD', 'Hipercard'],
    ['DINERS', 'Diners'],
    ['DISCOVER', 'Discover'],
    ['JCB', 'JCB'],
    ['CABAL', 'Cabal'],
    ['Cartão', 'Cartão'],
    ['', 'Cartão'],
  ])('%s → %s', (entrada, saida) => {
    expect(cardBrandLabel(entrada)).toBe(saida);
  });
});
