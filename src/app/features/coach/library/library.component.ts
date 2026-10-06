import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ApiService, WorkoutLogEntry } from '../../../core/services/api.service';
import { ExerciseLibraryItem, Student } from '../../../core/models';
import { WorkoutHistoryCalendarComponent } from '../../../shared/components/workout-history-calendar/workout-history-calendar.component';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';
import { confirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

type DrawerMode = 'add' | 'edit';
type LibraryTab = 'exercises' | 'history';

const CATEGORIES = ['LPO', 'Força', 'Ginástica', 'Metcon', 'Resistência', 'Mobilidade', 'Core', 'Outro'];
/** Mesmo teto do backend — recusa antes de enviar (o backend também valida tipo pelos magic bytes). */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, WorkoutHistoryCalendarComponent, YoutubeEmbedComponent],
  templateUrl: './library.component.html',
  styleUrl: './library.component.scss',
})
export class LibraryComponent implements OnInit {
  items       = signal<ExerciseLibraryItem[]>([]);
  loading     = signal(true);
  searchQuery = signal('');
  categories  = CATEGORIES;

  showDrawer    = signal(false);
  drawerMode    = signal<DrawerMode>('add');
  editingItem   = signal<ExerciseLibraryItem | null>(null);
  saving        = signal(false);
  uploadingImage = signal(false);
  imageError     = signal('');

  activeCategory = signal<'all' | string>('all');

  /** Uma aba por categoria com pelo menos 1 item — contagem real, direto do catálogo carregado. */
  categoryTabs = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.items()) {
      const cat = item.category ?? 'Sem categoria';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, count]) => ({ name, count }));
  });

  // ── Aba "Histórico por Aluno" ────────────────────────────────────────────
  activeTab            = signal<LibraryTab>('exercises');
  students              = signal<Student[]>([]);
  studentsLoading        = signal(false);
  selectedStudentId      = signal<string | null>(null);
  studentLogs            = signal<WorkoutLogEntry[]>([]);
  studentAvgSessionSeconds = signal(0);
  studentHistoryLoading  = signal(false);

  form!: FormGroup;

  /** Origem: veio sozinho dos planos (autoImported) ou cadastrado à mão. */
  origin = signal<'all' | 'auto' | 'manual'>('all');
  autoCount = computed(() => this.items().filter(i => i.autoImported).length);
  manualCount = computed(() => this.items().filter(i => !i.autoImported).length);

  /** Combina busca por texto + aba de categoria ativa + origem. */
  filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const activeCat = this.activeCategory();
    const origin = this.origin();
    return this.items().filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(q) || (i.category ?? '').toLowerCase().includes(q);
      const matchesCategory = activeCat === 'all' || (i.category ?? 'Sem categoria') === activeCat;
      const matchesOrigin = origin === 'all' || (origin === 'auto') === !!i.autoImported;
      return matchesSearch && matchesCategory && matchesOrigin;
    });
  });

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      category:    [''],
      youtubeUrl:  [''],
      sets:        [null as number | null],
      reps:        [''],
      duration:    [''],
      restSeconds: [90],
      loadPercent: [null as number | null],
      notes:       [''],
    });
  }

  ngOnInit(): void {
    this.api.getLibrary().subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openAdd(): void {
    this.drawerMode.set('add');
    this.editingItem.set(null);
    this.form.reset({ restSeconds: 90 });
    this.showDrawer.set(true);
  }

  openEdit(item: ExerciseLibraryItem): void {
    this.imageError.set('');
    this.drawerMode.set('edit');
    this.editingItem.set(item);
    this.form.patchValue({
      name:        item.name,
      category:    item.category ?? '',
      youtubeUrl:  item.youtubeUrl ?? '',
      sets:        item.sets ?? null,
      reps:        item.reps ?? '',
      duration:    item.duration ?? '',
      restSeconds: item.restSeconds ?? 90,
      loadPercent: item.loadPercent ?? null,
      notes:       item.notes ?? '',
    });
    this.showDrawer.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.value;
    const dto = {
      name:        v.name,
      category:    v.category || undefined,
      youtubeUrl:  v.youtubeUrl || undefined,
      sets:        v.sets || undefined,
      reps:        v.reps || undefined,
      duration:    v.duration || undefined,
      restSeconds: v.restSeconds,
      loadPercent: v.loadPercent || undefined,
      notes:       v.notes || undefined,
    };

    if (this.drawerMode() === 'add') {
      this.api.createLibraryItem(dto).subscribe({
        next: item => {
          this.items.update(list => [...list, item]);
          this.closeDrawer();
        },
        error: () => this.saving.set(false),
      });
    } else {
      const id = this.editingItem()!.id;
      this.api.updateLibraryItem(id, dto).subscribe({
        next: updated => {
          this.items.update(list => list.map(i => i.id === id ? updated : i));
          this.closeDrawer();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  /** Capa do exercício em edição: envia na hora (precisa do id, então só no modo editar). */
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const item = this.editingItem();
    input.value = '';
    if (!file || !item) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      this.imageError.set('Use uma imagem JPG, PNG ou WebP de até 5MB.');
      return;
    }
    this.imageError.set('');
    this.uploadingImage.set(true);
    this.api.uploadLibraryImage(item.id, file).subscribe({
      next: updated => this.applyImageChange(updated),
      error: () => {
        this.uploadingImage.set(false);
        this.imageError.set('Não foi possível enviar a imagem. Tente de novo.');
      },
    });
  }

  removeImage(): void {
    const item = this.editingItem();
    if (!item) return;
    this.uploadingImage.set(true);
    this.api.removeLibraryImage(item.id).subscribe({
      next: updated => this.applyImageChange(updated),
      error: () => {
        this.uploadingImage.set(false);
        this.imageError.set('Não foi possível remover a imagem.');
      },
    });
  }

  private applyImageChange(updated: ExerciseLibraryItem): void {
    this.uploadingImage.set(false);
    this.editingItem.set(updated);
    this.items.update(list => list.map(i => (i.id === updated.id ? updated : i)));
  }

  async delete(item: ExerciseLibraryItem): Promise<void> {
    const ok = await confirmDialog.ask({
      title: `Remover "${item.name}" da biblioteca?`,
      message: item.autoImported
        ? 'Ele continua nos planos em que já foi usado e não volta a aparecer aqui.'
        : 'Ele deixa de aparecer na sua biblioteca.',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) return;
    this.api.deleteLibraryItem(item.id).subscribe({
      next: () => this.items.update(list => list.filter(i => i.id !== item.id)),
    });
  }

  closeDrawer(): void {
    this.showDrawer.set(false);
    this.saving.set(false);
    this.editingItem.set(null);
  }

  formatPreview(item: ExerciseLibraryItem): string {
    const parts: string[] = [];
    if (item.sets) parts.push(`${item.sets}×`);
    if (item.reps) parts.push(item.reps);
    if (item.duration) parts.push(item.duration);
    return parts.join(' ') || '—';
  }

  // ── Aba "Histórico por Aluno" ────────────────────────────────────────────

  selectTab(tab: LibraryTab): void {
    this.activeTab.set(tab);
    if (tab === 'history' && this.students().length === 0 && !this.studentsLoading()) {
      this.loadStudents();
    }
  }

  private loadStudents(): void {
    this.studentsLoading.set(true);
    this.api.getStudents().subscribe({
      next: list => {
        this.students.set(list);
        this.studentsLoading.set(false);
      },
      error: () => this.studentsLoading.set(false),
    });
  }

  selectStudent(studentId: string): void {
    this.selectedStudentId.set(studentId || null);
    this.studentLogs.set([]);
    this.studentAvgSessionSeconds.set(0);
    if (!studentId) return;

    this.studentHistoryLoading.set(true);
    this.api.getStudentWorkoutHistory(studentId).subscribe({
      next: logs => {
        this.studentLogs.set(logs);
        this.studentHistoryLoading.set(false);
      },
      error: () => this.studentHistoryLoading.set(false),
    });
    this.api.getStudentSessionSummary(studentId).subscribe({
      next: summary => this.studentAvgSessionSeconds.set(summary.avgElapsedSeconds),
      error: () => {},
    });
  }

  get selectedStudent(): Student | null {
    return this.students().find(s => s.id === this.selectedStudentId()) ?? null;
  }
}
