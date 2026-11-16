import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinear, Path, Stop, Text as SvgText } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { TRADER_MULTIPLIER, TRADER_START, type TraderSide } from '@/engine/games/trader.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { TutorialTarget } from '@/features/tutorial/TutorialTarget';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const UP = '#3BE39A';
const DOWN = '#FF5C7A';
const TICK_MS = 95;
const fmt = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TraderScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('trader');
  const [bet, setBet] = useBet('trader', s.room);
  const [path, setPath] = useState<number[]>([TRADER_START]);
  const [shown, setShown] = useState(1);
  const [side, setSide] = useState<TraderSide | null>(null);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({ w: 340, h: 300 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('trader', (d) => d);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const play = async (pick: TraderSide) => {
    if (busy) return;
    try {
      setBusy(true);
      setSide(pick);
      haptic.medium();
      sfx('chip');
      const r = await s.op('play', { bet, side: pick });
      const v = r.view as { path: number[]; won: boolean };
      setPath(v.path);
      tutorialEvent('trader', 'trader:play');
      // reveal the (already decided) path tick by tick, like a live chart
      await new Promise<void>((res) => {
        if (reduceMotion) {
          setShown(v.path.length);
          return res();
        }
        let k = 1;
        setShown(1);
        timer.current = setInterval(() => {
          k += 1;
          setShown(k);
          if (k % 4 === 0) sfx('tick', 0.4);
          if (k >= v.path.length) {
            if (timer.current) clearInterval(timer.current);
            res();
          }
        }, TICK_MS);
      });
      show({ bet, payout: r.payout, multiplier: v.won ? TRADER_MULTIPLIER : undefined, label: `${fmt(v.path[v.path.length - 1])}` });
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };

  // chart geometry
  const pad = { l: 12, r: 58, t: 18, b: 18 };
  const W = Math.max(1, box.w - pad.l - pad.r), H = Math.max(1, box.h - pad.t - pad.b);
  const visible = path.slice(0, shown);
  const lo = Math.min(...path, TRADER_START) * 0.995, hi = Math.max(...path, TRADER_START) * 1.005;
  const x = (i: number) => pad.l + (i / Math.max(1, path.length - 1)) * W;
  const y = (v: number) => pad.t + (1 - (v - lo) / Math.max(0.0001, hi - lo)) * H;
  const last = visible[visible.length - 1];
  const upNow = last >= TRADER_START;
  const col = visible.length > 1 ? (upNow ? UP : DOWN) : '#FFFFFF';
  const d = visible.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = visible.length > 1 ? `${d} L${x(visible.length - 1).toFixed(1)},${pad.t + H} L${x(0)},${pad.t + H} Z` : '';
  const change = ((last - TRADER_START) / TRADER_START) * 100;
  return (
    <GameShell
      game="trader"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={{ flex: 1, paddingHorizontal: 12 }}>
          {/* ticker */}
          <View style={styles.ticker}>
            <View>
              <T weight="displaySemi" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, letterSpacing: 1.5 }}>CSH / EUR</T>
              <T weight="display" tabular style={{ color: col, fontSize: 34, lineHeight: 40 }}>{fmt(last)}</T>
            </View>
            <View style={[styles.change, { backgroundColor: (visible.length > 1 ? (upNow ? UP : DOWN) : '#FFFFFF') + '26' }]}>
              <T weight="displaySemi" tabular style={{ color: col, fontSize: 14 }}>{change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)} %</T>
            </View>
          </View>
          {/* chart */}
          <View style={styles.chart} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']} style={StyleSheet.absoluteFill} />
            <Svg width={box.w} height={box.h}>
              <Defs>
                <SvgLinear id="trArea" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={col} stopOpacity={0.35} />
                  <Stop offset="1" stopColor={col} stopOpacity={0} />
                </SvgLinear>
              </Defs>
              {[0.25, 0.5, 0.75].map((f) => <Line key={f} x1={pad.l} x2={pad.l + W} y1={pad.t + H * f} y2={pad.t + H * f} stroke="rgba(255,255,255,0.07)" />)}
              <Line x1={pad.l} x2={pad.l + W} y1={y(TRADER_START)} y2={y(TRADER_START)} stroke="#FFE58A" strokeWidth={1.5} strokeDasharray="6 5" />
              <SvgText x={pad.l + W + 6} y={y(TRADER_START) + 4} fontSize={10} fontWeight="700" fill="#FFE58A">{fmt(TRADER_START)}</SvgText>
              {area ? <Path d={area} fill="url(#trArea)" /> : null}
              {visible.length > 1 ? <Path d={d} stroke={col} strokeWidth={3} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
              <Circle cx={x(visible.length - 1)} cy={y(last)} r={9} fill={col} opacity={0.3} />
              <Circle cx={x(visible.length - 1)} cy={y(last)} r={5} fill={col} />
              {visible.length > 1 ? <SvgText x={pad.l + W + 6} y={y(last) + 4} fontSize={10} fontWeight="700" fill={col}>{fmt(last)}</SvgText> : null}
            </Svg>
            {!busy && visible.length <= 1 ? (
              <View style={styles.hint} pointerEvents="none">
                <T variant="body" color="text2" align="center">{t('play.traderHint')}</T>
              </View>
            ) : null}
            {side && busy ? (
              <View style={[styles.myPick, { backgroundColor: side === 'up' ? UP : DOWN }]}>
                <T weight="displaySemi" style={{ color: '#06140E', fontSize: 12 }}>{side === 'up' ? `▲ ${t('play.up')}` : `▼ ${t('play.down')}`}</T>
              </View>
            ) : null}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View style={{ gap: 10 }}>
          <BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} />
          <TutorialTarget id="trader:play" style={{ flexDirection: 'row', gap: 10 }}>
            <SideButton label={t('play.up')} arrow="▲" colors={['#3BE39A', '#0B8A55']} disabled={busy || bet > s.balance} onPress={() => play('up')} />
            <SideButton label={t('play.down')} arrow="▼" colors={['#FF5C7A', '#B3123C']} disabled={busy || bet > s.balance} onPress={() => play('down')} />
          </TutorialTarget>
        </View>
      }
    />
  );
}

function SideButton({ label, arrow, colors, disabled, onPress }: { label: string; arrow: string; colors: [string, string]; disabled: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} feedback="medium" scaleTo={0.95} accessibilityLabel={label} style={styles.side}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <T weight="display" style={{ color: '#fff', fontSize: 20 }}>{arrow} {label}</T>
      <T weight="displaySemi" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>×1,98</T>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ticker: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 8 },
  change: { paddingHorizontal: 12, height: 32, borderRadius: 16, justifyContent: 'center', marginBottom: 4 },
  chart: { flex: 1, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  hint: { position: 'absolute', left: 30, right: 30, top: '38%' },
  myPick: { position: 'absolute', left: 12, top: 12, paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
  side: { flex: 1, height: 66, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
