import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';
import type { GameId } from '@/engine/games/types.ts';

/** Tutorial flags use the keys required by the spec: `<game>_tutorial_completed`. */
export const tutorialKey = (g: GameId) => `${g}_tutorial_completed` as const;

interface LearningState {
  tutorials: Record<string, boolean>;
  lessons: Record<string, number>; // lessonId → completed ts
  quizzes: Record<string, { best: number; total: number; ts: number }>;
  simulatorsUsed: Record<string, number>;
  dirty: boolean; // needs sync with account
  completeTutorial: (g: GameId) => void;
  resetTutorial: (g: GameId) => void;
  isTutorialDone: (g: GameId) => boolean;
  completeLesson: (id: string) => boolean;
  recordQuiz: (id: string, score: number, total: number) => boolean;
  useSimulator: (id: string) => void;
  markSynced: () => void;
  mergeRemote: (r: { tutorials?: Record<string, boolean>; lessons?: Record<string, number> }) => void;
  resetAll: () => void;
}

const initial = () => ({ tutorials: {}, lessons: {}, quizzes: {}, simulatorsUsed: {}, dirty: false });

export const useLearning = create<LearningState>()(
  persist(
    (set, get) => ({
      ...initial(),
      completeTutorial: (g) => set((s) => ({ tutorials: { ...s.tutorials, [tutorialKey(g)]: true }, dirty: true })),
      resetTutorial: (g) => set((s) => ({ tutorials: { ...s.tutorials, [tutorialKey(g)]: false }, dirty: true })),
      isTutorialDone: (g) => !!get().tutorials[tutorialKey(g)],
      completeLesson: (id) => {
        if (get().lessons[id]) return false;
        set((s) => ({ lessons: { ...s.lessons, [id]: Date.now() }, dirty: true }));
        return true;
      },
      recordQuiz: (id, score, total) => {
        const prev = get().quizzes[id];
        const firstPerfect = score === total && (!prev || prev.best < total);
        if (!prev || score > prev.best) set((s) => ({ quizzes: { ...s.quizzes, [id]: { best: score, total, ts: Date.now() } }, dirty: true }));
        return firstPerfect;
      },
      useSimulator: (id) => set((s) => ({ simulatorsUsed: { ...s.simulatorsUsed, [id]: (s.simulatorsUsed[id] ?? 0) + 1 } })),
      markSynced: () => set({ dirty: false }),
      /** Union merge: a tutorial/lesson completed anywhere stays completed (no conflicts possible). */
      mergeRemote: (r) =>
        set((s) => ({
          tutorials: { ...r.tutorials, ...Object.fromEntries(Object.entries(s.tutorials).filter(([, v]) => v)) },
          lessons: { ...r.lessons, ...s.lessons },
        })),
      resetAll: () => set(initial()),
    }),
    { name: `${STORAGE_PREFIX}learning`, storage: persistStorage, version: 1 },
  ),
);
