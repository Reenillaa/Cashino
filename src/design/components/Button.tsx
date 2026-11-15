import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale } from './Pressable';
import { T } from './Text';
import { Icon, type IconName } from './Icon';
import { useTheme, alpha } from '../theme';
import { radius } from '../tokens';

export type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'tinted' | 'danger';

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  kind?: ButtonKind;
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  tint?: string;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
  subtitle?: string;
}

export function Button({ title, onPress, kind = 'primary', size = 'lg', icon, tint, disabled, loading, full, style, accessibilityHint, subtitle }: ButtonProps) {
  const { c } = useTheme();
  const h = size === 'lg' ? 56 : size === 'md' ? 46 : 36;
  const bg =
    kind === 'primary' ? c.primary : kind === 'secondary' ? c.surface2 : kind === 'tinted' ? alpha(tint ?? c.info, 0.16) : kind === 'danger' ? alpha(c.loss, 0.14) : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'tinted' ? tint ?? c.info : kind === 'danger' ? c.loss : c.text;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      feedback={kind === 'primary' ? 'medium' : 'light'}
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        styles.base,
        { height: subtitle ? h + 10 : h, backgroundColor: bg, borderRadius: size === 'sm' ? radius.sm : radius.md, paddingHorizontal: size === 'sm' ? 14 : 20 },
        kind === 'secondary' && { borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairlineStrong },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {kind === 'primary' && (
        <LinearGradient pointerEvents="none" colors={[c.sheenTop, 'rgba(255,255,255,0)']} style={[StyleSheet.absoluteFill, { borderRadius: radius.md }]} end={{ x: 0, y: 0.6 }} />
      )}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={size === 'sm' ? 16 : 20} color={fg} />}
          <View style={{ alignItems: 'center' }}>
            <T variant={size === 'sm' ? 'footnote' : 'callout'} weight="semibold" style={{ color: fg }} numberOfLines={1}>
              {title}
            </T>
            {subtitle ? (
              <T variant="footnote" style={{ color: fg, opacity: 0.7 }} numberOfLines={1} tabular>
                {subtitle}
              </T>
            ) : null}
          </View>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
