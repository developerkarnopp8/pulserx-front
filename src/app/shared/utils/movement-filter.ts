/** Grupos aceitos pelo backend (`CreateMovementDto`) — mesma lista, mesma grafia. */
export const MOVEMENT_CATEGORIES = ['LPO', 'Força', 'Ginástica', 'Metcon', 'Resistência', 'Mobilidade', 'Core', 'Outro'] as const;

/** Minúsculas, sem acento e com espaços colapsados — "Força  " casa com "forca". */
export function normalizeSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Filtra por nome (contém, sem acento/maiúscula) e, se informado, por grupo exato. */
export function filterMovements<T extends { movement: { name: string; category: string } }>(
  items: T[],
  search: string,
  category: string | null,
): T[] {
  const q = normalizeSearch(search);
  return items.filter(item =>
    (!category || item.movement.category === category) &&
    (!q || normalizeSearch(item.movement.name).includes(q)),
  );
}
