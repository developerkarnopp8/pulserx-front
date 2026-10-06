import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Movement, PersonalRecord } from '../../../core/models';
import { MOVEMENT_CATEGORIES, filterMovements } from '../../../shared/utils/movement-filter';
import { apiMessage } from '../../../shared/utils/signup-flow';
import { latestLoadPr } from '../../../shared/utils/training-streak';

/** Quantas tentativas aparecem na evolução do recorde em destaque. */
export const HIGHLIGHT_ATTEMPTS = 5;

interface MovementWithPR {
  movement: Movement;
  bestLoadKg?: number;
  bestReps?: number;
  lastAchievedAt?: string;
}

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss',
})
export class RecordsComponent implements OnInit {
  movements = signal<Movement[]>([]);
  records   = signal<PersonalRecord[]>([]);
  loading   = signal(true);
  errorMsg  = signal('');
  expandedCategories = signal<Set<string>>(new Set());

  showForm = signal<Movement | null>(null);
  formLoadKg = signal<number | null>(null);
  formReps = signal<number | null>(null);
  formNote = signal('');
  saving = signal(false);
  justRecordedId = signal<string | null>(null);

  // Busca e filtro por grupo
  search = signal('');
  selectedCategory = signal<string | null>(null);
  readonly movementCategories = MOVEMENT_CATEGORIES;

  // Novo movimento (do próprio atleta — só ele vê)
  showNewMovement = signal(false);
  newMovementName = signal('');
  newMovementCategory = signal<string>('Força');
  creatingMovement = signal(false);
  newMovementError = signal('');

  movementsWithPR = computed<MovementWithPR[]>(() => {
    const recordsByMovement = new Map<string, PersonalRecord[]>();
    for (const r of this.records()) {
      const list = recordsByMovement.get(r.movementId) ?? [];
      list.push(r);
      recordsByMovement.set(r.movementId, list);
    }

    return this.movements().map(movement => {
      const recs = recordsByMovement.get(movement.id) ?? [];
      const loadValues = recs.map(r => r.loadKg).filter((v): v is number => v != null && v > 0);
      const repValues  = recs.map(r => r.reps).filter((v): v is number => v != null && v > 0);
      const bestLoadKg = loadValues.length ? Math.max(...loadValues) : undefined;
      const bestReps   = repValues.length ? Math.max(...repValues) : undefined;
      const lastAchievedAt = recs.length
        ? recs.reduce((latest, r) => (r.achievedAt > latest ? r.achievedAt : latest), recs[0].achievedAt)
        : undefined;
      return { movement, bestLoadKg, bestReps, lastAchievedAt };
    });
  });

  /** Último registro que foi recorde de carga (mesma regra do Início). */
  highlight = computed(() => latestLoadPr(this.records()));
  /** Últimas tentativas com carga do movimento em destaque, da mais antiga para a mais nova (para a evolução). */
  highlightAttempts = computed(() => {
    const h = this.highlight();
    if (!h) return [];
    return this.records()
      .filter(r => r.movementId === h.record.movementId && (r.loadKg ?? 0) > 0)
      .sort((a, b) => a.achievedAt.localeCompare(b.achievedAt))
      .slice(-HIGHLIGHT_ATTEMPTS);
  });
  /** Maior carga entre as tentativas mostradas (altura das barras). */
  highlightMax = computed(() => Math.max(1, ...this.highlightAttempts().map(r => r.loadKg ?? 0)));
  /** Movimentos com pelo menos um registro. */
  recordedCount = computed(() => this.movementsWithPR().filter(m => m.bestLoadKg || m.bestReps).length);
  /** Movimentos por grupo (para os botões de filtro). */
  categoryCounts = computed(() => {
    const counts = new Map<string, number>();
    for (const m of this.movements()) counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
    return counts;
  });

  /** Grupos que existem no catálogo carregado (pro seletor "Selecione um grupo"). */
  availableCategories = computed(() =>
    [...new Set(this.movements().map(m => m.category))].sort((a, b) => a.localeCompare(b)),
  );

  isFiltering = computed(() => !!this.search().trim() || this.selectedCategory() !== null);

  groupedMovements = computed(() => {
    const grouped: Record<string, MovementWithPR[]> = {};
    for (const item of filterMovements(this.movementsWithPR(), this.search(), this.selectedCategory())) {
      const cat = item.movement.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getMovements().subscribe({
      next: movements => {
        this.movements.set(movements);
        this.loading.set(false);
        const firstCategory = this.groupedMovements()[0]?.[0];
        if (firstCategory) this.expandedCategories.set(new Set([firstCategory]));
      },
      // Sem isto a tela ficava presa no carregando (nenhum aviso) quando a API falhava.
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Não foi possível carregar seus recordes.');
      },
    });
    this.api.getMyPersonalRecords().subscribe(records => this.records.set(records));
  }

  toggleCategory(cat: string): void {
    this.expandedCategories.update(set => {
      const next = new Set(set);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  /** Buscando/filtrando, todo grupo com resultado fica aberto — senão o achado ficaria escondido. */
  isCategoryExpanded(cat: string): boolean {
    return this.isFiltering() || this.expandedCategories().has(cat);
  }

  openNewMovement(): void {
    this.newMovementName.set(this.search().trim());
    this.newMovementCategory.set(this.selectedCategory() ?? 'Força');
    this.newMovementError.set('');
    this.showNewMovement.set(true);
  }

  closeNewMovement(): void {
    this.showNewMovement.set(false);
  }

  /** Cria o movimento e já abre o registro do PR nele. */
  createMovement(): void {
    const name = this.newMovementName().trim();
    if (!name || this.creatingMovement()) return;
    this.creatingMovement.set(true);
    this.newMovementError.set('');
    this.api.createMovement(name, this.newMovementCategory()).subscribe({
      next: movement => {
        this.movements.update(list => [...list, movement]);
        this.creatingMovement.set(false);
        this.showNewMovement.set(false);
        this.search.set('');
        this.openForm(movement);
      },
      error: err => {
        this.creatingMovement.set(false);
        this.newMovementError.set(apiMessage(err, 'Não foi possível cadastrar o movimento.'));
      },
    });
  }

  openForm(movement: Movement): void {
    this.showForm.set(movement);
    this.formLoadKg.set(null);
    this.formReps.set(null);
    this.formNote.set('');
  }

  closeForm(): void {
    this.showForm.set(null);
  }

  get canSubmitForm(): boolean {
    return !!(this.formLoadKg() || this.formReps());
  }

  submitForm(): void {
    const movement = this.showForm();
    if (!movement || !this.canSubmitForm || this.saving()) return;
    this.saving.set(true);
    this.api.logPersonalRecord(
      movement.id,
      this.formLoadKg() ?? undefined,
      this.formReps() ?? undefined,
      this.formNote().trim() || undefined,
    ).subscribe({
      next: newRecord => {
        this.records.update(list => [newRecord, ...list]);
        this.justRecordedId.set(movement.id);
        setTimeout(() => this.justRecordedId.set(null), 3000);
        this.saving.set(false);
        this.closeForm();
      },
      error: () => this.saving.set(false),
    });
  }
}
