import React from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SCREEN_PAD, radius } from '../tokens';
import { T } from './Text';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

/** iOS inset-grouped list. */
export function ListGroup({ children, footer, style }: { children: React.ReactNode; footer?: string; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginHorizontal: SCREEN_PAD }, style]}>
      <View style={{ backgroundColor: c.surface1, borderRadius: radius.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline }}>
        {items.map((child, i) => (
          <View key={i}>
            {child}
            {i < items.length - 1 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.hairline, marginLeft: 52 }} />}
          </View>
        ))}
      </View>
      {footer ? <T variant="footnote" color="text3" style={{ marginTop: 8, marginHorizontal: 4 }}>{footer}</T> : null}
    </View>
  );
}

export function ListRow({
  icon,
  iconTint,
  title,
  subtitle,
  value,
  onPress,
  chevron = !!onPress,
  right,
  destructive,
}: {
  icon?: IconName;
  iconTint?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  right?: React.ReactNode;
  destructive?: boolean;
}) {
  const { c } = useTheme();
  const body = (
    <View style={styles.row}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: c.surface3 }]}>
          <Icon name={icon} size={17} color={destructive ? c.loss : iconTint ?? c.text} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T variant="body" style={destructive ? { color: c.loss } : undefined}>{title}</T>
        {subtitle ? <T variant="footnote" color="text3" style={{ marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      {value ? <T variant="body" color="text3" numberOfLines={1} style={{ maxWidth: 160 }}>{value}</T> : null}
      {right}
      {chevron ? <Icon name="chevronRight" size={16} color={c.text3} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale onPress={onPress} scaleTo={0.99} feedback="select" accessibilityLabel={title}>
      {body}
    </PressableScale>
  );
}

export function ToggleRow({ icon, title, subtitle, value, onChange }: { icon?: IconName; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <ListRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      right={
        <Switch
          value={value}
          accessibilityLabel={title}
          onValueChange={(v) => {
            haptic.select();
            sfx('toggle', 0.6);
            onChange(v);
          }}
          trackColor={{ false: c.surface3, true: c.win }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={c.surface3}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, paddingVertical: 10 },
  iconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
