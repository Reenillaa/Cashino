import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgLinear, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { Button, Chip, T, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { WHEEL_SEGMENTS, wheelLayout, type WheelRisk } from '@/engine/games/wheel.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

const SEG = 360 / WHEEL_SEGMENTS;
/** Colour per multiplier: losing segments dark, the rest by size of the prize. */
const colorFor = (m: number) => (m === 0 ? '#231A3A' : m < 1.4 ? '#7B5CFF' : m < 2 ? '#12C08A' : m < 3 ? '#FF4FA3' : '#FFB938');

function WheelArt({ layout, size, winner }: { layout: number[]; size: number; winner: number | null }) {
  const r = size / 2;
  const wedge = (i: number, ro: number, ri: number) => {
    const a0 = ((i * SEG - SEG / 2 - 90) * Math.PI) / 180, a1 = ((i * SEG + SEG / 2 - 90) * Math.PI) / 180;
    const p = (a: number, rr: number) => `${(r + rr * Math.cos(a)).toFixed(2)},${(r + rr * Math.sin(a)).toFixed(2)}`;
    return `M${p(a0, ro)} A${ro},${ro} 0 0 1 ${p(a1, ro)} L${p(a1, ri)} A${ri},${ri} 0 0 0 ${p(a0, ri)} Z`;
  };
  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgLinear id="wrim" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE58A" />
          <Stop offset="0.5" stopColor="#E0A21C" />
          <Stop offset="1" stopColor="#8A5300" />
        </SvgLinear>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#wrim)" />
      <Circle cx={r} cy={r} r={r * 0.94} fill="#120A22" />
      {layout.map((m, i) => (
        <Path key={i} d={wedge(i, r * 0.92, r * 0.42)} fill={colorFor(m)} stroke={winner === i ? '#FFFFFF' : 'rgba(255,229,138,0.5)'} strokeWidth={winner === i ? 3 : 1} />
      ))}
      {layout.map((m, i) => {
        if (m === 0) return null;
        const a = ((i * SEG - 90) * Math.PI) / 180;
        const x = r + r * 0.72 * Math.cos(a), y = r + r * 0.72 * Math.sin(a);
        return (
          <SvgText key={`t${i}`} x={x} y={y + 3.5} fontSize={size < 280 ? 8.5 : 10} fontWeight="900" fill="#FFFFFF" textAnchor="middle" transform={`rotate(${i * SEG} ${x} ${y})`}>
            {m}
          </SvgText>
        );
      })}
      {/* bulbs on the rim */}
      {Array.from({ length: 30 }, (_, i) => {
        const a = ((i * SEG - 90) * Math.PI) / 180;
        return <Circle key={`b${i}`} cx={r + r * 0.97 * Math.cos(a)} cy={r + r * 0.97 * Math.sin(a)} r={size * 0.008} fill="#FFF6D0" />;
      })}
      <Circle cx={r} cy={r} r={r * 0.42} fill="#1A0F08" stroke="url(#wrim)" strokeWidth={4} />
    </Svg>
  );
}

export default function WheelScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('wheel');
  const [bet, setBet] = useBet('wheel', s.room);
  const [risk, setRisk] = useState<WheelRisk>('medium');
  const [busy, setBusy] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [box, setBox] = useState({ w: 340, h: 360 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('wheel', (d) => d);
  const layout = useMemo(() => wheelLayout(risk), [risk]);
  const rot = useSharedValue(0);
  const size = Math.max(220, Math.min(box.w - 24, box.h - 70, 360));

  const spin = async () => {
    try {
      setBusy(true);
      setWinner(null);
      const r = await s.op('play', { bet, risk });
      const v = r.view as { segment: number; multiplier: number };
      // land the chosen segment under the arrow at the top, after several full turns
      const current = rot.get();
      const target = Math.ceil(current / 360) * 360 + 360 * 5 - v.segment * SEG + (Math.random() - 0.5) * SEG * 0.6;
      sfx('roll', 0.5);
      haptic.medium();
      rot.set(reduceMotion ? target : withTiming(target, { duration: 3200, easing: Easing.out(Easing.cubic) }));
      if (!reduceMotion) {
        for (let k = 0; k < 10; k++) setTimeout(() => sfx('tick', 0.35), 120 + k * k * 26);
        await wait(3250);
      }
      setWinner(v.segment);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined, label: formatMult(v.multiplier) });
      tutorialEvent('wheel', 'wheel:spin');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const legend = [...new Set(layout.filter((m) => m > 0))].sort((a, b) => a - b);
  return (
    <GameShell
      game="wheel"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={{ width: size, height: size + 14, alignItems: 'center' }}>
            <Animated.View style={[{ marginTop: 14, width: size, height: size }, wheelStyle]}>
              <WheelArt layout={layout} size={size} winner={busy ? null : winner} />
            </Animated.View>
            {/* pointer */}
            <View style={styles.pointer} pointerEvents="none">
              <Svg width={34} height={36}><Polygon points="17,34 3,4 31,4" fill="#FF3B5C" stroke="#FFF6D0" strokeWidth={2.5} strokeLinejoin="round" /></Svg>
            </View>
            <View style={[styles.hub, { top: 14 + size / 2 - size * 0.16, width: size * 0.32, height: size * 0.32, borderRadius: size }]} pointerEvents="none">
              <T weight="display" tabular style={{ color: '#FFE58A', fontSize: size * 0.075 }}>{winner !== null && !busy ? formatMult(layout[winner]) : '🎡'}</T>
            </View>
          </View>
          <View style={styles.legend}>
            {legend.map((m) => (
              <View key={m} style={[styles.leg, { backgroundColor: colorFor(m) }]}>
                <T weight="displaySemi" style={{ color: '#fff', fontSize: 11 }}>{formatMult(m)}</T>
              </View>
            ))}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
            {(['low', 'medium', 'high'] as WheelRisk[]).map((k) => (
              <Chip key={k} label={t(`play.risk${k[0].toUpperCase()}${k.slice(1)}`)} selected={risk === k} onPress={() => { if (!busy) { setRisk(k); setWinner(null); } }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} /></View>
            <Button spot="wheel:spin" title={t('play.spin')} onPress={spin} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pointer: { position: 'absolute', top: 0, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 4 },
  hub: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A0F08', borderWidth: 3, borderColor: '#E0A21C' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 10 },
  leg: { paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center' },
});
