import { of, throwError } from 'rxjs';
import { AdminFinancialComponent, monthLabel } from './financial.component';

const zero = { count: 0, gross: 0, gatewayFee: 0, platformFee: 0, coachNet: 0, pendingBreakdown: 0 };
const mes = (gross: number, extra = {}) => ({ ...zero, count: gross ? 1 : 0, gross, ...extra });

const overview = {
  months: ['2026-08', '2026-09'],
  coaches: [
    { id: 'a', name: 'Ana', email: 'ana@example.com', months: [mes(50), mes(100)] },
    { id: 'b', name: 'Bia', email: 'bia@example.com', months: [mes(0), mes(300)] },
    { id: 'c', name: 'Caio', email: 'caio@example.com', months: [mes(0), mes(100)] },
  ],
  totals: [mes(50), mes(500, { pendingBreakdown: 1 })],
};

function build(apiOver: Record<string, unknown> = {}) {
  const api = { getAdminFinancial: vi.fn().mockReturnValue(of(overview)), ...apiOver };
  return { component: new AdminFinancialComponent(api as any), api };
}

describe('monthLabel', () => {
  it('AAAA-MM vira mês curto em português', () => {
    expect(monthLabel('2026-09')).toBe('set/2026');
    expect(monthLabel('2026-01')).toBe('jan/2026');
    expect(monthLabel('2025-12')).toBe('dez/2025');
  });
});

describe('AdminFinancialComponent', () => {
  it('carrega e abre no mês atual (o último)', () => {
    const { component, api } = build();
    component.ngOnInit();
    expect(api.getAdminFinancial).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.selected()).toBe(1);
    expect(component.monthTotals()).toMatchObject({ gross: 500, pendingBreakdown: 1 });
  });

  it('coaches do mês escolhido, quem mais movimentou primeiro (empate: nome)', () => {
    const { component } = build();
    component.ngOnInit();
    expect(component.rows().map(r => r.id)).toEqual(['b', 'a', 'c']);
    component.select(0);
    expect(component.rows().map(r => r.id)).toEqual(['a', 'b', 'c']);
    expect(component.monthTotals()).toMatchObject({ gross: 50 });
  });

  it('sem dados ainda: nada para mostrar', () => {
    const { component } = build();
    expect(component.rows()).toEqual([]);
    expect(component.monthTotals()).toBeNull();
  });

  it('lista vazia de meses: seleciona o índice 0 sem quebrar', () => {
    const { component } = build({ getAdminFinancial: vi.fn().mockReturnValue(of({ months: [], coaches: [], totals: [] })) });
    component.ngOnInit();
    expect(component.selected()).toBe(0);
    expect(component.monthTotals()).toBeNull();
  });

  it('erro: mensagem em português e sai do carregando', () => {
    const { component } = build({
      getAdminFinancial: vi.fn().mockReturnValue(throwError(() => ({ status: 500, error: { message: 'Internal server error' } }))),
    });
    component.ngOnInit();
    expect(component.loading()).toBe(false);
    expect(component.errorMsg()).toBe('Não foi possível carregar o financeiro.');
  });
});
