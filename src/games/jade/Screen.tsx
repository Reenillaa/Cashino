import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PAYLINES, REELS, ROWS } from '@/engine/games/lineslot.ts';
import { IDOL, type JadeSpin } from '@/engine/games/jade.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { JadeSymbol } from '../lineslot/Symbols';
import { Machine, reelTimes } from '../lineslot/Machine';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const START = [[0, 5, 3], [IDOL, 1, 6], [4, 8, 2], [7, 0, 5], [1, 3, IDOL]];
const fillCode = () => (Math.random() < 0.05 ? IDOL : Math.floor(Math.random() * 9));
const teaseOf = (g: number[][]) => {
  let n = 0;
  const out: number[] = [];
  g.forEach((col, i) => {
    if (n >= 2) out.push(i);
    n += col.filter((c) => c === IDOL).length;
  });
  return out;
};

/** The special-symbol draw: symbols flick past fast and stop on the chosen one. */
function SpecialPick({ special, onDone }: { special: number; onDone: () => void }) {
  const { t } = useT();
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let k = 0;
    let delay = 60;
    let id: ReturnType<typeof setTimeout>;
    const step = () => {
      k++;
      if (k > 22) {
        setShown(special);
        setDone(true);
        sfx('bigwin');
        id = setTimeout(onDone, 1300);
        return;
      }
      setShown((k * 4) % 9);
      sfx('tick', 0.4);
      delay *= 1.12;
      id = setTimeout(step, delay);
    };
    id = setTimeout(step, delay);
    return () => clearTimeout(id);
  }, [special, onDone]);
  return (
    <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={styles.pick} pointerEvents="none">
      <LinearGradient colors={['#0B5E3E', '#04231A']} style={StyleSheet.absoluteFill} />
      <T weight="display" style={{ color: '#FFE58A', fontSize: 16, letterSpacing: 2 }}>{t('play.jadeSpecial').toUpperCase()}</T>
      <View style={[styles.pickCard, done && { borderColor: '#FFE58A', backgroundColor: 'rgba(255,229,138,0.15)' }]}>
        <JadeSymbol code={shown} size={110} />
      </View>
    </Animated.View>
  );
}

export default function JadeScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('jade');
  const [bet, setBet] = useBet('jade', s.room);
  const [grid, setGrid] = useState<number[][]>(START);
  const [prev, setPrev] = useState<number[][]>(START);
  const [spinKey, setSpinKey] = useState(0);
  const [tease, setTease] = useState<number[]>([]);
  const [lines, setLines] = useState<number[]>([]);
  const [cells, setCells] = useState<{ reel: number; row: number }[]>([]);
  const [expanded, setExpanded] = useState<number[]>([]);
  const [special, setSpecial] = useState<number | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [won, setWon] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [free, setFree] = useState<{ i: number; n: number } | null>(null);
  const [box, setBox] = useState({ w: 360, h: 460 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('jade', (d) => d);
  const skip = useRef(false);
  const pickDone = useRef<() => void>(() => undefined);
  const cell = Math.floor(Math.max(44, Math.min((box.w - 44) / REELS, (box.h - 190) / ROWS, 86)));
  const pause = (ms: number) => (skip.current || reduceMotion ? Promise.resolve() : wait(ms * (turbo ? 0.55 : 1)));
  const render = (code: number, size: number) => <JadeSymbol code={code} size={size} />;

  const playSpin = async (sp: JadeSpin, acc: number) => {
    setLines([]);
    setCells([]);
    setExpanded([]);
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
    const lineSum = sp.lines.reduce((a, l) => a + l.pay, 0) + sp.scatterPay;
    if (lineSum > 0) {
      setLines(sp.lines.map((l) => l.line));
      const lit: { reel: number; row: number }[] = [];
      for (const l of sp.lines) for (let r = 0; r < l.count; r++) lit.push({ reel: r, row: PAYLINES[l.line][r] });
      if (sp.scatterPay) sp.grid.forEach((col, reel) => col.forEach((c, row) => (c === IDOL ? lit.push({ reel, row }) : null)));
      setCells(lit);
      total += lineSum;
      setWon(total);
      sfx(lineSum >= 10 ? 'bigwin' : 'win', 0.6);
      haptic.select();
      await pause(900);
    }
    if (sp.expandPay > 0) {
      setLines([]);
      setCells([]);
      setExpanded(sp.expanded);
      setLines(PAYLINES.map((_, i) => i));
      sfx('bigwin');
      haptic.heavy();
      total += sp.expandPay;
      setBanner(t('play.jadeExpand', { v: formatCoins(Math.floor(sp.expandPay * bet)) }));
      setWon(total);
      await pause(1500);
      setBanner(null);
    }
    return total;
  };

  const spin = async () => {
    if (busy) return;
    try {
      setBusy(true);
      skip.current = false;
      setWon(0);
      setFree(null);
      setSpecial(null);
      haptic.medium();
      const r = await s.op('play', { bet });
      const v = r.view as { spins: JadeSpin[]; special: number | null; multiplier: number };
      let acc = await playSpin(v.spins[0], 0);
      if (v.spins.length > 1 && v.special !== null) {
        setBanner(t('play.jadeFree', { n: v.spins.length - 1 }));
        sfx('bigwin');
        haptic.success();
        await pause(1500);
        setBanner(null);
        if (!skip.current && !reduceMotion) {
          await new Promise<void>((res) => {
            pickDone.current = res;
            setPicking(v.special);
          });
          setPicking(null);
        }
        setSpecial(v.special);
        for (let i = 1; i < v.spins.length; i++) {
          setFree({ i, n: v.spins.length - 1 });
          acc = await playSpin(v.spins[i], acc);
        }
      }
      setWon(v.multiplier);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined });
      tutorialEvent('jade', 'jade:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameShell
      game="jade"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={styles.top}>
            {free ? (
              <View style={[styles.pill, { backgroundColor: '#12C08A' }]}>
                <T weight="display" style={{ color: '#fff', fontSize: 12 }}>🗿 {t('play.freeSpin')} {free.i}/{free.n}</T>
              </View>
            ) : <T weight="display" style={styles.title}>{t('play.tenLines')}</T>}
            {special !== null ? (
              <View style={styles.special}><T variant="caption" style={{ color: '#FFE58A' }}>{t('play.jadeSpecial')}</T><JadeSymbol code={special} size={26} /></View>
            ) : null}
            <View style={[styles.pill, { backgroundColor: won > 0 ? '#5BE3B0' : 'rgba(255,255,255,0.08)' }]}>
              <T weight="display" tabular style={{ color: won > 0 ? '#062A24' : 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('common.win')} {formatCoins(Math.floor(bet * won))}</T>
            </View>
          </View>
          <Machine
            grid={grid} prev={prev} spinKey={spinKey} cell={cell} turbo={turbo} tease={tease}
            render={render} filler={fillCode} lines={lines} cells={cells}
            expanded={special !== null && expanded.length ? { reels: expanded, render: (size) => (
              <View style={{ alignItems: 'center', gap: 2 }}>{[0, 1, 2].map((k) => <JadeSymbol key={k} code={special} size={size * 0.72} />)}</View>
            ) } : null}
            colors={free ? ['#0B5E3E', '#04231A'] : ['#12C08A', '#0B4E32']} rim="#FFD06B"
            title={<T weight="display" style={styles.marquee}>🗿 {free ? t('play.freeSpin').toUpperCase() : t(`games.names.jade`).toUpperCase()} 🌿</T>}
          />
          {picking !== null ? <SpecialPick special={picking} onDone={() => pickDone.current()} /> : null}
          {banner ? (
            <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={styles.banner} pointerEvents="none">
              <LinearGradient colors={['#FFE58A', '#FFB938']} style={StyleSheet.absoluteFill} />
              <T weight="display" align="center" style={{ color: '#231A3A', fontSize: 18 }}>{banner}</T>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeIn} style={{ marginTop: 8, paddingHorizontal: 12 }}>
            <T variant="caption" color="text3" align="center">{t('play.jadeHint')}</T>
          </Animated.View>
          <ResultBanner result={result} />
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
            <Button spot="jade:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 6, marginBottom: 6, gap: 6 },
  title: { color: '#7FF0C0', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(18,192,138,0.8)', textShadowRadius: 10 },
  pill: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center' },
  special: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: '#FFE58A' },
  marquee: { color: '#FFE58A', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  banner: { position: 'absolute', left: 24, right: 24, top: '38%', paddingVertical: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  pick: { position: 'absolute', left: 30, right: 30, top: '22%', paddingVertical: 20, borderRadius: 26, overflow: 'hidden', alignItems: 'center', gap: 12, borderWidth: 3, borderColor: '#FFE58A' },
  pickCard: { width: 150, height: 150, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)' },
});
