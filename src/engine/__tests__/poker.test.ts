import { parseCards } from '../cards/cards.ts';
import { seededRng } from '../rng/rng.ts';
import { evaluate, HandCategory, compareHands, chenScore } from '../poker/evaluator.ts';
import * as T from '../poker/table.ts';
import { botDecide, BOT_ROSTER } from '../poker/bots.ts';
import { monteCarloEquity, countOuts } from '../poker/equity.ts';

describe('hand evaluator', () => {
  const cat = (s: string) => evaluate(parseCards(s)).category;
  it('identifies every category', () => {
    expect(cat('Ah Kh Qh Jh Th 2c 3d')).toBe(HandCategory.StraightFlush);
    expect(cat('Ah 2h 3h 4h 5h 9c 9d')).toBe(HandCategory.StraightFlush);
    expect(cat('9h 9s 9d 9c 2h 3c 4d')).toBe(HandCategory.Quads);
    expect(cat('9h 9s 9d 2c 2h 3c 4d')).toBe(HandCategory.FullHouse);
    expect(cat('7h 7s 7d 5c 5h 5d Kd')).toBe(HandCategory.FullHouse);
    expect(cat('Ah 9h 7h 4h 2h Ks Qd')).toBe(HandCategory.Flush);
    expect(cat('5s 6h 7d 8c 9h Ks Kd')).toBe(HandCategory.Straight);
    expect(cat('As 2h 3d 4c 5h Ks Qd')).toBe(HandCategory.Straight);
    expect(cat('Qs Qh Qd 4c 5h Ks 2d')).toBe(HandCategory.Trips);
    expect(cat('Qs Qh 4d 4c 5h Ks 2d')).toBe(HandCategory.TwoPair);
    expect(cat('Qs Qh 4d 7c 5h Ks 2d')).toBe(HandCategory.Pair);
    expect(cat('Qs 9h 4d 7c 5h Ks 2d')).toBe(HandCategory.HighCard);
  });
  it('breaks ties correctly', () => {
    expect(compareHands(parseCards('Ah Kd 7c 7s 2h 3c 9d'), parseCards('Qh Jd 7c 7s 2h 3c 9d'))).toBe(1); // kicker
    expect(compareHands(parseCards('6h 7d 2c 3s 4h 5c Kd'), parseCards('Ah Td 2c 3s 4h 5c Kd'))).toBe(1); // 7-high vs wheel
    expect(compareHands(parseCards('Ah Ad Kc Ks 2h 2c 3d'), parseCards('Ah Ad Kc Ks 2h 2c Qd'))).toBe(-1); // two pair kicker
    expect(compareHands(parseCards('Th Td 2c 3s 4h 9c Kd'), parseCards('Ts Tc 2c 3s 4h 9c Kd'))).toBe(0); // split
    expect(compareHands(parseCards('7h 7s 7d 5c 5h 5d Kd'), parseCards('7h 7s 7d 4c 4h Kd Ks'))).toBe(-1); // 777KK > 77755
  });
  it('returns the five winning cards', () => {
    const r = evaluate(parseCards('Ah Kh Qh Jh Th 2c 3d'));
    expect(r.best).toHaveLength(5);
    expect(r.best.every((c) => c.suit === 'h')).toBe(true);
  });
  it('chen score orders classic hands', () => {
    const c = (s: string) => { const [a, b] = parseCards(s); return chenScore(a, b); };
    expect(c('Ah As')).toBe(20);
    expect(c('Ah Kh')).toBeGreaterThan(c('7h 2c'));
  });
});

describe('equity', () => {
  it('AA vs random ≈ 85 %', () => {
    const e = monteCarloEquity(seededRng(40), parseCards('Ah As'), [], 1, 4000);
    expect(Math.abs(e - 0.852)).toBeLessThan(0.025);
  });
  it('counts flush draw outs', () => {
    expect(countOuts(parseCards('Ah Kh'), parseCards('2h 7h 9c')).outs).toBeGreaterThanOrEqual(9);
  });
});

function table(stacks: number[], config: Partial<T.TableConfig> = {}) {
  let t = T.createTable({ maxSeats: 6, smallBlind: 5, bigBlind: 10, ...config });
  stacks.forEach((s, i) => (t = T.sitDown(t, i, { id: `p${i}`, name: `P${i}`, isBot: false, stack: s, sittingOut: false })));
  return t;
}
const chips = (t: T.TableState) => t.seats.reduce((s, x) => s + (x?.stack ?? 0), 0) + (t.hand && !t.hand.complete ? T.potTotal(t.hand) : 0);

describe('NLHE table', () => {
  it('posts blinds and sets first actor (3-handed)', () => {
    const t = T.startHand(table([1000, 1000, 1000]), seededRng(1));
    const h = t.hand!;
    expect(h.button).toBe(0);
    expect(h.sb).toBe(1);
    expect(h.bb).toBe(2);
    expect(h.toAct).toBe(0);
    expect(T.potTotal(h)).toBe(15);
    expect(h.players.every((p) => p.hole.length === 2)).toBe(true);
  });
  it('heads-up: button posts SB and acts first preflop, last postflop', () => {
    let t = T.startHand(table([1000, 1000]), seededRng(2));
    expect(t.hand!.sb).toBe(t.hand!.button);
    expect(t.hand!.toAct).toBe(t.hand!.button);
    t = T.act(t, t.hand!.toAct!, { type: 'call' });
    expect(t.hand!.toAct).toBe(t.hand!.bb); // BB option
    t = T.act(t, t.hand!.toAct!, { type: 'check' });
    expect(t.hand!.street).toBe('flop');
    expect(t.hand!.board).toHaveLength(3);
    expect(t.hand!.toAct).toBe(t.hand!.bb);
  });
  it('enforces min-raise and turn order', () => {
    let t = T.startHand(table([1000, 1000, 1000]), seededRng(3));
    expect(() => T.act(t, 1, { type: 'call' })).toThrow('Not your turn');
    expect(() => T.act(t, 0, { type: 'raise', amount: 15 })).toThrow();
    t = T.act(t, 0, { type: 'raise', amount: 30 });
    const l = T.legalActions(t)!;
    expect(l.minRaiseTo).toBe(50);
    expect(l.callAmount).toBe(25);
  });
  it('an incomplete all-in raise does not reopen betting', () => {
    // seat0 raises to 100, seat1 (stack 120) all-in to 120 (raise of 20 < 90), seat2 folds → seat0 may only call/fold
    let t = T.startHand(table([1000, 120, 1000]), seededRng(4));
    t = T.act(t, 0, { type: 'raise', amount: 100 });
    t = T.act(t, 1, { type: 'raise', amount: 120 });
    t = T.act(t, 2, { type: 'fold' });
    const l = T.legalActions(t)!;
    expect(l.seat).toBe(0);
    expect(l.canRaise).toBe(false);
    expect(l.callAmount).toBe(20);
  });
  it('fold to a bet awards the pot and returns uncalled chips', () => {
    let t = T.startHand(table([1000, 1000, 1000]), seededRng(5));
    t = T.act(t, 0, { type: 'raise', amount: 300 });
    t = T.act(t, 1, { type: 'fold' });
    t = T.act(t, 2, { type: 'fold' });
    expect(t.hand!.complete).toBe(true);
    expect(t.seats[0]!.stack).toBe(1015);
    expect(chips(t)).toBe(3000);
  });
  it('builds side pots for multiple all-ins', () => {
    const pots = T.buildPots([
      { seat: 0, committed: 100, folded: false } as T.HandPlayer,
      { seat: 1, committed: 300, folded: false } as T.HandPlayer,
      { seat: 2, committed: 500, folded: false } as T.HandPlayer,
      { seat: 3, committed: 500, folded: true } as T.HandPlayer,
    ]);
    expect(pots).toEqual([
      { amount: 400, eligible: [0, 1, 2], winners: [] },
      { amount: 600, eligible: [1, 2], winners: [] },
      { amount: 400, eligible: [2], winners: [] },
    ]);
  });
  it('conserves chips over many random bot hands (property test)', () => {
    const rng = seededRng(6);
    let t = table([800, 1200, 500, 2000, 950, 1500]);
    t = { ...t, seats: t.seats.map((s, i) => s && { ...s, isBot: true, botProfile: BOT_ROSTER[i % BOT_ROSTER.length].id }) };
    const total = chips(t);
    for (let hand = 0; hand < 150 && T.canStartHand(t); hand++) {
      t = T.startHand(t, rng);
      let guard = 0;
      while (!t.hand!.complete && guard++ < 200) {
        const seat = t.hand!.toAct!;
        const profile = BOT_ROSTER[seat % BOT_ROSTER.length];
        t = T.act(t, seat, botDecide(t, { ...profile, difficulty: 'easy' }, rng));
        expect(chips(t)).toBe(total);
      }
      expect(t.hand!.complete).toBe(true);
      expect(chips(t)).toBe(total);
      t.seats.forEach((s) => expect(s!.stack).toBeGreaterThanOrEqual(0));
    }
  });
  it('splits a pot and gives the odd chip left of the button', () => {
    let t = table([1000, 1000, 1000], { ante: 1 });
    t = T.startHand(t, seededRng(7));
    // Force identical hands: replace hole cards and board
    const h = t.hand!;
    h.players[1].hole = parseCards('2c 3d');
    h.players[2].hole = parseCards('2d 3c');
    h.deck = parseCards('4h Ah Kh Qh 5s Js 9s Tc');
    t = T.act(t, 0, { type: 'fold' });
    t = T.act(t, 1, { type: 'call' }); // pot = 3 antes + 10 + 10 = 23 (odd)
    t = T.act(t, 2, { type: 'check' });
    while (!t.hand!.complete) t = T.act(t, t.hand!.toAct!, { type: 'check' });
    expect(t.hand!.board.map((c) => c.rank)).toEqual([14, 13, 12, 11, 10]);
    expect(t.hand!.pots![0].winners).toEqual([1, 2]);
    expect(t.hand!.winnings).toEqual({ 1: 12, 2: 11 });
    expect(chips(t)).toBe(3000);
  });
  it('tournament levels increase and eliminations are recorded', () => {
    let t = table([200, 200, 200], { tournament: { levels: T.DEFAULT_SNG_LEVELS, handsPerLevel: 2 } });
    t = { ...t, seats: t.seats.map((s) => s && { ...s, isBot: true }) };
    const rng = seededRng(8);
    let hands = 0;
    while (!T.tournamentWinner(t) && hands++ < 500) {
      t = T.startHand(t, rng);
      while (!t.hand!.complete) {
        const seat = t.hand!.toAct!;
        t = T.act(t, seat, botDecide(t, { ...BOT_ROSTER[3], difficulty: 'easy' }, rng));
      }
    }
    expect(T.tournamentWinner(t)).not.toBeNull();
    expect(t.eliminated).toHaveLength(2);
    expect(T.currentBlinds(t).bb).toBeGreaterThan(20);
  });
  it('viewFor hides opponents\' cards and the deck', () => {
    const t = T.startHand(table([1000, 1000, 1000]), seededRng(9));
    const v = T.viewFor(t, 'p0');
    expect(v.hand!.deck).toEqual([]);
    expect(v.hand!.players.find((p) => p.id === 'p0')!.hole).toHaveLength(2);
    expect(v.hand!.players.find((p) => p.id === 'p1')!.hole).toHaveLength(0);
  });
});

describe('bots', () => {
  it('only produce legal actions at every difficulty', () => {
    const rng = seededRng(50);
    for (const profile of BOT_ROSTER) {
      let t = table([1000, 1000, 1000, 1000]);
      for (let k = 0; k < 6 && T.canStartHand(t); k++) {
        t = T.startHand(t, rng);
        while (!t.hand!.complete) t = T.act(t, t.hand!.toAct!, botDecide(t, profile, rng));
      }
    }
  });
});
