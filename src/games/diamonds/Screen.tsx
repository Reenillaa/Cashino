import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Button, T, formatMult } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { DIAMOND_HANDS, DIAMOND_PAYS, type DiamondHand } from '@/engine/games/diamonds.ts';
import { useGameSession } from '@/features/play/session';
import { tutorialEvent } from '@/features/tutorial/tutorial';
import { GameShell } from '../shared/GameShell';
import { BetInput } from '../shared/BetInput';
import { HistoryStrip } from '../shared/HistoryStrip';
import { ResultBanner } from '../shared/ResultBanner';
import { useBet, useGameHistory, usePlayErrors, useResult, wait } from '../shared/hooks';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/** The 7 gem colours (light, main, dark). */
const GEMS: [string, string, string][] = [
  ['#C8FFE9', '#12C08A', '#0B6E52'],
  ['#FFD3E8', '#FF4FA3', '#9E0F5E'],
  ['#E3DBFF', '#7B5CFF', '#3A1FA8'],
  ['#FFF1C2', '#FFB938', '#B8670A'],
  ['#D6F1FF', '#3BA7FF', '#0F4F9E'],
  ['#FFD9D0', '#FF5C3A', '#9E2A0F'],
  ['#F2F2F7', '#B8BCC8', '#5E6270'],
];

function Gem({ color, size }: { color: number; size: number }) {
  const [l, m, d] = GEMS[color];
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Path d="M8 14 L14 6 L26 6 L32 14 L20 36 Z" fill={m} />
      <Path d="M8 14 L32 14 L20 36 Z" fill={d} opacity={0.55} />
      <Path d="M14 6 L18 14 L22 14 L26 6 Z" fill={l} />
      <Path d="M8 14 L14 6 L18 14 Z M32 14 L26 6 L22 14 Z" fill={l} opacity={0.6} />
      <Path d="M18 14 L20 36 L22 14 Z" fill={l} opacity={0.35} />
      <Path d="M31 4 v4 M29 6 h4" stroke="#fff" strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

/** One slot: the gem falls in from above and bounces; matching gems pulse. */
function Slot({ color, k, drop, glow, size }: { color: number | null; k: number; drop: number; glow: boolean; size: number }) {
  const { reduceMotion } = useTheme();
  const y = useSharedValue(0);
  const s = useSharedValue(1);
  React.useEffect(() => {
    if (color === null || reduceMotion) return;
    y.set(-220);
    y.set(withDelay(k * 170, withSpring(0, { damping: 11, stiffness: 160 })));
  }, [drop]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (!glow || reduceMotion) return;
    s.set(withSequence(withTiming(1.18, { duration: 180, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 260 })));
  }, [glow, drop]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: s.value }] }));
  return (
    <View style={[styles.slot, { width: size, height: size + 10, borderColor: glow ? '#FFD06B' : 'rgba(255,255,255,0.12)', shadowOpacity: glow ? 0.8 : 0 }]}>
      {color !== null ? <Animated.View style={style}><Gem color={color} size={size * 0.82} /></Animated.View> : <View style={styles.empty} />}
    </View>
  );
}

const ROWS = DIAMOND_HANDS.filter((h) => h !== 'none');

export default function DiamondsScreen({ forceTutorial }: { forceTutorial?: boolean }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const s = useGameSession('diamonds');
  const [bet, setBet] = useBet('diamonds', s.room);
  const [gems, setGems] = useState<(number | null)[]>([null, null, null, null, null]);
  const [hand, setHand] = useState<DiamondHand | null>(null);
  const [drop, setDrop] = useState(0);
  const [busy, setBusy] = useState(false);
  const [box, setBox] = useState({ w: 340 });
  const { result, show } = useResult();
  const onError = usePlayErrors();
  const history = useGameHistory('diamonds', (d) => t(`play.dHands.${d}`));
  const size = Math.min(64, (box.w - 24 - 4 * 8) / 5);

  const play = async () => {
    try {
      setBusy(true);
      setHand(null);
      const r = await s.op('play', { bet });
      const v = r.view as { gems: number[]; hand: DiamondHand; multiplier: number };
      setGems(v.gems);
      setDrop((d) => d + 1);
      for (let k = 0; k < 5; k++) setTimeout(() => sfx('gem', 0.55), reduceMotion ? 0 : 180 + k * 170);
      haptic.light();
      if (!reduceMotion) await wait(5 * 170 + 420);
      setHand(v.hand);
      show({ bet, payout: r.payout, multiplier: r.payout > 0 ? v.multiplier : undefined, label: t(`play.dHands.${v.hand}`) });
      tutorialEvent('diamonds', 'diamonds:play');
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  };
  // which slots glow: gems whose colour appears at least twice
  const counts = new Map<number, number>();
  gems.forEach((g) => g !== null && counts.set(g, (counts.get(g) ?? 0) + 1));
  return (
    <GameShell
      game="diamonds"
      mode={s.mode}
      balance={s.balance}
      locked={busy}
      forceTutorial={forceTutorial}
      history={<HistoryStrip items={history} />}
      stage={
        <View style={styles.stage} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width })}>
          {/* pay table: your hand lights up */}
          <View style={styles.table}>
            {ROWS.map((h) => {
              const on = hand === h;
              return (
                <View key={h} style={[styles.payRow, on && { backgroundColor: '#5BE3B0' }]}>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {patternOf(h).map((col, i) => <View key={i} style={[styles.dot, { backgroundColor: GEMS[col][1] }]} />)}
                  </View>
                  <T weight="displaySemi" style={{ flex: 1, fontSize: 12, color: on ? '#04201A' : 'rgba(255,255,255,0.85)' }}>{t(`play.dHands.${h}`)}</T>
                  <T weight="display" tabular style={{ fontSize: 13, color: on ? '#04201A' : '#5BE3B0' }}>{formatMult(DIAMOND_PAYS[h])}</T>
                </View>
              );
            })}
          </View>
          <View style={styles.row}>
            {gems.map((g, k) => <Slot key={k} k={k} color={g} drop={drop} size={size} glow={!!hand && g !== null && (counts.get(g) ?? 0) >= 2} />)}
          </View>
          <ResultBanner result={result} />
        </View>
      }
      controls={
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <View style={{ flex: 1.15 }}><BetInput value={bet} onChange={setBet} balance={s.balance} min={s.room.min} max={s.room.max} disabled={busy} /></View>
          <Button spot="diamonds:play" title={t('common.play')} onPress={play} loading={busy} disabled={bet > s.balance || bet < s.room.min || bet > s.room.max} style={{ flex: 1 }} />
        </View>
      }
    />
  );
}

/** Little colour dots that illustrate each hand in the pay table. */
function patternOf(h: DiamondHand): number[] {
  return ({ five: [0, 0, 0, 0, 0], four: [1, 1, 1, 1, 6], full: [2, 2, 2, 3, 3], three: [3, 3, 3, 6, 5], twoPair: [4, 4, 5, 5, 6], pair: [5, 5, 6, 4, 2], none: [0, 1, 2, 3, 4] } as Record<DiamondHand, number[]>)[h];
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, gap: 22 },
  table: { width: '100%', maxWidth: 360, gap: 4, padding: 10, borderRadius: 20, backgroundColor: 'rgba(3,26,24,0.72)', borderWidth: 1.5, borderColor: 'rgba(91,227,176,0.4)' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 26, paddingHorizontal: 10, borderRadius: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', gap: 8 },
  slot: { borderRadius: 16, borderWidth: 2, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', shadowColor: '#FFD06B', shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  empty: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.15)' },
});
