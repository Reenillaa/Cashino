import React from 'react';
import { View } from 'react-native';
import { T } from '@/design/components';

/** A label over a big number — no box around it (Offsuit's "Win 71%" style). */
export function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={`${label}: ${value}`}>
      <T variant="footnote" color="text3" numberOfLines={2} align="center">{label}</T>
      <T variant="headline" weight="medium" tabular numberOfLines={1} adjustsFontSizeToFit style={[{ fontSize: 22, lineHeight: 28 }, tint ? { color: tint } : null]}>{value}</T>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>{children}</View>;
}
