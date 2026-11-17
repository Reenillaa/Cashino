import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PAYLINES, REELS, ROWS } from '@/engine/games/lineslot.ts';
import { BOX, FISH, FISHER, FISHING_LEVELS, FISH_VALUES, isFish, fishValue, type FishingSpin } from '@/engine/games/fishing.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { FishSymbol } from '../lineslot/Symbols';
import { Machine, reelTimes } from '../lineslot/Machine';
import { useBigWin } from '../lineslot/BigWin';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tileOf = (c: number): [string, string] | null =>
  c === FISHER ? ['#FFE58A', '#C98B12'] : c === BOX ? ['#FF8A4A', '#8A1F0A'] : isFish(c) ? ['#3D9BFF', '#0B3E7A'] : c === 7 || c === 6 ? ['#A996FF', '#3D2BC9'] : c >= 4 ? ['#12C08A', '#0B4E32'] : null;
const START = [[0, 4, 1], [2, FISH + 5, 6], [7, 3, 5], [FISH + 10, 0, 4], [1, 6, BOX]];
const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : formatCoins(v));
const fillCode = () => {
  const r = Math.random();
  if (r < 0.08) return FISH + FISH_VALUES[Math.floor(Math.random() * 4)][0];
  if (r < 0.1) return BOX;
  return Math.floor(Math.random() * 8);
};
/** Reels after the one where the 2nd tackle box landed spin longer (tension). */
const teaseOf = (g: number[][]) => {
  let n = 0;
  const out: number[] = [];
  g.forEach((col, i) => {
    if (n >= 2) out.push(i);
    n += col.filter((c) => c === BOX).length;
  });
  return out;
};

/** A fish prize flying to the fisherman. */
function FlyingPrize({ from, to, cell, text, delay }: { from: { x: number; y: number }; to: { x: number; y: number }; cell: number; text: string; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.cubic) })));
  }, [p, delay]);
  const st = useAnimatedStyle(() => ({
    opacity: p.value < 0.95 ? 1 : 0,
    transform: [
      { translateX: (from.x + (to.x - from.x) * p.value) * cell + cell / 2 - 30 },
      { translateY: (from.y + (to.y - from.y) * p.value) * cell + cell / 2 - 12 - Math.sin(p.value * Math.PI) * cell * 0.6 },
      { scale: 1 + Math.sin(p.value * Math.PI) * 0.35 },
    ],
  }));
  return <Animated.View style={[styles.prize, st]}><T weight="display" style={{ color: '#062A24', fontSize: 12 }}>{text}</T></Animated.View>;
}

export default function FishingScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('fishing');
  const [bet, setBet] = useBet('fishing', s.room);
  const [grid, setGrid] = useState<number[][]>(START);
  const [prev, setPrev] = useState<number[][]>(START);
  const [spinKey, setSpinKey] = useState(0);
  const [tease, setTease] = useState<number[]>([]);
  const [lines, setLines] = useState<number[]>([]);
  const [cells, setCells] = useState<{ reel: number; row: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [won, setWon] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [free, setFree] = useState<{ i: number; n: number; collected: number; level: number } | null>(null);
  const [fly, setFly] = useState<{ key: number; items: { from: { x: number; y: number }; to: { x: number; y: number }; text: string }[] } | null>(null);
  const [box, setBox] = useState({ w: 360, h: 460 });
  const { result, show } = useResult();
  const big = useBigWin();
  const onError = usePlayErrors();
  const history = useGameHistory('fishing', (d) => d);
  const skip = useRef(false);
  const betRef = useRef(bet);
  const cell = Math.floor(Math.max(44, Math.min((box.w - 44) / REELS, (box.h - 190) / ROWS, 86)));
  const pause = (ms: number) => (skip.current || reduceMotion ? Promise.resolve() : wait(ms * (turbo ? 0.55 : 1)));
  const render = (code: number, size: number) => <FishSymbol code={code} size={size} fishText={isFish(code) ? short(fishValue(code) * betRef.current) : undefined} />;

  const playSpin = async (sp: FishingSpin, acc: number) => {
    setLines([]);
    setCells([]);
    setFly(null);
    setPrev(grid);
    setGrid(sp.grid);
    const tz = teaseOf(sp.grid);
    setTease(tz);
    setSpinKey((k) => k + 1);
    sfx('roll', 0.4);
    const times = reelTimes(turbo, tz);
    if (!skip.current && !reduceMotion) times.forEach((ms) => setTimeout(() => sfx('land', 0.5), ms));
    await (skip.current || reduceMotion ? Promise.resolve() : wait(times[REELS - 1] + 260));
    let total = acc;
    if (sp.lines.length) {
      setLines(sp.lines.map((l) => l.line));
      const lit: { reel: number; row: number }[] = [];
      for (const l of sp.lines) for (let r = 0; r < l.count; r++) lit.push({ reel: r, row: PAYLINES[l.line][r] });
      setCells(lit);
      total += sp.lines.reduce((a, l) => a + l.pay, 0);
      setWon(total);
      sfx(sp.lines.some((l) => l.pay >= 10) ? 'bigwin' : 'win', 0.6);
      haptic.select();
      await pause(900);
    }
    if (sp.collect > 0) {
      // the fishermen reel in every fish on the screen
      const fishers: { x: number; y: number }[] = [];
      const fish: { x: number; y: number; v: number }[] = [];
      sp.grid.forEach((col, x) => col.forEach((c, y) => (c === FISHER ? fishers.push({ x, y }) : isFish(c) ? fish.push({ x, y, v: fishValue(c) }) : null)));
      setBanner(t('play.fishCollect', { n: sp.fishers, x: sp.multiplier }));
      setFly({ key: Date.now(), items: fishers.flatMap((to) => fish.map((f) => ({ from: { x: f.x, y: f.y }, to, text: short(f.v * betRef.current * sp.multiplier) }))) });
      sfx('cashout', 0.7);
      haptic.medium();
      await pause(1200);
      total += sp.collect;
      setWon(total);
      setBanner(null);
    }
    return total;
  };

  const spin = async () => {
    if (busy) return;
    try {
      setBusy(true);
      skip.current = false;
      betRef.current = bet;
      setWon(0);
      setFree(null);
      haptic.medium();
      const r = await s.op('play', { bet });
      const v = r.view as { spins: FishingSpin[]; freeSpins: number; multiplier: number };
      let acc = await playSpin(v.spins[0], 0);
      if (v.spins.length > 1) {
        setCells(v.spins[0].grid.flatMap((col, reel) => col.map((c, row) => (c === BOX ? { reel, row } : null)).filter(Boolean) as { reel: number; row: number }[]));
        setBanner(t('play.fishFree', { n: v.spins.length - 1 }));
        sfx('bigwin');
        haptic.success();
        await pause(1700);
        setBanner(null);
        let collected = 0;
        for (let i = 1; i < v.spins.length; i++) {
          const sp = v.spins[i];
          setFree({ i, n: v.spins.length - 1, collected, level: FISHING_LEVELS.indexOf(sp.multiplier) });
          acc = await playSpin(sp, acc);
          const before = Math.floor(collected / 4);
          collected += sp.fishers;
          if (Math.min(3, Math.floor(collected / 4)) > before && before < 3) {
            setBanner(t('play.fishLevel', { x: FISHING_LEVELS[Math.min(3, Math.floor(collected / 4))] }));
            sfx('bigwin');
            await pause(1300);
            setBanner(null);
          }
          setFree({ i, n: v.spins.length - 1, collected, level: FISHING_LEVELS.indexOf(sp.multiplier) });
        }
      }
      setWon(v.multiplier);
      await big.celebrate(v.multiplier, r.payout);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined });
      tutorialEvent('fishing', 'fishing:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameShell
      game="fishing"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={styles.top}>
            {free ? (
              <View style={[styles.pill, { backgroundColor: '#1FA7E0' }]}>
                <T weight="display" style={{ color: '#fff', fontSize: 12 }}>🎣 {t('play.freeSpin')} {free.i}/{free.n}</T>
              </View>
            ) : <T weight="display" style={styles.title}>{t('play.tenLines')}</T>}
            <View style={[styles.pill, { backgroundColor: won > 0 ? '#5BE3B0' : 'rgba(255,255,255,0.08)' }]}>
              <T weight="display" tabular style={{ color: won > 0 ? '#062A24' : 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('common.win')} {formatCoins(Math.floor(bet * won))}</T>
            </View>
          </View>
          {free ? (
            <View style={styles.meter}>
              {[0, 1, 2, 3].map((k) => <View key={k} style={[styles.notch, { backgroundColor: k < free.collected % 4 ? '#FFD06B' : 'rgba(255,255,255,0.15)' }]} />)}
              <T weight="display" style={{ color: '#FFD06B', fontSize: 12, marginLeft: 6 }}>×{FISHING_LEVELS[Math.min(3, Math.floor(free.collected / 4))]}</T>
            </View>
          ) : null}
          <Machine
            grid={grid} prev={prev} spinKey={spinKey} cell={cell} turbo={turbo} tease={tease}
            render={render} filler={fillCode} lines={lines} cells={cells} tile={tileOf}
            colors={free ? ['#0B6E9A', '#06304A'] : ['#1FA7E0', '#0B4E7A']} rim="#FFD06B"
            title={<T weight="display" style={styles.marquee}>🎣 {free ? t('play.freeSpin').toUpperCase() : t(`games.names.fishing`).toUpperCase()} 🐟</T>}
          >
            {fly ? fly.items.map((f, k) => <FlyingPrize key={`${fly.key}-${k}`} from={f.from} to={f.to} cell={cell} text={f.text} delay={k * 90} />) : null}
          </Machine>
          {banner ? (
            <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={styles.banner} pointerEvents="none">
              <LinearGradient colors={['#FFE58A', '#FFB938']} style={StyleSheet.absoluteFill} />
              <T weight="display" align="center" style={{ color: '#231A3A', fontSize: 18 }}>{banner}</T>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeIn} style={styles.pays}>
            <T variant="caption" color="text3" align="center">{t('play.fishHint')}</T>
          </Animated.View>
          <ResultBanner result={result} />
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
            <Button spot="fishing:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 6, marginBottom: 6 },
  title: { color: '#9CDFFF', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(31,167,224,0.8)', textShadowRadius: 10 },
  pill: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center' },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  notch: { width: 22, height: 8, borderRadius: 4 },
  marquee: { color: '#FFE58A', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  banner: { position: 'absolute', left: 24, right: 24, top: '38%', paddingVertical: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  prize: { position: 'absolute', left: 0, top: 0, width: 60, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#5BE3B0', borderWidth: 2, borderColor: '#fff' },
  pays: { marginTop: 8, paddingHorizontal: 12 },
});
