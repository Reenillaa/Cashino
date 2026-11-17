import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PAYLINES, REELS, ROWS } from '@/engine/games/lineslot.ts';
import { PARROT, type PirateSpin } from '@/engine/games/pirate.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { PirateSymbol } from '../lineslot/Symbols2';
import { Machine, reelTimes } from '../lineslot/Machine';
import { useBigWin } from '../lineslot/BigWin';
import { Ambient } from '../lineslot/Ambient';
import { SLOT_THEMES } from '../lineslot/WinFx';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tileOf = (c: number): [string, string] | null =>
  c === PARROT ? ['#12C08A', '#0B4E32'] : c === 7 ? ['#FFD06B', '#8A5200'] : c === 6 || c === 5 ? ['#A996FF', '#2A1E7A'] : null;
const START = [[0, 3, 1], [6, PARROT, 2], [5, 4, 7], [1, 0, 3], [2, 6, 4]];
const fillCode = () => (Math.random() < 0.03 ? PARROT : Math.floor(Math.random() * 8));
const parrotsOf = (g: number[][]) => {
  const out: { reel: number; row: number }[] = [];
  g.forEach((col, reel) => col.forEach((c, row) => (c === PARROT ? out.push({ reel, row }) : null)));
  return out;
};

/** A parrot held over its cell while the reels spin; it walks one reel to the left (and off the edge from reel 1). */
function Walker({ reel, row, cell, turbo }: { reel: number; row: number; cell: number; turbo: boolean }) {
  const { reduceMotion } = useTheme();
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  useEffect(() => {
    const d = reduceMotion ? 0 : turbo ? 260 : 520;
    x.set(withTiming(-cell, { duration: d, easing: Easing.inOut(Easing.cubic) }));
    if (reel === 0) o.set(withTiming(0, { duration: d }));
  }, [x, o, cell, reel, reduceMotion, turbo]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateX: x.value }, { translateY: -Math.sin((Math.abs(x.value) / cell) * Math.PI) * cell * 0.18 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.walker, { left: reel * cell + 3, top: row * cell + 3, width: cell - 6, height: cell - 6, borderRadius: cell * 0.2 }, st]}>
      <LinearGradient colors={['#12C08A', '#0B4E32']} style={StyleSheet.absoluteFill} />
      <View><PirateSymbol code={PARROT} size={cell * 0.84} /></View>
    </Animated.View>
  );
}

export default function PirateScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('pirate');
  const [bet, setBet] = useBet('pirate', s.room);
  const [grid, setGrid] = useState<number[][]>(START);
  const [prev, setPrev] = useState<number[][]>(START);
  const [spinKey, setSpinKey] = useState(0);
  const [lines, setLines] = useState<number[]>([]);
  const [cells, setCells] = useState<{ reel: number; row: number }[]>([]);
  const [walkers, setWalkers] = useState<{ reel: number; row: number }[]>([]);
  const [walkKey, setWalkKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [won, setWon] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [respin, setRespin] = useState(0);
  const [box, setBox] = useState({ w: 360, h: 460 });
  const { result, show } = useResult();
  const big = useBigWin('coin');
  const onError = usePlayErrors();
  const history = useGameHistory('pirate', (d) => d);
  const skip = useRef(false);
  const cell = Math.floor(Math.max(44, Math.min((box.w - 44) / REELS, (box.h - 190) / ROWS, 86)));
  const pause = (ms: number) => (skip.current || reduceMotion ? Promise.resolve() : wait(ms * (turbo ? 0.55 : 1)));
  const render = (code: number, size: number) => <PirateSymbol code={code} size={size} />;

  const playSpin = async (sp: PirateSpin, acc: number, held: { reel: number; row: number }[]) => {
    setLines([]);
    setCells([]);
    setPrev(grid);
    setGrid(sp.grid);
    setSpinKey((k) => k + 1);
    sfx('roll', 0.4);
    const times = reelTimes(turbo, []);
    if (!skip.current && !reduceMotion) times.forEach((ms) => setTimeout(() => sfx('land', 0.5), ms));
    await (skip.current || reduceMotion ? Promise.resolve() : wait(times[REELS - 1] + 260));
    if (held.length) setWalkers([]);
    if (sp.total > 0) {
      setLines(sp.lines.map((l) => l.line));
      const lit: { reel: number; row: number }[] = [];
      for (const l of sp.lines) for (let r = 0; r < l.count; r++) lit.push({ reel: r, row: PAYLINES[l.line][r] });
      setCells(lit);
      setWon(acc + sp.total);
      sfx(sp.total >= 10 ? 'bigwin' : 'win', 0.6);
      haptic.select();
      await pause(900);
    } else if (sp.parrots) await pause(300);
    return acc + sp.total;
  };

  const spin = async () => {
    if (busy) return;
    try {
      setBusy(true);
      skip.current = false;
      setWon(0);
      setRespin(0);
      haptic.medium();
      const r = await s.op('play', { bet });
      const v = r.view as { spins: PirateSpin[]; multiplier: number };
      let acc = await playSpin(v.spins[0], 0, []);
      for (let i = 1; i < v.spins.length; i++) {
        // the parrots stay put while the other cells spin, then walk one reel to the left
        const held = parrotsOf(v.spins[i - 1].grid);
        setRespin(i);
        if (i === 1) {
          setBanner(t('play.pirateWalk'));
          sfx('notify', 0.6);
          await pause(1000);
          setBanner(null);
        }
        setWalkers(held);
        setWalkKey((k) => k + 1);
        haptic.select();
        await pause(560);
        acc = await playSpin(v.spins[i], acc, held);
      }
      setWalkers([]);
      setRespin(0);
      setWon(v.multiplier);
      await big.celebrate(v.multiplier, r.payout);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined });
      tutorialEvent('pirate', 'pirate:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameShell
      game="pirate"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Ambient kind="pirate" />
          <View style={styles.top}>
            {respin ? (
              <View style={[styles.pill, { backgroundColor: '#12C08A' }]}>
                <T weight="display" style={{ color: '#fff', fontSize: 12 }}>🦜 {t('play.respin')} {respin}</T>
              </View>
            ) : <T weight="display" style={styles.title}>{t('play.tenLines')}</T>}
            <View style={[styles.pill, { backgroundColor: won > 0 ? '#A996FF' : 'rgba(255,255,255,0.08)' }]}>
              <T weight="display" tabular style={{ color: won > 0 ? '#12063A' : 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('common.win')} {formatCoins(Math.floor(bet * won))}</T>
            </View>
          </View>
          <Machine
            grid={grid} prev={prev} spinKey={spinKey} cell={cell} turbo={turbo} tease={[]}
            render={render} filler={fillCode} lines={lines} cells={cells} theme={SLOT_THEMES.pirate} tile={tileOf}
            colors={respin ? ['#12806A', '#06201A'] : ['#3D2BC9', '#0E0830']} rim="#FFD06B"
            title={<T weight="display" style={styles.marquee}>🏴‍☠️ {t('games.names.pirate').toUpperCase()} 🦜</T>}
          >
            {walkers.map((w) => <Walker key={`${walkKey}-${w.reel}-${w.row}`} reel={w.reel} row={w.row} cell={cell} turbo={turbo} />)}
          </Machine>
          {banner ? (
            <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={styles.banner} pointerEvents="none">
              <LinearGradient colors={['#5BE3B0', '#12A07A']} style={StyleSheet.absoluteFill} />
              <T weight="display" align="center" style={{ color: '#062A24', fontSize: 18 }}>{banner}</T>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeIn} style={{ marginTop: 8, paddingHorizontal: 12 }}>
            <T variant="caption" color="text3" align="center">{t('play.pirateHint')}</T>
          </Animated.View>
          <ResultBanner result={result} compact />
          {big.node}
        </View>
      }
      controls={
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            <Chip label={`⚡ ${t('play.turbo')}`} selected={turbo} onPress={() => setTurbo((x) => !x)} />
            {busy ? <Chip label={`⏭ ${t('common.skip')}`} selected={false} onPress={() => { skip.current = true; }} /> : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} /></View>
            <Button spot="pirate:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 6, marginBottom: 6, gap: 6 },
  title: { color: '#C8BEFF', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(169,150,255,0.8)', textShadowRadius: 10 },
  pill: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center' },
  marquee: { color: '#FFE58A', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  banner: { position: 'absolute', left: 24, right: 24, top: '38%', paddingVertical: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  walker: { position: 'absolute', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFE58A', zIndex: 5 },
});
