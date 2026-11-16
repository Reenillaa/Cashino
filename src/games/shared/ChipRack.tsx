import React from 'react';
import { ScrollView, View } from 'react-native';
import { CasinoChip, PressableScale } from '@/design/components';
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

const CHIP_COLORS = ['#8A90A8', '#3D7BFF', '#12C08A', '#16A34A', '#FFB938', '#E8304F', '#D9741C', '#7B5CFF', '#1A1430', '#00B8D9', '#C9A227'];
export function ChipToken({ value, size = 34, selected }: { value: number; size?: number; selected?: boolean }) {
  const i = CHIP_VALUES.indexOf(value);
  return (
    <View style={{ transform: [{ scale: selected ? 1.12 : 1 }] }}>
      <CasinoChip size={size} color={CHIP_COLORS[i >= 0 ? i : 0]} label={value >= 1000 ? `${value / 1000}k` : `${value}`} />
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

