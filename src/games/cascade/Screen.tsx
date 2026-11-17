import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, T, formatCoins, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { BOMB, COLS, ROWS, SCATTER, CASCADE_PAYS, isBomb, type CascadeSpin } from '@/engine/games/cascade.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { Ambient } from '../lineslot/Ambient';
import { SLOT_THEMES, WinCellFx } from '../lineslot/WinFx';
import { useBigWin } from '../lineslot/BigWin';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { SweetArt } from './Sweets';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

type Mark = 'idle' | 'win' | 'pop' | 'bomb';
interface Cell { id: number; code: number; drop: number; delay: number }

const START = [[0, 4, 6, 8, 7], [1, 5, 9, 6, 8], [2, 8, 0, 7, 5], [3, 6, 4, 8, 7], [8, 7, 5, 1, 6], [6, 2, 8, BOMB + 5, 4]];

/** One sweet: falls from `drop` rows above (or from its previous row), pulses when it wins, pops when it goes. */
const SweetCell = React.memo(function SweetCell({ code, row, col, size, drop, delay, mark, speed }: { code: number; row: number; col: number; size: number; drop: number; delay: number; mark: Mark; speed: number }) {
  const y = useSharedValue(-drop * size);
  const sc = useSharedValue(1);
  const prevRow = useRef(row);
  useEffect(() => {
    y.set(withDelay(delay * speed, withTiming(0, { duration: (230 + drop * 35) * speed, easing: Easing.in(Easing.quad) })));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (prevRow.current !== row) {
      y.set((prevRow.current - row) * size);
      y.set(withTiming(0, { duration: 240 * speed, easing: Easing.in(Easing.quad) }));
      prevRow.current = row;
    }
  }, [row, size, speed, y]);
  useEffect(() => {
    if (mark === 'win' || mark === 'bomb') sc.set(withRepeat(withSequence(withTiming(1.16, { duration: 170 * speed }), withTiming(0.96, { duration: 170 * speed })), -1, true));
    else if (mark === 'pop') sc.set(withTiming(0, { duration: 180 * speed, easing: Easing.in(Easing.back(2)) }));
    else sc.set(withTiming(1, { duration: 120 }));
  }, [mark, speed, sc]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: sc.value }] }));
  return (
    <Animated.View style={[styles.cell, { left: col * size, top: row * size, width: size, height: size }, st]}>
      {mark === 'win' || mark === 'bomb' ? <View style={[styles.glow, { borderRadius: size / 3, backgroundColor: mark === 'bomb' ? 'rgba(255,208,107,0.35)' : 'rgba(255,255,255,0.28)' }]} /> : null}
      <SweetArt code={code} size={size * 0.9} />
      {mark === 'win' ? <View pointerEvents="none" style={StyleSheet.absoluteFill}><WinCellFx x={0} y={0} cell={size} theme={SLOT_THEMES.candy} order={(row + col) % 4} /></View> : null}
    </Animated.View>
  );
});

let nextId = 1;
const fresh = (grid: number[][], dropAll: boolean): Cell[][] =>
  grid.map((col, c) => col.map((code, r) => ({ id: nextId++, code, drop: dropAll ? ROWS + 1 : 0, delay: dropAll ? c * 45 + (ROWS - r) * 18 : 0 })));

export default function CascadeScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('cascade');
  const [bet, setBet] = useBet('cascade', s.room);
  const [cells, setCells] = useState<Cell[][]>(() => fresh(START, false));
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [busy, setBusy] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [won, setWon] = useState(0); // running win of the round, in × bet
  const [note, setNote] = useState<string | null>(null);
  const [free, setFree] = useState<{ i: number; n: number } | null>(null);
  const [box, setBox] = useState({ w: 340, h: 380 });
  const { result, show } = useResult();
  const big = useBigWin('candy');
  const onError = usePlayErrors();
  const history = useGameHistory('cascade', (d) => d);
  const skip = useRef(false);
  const gridRef = useRef<Cell[][]>(cells);
  const speedRef = useRef(1);
  const size = Math.floor(Math.max(36, Math.min((box.w - 24) / COLS, (box.h - 118) / ROWS, 74)));
  const speed = turbo ? 0.5 : 1;
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  const pause = (ms: number) => (skip.current || reduceMotion ? Promise.resolve() : wait(ms * speedRef.current));

  /** Plays one spin's tumbles on the grid; returns once its win (and bombs) are shown. */
  const playSpin = async (spin: CascadeSpin, before: number) => {
    let grid = fresh(spin.steps[0].grid, true);
    setMarks({});
    setCells(grid);
    gridRef.current = grid;
    sfx('roll', 0.4);
    await pause(650);
    let acc = before;
    for (let k = 0; k < spin.steps.length; k++) {
      const step = spin.steps[k];
      if (!step.wins.length) break;
      const syms = new Set(step.wins.map((w) => w.sym));
      const m: Record<number, Mark> = {};
      for (const col of grid) for (const c of col) if (syms.has(c.code)) m[c.id] = 'win';
      setMarks(m);
      acc += step.wins.reduce((a, w) => a + w.pay, 0);
      setWon(acc);
      sfx(step.wins.some((w) => w.pay >= 10) ? 'bigwin' : 'land', 0.7);
      haptic.select();
      await pause(520);
      setMarks(Object.fromEntries(Object.keys(m).map((id) => [id, 'pop' as Mark])));
      await pause(200);
      // kept sweets fall down, new ones drop in on top
      const next = spin.steps[k + 1].grid;
      grid = grid.map((col, c) => {
        const keep = col.filter((x) => !syms.has(x.code));
        const add = next[c].slice(0, ROWS - keep.length).map((code, r) => ({ id: nextId++, code, drop: ROWS - keep.length - r + 1, delay: r * 20 }));
        return [...add, ...keep];
      });
      setMarks({});
      setCells(grid);
      gridRef.current = grid;
      await pause(420);
    }
    if (spin.win > 0 && spin.bombs > 0) {
      const m: Record<number, Mark> = {};
      for (const col of grid) for (const c of col) if (isBomb(c.code)) m[c.id] = 'bomb';
      setMarks(m);
      setNote(`${formatMult(spin.win)} × ${spin.bombs} = ${formatMult(spin.total)}`);
      sfx('bigwin');
      haptic.heavy();
      setWon(before + spin.total);
      await pause(1100);
      setNote(null);
    }
    setMarks({});
    return before + spin.total;
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
      const v = r.view as { spins: CascadeSpin[]; freeSpins: number; scatterWin: number; multiplier: number; capped: boolean };
      let acc = await playSpin(v.spins[0], 0);
      if (v.spins.length > 1) {
        // lollipops: show them, pay them and start the free spins
        const m: Record<number, Mark> = {};
        for (const col of gridRef.current) for (const c of col) if (c.code === SCATTER) m[c.id] = 'bomb';
        setMarks(m);
        acc += v.scatterWin;
        setWon(acc);
        setNote(t('play.freeSpinsWon', { n: v.spins.length > 11 ? `${v.spins.length - 1}` : '10' }));
        sfx('bigwin');
        haptic.success();
        await pause(1600);
        setNote(null);
        for (let i = 1; i < v.spins.length; i++) {
          setFree({ i, n: v.spins.length - 1 });
          acc = await playSpin(v.spins[i], acc);
        }
      }
      setWon(v.multiplier);
      await big.celebrate(v.multiplier, r.payout);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined });
      if (v.multiplier >= 20) sfx('bigwin');
      tutorialEvent('cascade', 'cascade:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  const gridW = size * COLS;
  const gridH = size * ROWS;
  return (
    <GameShell
      game="cascade"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <Ambient kind="candy" />
          <View style={styles.top}>
            {free ? (
              <View style={[styles.pill, { backgroundColor: '#FF4FA3' }]}><T weight="display" style={{ color: '#fff', fontSize: 13 }}>🍭 {t('play.freeSpin')} {free.i}/{free.n}</T></View>
            ) : (
              <T weight="display" style={styles.title}>DULCE CASCADA</T>
            )}
            <View style={[styles.pill, { backgroundColor: won > 0 ? '#5BE3B0' : 'rgba(255,255,255,0.08)' }]}>
              <T weight="display" tabular style={{ color: won > 0 ? '#062A24' : 'rgba(255,255,255,0.6)', fontSize: 13 }}>{t('common.win')} {formatCoins(Math.floor(bet * won))}</T>
            </View>
          </View>
          <View style={[styles.frame, { width: gridW + 12, height: gridH + 12 }]}>
            <LinearGradient colors={['#5B1F7A', '#2A0F4A']} style={StyleSheet.absoluteFill} />
            <View style={{ position: 'absolute', left: 6, top: 6, width: gridW, height: gridH, overflow: 'hidden' }}>
              {Array.from({ length: COLS }, (_, c) => <View key={c} style={[styles.lane, { left: c * size, width: size - 2 }]} />)}
              {cells.map((col, c) => col.map((cell, r) => (
                <SweetCell key={cell.id} code={cell.code} row={r} col={c} size={size} drop={cell.drop} delay={cell.delay} mark={marks[cell.id] ?? 'idle'} speed={reduceMotion ? 0 : speed} />
              )))}
            </View>
            {note ? (
              <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={styles.note} pointerEvents="none">
                <T weight="display" align="center" style={{ color: '#231A3A', fontSize: 20 }}>{note}</T>
              </Animated.View>
            ) : null}
          </View>
          <Animated.View entering={FadeIn} style={styles.pays}>
            {[0, 1, 2, 3, 8].map((sym) => (
              <View key={sym} style={styles.pay}>
                <SweetArt code={sym} size={18} />
                <T weight="displaySemi" style={{ color: '#FFE58A', fontSize: 10 }}>8+ ×{CASCADE_PAYS[sym][0]}</T>
              </View>
            ))}
            <View style={styles.pay}><SweetArt code={SCATTER} size={18} /><T weight="displaySemi" style={{ color: '#FFE58A', fontSize: 10 }}>4+ = 10 🎁</T></View>
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
            <Button spot="cascade:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 6, marginBottom: 8 },
  title: { color: '#FFB3D6', fontSize: 16, letterSpacing: 2, textShadowColor: 'rgba(255,79,163,0.8)', textShadowRadius: 10 },
  pill: { paddingHorizontal: 12, height: 30, borderRadius: 15, justifyContent: 'center' },
  frame: { borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#FF8AC4' },
  lane: { position: 'absolute', top: 0, bottom: 0, marginLeft: 1, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  cell: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', left: 2, right: 2, top: 2, bottom: 2 },
  note: { position: 'absolute', left: 20, right: 20, top: '40%', paddingVertical: 12, borderRadius: 18, backgroundColor: '#FFD06B', borderWidth: 3, borderColor: '#fff' },
  pays: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)' },
});
