import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Button, Segmented, Slider, T, formatMult } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
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

const tint = META.plinko.tint;
const ROW_MS = 120;

function binColor(m: number, maxM: number, c: string) {
  if (m < 1) return alpha(c, 0.16);
  const k = Math.min(1, Math.log(m) / Math.log(Math.max(2, maxM)));
  return alpha(c, 0.3 + 0.6 * k);
}

interface BallSpec {
  id: number;
  path: boolean[];
  bin: number;
}

function Ball({ spec, geo, onLand, reduceMotion }: { spec: BallSpec; geo: { cx: number; dx: number; top: number; dy: number; r: number }; onLand: (b: BallSpec) => void; reduceMotion: boolean }) {
  const x = useSharedValue(geo.cx);
  const y = useSharedValue(geo.top - geo.dy);
  const started = useRef(false);
  if (!started.current) {
    started.current = true;
    const n = spec.path.length;
    if (reduceMotion) {
      x.value = geo.cx + (spec.bin - n / 2) * geo.dx;
      y.value = geo.top + n * geo.dy;
      setTimeout(() => onLand(spec), 50);
    } else {
      let rights = 0;
      const xs: number[] = [];
      const ys: number[] = [];
      spec.path.forEach((right, r) => {
        rights += right ? 1 : 0;
        xs.push(geo.cx + (rights - (r + 1) / 2) * geo.dx);
        ys.push(geo.top + (r + 1) * geo.dy);
      });
      x.value = withSequence(withTiming(geo.cx, { duration: ROW_MS }), ...xs.map((v) => withTiming(v, { duration: ROW_MS, easing: Easing.inOut(Easing.quad) })));
      y.value = withSequence(
        withTiming(geo.top, { duration: ROW_MS, easing: Easing.in(Easing.quad) }),
        ...ys.map((v, i) =>
          i === ys.length - 1
            ? withTiming(v, { duration: ROW_MS, easing: Easing.in(Easing.quad) }, (done) => {
                if (done) runOnJS(onLand)(spec);
              })
            : withTiming(v, { duration: ROW_MS, easing: Easing.bezier(0.3, -0.4, 0.7, 1) }),
        ),
      );
      for (let i = 0; i < n; i++) setTimeout(() => sfx('peg', 0.35), ROW_MS * (i + 1));
    }
  }
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value - geo.r }, { translateY: y.value - geo.r }] }));
  return <Animated.View pointerEvents="none" style={[styles.ball, { width: geo.r * 2, height: geo.r * 2, borderRadius: geo.r, backgroundColor: '#FFFFFF' }, style]} />;
}

export default function PlinkoScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const s = useGameSession('plinko');
  const [bet, setBet] = useBet('plinko');
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

  const drop = async () => {
    try {
      const r = await s.op('play', { bet, rows, risk });
      const v = r.view as { path: boolean[]; bin: number };
      setBalls((list) => [...list, { id: ++seq.current, path: v.path, bin: v.bin }]);
      tutorialEvent('plinko', 'plinko:drop');
    } catch (e) {
      onError(e);
    }
  };
  const inFlight = balls.length > 0;
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
                    <Circle key={`${r}-${j}`} cx={geo.cx + (j - (r + 2) / 2) * dx} cy={geo.top + r * dy + dy * 0.5} r={Math.max(2, dx * 0.08)} fill={c.text3} opacity={0.75} />
                  )),
                )}
              </Svg>
              {balls.map((b) => <Ball key={b.id} spec={b} geo={{ ...geo, top: geo.top + dy * 0.5 - dy }} onLand={onLand} reduceMotion={reduceMotion} />)}
              <View style={[styles.bins, { top: geo.top + rows * dy + dy * 0.2, left: geo.cx - ((rows + 1) * dx) / 2, width: (rows + 1) * dx }]}>
                {table.map((m, i) => (
                  <View
                    key={i}
                    accessibilityLabel={`${formatMult(m)} · ${(binProbability(rows, i) * 100).toFixed(2)} %`}
                    style={[styles.bin, { width: dx - 3, height: binH, backgroundColor: binColor(m, maxM, tint), transform: [{ translateY: lit === i ? 4 : 0 }], borderColor: lit === i ? c.text : 'transparent' }]}
                  >
                    <T style={{ fontFamily: 'Geist_600SemiBold', fontSize: dx > 26 ? 10 : 8, color: c.text }} numberOfLines={1} adjustsFontSizeToFit>
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
          <BetInput value={bet} onChange={setBet} balance={s.balance} tint={tint} />
          <Button title={t('play.drop')} onPress={drop} disabled={bet > s.balance} style={{ marginTop: 12 }} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  ball: { position: 'absolute', left: 0, top: 0, shadowColor: '#fff', shadowOpacity: 0.6, shadowRadius: 6 },
  bins: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between' },
  bin: { borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
