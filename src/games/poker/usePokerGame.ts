import { useCallback, useEffect, useRef, useState } from 'react';
import * as P from '@/engine/poker/table.ts';
import { botDecide, BOT_ROSTER, type BotDifficulty, type BotProfile, type BotStyle } from '@/engine/poker/bots.ts';
import { monteCarloEquity } from '@/engine/poker/equity.ts';
import { seededRng } from '@/engine/rng/rng.ts';
import { secureRng } from '@/services/random';
import { useWallet } from '@/state/wallet';
import { useProgress } from '@/state/progress';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

export const HERO = 'hero';
export interface PokerSetup {
  format: 'cash' | 'sng';
  opponents: number; // 1..5
  difficulty: BotDifficulty;
  stakes: { sb: number; bb: number; buyIn: number };
  practice: boolean;
}

const STYLES: BotStyle[] = ['shark', 'rock', 'maniac', 'station', 'shark'];

/** Local table vs bots. Bots only see public info + their own cards (engine-enforced via botDecide). */
export function usePokerGame() {
  const [table, setTable] = useState<P.TableState | null>(null);
  const [setup, setSetup] = useState<PokerSetup | null>(null);
  const [equityState, setEquityState] = useState<{ key: string; value: number } | null>(null);
  const [finished, setFinished] = useState<{ place: number; prize: number } | null>(null);
  const profiles = useRef<Record<string, BotProfile>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableRef = useRef<P.TableState | null>(null);
  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => clear(), []);

  const start = useCallback((s: PokerSetup) => {
    const wallet = useWallet.getState();
    const cost = s.format === 'sng' ? s.stakes.buyIn : s.stakes.buyIn;
    const ok = s.practice ? wallet.practiceDebit(cost) : wallet.debit(cost, 'bet', 'poker');
    if (!ok) return false;
    const seats = Math.min(6, s.opponents + 1);
    let t = P.createTable({
      maxSeats: seats,
      smallBlind: s.stakes.sb,
      bigBlind: s.stakes.bb,
      tournament: s.format === 'sng' ? { levels: P.DEFAULT_SNG_LEVELS, handsPerLevel: 6 } : undefined,
    });
    const startStack = s.format === 'sng' ? 1500 : s.stakes.buyIn;
    t = P.sitDown(t, 0, { id: HERO, name: 'You', isBot: false, stack: startStack, sittingOut: false });
    profiles.current = {};
    for (let i = 1; i < seats; i++) {
      const style = STYLES[(i - 1) % STYLES.length];
      const id = `bot-${style}-${i}`;
      profiles.current[id] = { id, style, difficulty: s.difficulty };
      t = P.sitDown(t, i, { id, name: style, isBot: true, botProfile: id, stack: startStack, sittingOut: false, avatar: `a${i * 5}` });
    }
    setSetup(s);
    setFinished(null);
    t = P.startHand(t, secureRng);
    setTable(t);
    sfx('card');
    return true;
  }, []);

  const afterHand = useCallback((t: P.TableState) => {
    const h = t.hand!;
    const heroWon = (h.winnings?.[0] ?? 0) > 0;
    const heroPlayer = h.players.find((p) => p.id === HERO);
    if (heroPlayer) {
      const committed = heroPlayer.committed;
      useProgress.getState().recordRound(
        { game: 'poker', ts: Date.now(), bet: committed, payout: h.winnings?.[0] ?? 0, practice: !!setup?.practice, detail: heroWon ? '✓' : heroPlayer.folded ? 'fold' : '✗' },
        { multiStep: true },
      );
    }
    if (heroWon) {
      sfx('win');
      haptic.success();
    }
    tutorialEvent('poker', 'poker:handEnd');
  }, [setup]);

  const step = useCallback(() => {
    const t = tableRef.current;
    if (!t?.hand) return;
    if (t.hand.complete) {
      // Tournament end / bust handling
      if (setup?.format === 'sng') {
        const winner = P.tournamentWinner(t);
        const heroOut = t.eliminated.includes(HERO);
        if (winner || heroOut) {
          const total = t.seats.length;
          const place = winner?.id === HERO ? 1 : total - t.eliminated.indexOf(HERO);
          const pool = setup.stakes.buyIn * total;
          const prize = place === 1 ? Math.floor(pool * 0.65) : place === 2 ? Math.floor(pool * 0.35) : 0;
          if (prize > 0) {
            if (setup.practice) useWallet.getState().practiceCredit(prize);
            else useWallet.getState().credit(prize, 'payout', 'poker');
          }
          setFinished({ place, prize });
          return;
        }
      } else if ((t.seats[0]?.stack ?? 0) === 0) {
        setFinished({ place: 0, prize: 0 });
        return;
      }
      // Cash: bots that busted rebuy so the table keeps going.
      let nt = t;
      if (setup?.format === 'cash') {
        nt = { ...t, seats: t.seats.map((s, i) => (s && i > 0 && s.stack === 0 ? { ...s, stack: setup.stakes.buyIn } : s)) };
      }
      if (!P.canStartHand(nt)) return;
      timer.current = setTimeout(() => {
        const next = P.startHand(nt, secureRng);
        setTable(next);
        sfx('card');
      }, 2600);
      return;
    }
    const seat = t.hand.toAct;
    if (seat === null) return;
    const info = t.seats[seat]!;
    if (!info.isBot) {
      haptic.light();
      return; // wait for hero
    }
    const profile = profiles.current[info.id] ?? { ...BOT_ROSTER[0], id: info.id };
    timer.current = setTimeout(() => {
      const cur = tableRef.current!;
      if (!cur.hand || cur.hand.toAct !== seat) return;
      const action = botDecide(cur, profile, seededRng((Date.now() ^ (seat * 7919)) >>> 0));
      const next = P.act(cur, seat, action);
      sfx(action.type === 'fold' ? 'flip' : action.type === 'check' ? 'tap' : 'chip', 0.7);
      setTable(next);
      if (next.hand?.complete) afterHand(next);
    }, 550 + Math.random() * 650);
  }, [setup, afterHand]);

  useEffect(() => {
    clear();
    step();
  }, [table, step]);

  // Equity for the hero (Offsuit-style "win %" panel), computed off the critical path and keyed by the
  // situation, so a stale value is never shown.
  const h = table?.hand;
  const hero = h?.players.find((p) => p.id === HERO);
  const opp = h ? h.players.filter((p) => !p.folded && p.id !== HERO).length : 0;
  const eqKey = h && hero && !hero.folded && !h.complete ? `${h.number}:${h.board.length}:${opp}` : '';
  useEffect(() => {
    if (!eqKey || !h || !hero) return;
    const id = setTimeout(() => setEquityState({ key: eqKey, value: monteCarloEquity(secureRng, hero.hole, h.board, opp, 400) }), 30);
    return () => clearTimeout(id);
  }, [eqKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const equity = eqKey && equityState?.key === eqKey ? equityState.value : null;

  const heroAct = useCallback((a: P.PokerAction) => {
    const t = tableRef.current;
    if (!t?.hand || t.hand.toAct !== 0) return;
    const next = P.act(t, 0, a);
    sfx(a.type === 'fold' ? 'flip' : a.type === 'check' ? 'tap' : 'chip');
    tutorialEvent('poker', 'poker:act');
    setTable(next);
    if (next.hand?.complete) afterHand(next);
  }, [afterHand]);

  const leave = useCallback(() => {
    clear();
    const t = tableRef.current;
    if (t && setup?.format === 'cash') {
      // Leaving mid-hand counts as folding: chips already in the pot stay there.
      const stack = t.seats[0]?.stack ?? 0;
      if (stack > 0) {
        if (setup.practice) useWallet.getState().practiceCredit(stack);
        else useWallet.getState().credit(stack, 'payout', 'poker');
      }
    }
    setTable(null);
    setSetup(null);
    setFinished(null);
  }, [setup]);

  const rebuy = useCallback(() => {
    const t = tableRef.current;
    if (!t || !setup) return;
    const w = useWallet.getState();
    const ok = setup.practice ? w.practiceDebit(setup.stakes.buyIn) : w.debit(setup.stakes.buyIn, 'bet', 'poker');
    if (!ok) return;
    const nt = { ...t, seats: t.seats.map((s, i) => (i === 0 && s ? { ...s, stack: s.stack + setup.stakes.buyIn } : s)) };
    setFinished(null);
    setTable(P.canStartHand(nt) ? P.startHand(nt, secureRng) : nt);
  }, [setup]);

  return { table, setup, equity, finished, start, heroAct, leave, rebuy };
}
