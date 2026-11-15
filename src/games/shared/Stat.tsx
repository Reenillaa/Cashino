import React from 'react';
import { View } from 'react-native';
import { T } from '@/design/components';
import { useTheme } from '@/design/theme';

export function Stat({ label, value, tint }: { label: string; value: string; tint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface2, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <T variant="caption" color="text3" style={{ fontSize: 9.5 }} numberOfLines={1}>{label}</T>
      <T variant="callout" weight="semibold" tabular numberOfLines={1} style={tint ? { color: tint } : undefined}>{value}</T>
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>{children}</View>;
}
