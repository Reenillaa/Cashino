import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme, alpha, adaptTint } from '../theme';
import { radius } from '../tokens';
import { T } from './Text';
import { PressableScale } from './Pressable';
import { Icon, type IconName } from './Icon';

export function Chip({ label, selected, onPress, icon, tint: rawTint }: { label: string; selected?: boolean; onPress?: () => void; icon?: IconName; tint?: string }) {
  const { c, isDark } = useTheme();
  const tint = rawTint ? adaptTint(rawTint, isDark) : undefined;
  const content = (
    <View
      style={[
        styles.chip,
        { backgroundColor: selected ? (tint ? alpha(tint, 0.18) : c.surface3) : c.surface2 },
      ]}
    >
      {icon && <Icon name={icon} size={14} color={selected ? tint ?? c.text : c.text3} />}
      <T variant="footnote" weight="medium" color={selected ? (tint ?? 'text') : 'text2'}>{label}</T>
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} feedback="select" accessibilityState={{ selected: !!selected }} accessibilityLabel={label}>
      {content}
    </PressableScale>
  );
}

export function Tag({ label, tint }: { label: string; tint?: string }) {
  const { c } = useTheme();
  const col = tint ?? c.text3;
  return (
    <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: alpha(col.startsWith('#') ? col : '#8E959F', 0.16) }}>
      <T variant="caption" style={{ color: col, fontSize: 10, letterSpacing: 0.8 }}>{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: radius.pill },
});
