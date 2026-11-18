import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, PressableScale, T, formatCoins } from '@/design/components';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { useT } from '@/i18n';
import { betKey, drawFire, spinRoulette, type PlacedBet, type RouletteOutcome } from '@/engine/games/roulette.ts';
import { useGameSession, PlayError } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { useDesktop } from '@/design/layout';
import { useProgress } from '@/state/progress';
import { GameShell } from '../shared/GameShell';
import { ResultBanner } from '../shared/ResultBanner';
import { BetInput } from '../shared/BetInput';
import { useBet, usePlayErrors, useResult } from '../shared/hooks';
import { useBigWin } from '../lineslot/BigWin';
import { Countdown, LastNumbers, RouletteStage, SPIN, type SpinInfo } from './Stage';
import { BetOverlay, type BoardMode } from './Overlay';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/** A spin every 30 s from the moment you sit down: 20.4 s to bet, a breath, then 9 s of ball. */
export const ROUND = { bet: 20_400, lead: 600, cycle: 30_000 };
const mathRng = { float: () => Math.random() };

type Phase = 'betting' | 'spinning';
type Bets = Record<string, PlacedBet>;

export default function RouletteScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const focused = useIsFocused();
  const desktop = useDesktop();
  const s = useGameSession('roulette');
  const chips = [...new Set([...s.room.chips, s.room.max])].sort((a, b) => a - b);
  const [chip, setChip] = useBet('roulette', { ...s.room, min: chips[0] });
  const [bets, setBets] = useState<Bets>({});
  const [stack, setStack] = useState<string[][]>([]); // undo groups (a call bet is one step)
  const [phase, setPhase] = useState<Phase>('betting');
  const [opensAt, setOpensAt] = useState<number | null>(null);
  const [spin, setSpin] = useState<SpinInfo | null>(null);
  const [lastNums, setLastNums] = useState<{ n: number; fire?: number | null; key: string }[]>(() =>
    useProgress.getState().history.filter((x) => x.game === 'roulette').slice(0, 12).map((x) => ({ n: Number(x.detail), key: x.id })).filter((x) => Number.isInteger(x.n)),
  );
  const [board, setBoard] = useState<BoardMode | null>(null);
  const [box, setBox] = useState({ w: 360, h: 480 });
  const { result, show } = useResult();
  const big = useBigWin('ember');
  const onError = usePlayErrors();
  const lastBets = useRef<Bets>({});
  const betsRef = useRef<Bets>({});
  const [hasLast, setHasLast] = useState(false);
  useEffect(() => {
    betsRef.current = bets;
  }, [bets]);
  const total = Object.values(bets).reduce((a, b) => a + b.amount, 0);
  const vertical = !desktop && box.h > box.w * 1.05;


  const add = useCallback(
    (list: PlacedBet[]) => {
      if (phase !== 'betting') return;
      const sum = list.reduce((a, b) => a + b.amount, 0);
      const cur = Object.values(betsRef.current).reduce((a, b) => a + b.amount, 0);
      if (cur + sum > s.balance) return onError(new PlayError('insufficient'));
      if (cur + sum > s.room.max) return onError(new PlayError(`room_max:${s.room.max}`));
      const keys: string[] = [];
      setBets((b) => {
        const nb = { ...b };
        for (const x of list) {
          const k = betKey(x.bet);
          keys.push(k);
          nb[k] = { bet: x.bet, amount: (nb[k]?.amount ?? 0) + x.amount };
        }
        return nb;
      });
      setStack((st) => [...st, list.map((x) => `${betKey(x.bet)}|${x.amount}`)]);
      sfx('chip');
      haptic.select();
      tutorialEvent('roulette', 'roulette:place');
    },
    [phase, s.balance, s.room.max, onError],
  );
  const undo = () => {
    const top = stack[stack.length - 1];
    if (!top) return;
    setStack((st) => st.slice(0, -1));
    setBets((b) => {
      const nb = { ...b };
      for (const it of top) {
        const [k, a] = it.split('|');
        const left = (nb[k]?.amount ?? 0) - Number(a);
        if (left <= 0) delete nb[k];
        else nb[k] = { ...nb[k], amount: left };
      }
      return nb;
    });
    sfx('chip', 0.4);
  };
  const clear = () => {
    setBets({});
    setStack([]);
  };
  const repeat = () => {
    const lb = lastBets.current;
    const sum = Object.values(lb).reduce((a, b) => a + b.amount, 0);
    if (sum && !total) add(Object.values(lb));
  };
  const double = () => total && add(Object.values(bets));

  // betting closes → the bets are played (or the wheel spins on its own) → 9 s of ball → next round
  useEffect(() => {
    if (opensAt === null || !focused) return;
    const closeAt = opensAt + ROUND.bet;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const close = async () => {
      setPhase('spinning');
      setBoard(null);
      const placed = Object.values(betsRef.current);
      const sum = placed.reduce((a, b) => a + b.amount, 0);
      const at = closeAt + ROUND.lead;
      const key = `${opensAt}`;
      let outcome: (RouletteOutcome & { stake: number }) | null = null;
      if (sum > 0 && sum >= s.room.min) {
        try {
          const r = await s.op('play', { bets: placed });
          const v = r.view as unknown as RouletteOutcome;
          outcome = { ...v, payout: r.payout, stake: sum };
        } catch (e) {
          onError(e);
        }
      } else if (sum > 0) {
        useProgress.getState().pushToast({ kind: 'info', title: t('play.rl.tooSmall', { min: formatCoins(s.room.min) }) });
      }
      // nobody bet (or it failed): the wheel still spins, just for show
      const number = outcome ? outcome.number : spinRoulette(mathRng);
      const fire = outcome ? outcome.fire : drawFire(mathRng);
      setSpin({ at, number, fire, key });
      timers.push(
        setTimeout(() => {
          const hit = fire.find((f) => f.n === number)?.m ?? null;
          setLastNums((l) => [{ n: number, fire: hit, key }, ...l].slice(0, 14));
          if (outcome) {
            lastBets.current = betsRef.current;
            setHasLast(true);
            clear();
            void big.celebrate(outcome.stake ? outcome.payout / outcome.stake : 0, outcome.payout).then(() =>
              show({ bet: outcome!.stake, payout: outcome!.payout, label: `${number}${hit ? ` 🔥×${hit}` : ''}` }),
            );
            tutorialEvent('roulette', 'roulette:spin');
          }
        }, Math.max(0, at + SPIN.reveal - Date.now())),
      );
      timers.push(
        setTimeout(() => {
          setPhase('betting');
          setOpensAt(opensAt + ROUND.cycle);
        }, Math.max(0, opensAt + ROUND.cycle - Date.now())),
      );
    };
    timers.push(setTimeout(() => void close(), Math.max(0, closeAt - Date.now())));
    return () => timers.forEach(clearTimeout);
  }, [opensAt, focused]); // eslint-disable-line react-hooks/exhaustive-deps
  // coming back to the table: start a fresh round
  useEffect(() => {
    if (!focused || opensAt === null || Date.now() <= opensAt + ROUND.cycle) return;
    const id = setTimeout(() => {
      setPhase('betting');
      setOpensAt(Date.now());
    }, 0);
    return () => clearTimeout(id);
  }, [focused]); // eslint-disable-line react-hooks/exhaustive-deps

  const openBoard = (m: BoardMode) => {
    if (phase !== 'betting') return;
    setBoard(m);
    sfx('card', 0.5);
    haptic.light();
    tutorialEvent('roulette', 'roulette:board');
  };
  const prev = lastNums[0]?.n ?? null;
  const clockEl = opensAt !== null ? <Countdown opensAt={opensAt} closesAt={opensAt + ROUND.bet} label={t('play.rl.place')} closed={phase === 'spinning' ? t('play.rl.closed') : null} compact={!desktop} /> : null;
  const tools = (
    <View style={styles.tools}>
      <View style={styles.total}>
        <T variant="caption" style={{ color: 'rgba(255,227,176,0.7)' }}>{t('play.totalBet')}</T>
        <T weight="display" tabular style={{ color: total && total < s.room.min ? '#FFB938' : '#fff', fontSize: 15 }}>{formatCoins(total)}</T>
      </View>
      <Tool icon="refresh" label={t('play.repeat')} onPress={repeat} disabled={phase !== 'betting' || total > 0 || !hasLast} />
      <Tool text="×2" label={t('play.rl.double')} onPress={double} disabled={phase !== 'betting' || !total} />
      <Tool icon="arrowDown" rotate label={t('play.undo')} onPress={undo} disabled={phase !== 'betting' || !stack.length} />
      <Tool icon="trash" label={t('common.clear')} onPress={clear} disabled={phase !== 'betting' || !total} />
    </View>
  );
  return (
    <GameShell
      game="roulette"
      mode={s.mode}
      balance={s.balance}
      locked={total > 0 || phase === 'spinning'}
      forceTutorial={forceTutorial}
      wideStage
      stage={
        <View
          style={styles.stage}
          onLayout={(e) => {
            setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
            // the clock starts when you sit at the table
            if (opensAt === null) setOpensAt(Date.now());
          }}
        >
          <RouletteStage w={box.w} h={box.h} spin={spin} prev={prev} active={focused} compact={!desktop} />
          {/* HUD: the countdown and the last numbers */}
          <View pointerEvents="none" style={[styles.hud, { top: desktop ? 14 : 6 }]}>
            {opensAt !== null && !board ? clockEl : null}
          </View>
          <View pointerEvents="none" style={[styles.last, { bottom: desktop ? 16 : 8 }]}>
            <LastNumbers items={lastNums} compact={!desktop} />
          </View>
          {board ? (
            <BetOverlay
              w={box.w}
              h={box.h}
              vertical={vertical}
              mode={board}
              onMode={setBoard}
              bets={bets}
              chip={chip}
              onAdd={add}
              last={prev}
              disabled={phase !== 'betting'}
              onClose={() => setBoard(null)}
              footer={tools}
              center={desktop ? clockEl : opensAt !== null ? <Countdown opensAt={opensAt} closesAt={opensAt + ROUND.bet} label="" closed={null} compact tiny /> : null}
            />
          ) : null}
          <ResultBanner result={result} compact />
          {big.node}
        </View>
      }
      controls={
        <View style={{ gap: 8 }}>
          {board ? null : tools}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1.1 }}><BetInput value={chip} onChange={setChip} balance={s.balance} min={chips[0]} max={s.room.max} label={t('play.chipValue')} disabled={phase !== 'betting'} options={chips} /></View>
            <View style={{ flex: 1, gap: 6 }}>
              <TutorialTarget id="roulette:board">
                <PressableScale onPress={() => openBoard('table')} disabled={phase !== 'betting'} feedback="select" scaleTo={0.96} accessibilityLabel={t('play.rl.table')} style={[styles.tableBtn, phase !== 'betting' && { opacity: 0.45 }]}>
                  <LinearGradient colors={['#7A1024', '#3A0610']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                  <T weight="display" style={{ color: '#FFE3B0', fontSize: 14 }}>🎯 {t('play.rl.table')}</T>
                </PressableScale>
              </TutorialTarget>
              <FireButton label={t('play.rl.zones')} onPress={() => openBoard('zones')} disabled={phase !== 'betting'} />
            </View>
          </View>
        </View>
      }
    />
  );
}

/** The "nice" zones button: molten gradient with a flame. */
function FireButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} feedback="select" scaleTo={0.96} accessibilityLabel={label} style={[styles.fire, disabled && { opacity: 0.45 }]}>
      <LinearGradient colors={['#FFD06B', '#FF6A1F', '#B8100A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <T weight="display" style={{ color: '#2A0800', fontSize: 14, letterSpacing: 0.3 }}>🔥 {label}</T>
    </PressableScale>
  );
}

function Tool({ icon, text, label, onPress, disabled, rotate }: { icon?: 'refresh' | 'arrowDown' | 'trash'; text?: string; label: string; onPress: () => void; disabled?: boolean; rotate?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={label} hitSlop={6} style={[styles.tool, disabled && { opacity: 0.35 }]}>
      {icon ? (
        <View style={rotate ? { transform: [{ rotate: '90deg' }] } : undefined}><Icon name={icon} size={17} color="#FFE3B0" /></View>
      ) : (
        <T weight="display" style={{ color: '#FFE3B0', fontSize: 13 }}>{text}</T>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, borderRadius: 24, overflow: 'hidden', marginHorizontal: 8 },
  hud: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  last: { position: 'absolute', left: 0, right: 0 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  total: { flex: 1, paddingHorizontal: 12, height: 40, borderRadius: 20, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  tool: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,185,56,0.3)' },
  tableBtn: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,229,138,0.7)' },
  fire: { height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: '#FFE58A', shadowColor: '#FF6A1F', shadowOpacity: 0.7, shadowRadius: 10 },
});
