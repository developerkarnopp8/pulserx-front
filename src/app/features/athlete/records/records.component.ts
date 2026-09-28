import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Movement, PersonalRecord } from '../../../core/models';

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

  groupedMovements = computed(() => {
    const grouped: Record<string, MovementWithPR[]> = {};
    for (const item of this.movementsWithPR()) {
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

  isCategoryExpanded(cat: string): boolean {
    return this.expandedCategories().has(cat);
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
