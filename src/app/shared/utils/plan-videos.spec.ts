import { collectPlanVideos, filterVideos } from './plan-videos';
import { TrainingPlan } from '../../core/models';

const YT = (id: string) => `https://www.youtube.com/watch?v=${id}`;

function plan(category: TrainingPlan['category'], exercises: { name: string; youtubeUrl?: string; sets?: number; reps?: string; loadPercent?: number; coachNotes?: string }[], sessionName = 'Sessão A'): TrainingPlan {
  return {
    id: `p-${category}`, studentId: null, category, scope: 'SHARED', coachId: 'c1', month: 1,
    startDate: '2026-09-01', title: 'Plano', published: true,
    weeks: [{
      id: 'w1', weekNumber: 1,
      days: [{
        id: 'd1', dayOfWeek: 'Terça', dayIndex: 1,
        sessions: [{
          id: 's1', name: sessionName, type: 'LPO', order: 1, status: 'none',
          exercises: exercises.map((e, i) => ({ id: `e${i}`, completed: false, status: 'none' as const, ...e })),
        }],
      }],
    }],
  };
}

describe('collectPlanVideos', () => {
  it('sem planos ou sem vídeo: lista vazia', () => {
    expect(collectPlanVideos([])).toEqual([]);
    expect(collectPlanVideos([plan('LPO', [{ name: 'Snatch' }])])).toEqual([]);
  });

  it('agrupa por categoria na ordem Performance, LPO, Core', () => {
    const groups = collectPlanVideos([
      plan('CORE', [{ name: 'Prancha', youtubeUrl: YT('aaaaaaaaaaa') }]),
      plan('PERFORMANCE', [{ name: 'Back Squat', youtubeUrl: YT('bbbbbbbbbbb') }]),
      plan('LPO', [{ name: 'Snatch', youtubeUrl: YT('ccccccccccc') }]),
    ]);
    expect(groups.map(g => g.label)).toEqual(['Performance', 'LPO', 'Core']);
    expect(groups[1].videos[0]).toEqual({
      videoId: 'ccccccccccc', url: YT('ccccccccccc'), exerciseName: 'Snatch', sessionName: 'Sessão A',
      prescription: '', coachNotes: null,
    });
  });

  it('mesmo vídeo repetido aparece uma vez; ordena por nome do exercício', () => {
    const groups = collectPlanVideos([
      plan('LPO', [
        { name: 'Snatch', youtubeUrl: YT('ccccccccccc') },
        { name: 'Clean', youtubeUrl: YT('ddddddddddd') },
        { name: 'Snatch (repetido)', youtubeUrl: `https://youtu.be/ccccccccccc` },
      ]),
    ]);
    expect(groups[0].videos.map(v => v.exerciseName)).toEqual(['Clean', 'Snatch']);
  });

  it('dois planos da mesma categoria somam os vídeos no mesmo grupo', () => {
    const groups = collectPlanVideos([
      plan('LPO', [{ name: 'Snatch', youtubeUrl: YT('ccccccccccc') }]),
      plan('LPO', [{ name: 'Clean', youtubeUrl: YT('ddddddddddd') }]),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].videos).toHaveLength(2);
  });

  it('ignora URL que não é do YouTube (não embute id não validado)', () => {
    const groups = collectPlanVideos([
      plan('LPO', [
        { name: 'Malicioso', youtubeUrl: 'javascript:alert(1)' },
        { name: 'Outro site', youtubeUrl: 'https://evil.com/watch?v=ccccccccccc' },
      ]),
    ]);
    expect(groups).toEqual([]);
  });
});

describe('vídeos — prescrição, recado e busca', () => {
  it('guarda a prescrição e a observação do coach do exercício', () => {
    const [g] = collectPlanVideos([plan('LPO', [{ name: 'Snatch', youtubeUrl: YT('ccccccccccc'), sets: 3, reps: '5', loadPercent: 82, coachNotes: ' Pés rápidos. ' }])]);
    expect(g.videos[0].prescription).toBe('3x5 @ 82%');
    expect(g.videos[0].coachNotes).toBe('Pés rápidos.');
  });

  it('busca por exercício ou sessão, sem acento e sem caixa', () => {
    const [g] = collectPlanVideos([plan('LPO', [
      { name: 'Agachamento', youtubeUrl: YT('aaaaaaaaaaa') },
      { name: 'Snatch', youtubeUrl: YT('bbbbbbbbbbb') },
    ], 'Força Máxima')]);
    expect(filterVideos(g.videos, 'agach').map(v => v.exerciseName)).toEqual(['Agachamento']);
    expect(filterVideos(g.videos, 'FORCA').length).toBe(2);
    expect(filterVideos(g.videos, '  ').length).toBe(2);
    expect(filterVideos(g.videos, 'remo')).toEqual([]);
  });
});
