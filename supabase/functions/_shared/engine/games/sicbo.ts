import { randomInt, type Rng } from '../rng/rng.ts';

/** Sic Bo with three fair dice. Payouts are "x to 1". Small/Big/Odd/Even lose on any triple. */
export type SicBoBet =
  | { kind: 'small' } | { kind: 'big' } | { kind: 'odd' } | { kind: 'even' }
  | { kind: 'total'; total: number } // 4..17
  | { kind: 'single'; face: number } // 1:1 / 2:1 / 3:1 for one, two, three matches
  | { kind: 'double'; face: number } // specific double
  | { kind: 'triple'; face: number } // specific triple
  | { kind: 'anyTriple' }
  | { kind: 'combo'; faces: [number, number] }; // two different specific faces

export const TOTAL_PAYS: Record<number, number> = { 4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60 };
export const SICBO_PAYS = { small: 1, big: 1, odd: 1, even: 1, double: 10, triple: 180, anyTriple: 30, combo: 5 } as const;

const face = (f: number) => {
  if (!Number.isInteger(f) || f < 1 || f > 6) throw new Error('Invalid face');
  return f;
};

export function validateSicBo(bet: SicBoBet): void {
  switch (bet.kind) {
    case 'total': if (!(bet.total in TOTAL_PAYS)) throw new Error('Total must be 4–17'); break;
    case 'single': case 'double': case 'triple': face(bet.face); break;
    case 'combo': if (face(bet.faces[0]) === face(bet.faces[1])) throw new Error('Combo needs two different faces'); break;
    default: break;
  }
}

export function rollSicBo(rng: Rng): [number, number, number] {
  return [randomInt(rng, 6) + 1, randomInt(rng, 6) + 1, randomInt(rng, 6) + 1];
}

/** Returns the total amount returned (stake included) for one bet given the dice. */
export function sicBoReturn(bet: SicBoBet, dice: readonly number[], amount: number): number {
  const sum = dice[0] + dice[1] + dice[2];
  const triple = dice[0] === dice[1] && dice[1] === dice[2];
  const count = (f: number) => dice.filter((d) => d === f).length;
  const win = (pays: number) => amount * (pays + 1);
  switch (bet.kind) {
    case 'small': return !triple && sum >= 4 && sum <= 10 ? win(1) : 0;
    case 'big': return !triple && sum >= 11 && sum <= 17 ? win(1) : 0;
    case 'odd': return !triple && sum % 2 === 1 ? win(1) : 0;
    case 'even': return !triple && sum % 2 === 0 ? win(1) : 0;
    case 'total': return sum === bet.total ? win(TOTAL_PAYS[bet.total]) : 0;
    case 'single': { const c = count(bet.face); return c > 0 ? win(c) : 0; }
    case 'double': return count(bet.face) >= 2 ? win(SICBO_PAYS.double) : 0;
    case 'triple': return count(bet.face) === 3 ? win(SICBO_PAYS.triple) : 0;
    case 'anyTriple': return triple ? win(SICBO_PAYS.anyTriple) : 0;
    case 'combo': return count(bet.faces[0]) >= 1 && count(bet.faces[1]) >= 1 ? win(SICBO_PAYS.combo) : 0;
  }
}

export function sicBoKey(bet: SicBoBet): string {
  switch (bet.kind) {
    case 'total': return `total:${bet.total}`;
    case 'single': case 'double': case 'triple': return `${bet.kind}:${bet.face}`;
    case 'combo': return `combo:${[...bet.faces].sort().join('-')}`;
    default: return bet.kind;
  }
}

/** Exact expected return per unit staked, enumerating all 216 outcomes. */
export function sicBoExpectedReturn(bet: SicBoBet): number {
  let total = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) total += sicBoReturn(bet, [a, b, c], 1);
  return total / 216;
}

export function sicBoWinProbability(bet: SicBoBet): number {
  let w = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) if (sicBoReturn(bet, [a, b, c], 1) > 0) w++;
  return w / 216;
}

export interface SicBoPlaced { bet: SicBoBet; amount: number }
export function playSicBo(rng: Rng, bets: SicBoPlaced[]) {
  bets.forEach((b) => {
    validateSicBo(b.bet);
    if (!Number.isInteger(b.amount) || b.amount <= 0) throw new Error('Invalid amount');
  });
  const dice = rollSicBo(rng);
  const lines = bets.map((b) => ({ ...b, returned: sicBoReturn(b.bet, dice, b.amount) }));
  return { dice, lines, totalBet: bets.reduce((s, b) => s + b.amount, 0), payout: lines.reduce((s, l) => s + l.returned, 0) };
}
