import { create } from 'zustand';
import type { GameId } from '@/engine/games/types.ts';

export type Bi = { es: string; en: string };
export interface TutorialStep {
  kind: 'info' | 'do' | 'quiz';
  title: Bi;
  body: Bi;
  /** For "do" steps: the game event that completes the step (emitted by the real game UI). */
  event?: string;
  options?: Bi[];
  answer?: number;
  explain?: Bi;
}

interface TutorialRuntime {
  game: GameId | null;
  step: number;
  emit: (game: GameId, event: string) => void;
  start: (game: GameId) => void;
  next: () => void;
  stop: () => void;
  listeners: Set<(game: GameId, event: string) => void>;
}

/** Tiny event bus between the real game UI and the tutorial coach. */
export const useTutorialRuntime = create<TutorialRuntime>()((set, get) => ({
  game: null,
  step: 0,
  listeners: new Set(),
  emit: (game, event) => get().listeners.forEach((l) => l(game, event)),
  start: (game) => set({ game, step: 0 }),
  next: () => set((s) => ({ step: s.step + 1 })),
  stop: () => set({ game: null, step: 0 }),
}));

/** Games call this whenever the player performs a meaningful action. */
export function tutorialEvent(game: GameId, event: string) {
  useTutorialRuntime.getState().emit(game, event);
}
