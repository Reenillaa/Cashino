import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';

export const CHIP_VALUES = [5, 10, 20, 25, 50, 100, 200, 500, 1000, 2000, 5000];
const CHIP_TINTS = ['#C5CAD1', '#8FB8F0', '#6FD3A0', '#6FD3A0', '#E9B65C', '#E2668F', '#D08F55', '#9B7BFF', '#F3F4F6', '#4FD1E0', '#D8B56A'];

export function chipTint(v: number) {
  const i = CHIP_VALUES.indexOf(v);
  return CHIP_TINTS[i >= 0 ? i : 0];
}

/** Largest denomination that fits an amount (for the stacked chip shown on a bet spot). */
export function chipFor(amount: number) {
  return [...CHIP_VALUES].reverse().find((x) => x <= amount) ?? CHIP_VALUES[0];
}

export function ChipToken({ value, size = 34, selected }: { value: number; size?: number; selected?: boolean }) {
  const col = chipTint(value);
  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: size / 2, borderColor: col, backgroundColor: '#15171B', transform: [{ scale: selected ? 1.12 : 1 }] }]}>
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 3, borderColor: col, borderStyle: 'dashed', opacity: 0.6 }]} />
      <T style={{ fontFamily: 'Geist_600SemiBold', fontSize: size * (value >= 100 && value < 1000 ? 0.28 : 0.32), color: col }}>{value >= 1000 ? `${value / 1000}k` : value}</T>
    </View>
  );
}

/** Chip selector for table games (roulette, sic bo, baccarat). */
export function ChipRack({ value, onChange, balance, values = CHIP_VALUES }: { value: number; onChange: (v: number) => void; balance: number; values?: number[] }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4, paddingHorizontal: 2 }} style={{ flexGrow: 0 }}>
      {values.map((v) => (
        <PressableScale key={v} onPress={() => onChange(v)} disabled={v > balance} feedback="select" accessibilityLabel={`${v}`} accessibilityState={{ selected: value === v }}>
          <View style={{ padding: 2, borderRadius: 22, borderWidth: 1.5, borderColor: value === v ? c.text : 'transparent' }}>
            <ChipToken value={v} selected={value === v} />
          </View>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
});
