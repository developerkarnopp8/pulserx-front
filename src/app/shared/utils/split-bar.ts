export interface SplitSegment {
  key: 'gateway' | 'platform' | 'coach';
  label: string;
  value: number;
  /** Fatia do bruto em % (1 casa). */
  percent: number;
}

/**
 * Fatias do bruto do mês: taxa do Asaas, plataforma e coach. Só com dado real completo — se não
 * houve cobrança com divisão conhecida, devolve [] (a tela não desenha barra fictícia).
 */
export function splitSegments(gatewayFee: number, platformFee: number, coachNet: number): SplitSegment[] {
  const total = gatewayFee + platformFee + coachNet;
  if (total <= 0) return [];
  const pct = (v: number) => Math.round((v / total) * 1000) / 10;
  return [
    { key: 'gateway',  label: 'Taxa Asaas', value: gatewayFee,  percent: pct(gatewayFee) },
    { key: 'platform', label: 'AEVON',      value: platformFee, percent: pct(platformFee) },
    { key: 'coach',    label: 'Você',       value: coachNet,    percent: pct(coachNet) },
  ];
}

/** Largura de cada item em relação ao maior (0–100), pra barras de "receita por plano". */
export function shareOfMax(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map(v => (max > 0 ? Math.round((v / max) * 100) : 0));
}
