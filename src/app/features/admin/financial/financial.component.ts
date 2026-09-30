import { Component, OnInit, computed, signal } from '@angular/core';
import { AdminFinancialOverview, MonthTotals } from '../../../core/models';
import { ApiService } from '../../../core/services/api.service';
import { formatReais } from '../../../shared/utils/currency';
import { apiMessage } from '../../../shared/utils/signup-flow';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-09" → "set/2026". */
export function monthLabel(key: string): string {
  const [ano, mes] = key.split('-');
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

/**
 * Admin — Financeiro por coach (pedido do dono): quanto cada coach recebeu no mês, dividido em bruto, taxa do
 * Asaas, parte da AEVON e parte do coach, com o histórico de 6 meses. Os números vêm prontos da API (mesma conta
 * do Financeiro do coach); aqui só se escolhe o mês e se mostra.
 */
@Component({
  selector: 'app-admin-financial',
  standalone: true,
  templateUrl: './financial.component.html',
})
export class AdminFinancialComponent implements OnInit {
  data = signal<AdminFinancialOverview | null>(null);
  loading = signal(true);
  errorMsg = signal('');
  /** Índice do mês escolhido em `data().months` (padrão: o atual, o último). */
  selected = signal(0);

  readonly fmt = formatReais;
  readonly monthLabel = monthLabel;

  /** Coaches no mês escolhido, quem mais movimentou primeiro. */
  readonly rows = computed(() => {
    const d = this.data();
    if (!d) return [];
    const i = this.selected();
    return d.coaches
      .map(c => ({ id: c.id, name: c.name, email: c.email, totals: c.months[i] }))
      .sort((a, b) => b.totals.gross - a.totals.gross || a.name.localeCompare(b.name));
  });

  readonly monthTotals = computed<MonthTotals | null>(() => this.data()?.totals[this.selected()] ?? null);

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getAdminFinancial().subscribe({
      next: d => {
        this.data.set(d);
        this.selected.set(Math.max(0, d.months.length - 1));
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.errorMsg.set(apiMessage(err, 'Não foi possível carregar o financeiro.'));
      },
    });
  }

  select(i: number): void {
    this.selected.set(i);
  }
}
