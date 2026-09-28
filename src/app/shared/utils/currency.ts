/** Centavos (inteiro, como o backend guarda preço) → "R$ 149,00". 0 → "Grátis". */
export function formatCents(cents: number): string {
  if (cents === 0) return 'Grátis';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "149,90" ou "149.90" (o que o usuário digitar num campo de reais) → 14990 centavos. */
export function reaisToCents(value: string | number): number {
  const normalized = typeof value === 'number' ? value : Number(value.replace(',', '.'));
  return Math.round((normalized || 0) * 100);
}

/** 14990 centavos → "149.90" (para preencher um <input type="number"> de reais). */
export function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Valor em reais (não centavos — é como o gateway de pagamento devolve) → "R$ 149,00". */
export function formatReais(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
