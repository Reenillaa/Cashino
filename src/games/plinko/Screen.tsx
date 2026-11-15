import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Button, Segmented, Slider, T, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { plinkoTable, binProbability, type PlinkoRisk } from '@/engine/games/plinko.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { useBet, useGameHistory, usePlayErrors } from '../shared/hooks';
import { META } from '../catalog';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';
import { MoreOptions } from '../shared/MoreOptions';

const tint = META.plinko.tint;
const ROW_MS = 120;

function binColor(m: number, maxM: number) {
  if (m < 1) return '#5B3FA8';
  const k = Math.min(1, Math.log(m) / Math.log(Math.max(2, maxM)));
  return k < 0.35 ? '#B83FD9' : k < 0.7 ? '#FF4F9A' : '#FFB938';
}

interface BallSpec {
  id: number;
  path: boolean[];
  bin: number;
}

let lastPeg = 0;
const pegSound = () => {
  const now = Date.now();
  if (now - lastPeg > 70) {
    lastPeg = now;
    sfx('peg', 0.3);
  }
};

function Ball({ spec, geo, onLand, reduceMotion }: { spec: BallSpec; geo: { cx: number; dx: number; top: number; dy: number; r: number }; onLand: (b: BallSpec) => void; reduceMotion: boolean }) {
  // Pre-compute where the ball is after each row; a single 0→n timeline moves it (one animation per ball).
  const pts = React.useMemo(() => {
    const xs = [geo.cx], ys = [geo.top - geo.dy];
    let rights = 0;
    xs.push(geo.cx); ys.push(geo.top);
    spec.path.forEach((right, r) => {
      rights += right ? 1 : 0;
      xs.push(geo.cx + (rights - (r + 1) / 2) * geo.dx);
      ys.push(geo.top + (r + 1) * geo.dy);
    });
    return { xs, ys };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const p = useSharedValue(0);
  useEffect(() => {
    const n = pts.xs.length - 1;
    if (reduceMotion) {
      p.set(n);
      const id = setTimeout(() => onLand(spec), 50);
      return () => clearTimeout(id);
    }
    p.set(withTiming(n, { duration: ROW_MS * n, easing: Easing.linear }, (done) => {
      if (done) runOnJS(onLand)(spec);
    }));
    const iv = setInterval(pegSound, ROW_MS);
    const stop = setTimeout(() => clearInterval(iv), ROW_MS * (n - 1));
    return () => {
      clearInterval(iv);
      clearTimeout(stop);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const { xs, ys } = pts;
  const dy = geo.dy;
  const style = useAnimatedStyle(() => {
    const n = xs.length - 1;
    const seg = Math.min(n - 1, Math.floor(p.value));
    const f = Math.min(1, p.value - seg);
    const e = f * f * (3 - 2 * f);
    const x = xs[seg] + (xs[seg + 1] - xs[seg]) * e;
    // little hop over each peg
    const y = ys[seg] + (ys[seg + 1] - ys[seg]) * f - Math.sin(f * Math.PI) * dy * 0.28;
    return { transform: [{ translateX: x - geo.r }, { translateY: y - geo.r }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.ball, { width: geo.r * 2, height: geo.r * 2, borderRadius: geo.r }, style]}>
      <View style={{ position: 'absolute', left: geo.r * 0.35, top: geo.r * 0.3, width: geo.r * 0.7, height: geo.r * 0.6, borderRadius: geo.r, backgroundColor: 'rgba(255,255,255,0.85)' }} />
    </Animated.View>
  );
}

export default function PlinkoScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('plinko');
  const [bet, setBet] = useBet('plinko', s.room);
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [balls, setBalls] = useState<BallSpec[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onError = usePlayErrors();
  const history = useGameHistory('plinko', (d) => d);
  const seq = useRef(0);
  const table = plinkoTable(rows, risk);
  const maxM = Math.max(...table);
  const W = Math.min(box.w - 24, 420);
  const dx = W / (rows + 2);
  const binH = 26;
  const dy = Math.max(10, Math.min(dx * 0.9, (box.h - binH - 30) / (rows + 1)));
  const geo = { cx: box.w / 2, dx, top: 18, dy, r: Math.max(4, Math.min(7, dx * 0.22)) };

  const onLand = useCallback((b: BallSpec) => {
    setBalls((list) => list.filter((x) => x.id !== b.id));
    setLit(b.bin);
    sfx('land', 0.7);
    haptic.light();
    setTimeout(() => setLit((l) => (l === b.bin ? null : l)), 400);
  }, []);

  // Every tap queues a ball; the queue is drained one round at a time, so fast taps never fail.
  const queue = useRef(0);
  const running = useRef(false);
  const [queued, setQueued] = useState(0);
  const drop = async () => {
    queue.current += 1;
    setQueued(queue.current);
    if (running.current) return;
    running.current = true;
    try {
      while (queue.current > 0) {
        const r = await s.op('play', { bet, rows, risk });
        const v = r.view as { path: boolean[]; bin: number };
        setBalls((list) => [...list, { id: ++seq.current, path: v.path, bin: v.bin }]);
        tutorialEvent('plinko', 'plinko:drop');
        queue.current -= 1;
        setQueued(queue.current);
        if (queue.current > 0) await new Promise((res) => setTimeout(res, 140));
      }
    } catch (e) {
      queue.current = 0;
      setQueued(0);
      onError(e);
    } finally {
      running.current = false;
    }
  };
  const inFlight = balls.length > 0 || queued > 0;
  return (
    <GameShell
      game="plinko"
      mode={s.mode}
      balance={s.balance}
      locked={inFlight}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {box.w > 0 && (
            <>
              <Svg width={box.w} height={geo.top + (rows + 1) * dy} style={StyleSheet.absoluteFill}>
                {Array.from({ length: rows }, (_, r) =>
                  Array.from({ length: r + 3 }, (_, j) => (
                    <React.Fragment key={`${r}-${j}`}>
                      <Circle cx={geo.cx + (j - (r + 2) / 2) * dx} cy={geo.top + r * dy + dy * 0.5} r={Math.max(4, dx * 0.2)} fill="#FF7AC6" opacity={0.18} />
                      <Circle cx={geo.cx + (j - (r + 2) / 2) * dx} cy={geo.top + r * dy + dy * 0.5} r={Math.max(2.2, dx * 0.09)} fill="#FFFFFF" />
                    </React.Fragment>
                  )),
                )}
              </Svg>
              {balls.map((b) => <Ball key={b.id} spec={b} geo={{ ...geo, top: geo.top + dy * 0.5 - dy }} onLand={onLand} reduceMotion={reduceMotion} />)}
              <View style={[styles.bins, { top: geo.top + rows * dy + dy * 0.2, left: geo.cx - ((rows + 1) * dx) / 2, width: (rows + 1) * dx }]}>
                {table.map((m, i) => (
                  <View
                    key={i}
                    accessibilityLabel={`${formatMult(m)} · ${(binProbability(rows, i) * 100).toFixed(2)} %`}
                    style={[styles.bin, { width: dx - 3, height: binH, backgroundColor: binColor(m, maxM), transform: [{ translateY: lit === i ? 5 : 0 }, { scale: lit === i ? 1.12 : 1 }], borderColor: lit === i ? '#FFFFFF' : 'rgba(255,255,255,0.25)', shadowColor: binColor(m, maxM), shadowOpacity: lit === i ? 0.9 : 0.35, shadowRadius: lit === i ? 12 : 4 }]}
                  >
                    <T style={{ fontFamily: 'Unbounded_600SemiBold', fontSize: dx > 26 ? 9 : 7.5, color: '#fff' }} numberOfLines={1} adjustsFontSizeToFit>
                      {m >= 100 ? Math.round(m) : m}
                    </T>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      }
      controls={
        <View>
          <MoreOptions game="plinko" disabled={inFlight} summary={`${t('play.risk')} ${(risk === 'low' ? t('play.low') : risk === 'medium' ? t('play.medium') : t('play.high')).toLowerCase()} · ${rows} ${t('play.rows').toLowerCase()}`}>
          <Segmented
            size="sm"
            value={risk}
            disabled={inFlight}
            onChange={setRisk}
            options={[{ value: 'low', label: t('play.low') }, { value: 'medium', label: t('play.medium') }, { value: 'high', label: t('play.high') }]}
            style={{ marginBottom: 6 }}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T variant="footnote" color="text3" style={{ width: 64 }}>{t('play.rows')} {rows}</T>
            <View style={{ flex: 1, opacity: inFlight ? 0.4 : 1 }} pointerEvents={inFlight ? 'none' : 'auto'}>
              <Slider value={rows} min={8} max={16} step={1} onChange={setRows} tint={tint} accessibilityLabel={t('play.rows')} />
            </View>
          </View>
          </MoreOptions>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} tint={tint} /></View>
            <Button spot="plinko:drop" title={queued > 0 ? `${t('play.drop')} · ${queued}` : t('play.drop')} onPress={drop} disabled={(bet * (queued + 1) > s.balance || bet < s.room.min || bet > s.room.max)} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  ball: { position: 'absolute', left: 0, top: 0, backgroundColor: '#FF4F9A', borderWidth: 1.5, borderColor: '#FFD0E6', shadowColor: '#FF4F9A', shadowOpacity: 0.9, shadowRadius: 8 },
  bins: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between' },
  bin: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
