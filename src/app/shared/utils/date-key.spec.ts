import { utcDate, addUtcDays, toDateKey, dateKeyFromIso, utcDateFromIso, toLocalDateKey, todayLocalKey } from './date-key';

describe('utcDate', () => {
  it('constrói a data em UTC a partir de ano/mês(1-based)/dia', () => {
    const d = utcDate(2026, 3, 9);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCDate()).toBe(9);
  });
});

describe('addUtcDays', () => {
  it('soma dias sem alterar a data original', () => {
    const original = utcDate(2026, 3, 9);
    const result = addUtcDays(original, 5);
    expect(toDateKey(result)).toBe('2026-03-14');
    expect(toDateKey(original)).toBe('2026-03-09');
  });

  it('número negativo subtrai dias', () => {
    const result = addUtcDays(utcDate(2026, 3, 9), -10);
    expect(toDateKey(result)).toBe('2026-02-27');
  });
});

describe('toDateKey', () => {
  it('formata YYYY-MM-DD com padding de mês e dia', () => {
    expect(toDateKey(utcDate(2026, 1, 5))).toBe('2026-01-05');
  });
});

describe('dateKeyFromIso', () => {
  it('extrai os 10 primeiros caracteres da string ISO', () => {
    expect(dateKeyFromIso('2026-03-09T00:00:00.000Z')).toBe('2026-03-09');
  });
});

describe('utcDateFromIso', () => {
  it('constrói a Date UTC a partir da chave extraída da ISO', () => {
    const d = utcDateFromIso('2026-03-09T00:00:00.000Z');
    expect(toDateKey(d)).toBe('2026-03-09');
  });
});

describe('toLocalDateKey', () => {
  it('formata YYYY-MM-DD usando os componentes locais da Date', () => {
    const d = new Date(2026, 2, 9); // mês 0-based local: março
    expect(toLocalDateKey(d)).toBe('2026-03-09');
  });

  it('faz padding de mês e dia com um dígito', () => {
    const d = new Date(2026, 0, 5); // janeiro, dia 5
    expect(toLocalDateKey(d)).toBe('2026-01-05');
  });
});

describe('todayLocalKey', () => {
  it('devolve a chave local do dia atual', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    expect(todayLocalKey()).toBe('2026-06-15');
    vi.useRealTimers();
  });
});
