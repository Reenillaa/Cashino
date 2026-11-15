/**
 * Ranking maths (documented in docs/08-RANKINGS.md). Balance is never a ranking criterion.
 */

/** Wilson score lower bound — conservative estimate of a proportion, robust to small samples. */
export function wilsonLower(successes: number, n: number, z = 1.96): number {
  if (n === 0) return 0;
  const p = successes / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return (c - m) / d;
}

/**
 * Multi-player Elo for poker Sit & Go placements. placements: player ids, winner first.
 * Each pair is a virtual duel; K is split across opponents so a game moves ratings by ≈ K at most.
 */
export function eloUpdate(ratings: Record<string, number>, placements: string[], K = 32): Record<string, number> {
  const n = placements.length;
  const out: Record<string, number> = {};
  for (const a of placements) {
    let delta = 0;
    for (const b of placements) {
      if (a === b) continue;
      const ra = ratings[a] ?? 1200, rb = ratings[b] ?? 1200;
      const expected = 1 / (1 + 10 ** ((rb - ra) / 400));
      const score = placements.indexOf(a) < placements.indexOf(b) ? 1 : 0;
      delta += (K / (n - 1)) * (score - expected);
    }
    out[a] = Math.round((ratings[a] ?? 1200) + delta);
  }
  return out;
}

/**
 * Mastery score (0–1000) for games of pure chance, where "skill" cannot exist: rewards participation
 * (log-scaled, so volume has diminishing returns), learning and achievements — never wagering or luck.
 */
export function masteryScore(input: { rounds: number; academyProgress: number; achievementRatio: number; tutorialDone: boolean }): number {
  const participation = Math.min(1, Math.log10(1 + input.rounds) / 3); // saturates at ~1000 rounds
  const s = 400 * participation + 350 * clamp01(input.academyProgress) + 200 * clamp01(input.achievementRatio) + (input.tutorialDone ? 50 : 0);
  return Math.round(s);
}

/** Blackjack skill score (0–1000): Wilson lower bound of basic-strategy accuracy. */
export function blackjackSkill(correct: number, decisions: number): number {
  return Math.round(1000 * wilsonLower(correct, decisions));
}

/** Season points from a round, with a daily cap handled by the server ledger. */
export const SP = { round: 2, roundDailyCap: 200, lesson: 30, quiz: 20, achievement: 50, sngWin: 120, sngTop3: 50 } as const;

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
