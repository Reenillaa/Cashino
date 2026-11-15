// Economy simulation used to choose the starting balance and reward sizes (docs/06-ECONOMY.md).
// Uses the real game engine (Node ≥ 22.18 strips TypeScript types natively).
// Run: node scripts/economy-sim.mjs
import { seededRng } from '../src/engine/rng/rng.ts';
import { playDice } from '../src/engine/games/dice.ts';
import { crashPoint, settleCrash } from '../src/engine/games/crash.ts';
import { playPlinko } from '../src/engine/games/plinko.ts';
import { playRoulette } from '../src/engine/games/roulette.ts';
import { minesMultiplier, surviveChance } from '../src/engine/games/mines.ts';
import { ECONOMY, dailyRewardAmount } from '../src/engine/meta/economy.ts';

const rng = seededRng(2026);
// One "round" from a realistic mix of games (weights from expected usage).
function round(bet) {
  const r = rng.float();
  if (r < 0.25) return playDice(rng, bet, 'under', 50).payout;
  if (r < 0.45) return settleCrash(bet, crashPoint(rng), 2).payout;
  if (r < 0.6) return playPlinko(rng, bet, 12, 'medium').payout;
  if (r < 0.75) return playRoulette(rng, [{ bet: { kind: 'red' }, amount: bet }]).payout;
  if (r < 0.9) return rng.float() < surviveChance(3, 4) ? Math.floor(bet * minesMultiplier(3, 4)) : 0;
  return settleCrash(bet, crashPoint(rng), 10).payout; // occasional high-variance play
}
const PLAYERS = {
  casual: { roundsPerDay: 60, bet: () => 10 },
  regular: { roundsPerDay: 150, bet: (b) => Math.max(10, Math.floor(b * 0.01)) },
  highroller: { roundsPerDay: 200, bet: (b) => Math.max(10, Math.floor(b * 0.05)) },
  reckless: { roundsPerDay: 200, bet: (b) => Math.max(10, Math.floor(b * 0.2)) },
};
function simulate(start, kind, days = 30, n = 400) {
  const p = PLAYERS[kind];
  let bustDay1 = 0, bustWeek1 = 0, refillDays = 0, endBal = [];
  for (let i = 0; i < n; i++) {
    let bal = start, streak = 0, firstBust = Infinity;
    for (let d = 0; d < days; d++) {
      streak = Math.min(7, streak + 1);
      bal += dailyRewardAmount(streak);
      let refills = 0;
      for (let k = 0; k < p.roundsPerDay; k++) {
        if (bal < ECONOMY.minBet || bal < 10) {
          if (refills < ECONOMY.refillsPerDay) { bal = ECONOMY.refillAmount; refills++; firstBust = Math.min(firstBust, d); } else break;
        }
        const bet = Math.min(bal, p.bet(bal));
        bal += round(bet) - bet;
      }
      if (refills) refillDays++;
    }
    if (firstBust === 0) bustDay1++;
    if (firstBust < 7) bustWeek1++;
    endBal.push(bal);
  }
  endBal.sort((a, b) => a - b);
  return { bustDay1: bustDay1 / n, bustWeek1: bustWeek1 / n, refillDayShare: refillDays / (n * days), medianDay30: endBal[Math.floor(n / 2)] };
}
const rows = [];
for (const start of [2000, 5000, 10000, 25000]) {
  for (const kind of Object.keys(PLAYERS)) rows.push({ start, kind, ...simulate(start, kind) });
}
console.log('| Start | Player | Bust day 1 | Bust week 1 | Days needing refill | Median balance day 30 |');
console.log('|---|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.start} | ${r.kind} | ${(r.bustDay1 * 100).toFixed(1)} % | ${(r.bustWeek1 * 100).toFixed(1)} % | ${(r.refillDayShare * 100).toFixed(1)} % | ${r.medianDay30} |`);
