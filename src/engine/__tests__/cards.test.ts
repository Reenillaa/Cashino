import { parseCards, newDeck, cardCode, parseCard } from '../cards/cards.ts';
import { seededRng } from '../rng/rng.ts';
import * as Bac from '../games/baccarat.ts';
import * as BJ from '../games/blackjack.ts';

describe('cards', () => {
  it('deck has 52 unique cards and codes round-trip', () => {
    const d = newDeck();
    expect(new Set(d.map(cardCode)).size).toBe(52);
    d.forEach((c) => expect(parseCard(cardCode(c))).toEqual(c));
  });
});

describe('Baccarat', () => {
  it('values and totals', () => {
    expect(Bac.handTotal(parseCards('Kh 9s'))).toBe(9);
    expect(Bac.handTotal(parseCards('7h 8s'))).toBe(5);
    expect(Bac.handTotal(parseCards('Ah Ts Qd'))).toBe(1);
  });
  it('banker tableau', () => {
    expect(Bac.bankerDraws(3, 8)).toBe(false);
    expect(Bac.bankerDraws(3, 9)).toBe(true);
    expect(Bac.bankerDraws(4, 1)).toBe(false);
    expect(Bac.bankerDraws(4, 2)).toBe(true);
    expect(Bac.bankerDraws(5, 4)).toBe(true);
    expect(Bac.bankerDraws(5, 3)).toBe(false);
    expect(Bac.bankerDraws(6, 6)).toBe(true);
    expect(Bac.bankerDraws(6, null)).toBe(false);
    expect(Bac.bankerDraws(5, null)).toBe(true);
    expect(Bac.bankerDraws(7, 6)).toBe(false);
  });
  it('deals a natural without third cards', () => {
    // order: P1 B1 P2 B2
    const coup = Bac.dealCoup(parseCards('4h 2s 4d 3c 9h 9s'));
    expect(coup.playerTotal).toBe(8);
    expect(coup.natural).toBe(true);
    expect(coup.player).toHaveLength(2);
    expect(coup.winner).toBe('player');
  });
  it('player draws on 5, banker responds by the tableau', () => {
    // P: 2,3 (5) B: 6,Q (6) → player draws 7 → banker (6 vs third 7) draws
    const coup = Bac.dealCoup(parseCards('2h 6s 3d Qc 7h 2c'));
    expect(coup.player).toHaveLength(3);
    expect(coup.banker).toHaveLength(3);
    expect(coup.playerTotal).toBe(2);
    expect(coup.bankerTotal).toBe(8);
    expect(coup.winner).toBe('banker');
  });
  it('settles with commission and pushes on tie', () => {
    const tie = Bac.dealCoup(parseCards('Kh Ks 7d 7c'));
    expect(tie.winner).toBe('tie');
    const s = Bac.settleBaccarat(tie, { player: 100, banker: 100, tie: 10, playerPair: 10 });
    expect(s.results).toEqual({ player: 100, banker: 100, tie: 90, playerPair: 0 });
    const bw = Bac.dealCoup(parseCards('2h 9s 3d Kc Kh'));
    expect(bw.winner).toBe('banker');
    expect(Bac.settleBaccarat(bw, { banker: 100 }).payout).toBe(195);
  });
  it('outcome frequencies match the published 8-deck values', () => {
    const rng = seededRng(30);
    const N = 60000;
    const c = { player: 0, banker: 0, tie: 0 };
    for (let i = 0; i < N; i++) c[Bac.playBaccarat(rng, {}).coup.winner]++;
    expect(Math.abs(c.banker / N - 0.4586)).toBeLessThan(0.006);
    expect(Math.abs(c.player / N - 0.4462)).toBeLessThan(0.006);
    expect(Math.abs(c.tie / N - 0.0952)).toBeLessThan(0.004);
  });
});

describe('Blackjack', () => {
  const shoe = (codes: string) => parseCards(codes);
  it('hand values handle soft aces', () => {
    expect(BJ.handValue(parseCards('Ah 6s'))).toEqual({ total: 17, soft: true });
    expect(BJ.handValue(parseCards('Ah 6s 9d'))).toEqual({ total: 16, soft: false });
    expect(BJ.handValue(parseCards('Ah Ad 9c'))).toEqual({ total: 21, soft: true });
  });
  it('natural blackjack pays 3:2 immediately', () => {
    // P1 D1 P2 D2
    const s = BJ.dealFromShoe(shoe('Ah 9s Kd 7c'), 100);
    expect(s.phase).toBe('settled');
    expect(s.hands[0].outcome).toBe('blackjack');
    expect(s.payout).toBe(250);
  });
  it('dealer blackjack takes only the original bet; BJ vs BJ pushes', () => {
    expect(BJ.dealFromShoe(shoe('9h Ah 9d Kc'), 100)).toMatchObject({ phase: 'settled', payout: 0 });
    expect(BJ.dealFromShoe(shoe('Ah As Kd Kc'), 100)).toMatchObject({ phase: 'settled', payout: 100 });
  });
  it('dealer stands on soft 17', () => {
    let s = BJ.dealFromShoe(shoe('Th Ah 8d 6c 5s'), 10);
    s = BJ.act(s, 'stand');
    expect(BJ.handValue(s.dealer)).toEqual({ total: 17, soft: true });
    expect(s.hands[0].outcome).toBe('win');
  });
  it('double takes exactly one card and doubles the bet', () => {
    let s = BJ.dealFromShoe(shoe('6h 9s 5d 7c Ks 2h'), 50);
    expect(BJ.legalActions(s)).toContain('double');
    expect(BJ.extraStake(s, 'double')).toBe(50);
    s = BJ.act(s, 'double');
    expect(s.hands[0].cards).toHaveLength(3);
    expect(s.totalBet).toBe(100);
    // dealer 9+7=16 draws 2 → 18; player 21 wins
    expect(s.hands[0].outcome).toBe('win');
    expect(s.payout).toBe(200);
  });
  it('splits pairs and aces get one card each', () => {
    let s = BJ.dealFromShoe(shoe('Ah 9s Ad 7c Ks 5h 8c'), 10);
    expect(BJ.legalActions(s)).toContain('split');
    s = BJ.act(s, 'split');
    expect(s.hands).toHaveLength(2);
    expect(s.hands.every((h) => h.cards.length === 2 && h.done)).toBe(true);
    expect(s.phase).toBe('settled');
    expect(s.hands[0].outcome).toBe('win'); // A+K = 21 (not blackjack) vs 16+? dealer
    expect(s.hands[0].payout).toBe(20);
    expect(s.totalBet).toBe(20);
  });
  it('rejects illegal actions', () => {
    let s = BJ.dealFromShoe(shoe('6h 9s 5d 7c 2s 2h 2c'), 10);
    expect(() => BJ.act(s, 'split')).toThrow();
    s = BJ.act(s, 'hit');
    expect(BJ.legalActions(s)).not.toContain('double');
  });
  it('basic strategy spot checks (6D S17 DAS)', () => {
    const up = (c: string) => parseCards(c)[0];
    expect(BJ.basicStrategy(parseCards('8h 8s'), up('Th'), true, true)).toBe('split');
    expect(BJ.basicStrategy(parseCards('Th Ts'), up('6h'), true, true)).toBe('stand');
    expect(BJ.basicStrategy(parseCards('6h 5s'), up('Ah'), true, true)).toBe('hit');
    expect(BJ.basicStrategy(parseCards('6h 5s'), up('Th'), true, true)).toBe('double');
    expect(BJ.basicStrategy(parseCards('Th 2s'), up('3h'), true, true)).toBe('hit');
    expect(BJ.basicStrategy(parseCards('Th 2s'), up('4h'), true, true)).toBe('stand');
    expect(BJ.basicStrategy(parseCards('Ah 7s'), up('9h'), true, true)).toBe('hit');
    expect(BJ.basicStrategy(parseCards('Ah 7s'), up('5h'), true, true)).toBe('double');
    expect(BJ.basicStrategy(parseCards('Ah 7s'), up('5h'), false, true)).toBe('stand');
    expect(BJ.basicStrategy(parseCards('9h 9s'), up('7h'), true, true)).toBe('stand');
    expect(BJ.basicStrategy(parseCards('5h 5s'), up('9h'), true, true)).toBe('double');
    expect(BJ.basicStrategy(parseCards('Ah As'), up('Ah'), true, false)).toBe('hit');
  });
  it('basic strategy RTP is in the expected range (≈ 99.5 %)', () => {
    const rng = seededRng(31);
    const N = 30000;
    let bet = 0, ret = 0, correct = 0, total = 0;
    for (let i = 0; i < N; i++) {
      let s = BJ.dealBlackjack(rng, 10);
      while (s.phase === 'player') {
        const legal = BJ.legalActions(s);
        const h = s.hands[s.active];
        s = BJ.act(s, BJ.basicStrategy(h.cards, s.dealer[0], legal.includes('double'), legal.includes('split')));
      }
      bet += s.totalBet;
      ret += s.payout;
      correct += s.decisions.filter((d) => d.action === d.optimal).length;
      total += s.decisions.length;
    }
    const rtp = ret / bet;
    expect(rtp).toBeGreaterThan(0.975);
    expect(rtp).toBeLessThan(1.015);
    expect(correct).toBe(total);
    expect(BJ.decisionAccuracy([])).toBe(0);
  });
  it('public view hides the hole card', () => {
    const s = BJ.dealFromShoe(shoe('6h 9s 5d 7c Ks'), 10);
    const v = BJ.publicBlackjack(s);
    expect(v.dealer).toHaveLength(1);
    expect('shoe' in v).toBe(false);
  });
});
