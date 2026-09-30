const NOMES: Record<string, string> = {
  MASTERCARD: 'Mastercard',
  VISA: 'Visa',
  ELO: 'Elo',
  AMEX: 'Amex',
  HIPERCARD: 'Hipercard',
  DINERS: 'Diners',
  DISCOVER: 'Discover',
  JCB: 'JCB',
};

/** Bandeira do cartão como o Asaas manda ("MASTERCARD") → como o aluno lê ("Mastercard"). Desconhecida: só a 1ª maiúscula. */
export function cardBrandLabel(brand: string): string {
  const b = brand.trim().toUpperCase();
  if (NOMES[b]) return NOMES[b];
  return b ? b.charAt(0) + b.slice(1).toLowerCase() : 'Cartão';
}
