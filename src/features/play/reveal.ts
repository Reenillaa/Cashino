import { create } from 'zustand';
import type { GameId } from '@/engine/games/types.ts';

/**
 * Results are decided before the animation (that is what makes them provably fair), but the player must not
 * see them early. Each finished round leaves a "pending reveal" with its payout and history entry: the
 * displayed balance leaves that payout out and the history strip hides that entry until the game shows the
 * result (`revealOne`, called by the result banner or when a Plinko ball lands). Safety nets: leaving the
 * game reveals everything, and nothing stays hidden for more than 4 minutes.
 */
interface Pending { game: GameId; payout: number; historyId?: string; at: number }
interface RevealState {
  pending: Pending[];
  hold: (p: Omit<Pending, 'at'>) => void;
  revealOne: () => void;
  revealGame: (game: GameId) => void;
}

export const MAX_HOLD_MS = 240_000;

export const useReveal = create<RevealState>()((set) => ({
  pending: [],
  hold: (p) => set((s) => ({ pending: [...s.pending.filter((x) => Date.now() - x.at < MAX_HOLD_MS), { ...p, at: Date.now() }] })),
  revealOne: () => set((s) => ({ pending: s.pending.slice(1) })),
  revealGame: (game) => set((s) => ({ pending: s.pending.filter((x) => x.game !== game) })),
}));

/** Chips of `game` won but not shown yet. */
export const useHiddenPayout = (game: GameId) => useReveal((s) => s.pending.reduce((a, p) => (p.game === game ? a + p.payout : a), 0));
/** History ids not shown yet. */
export const useHiddenIds = () => useReveal((s) => s.pending.map((p) => p.historyId).filter(Boolean).join(','));
export const useHiddenTotal = () => useReveal((s) => s.pending.reduce((a, p) => a + p.payout, 0));
