import { useLearning } from '@/state/learning';
import { LESSONS } from './content';
import type { GameId } from '@/engine/games/types.ts';
import { GAME_IDS } from '@/engine/games/types.ts';

export interface Badge { id: string; es: string; en: string; earned: boolean }

/** Learning level: 1 + one level per 4 completed lessons. */
export function learningLevel(completed: number) {
  return 1 + Math.floor(completed / 4);
}

export function useAcademyProgress() {
  const lessons = useLearning((s) => s.lessons);
  const quizzes = useLearning((s) => s.quizzes);
  const completed = LESSONS.filter((l) => lessons[l.id]).length;
  const perGame = (g: GameId) => {
    const ls = LESSONS.filter((l) => l.game === g);
    return { done: ls.filter((l) => lessons[l.id]).length, total: ls.length };
  };
  const perfect = Object.values(quizzes).filter((q) => q.best === q.total).length;
  const badges: Badge[] = [
    { id: 'first', es: 'Primera lección', en: 'First lesson', earned: completed >= 1 },
    { id: 'ten', es: '10 lecciones', en: '10 lessons', earned: completed >= 10 },
    { id: 'all', es: 'Academia completa', en: 'Full academy', earned: completed >= LESSONS.length },
    { id: 'quiz5', es: '5 cuestionarios perfectos', en: '5 perfect quizzes', earned: perfect >= 5 },
    ...GAME_IDS.map((g) => ({ id: `master-${g}`, es: `Experto · ${g}`, en: `Expert · ${g}`, earned: perGame(g).done === perGame(g).total && perGame(g).total > 0 })),
  ];
  return { completed, total: LESSONS.length, level: learningLevel(completed), perGame, badges, lessons };
}
