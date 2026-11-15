import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

const ITEM = 58;
const MULTS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5];
const CHIP_COLORS = ['#7B5CFF', '#FF4FA3', '#12C08A', '#FF9F1C', '#21C8FD', '#FF3B5C', '#FFB938', '#00C2A8', '#C04BFF'];

/** "Nice" amounts between min and max (20 → 20, 30, 40, 50, 60, 75, 100…), always including both ends. */
export function betLadder(min: number, max: number): number[] {
  const out = new Set<number>([min, max]);
  for (let d = 1; d <= max; d *= 10) for (const m of MULTS) { const v = Math.round(m * d); if (v > min && v < max) out.add(v); }
  return [...out].sort((a, b) => a - b);
}
export const betStep = (min: number) => Math.max(1, Math.round(min / 2));

const short = (v: number) => (v >= 1000 ? `${v % 1000 === 0 ? v / 1000 : (v / 1000).toFixed(1)}k` : `${v}`);

/**
 * Bet chooser as a wheel of poker chips: swipe (or tap a chip) and the one in the middle is your bet.
 * Chips curve away like a wheel. Amounts stay inside the room limits and never above your balance.
 */
export function BetInput({ value, onChange, balance, disabled, label, min = 1, max = Number.MAX_SAFE_INTEGER }: { value: number; onChange: (v: number) => void; balance: number; disabled?: boolean; tint?: string; label?: string; min?: number; max?: number; step?: number }) {
  const { t } = useT();
  const { c } = useTheme();
  const top = Math.max(min, Math.min(max, Math.floor(balance)));
  const values = useMemo(() => betLadder(min, top), [min, top]);
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const ref = useRef<Animated.ScrollView>(null);
  const idx = Math.max(0, values.findIndex((v) => v >= value));
  // Keep the wheel on the current value (room change, balance drop…).
  useEffect(() => {
    if (!w) return;
    const id = setTimeout(() => ref.current?.scrollTo({ x: idx * ITEM, animated: false }), 0);
    return () => clearTimeout(id);
  }, [w, values.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (values.length && !values.includes(value)) onChange(values[idx] ?? values[values.length - 1]);
  }, [values]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick = (i: number) => {
    const v = values[Math.max(0, Math.min(values.length - 1, i))];
    if (v === undefined || v === value) return;
    haptic.select();
    sfx('chip', 0.35);
    onChange(v);
  };
  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => x.set(e.contentOffset.x) });
  useAnimatedReaction(
    () => Math.round(x.value / ITEM),
    (now, prev) => {
      if (prev !== null && now !== prev) runOnJS(pick)(now);
    },
    [values, value],
  );
  const pad = Math.max(0, (w - ITEM) / 2);
  return (
    <View style={{ opacity: disabled ? 0.45 : 1 }} pointerEvents={disabled ? 'none' : 'auto'} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} accessibilityRole="adjustable" accessibilityLabel={`${label ?? t('common.bet')}: ${value}`}>
      <View style={[styles.well, { backgroundColor: c.surface2 }]}>
        {w > 0 && (
          <Animated.ScrollView
            ref={ref}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={onScroll}
            contentContainerStyle={{ alignItems: 'center' }}
          >
            <View style={{ width: pad }} />
            {values.map((v, i) => (
              <WheelChip key={v} v={v} i={i} x={x} color={CHIP_COLORS[i % CHIP_COLORS.length]} onPress={() => ref.current?.scrollTo({ x: i * ITEM, animated: true })} />
            ))}
            <View style={{ width: pad }} />
          </Animated.ScrollView>
        )}
        <View pointerEvents="none" style={styles.notch} />
      </View>
      <T variant="caption" color="text3" align="center" style={{ fontSize: 11, marginTop: 2 }}>{label ?? t('common.bet')} · <T variant="caption" weight="semibold" style={{ fontSize: 11 }}>{value.toLocaleString('es-ES')}</T></T>
    </View>
  );
}

function WheelChip({ v, i, x, color, onPress }: { v: number; i: number; x: SharedValue<number>; color: string; onPress: () => void }) {
  const style = useAnimatedStyle(() => {
    const d = (x.value - i * ITEM) / ITEM; // 0 = centre
    const s = interpolate(Math.abs(d), [0, 1, 2], [1.12, 0.78, 0.6], Extrapolation.CLAMP);
    return {
      opacity: interpolate(Math.abs(d), [0, 1.5, 2.5], [1, 0.55, 0.2], Extrapolation.CLAMP),
      transform: [{ translateY: Math.min(2.5, Math.abs(d)) ** 2 * 3 }, { rotate: `${-d * 14}deg` }, { scale: s }],
    };
  });
  return (
    <PressableScale onPress={onPress} feedback="none" scaleTo={0.9} accessibilityLabel={`${v}`} style={{ width: ITEM, alignItems: 'center' }}>
      <Animated.View style={style}>
        <View style={[styles.chip, { backgroundColor: color }]}>
          <View style={styles.edge} />
          <View style={styles.face}>
            <T weight="display" style={{ color: '#fff', fontSize: v >= 1000 ? 12 : v >= 100 ? 13 : 15, lineHeight: 18 }}>{short(v)}</T>
          </View>
        </View>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  well: { height: 64, borderRadius: 32, overflow: 'hidden', justifyContent: 'center' },
  chip: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  edge: { position: 'absolute', left: 3, top: 3, right: 3, bottom: 3, borderRadius: 22, borderWidth: 4, borderColor: '#fff', borderStyle: 'dashed', opacity: 0.85 },
  face: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
  notch: { position: 'absolute', top: 0, alignSelf: 'center', width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff' },
});
