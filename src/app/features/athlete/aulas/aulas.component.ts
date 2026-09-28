import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { TrainingCategory } from '../../../core/models';
import { PlanVideoGroup, collectPlanVideos } from '../../../shared/utils/plan-videos';
import { YoutubeEmbedComponent } from '../../../shared/components/youtube-embed/youtube-embed.component';

/**
 * Aulas: os vídeos dos exercícios dos planos que o atleta já recebeu, por categoria.
 * Os planos vêm do mesmo endpoint da semana de treino — a autorização (plano pago/liberado,
 * publicado) é do backend; aqui só se reúne o que ele já pode ver.
 */
@Component({
  selector: 'app-athlete-aulas',
  standalone: true,
  imports: [CommonModule, YoutubeEmbedComponent],
  templateUrl: './aulas.component.html',
})
export class AulasComponent implements OnInit {
  groups   = signal<PlanVideoGroup[]>([]);
  loading  = signal(true);
  errorMsg = signal('');
  /** null = todas as categorias. */
  selected = signal<TrainingCategory | null>(null);

  visibleGroups = computed(() => {
    const sel = this.selected();
    return sel ? this.groups().filter(g => g.category === sel) : this.groups();
  });

  totalVideos = computed(() => this.groups().reduce((n, g) => n + g.videos.length, 0));

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getMyStudentProfile().subscribe({
      next: student => {
        this.api.getPlansByStudent(student.id).subscribe({
          next: plans => { this.groups.set(collectPlanVideos(plans)); this.loading.set(false); },
          error: () => this.fail(),
        });
      },
      error: () => this.fail(),
    });
  }

  select(category: TrainingCategory | null): void {
    this.selected.set(category);
  }

  private fail(): void {
    this.loading.set(false);
    this.errorMsg.set('Não foi possível carregar suas aulas.');
  }
}
