import type { Rng } from '../rng/rng.ts';
import { chenScore, evaluate, HandCategory } from './evaluator.ts';
import { monteCarloEquity } from './equity.ts';
import { legalActions, potTotal, type PokerAction, type TableState } from './table.ts';

/**
 * Poker bots. They only see what a human in their seat would see (their own cards, the board, the
 * public action) — never the deck or other hole cards. They are always labelled as bots in the UI.
 */
export type BotDifficulty = 'easy' | 'medium' | 'advanced';
export type BotStyle = 'rock' | 'shark' | 'maniac' | 'station';

export interface BotProfile {
  id: string;
  style: BotStyle;
  difficulty: BotDifficulty;
}

interface StyleParams {
  /** Minimum Chen score to enter the pot preflop (unraised / facing a raise). */
  openChen: number;
  callRaiseChen: number;
  /** Equity margin over pot odds required to call. */
  callMargin: number;
  /** Equity needed to bet/raise for value. */
  valueEquity: number;
  bluff: number;
  sizing: number; // fraction of pot
}

const STYLES: Record<BotStyle, StyleParams> = {
  rock: { openChen: 9, callRaiseChen: 11, callMargin: 0.08, valueEquity: 0.72, bluff: 0.02, sizing: 0.6 },
  shark: { openChen: 7, callRaiseChen: 9, callMargin: 0.02, valueEquity: 0.62, bluff: 0.12, sizing: 0.7 },
  maniac: { openChen: 4, callRaiseChen: 6, callMargin: -0.04, valueEquity: 0.5, bluff: 0.3, sizing: 1.0 },
  station: { openChen: 4, callRaiseChen: 5, callMargin: -0.1, valueEquity: 0.8, bluff: 0.03, sizing: 0.5 },
};

const ITER: Record<BotDifficulty, number> = { easy: 0, medium: 180, advanced: 420 };

export const BOT_ROSTER: BotProfile[] = [
  { id: 'bot-rock-e', style: 'rock', difficulty: 'easy' },
  { id: 'bot-station-e', style: 'station', difficulty: 'easy' },
  { id: 'bot-shark-m', style: 'shark', difficulty: 'medium' },
  { id: 'bot-maniac-m', style: 'maniac', difficulty: 'medium' },
  { id: 'bot-rock-a', style: 'rock', difficulty: 'advanced' },
  { id: 'bot-shark-a', style: 'shark', difficulty: 'advanced' },
  { id: 'bot-maniac-a', style: 'maniac', difficulty: 'advanced' },
];

function roundTo(x: number, step: number) {
  return Math.max(step, Math.round(x / step) * step);
}

/** Decides an action for the seat to act. Pure given the RNG. */
export function botDecide(t: TableState, profile: BotProfile, rng: Rng): PokerAction {
  const h = t.hand!;
  const legal = legalActions(t)!;
  const me = h.players.find((p) => p.seat === legal.seat)!;
  const st = STYLES[profile.style];
  const pot = potTotal(h);
  const toCall = legal.callAmount;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const opponents = h.players.filter((p) => !p.folded && p.seat !== me.seat).length;
  const bb = Math.max(1, h.minRaise);
  const noise = profile.difficulty === 'easy' ? 0.15 : profile.difficulty === 'medium' ? 0.06 : 0.02;
  const r = rng.float();

  const raiseTo = (fraction: number): PokerAction => {
    const target = me.bet + toCall + Math.max(legal.minRaiseTo - h.currentBet, fraction * (pot + toCall));
    const to = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, roundTo(target, Math.max(1, Math.floor(bb / 2)))));
    return { type: legal.canBet ? 'bet' : 'raise', amount: to };
  };
  const passive = (): PokerAction => (legal.canCheck ? { type: 'check' } : { type: 'fold' });
  const call = (): PokerAction => (legal.canCheck ? { type: 'check' } : { type: 'call' });
  const canAggress = legal.canBet || legal.canRaise;

  if (h.street === 'preflop') {
    let chen = chenScore(me.hole[0], me.hole[1]) + (rng.float() - 0.5) * noise * 20;
    // Late position widens ranges for thinking bots.
    const n = t.seats.length;
    const posFromButton = (me.seat - h.button + n) % n;
    if (profile.difficulty !== 'easy' && (posFromButton === 0 || posFromButton === n - 1)) chen += 1;
    const facingRaise = h.currentBet > h.minRaise && toCall > 0 && h.log.some((l) => l.street === 'preflop' && (l.type === 'raise' || l.type === 'bet'));
    const need = facingRaise ? st.callRaiseChen : st.openChen;
    if (chen >= need + 4 && canAggress && r > 0.15) return raiseTo(st.sizing);
    if (chen >= need) {
      if (!facingRaise && canAggress && r < (profile.style === 'maniac' ? 0.7 : profile.style === 'station' ? 0.1 : 0.45)) return raiseTo(st.sizing * 0.8);
      if (toCall > me.bet + t.seats[me.seat]!.stack * 0.5 && chen < need + 3 && profile.style !== 'station') return passive();
      return call();
    }
    if (canAggress && r < st.bluff * 0.5) return raiseTo(st.sizing);
    return passive();
  }

  // Post-flop
  let equity: number;
  if (ITER[profile.difficulty] === 0) {
    const cat = evaluate([...me.hole, ...h.board]).category;
    equity = [0.25, 0.5, 0.68, 0.78, 0.84, 0.88, 0.94, 0.98, 1][cat] + (rng.float() - 0.5) * 0.3;
    equity = Math.pow(Math.max(0.01, equity), Math.max(1, opponents * 0.6));
  } else {
    const aggressors = h.log.filter((l) => l.street === h.street && (l.type === 'bet' || l.type === 'raise') && l.seat !== me.seat).length;
    const rangeFloor = profile.difficulty === 'advanced' && aggressors > 0 ? 6 + aggressors : -Infinity;
    equity = monteCarloEquity(rng, me.hole, h.board, opponents, ITER[profile.difficulty], rangeFloor);
    equity += (rng.float() - 0.5) * noise;
  }
  const strongMade = evaluate([...me.hole, ...h.board]).category >= HandCategory.TwoPair;

  if (equity >= st.valueEquity && canAggress) return raiseTo(st.sizing * (strongMade ? 1 : 0.75));
  if (toCall === 0) {
    if (canAggress && r < st.bluff && (profile.difficulty !== 'easy' || r < st.bluff / 2)) return raiseTo(st.sizing * 0.6);
    return { type: 'check' };
  }
  if (equity >= potOdds + st.callMargin) return { type: 'call' };
  if (canAggress && r < st.bluff * 0.4 && profile.difficulty === 'advanced') return raiseTo(st.sizing);
  return { type: 'fold' };
}
