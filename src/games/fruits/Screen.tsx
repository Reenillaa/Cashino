import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PAYLINES, REELS, ROWS } from '@/engine/games/lineslot.ts';
import { STAR, WILD, isWild, type FruitSpin } from '@/engine/games/fruits.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { FruitSymbol } from '../lineslot/Symbols2';
import { Machine, reelTimes } from '../lineslot/Machine';
import { useBigWin } from '../lineslot/BigWin';
import { Ambient } from '../lineslot/Ambient';
import { SLOT_THEMES } from '../lineslot/WinFx';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tileOf = (c: number): [string, string] | null =>
  isWild(c) ? ['#FF8A1C', '#8A1F0A'] : c === STAR ? ['#5A4BFF', '#1A0F6A'] : c === 7 ? ['#FF4F6A', '#6A0A2A'] : c === 6 ? ['#FFD06B', '#8A5200'] : null;
const START = [[0, 7, 2], [6, WILD + 2, 1], [7, 7, 7], [3, 5, STAR], [4, 1, 6]];
const fillCode = () => {
  const x = Math.random();
  return x < 0.04 ? WILD + [2, 3, 5][Math.floor(Math.random() * 3)] : x < 0.07 ? STAR : Math.floor(Math.random() * 8);
};
const teaseOf = (g: number[][]) => {
  let n = 0;
  const out: number[] = [];
  g.forEach((col, i) => {
    if (n >= 2) out.push(i);
    n += col.filter((c) => c === STAR).length;
  });
  return out;
};

export default function FruitsScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('fruits');
  const [bet, setBet] = useBet('fruits', s.room);
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
  const [boost, setBoost] = useState<number | null>(null);
  const [free, setFree] = useState<{ i: number; n: number } | null>(null);
  const [box, setBox] = useState({ w: 360, h: 460 });
  const { result, show } = useResult();
  const big = useBigWin('ember');
  const onError = usePlayErrors();
  const history = useGameHistory('fruits', (d) => d);
  const skip = useRef(false);
  const cell = Math.floor(Math.max(44, Math.min((box.w - 44) / REELS, (box.h - 190) / ROWS, 86)));
  const pause = (ms: number) => (skip.current || reduceMotion ? Promise.resolve() : wait(ms * (turbo ? 0.55 : 1)));
  const render = (code: number, size: number) => <FruitSymbol code={code} size={size} />;

  const playSpin = async (sp: FruitSpin, acc: number) => {
    setLines([]);
    setCells([]);
    setBoost(null);
    setPrev(grid);
    setGrid(sp.grid);
    const tz = teaseOf(sp.grid);
    setTease(tz);
    setSpinKey((k) => k + 1);
    sfx('roll', 0.4);
    const times = reelTimes(turbo, tz);
    if (!skip.current && !reduceMotion) times.forEach((ms) => setTimeout(() => sfx('land', 0.5), ms));
    await (skip.current || reduceMotion ? Promise.resolve() : wait(times[REELS - 1] + 260));
    const sum = sp.total;
    if (sum > 0) {
      setLines(sp.lines.map((l) => l.line));
      const lit: { reel: number; row: number }[] = [];
      for (const l of sp.lines) for (let r = 0; r < l.count; r++) lit.push({ reel: r, row: PAYLINES[l.line][r] });
      if (sp.starPay) sp.grid.forEach((col, reel) => col.forEach((c, row) => (c === STAR ? lit.push({ reel, row }) : null)));
      setCells(lit);
      // the biggest wild multiplier that helped a line gets a fiery stamp
      const top = Math.max(1, ...sp.lines.map((l) => l.mult));
      if (top > 1) {
        setBoost(top);
        sfx('bigwin', 0.5);
        haptic.heavy();
      } else {
        sfx(sum >= 10 ? 'bigwin' : 'win', 0.6);
        haptic.select();
      }
      setWon(acc + sum);
      await pause(top > 1 ? 1200 : 900);
    }
    return acc + sum;
  };

  const spin = async () => {
    if (busy) return;
    try {
      setBusy(true);
      skip.current = false;
      setWon(0);
      setFree(null);
      haptic.medium();
      const r = await s.op('play', { bet });
      const v = r.view as { spins: FruitSpin[]; multiplier: number };
      let acc = await playSpin(v.spins[0], 0);
      if (v.spins.length > 1) {
        setBanner(t('play.fruitFree', { n: v.spins.length - 1 }));
        sfx('bigwin');
        haptic.success();
        await pause(1500);
        setBanner(null);
        for (let i = 1; i < v.spins.length; i++) {
          setFree({ i, n: v.spins.length - 1 });
          acc = await playSpin(v.spins[i], acc);
        }
      }
      setWon(v.multiplier);
      setBoost(null);
      await big.celebrate(v.multiplier, r.payout);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined });
      tutorialEvent('fruits', 'fruits:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameShell
      game="fruits"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Ambient kind="fire" />
          <View style={styles.top}>
            {free ? (
              <View style={[styles.pill, { backgroundColor: '#5A4BFF' }]}>
                <T weight="display" style={{ color: '#fff', fontSize: 12 }}>⭐ {t('play.freeSpin')} {free.i}/{free.n}</T>
              </View>
            ) : <T weight="display" style={styles.title}>{t('play.tenLines')}</T>}
            <View style={[styles.pill, { backgroundColor: won > 0 ? '#FFD06B' : 'rgba(255,255,255,0.08)' }]}>
              <T weight="display" tabular style={{ color: won > 0 ? '#231A3A' : 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('common.win')} {formatCoins(Math.floor(bet * won))}</T>
            </View>
          </View>
          <Machine
            grid={grid} prev={prev} spinKey={spinKey} cell={cell} turbo={turbo} tease={tease}
            render={render} filler={fillCode} lines={lines} cells={cells} theme={SLOT_THEMES.fire} tile={tileOf}
            colors={free ? ['#3D2BC9', '#12063A'] : ['#FF5A2A', '#7A0A2A']} rim="#FFD06B"
            title={<T weight="display" style={styles.marquee}>🔥 {free ? t('play.freeSpin').toUpperCase() : t('games.names.fruits').toUpperCase()} 🍒</T>}
          >
            {boost ? (
              <Animated.View entering={ZoomIn.springify().damping(8)} exiting={FadeOut} style={styles.boost} pointerEvents="none">
                <T weight="display" style={styles.boostText}>×{boost}</T>
              </Animated.View>
            ) : null}
          </Machine>
          {banner ? (
            <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={styles.banner} pointerEvents="none">
              <LinearGradient colors={['#FFE58A', '#FF8A1C']} style={StyleSheet.absoluteFill} />
              <T weight="display" align="center" style={{ color: '#231A3A', fontSize: 18 }}>{banner}</T>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeIn} style={{ marginTop: 8, paddingHorizontal: 12 }}>
            <T variant="caption" color="text3" align="center">{t('play.fruitHint')}</T>
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
            <Button spot="fruits:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 6, marginBottom: 6, gap: 6 },
  title: { color: '#FFB36B', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(255,90,42,0.8)', textShadowRadius: 10 },
  pill: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center' },
  marquee: { color: '#FFE58A', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  banner: { position: 'absolute', left: 24, right: 24, top: '38%', paddingVertical: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  boost: { position: 'absolute', right: 6, top: 6, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 18, backgroundColor: '#E8304F', borderWidth: 3, borderColor: '#FFE58A' },
  boostText: { color: '#FFFFFF', fontSize: 26, textShadowColor: '#FF8A1C', textShadowRadius: 10 },
});
