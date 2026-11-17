import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, T, formatCoins } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { PAYLINES, REELS, ROWS, type LineWin } from '@/engine/games/lineslot.ts';
import { MAJOR, MINER, MINI, NUGGET, isNugget, nuggetValue, type MineRespin } from '@/engine/games/goldmine.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { MineSymbol, Nugget } from '../lineslot/Symbols2';
import { Machine, reelTimes } from '../lineslot/Machine';
import { useBigWin } from '../lineslot/BigWin';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const tileOf = (c: number): [string, string] | null =>
  isNugget(c) ? ['#FFD06B', '#8A5200'] : c === MINER ? ['#E8304F', '#5A0A1A'] : c === 6 || c === 5 ? ['#FF8A3D', '#6A2A0A'] : null;
const START = [[0, NUGGET + 5, 2], [6, 1, MINER], [NUGGET + 2, 4, 3], [5, 0, NUGGET + 1], [1, 3, 6]];
const fillCode = () => (Math.random() < 0.08 ? NUGGET + [1, 2, 3, 5][Math.floor(Math.random() * 4)] : Math.floor(Math.random() * 8));

/** An empty bonus cell: a dark slot with a shimmer that runs while it "spins". */
function EmptyCell({ cell, spinning }: { cell: number; spinning: number }) {
  const o = useSharedValue(0.25);
  useEffect(() => {
    if (!spinning) return;
    o.set(withRepeat(withSequence(withTiming(0.8, { duration: 120 }), withTiming(0.2, { duration: 120 })), 3, false));
  }, [spinning, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={[styles.empty, { width: cell - 6, height: cell - 6, borderRadius: cell * 0.2 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFD06B', borderRadius: cell * 0.2 }, st]} />
    </View>
  );
}

/** The hold-and-win board drawn over the reels: nuggets stay, the rest flicker on each respin. */
function HoldBoard({ board, fresh, spin, cell, bet }: { board: number[][]; fresh: { reel: number; row: number }[]; spin: number; cell: number; bet: number }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut} style={[styles.hold, { width: cell * REELS, height: cell * ROWS }]} pointerEvents="none">
      <LinearGradient colors={['#2A1606', '#120802']} style={StyleSheet.absoluteFill} />
      {board.map((col, reel) => col.map((c, row) => {
        const isFresh = fresh.some((f) => f.reel === reel && f.row === row);
        return (
          <View key={`${reel}-${row}`} style={{ position: 'absolute', left: reel * cell, top: row * cell, width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
            {c ? (
              <Animated.View key={isFresh ? `f${spin}` : 'k'} entering={isFresh ? ZoomIn.springify().damping(9) : undefined} style={[styles.held, { width: cell - 6, height: cell - 6, borderRadius: cell * 0.2 }]}>
                <LinearGradient colors={['#FFD06B', '#8A5200']} style={StyleSheet.absoluteFill} />
                <View><Nugget value={nuggetValue(c)} size={cell * 0.84} text={valueText(nuggetValue(c), bet)} /></View>
              </Animated.View>
            ) : <EmptyCell cell={cell} spinning={spin} />}
          </View>
        );
      }))}
    </Animated.View>
  );
}
const valueText = (v: number, bet: number) => (v === MINI || v === MAJOR ? undefined : formatCoins(v * bet));

export default function GoldmineScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('goldmine');
  const [bet, setBet] = useBet('goldmine', s.room);
  const [grid, setGrid] = useState<number[][]>(START);
  const [prev, setPrev] = useState<number[][]>(START);
  const [spinKey, setSpinKey] = useState(0);
  const [tease, setTease] = useState<number[]>([]);
  const [lines, setLines] = useState<number[]>([]);
  const [cells, setCells] = useState<{ reel: number; row: number }[]>([]);
  const [hold, setHold] = useState<{ board: number[][]; fresh: { reel: number; row: number }[]; spin: number; left: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [won, setWon] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [box, setBox] = useState({ w: 360, h: 460 });
  const { result, show } = useResult();
  const big = useBigWin();
  const onError = usePlayErrors();
  const history = useGameHistory('goldmine', (d) => d);
  const skip = useRef(false);
  const cell = Math.floor(Math.max(44, Math.min((box.w - 44) / REELS, (box.h - 190) / ROWS, 86)));
  const pause = (ms: number) => (skip.current || reduceMotion ? Promise.resolve() : wait(ms * (turbo ? 0.55 : 1)));
  const render = (code: number, size: number) => <MineSymbol code={code} size={size} nuggetText={isNugget(code) ? valueText(nuggetValue(code), bet) : undefined} />;

  const spin = async () => {
    if (busy) return;
    try {
      setBusy(true);
      skip.current = false;
      setWon(0);
      setHold(null);
      setLines([]);
      setCells([]);
      haptic.medium();
      const r = await s.op('play', { bet });
      const v = r.view as { grid: number[][]; lines: LineWin[]; lineWin: number; nuggets: number; respins: MineRespin[]; bonus: number; grand: boolean; multiplier: number };
      // base spin; reels after 3 nuggets spin longer
      setPrev(grid);
      setGrid(v.grid);
      let seen = 0;
      const tz: number[] = [];
      v.grid.forEach((col, i) => {
        if (seen >= 3) tz.push(i);
        seen += col.filter(isNugget).length;
      });
      setTease(tz);
      setSpinKey((k) => k + 1);
      sfx('roll', 0.4);
      const times = reelTimes(turbo, tz);
      if (!skip.current && !reduceMotion) times.forEach((ms) => setTimeout(() => sfx('land', 0.5), ms));
      await (skip.current || reduceMotion ? Promise.resolve() : wait(times[REELS - 1] + 260));
      if (v.lineWin > 0) {
        setLines(v.lines.map((l) => l.line));
        const lit: { reel: number; row: number }[] = [];
        for (const l of v.lines) for (let k = 0; k < l.count; k++) lit.push({ reel: k, row: PAYLINES[l.line][k] });
        setCells(lit);
        setWon(v.lineWin);
        sfx(v.lineWin >= 10 ? 'bigwin' : 'win', 0.6);
        haptic.select();
        await pause(900);
      }
      if (v.respins.length) {
        setLines([]);
        setCells([]);
        setBanner(t('play.mineBonus', { n: v.nuggets }));
        sfx('bigwin');
        haptic.success();
        await pause(1500);
        setBanner(null);
        const start = v.grid.map((col) => col.map((c) => (isNugget(c) ? c : 0)));
        setHold({ board: start, fresh: [], spin: 0, left: 3 });
        await pause(600);
        for (let i = 0; i < v.respins.length; i++) {
          const rs = v.respins[i];
          // flicker the empty cells, then drop the new nuggets in
          setHold((h) => (h ? { ...h, fresh: [], spin: i + 1 } : h));
          sfx('roll', 0.3);
          await pause(780);
          setHold({ board: rs.board, fresh: rs.fresh, spin: i + 1, left: rs.left });
          if (rs.fresh.length) {
            sfx('coin', 0.8);
            haptic.heavy();
          } else sfx('tick', 0.5);
          await pause(rs.fresh.length ? 750 : 420);
        }
        if (v.grand) {
          setBanner(t('play.mineGrand'));
          sfx('levelup');
          await pause(1800);
          setBanner(null);
        }
        setWon(v.lineWin + v.bonus);
        await pause(500);
      }
      setWon(v.multiplier);
      await big.celebrate(v.multiplier, r.payout);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined });
      tutorialEvent('goldmine', 'goldmine:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GameShell
      game="goldmine"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={styles.top}>
            {hold ? (
              <View style={styles.dots}>
                <T weight="display" style={{ color: '#FFE58A', fontSize: 12 }}>{t('play.mineLeft', { n: hold.left })}</T>
                {[0, 1, 2].map((k) => <View key={k} style={[styles.dot, k < hold.left && styles.dotOn]} />)}
              </View>
            ) : <T weight="display" style={styles.title}>{t('play.tenLines')}</T>}
            <View style={[styles.pill, { backgroundColor: won > 0 ? '#FFD06B' : 'rgba(255,255,255,0.08)' }]}>
              <T weight="display" tabular style={{ color: won > 0 ? '#231A3A' : 'rgba(255,255,255,0.6)', fontSize: 12 }}>{t('common.win')} {formatCoins(Math.floor(bet * won))}</T>
            </View>
          </View>
          <View style={styles.jackpots}>
            {[['MINI', MINI, '#1A6ACF'], ['MAJOR', MAJOR, '#C0127A'], ['GRAND', 1000, '#C98B12']].map(([n, v, c]) => (
              <View key={String(n)} style={[styles.jp, { borderColor: String(c) }]}>
                <T weight="display" style={{ color: String(c), fontSize: 10, letterSpacing: 1 }}>{String(n)}</T>
                <T weight="display" tabular style={{ color: '#fff', fontSize: 12 }}>{formatCoins(Number(v) * bet)}</T>
              </View>
            ))}
          </View>
          <Machine
            grid={grid} prev={prev} spinKey={spinKey} cell={cell} turbo={turbo} tease={tease}
            render={render} filler={fillCode} lines={lines} cells={cells} tile={tileOf}
            colors={hold ? ['#8A5200', '#2A1606'] : ['#C98B12', '#3A1E06']} rim="#FFD06B"
            title={<T weight="display" style={styles.marquee}>⛏️ {t('games.names.goldmine').toUpperCase()} 💰</T>}
          >
            {hold ? <HoldBoard board={hold.board} fresh={hold.fresh} spin={hold.spin} cell={cell} bet={bet} /> : null}
          </Machine>
          {banner ? (
            <Animated.View entering={ZoomIn.springify()} exiting={FadeOut} style={styles.banner} pointerEvents="none">
              <LinearGradient colors={['#FFE58A', '#FFB938']} style={StyleSheet.absoluteFill} />
              <T weight="display" align="center" style={{ color: '#231A3A', fontSize: 18 }}>{banner}</T>
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeIn} style={{ marginTop: 8, paddingHorizontal: 12 }}>
            <T variant="caption" color="text3" align="center">{t('play.mineHint')}</T>
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
            <Button spot="goldmine:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', paddingHorizontal: 6, marginBottom: 6, gap: 6 },
  title: { color: '#FFE58A', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(255,185,56,0.8)', textShadowRadius: 10 },
  pill: { paddingHorizontal: 12, height: 28, borderRadius: 14, justifyContent: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,229,138,0.25)' },
  dotOn: { backgroundColor: '#FFD06B', shadowColor: '#FFD06B', shadowOpacity: 1, shadowRadius: 6 },
  jackpots: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  jp: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 2, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', minWidth: 70 },
  marquee: { color: '#FFF3C4', fontSize: 15, letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
  banner: { position: 'absolute', left: 24, right: 24, top: '38%', paddingVertical: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 3, borderColor: '#fff' },
  hold: { position: 'absolute', left: 0, top: 0, borderRadius: 8, overflow: 'hidden' },
  empty: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,208,107,0.25)', overflow: 'hidden' },
  held: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF3C4' },
});
