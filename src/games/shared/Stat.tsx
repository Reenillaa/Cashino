import React from 'react';
import { View } from 'react-native';
import { T } from '@/design/components';

/** A small label over a number — no box around it, and as short as possible. */
export function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={`${label}: ${value}`}>
      <T variant="caption" color="text3" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, lineHeight: 14 }}>{label}</T>
      <T variant="headline" weight="medium" tabular numberOfLines={1} adjustsFontSizeToFit style={[{ fontSize: 18, lineHeight: 23 }, tint ? { color: tint } : null]}>{value}</T>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>{children}</View>;
}
