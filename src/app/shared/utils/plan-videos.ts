import { TRAINING_CATEGORY_LABEL, TrainingCategory, TrainingPlan } from '../../core/models';
import { extractYoutubeId } from './youtube';
import { exerciseSummary } from './home-view';

export interface PlanVideo {
  /** Id do vídeo no YouTube — também é a chave de deduplicação. */
  videoId: string;
  url: string;
  exerciseName: string;
  sessionName: string;
  /** Prescrição do exercício onde o vídeo apareceu primeiro ("3x5 @ 82%"); vazio se o coach não preencheu. */
  prescription: string;
  /** Observação do coach nesse exercício, se houver. */
  coachNotes: string | null;
}

export interface PlanVideoGroup {
  category: TrainingCategory;
  label: string;
  videos: PlanVideo[];
}

const CATEGORY_ORDER: TrainingCategory[] = ['PERFORMANCE', 'LPO', 'CORE'];

/**
 * Junta os vídeos dos exercícios dos planos que o atleta já recebeu, por categoria.
 * Não cria vídeo: só reúne os `youtubeUrl` que o coach cadastrou nos exercícios. O mesmo vídeo
 * repetido em várias semanas/sessões aparece uma vez por categoria. URL que não é do YouTube
 * reconhecido é ignorada (mesma regra do player — nunca embute id não validado).
 */
export function collectPlanVideos(plans: TrainingPlan[]): PlanVideoGroup[] {
  const byCategory = new Map<TrainingCategory, Map<string, PlanVideo>>();

  for (const plan of plans) {
    const videos = byCategory.get(plan.category) ?? new Map<string, PlanVideo>();
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const session of day.sessions) {
          for (const exercise of session.exercises) {
            const videoId = extractYoutubeId(exercise.youtubeUrl);
            if (!videoId || videos.has(videoId)) continue;
            videos.set(videoId, {
              videoId,
              url: exercise.youtubeUrl!,
              exerciseName: exercise.name,
              sessionName: session.name,
              prescription: exerciseSummary({ ...exercise, name: '' }).trim(),
              coachNotes: exercise.coachNotes?.trim() || null,
            });
          }
        }
      }
    }
    if (videos.size) byCategory.set(plan.category, videos);
  }

  return CATEGORY_ORDER
    .filter(category => byCategory.has(category))
    .map(category => ({
      category,
      label: TRAINING_CATEGORY_LABEL[category],
      videos: [...byCategory.get(category)!.values()]
        .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'pt-BR')),
    }));
}

/** Busca por nome do exercício ou da sessão, sem diferenciar maiúsculas e acentos. */
export function filterVideos(videos: PlanVideo[], query: string): PlanVideo[] {
  const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const q = norm(query.trim());
  return q ? videos.filter(v => norm(v.exerciseName).includes(q) || norm(v.sessionName).includes(q)) : videos;
}
