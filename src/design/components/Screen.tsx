import React from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import { SCREEN_PAD } from '../tokens';
import { T } from './Text';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';

export const TAB_BAR_SPACE = 96;

/** Scrollable screen with large iOS-style title, safe areas and tab-bar clearance. */
export function Screen({
  title,
  subtitle,
  right,
  back,
  children,
  scroll = true,
  tabBar = true,
  contentStyle,
  ...rest
}: ScrollViewProps & { title?: string; subtitle?: string; right?: React.ReactNode; back?: boolean; scroll?: boolean; tabBar?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const header = (title || back || right) && (
    <View style={{ paddingTop: insets.top + (back ? 6 : 12), paddingHorizontal: SCREEN_PAD, paddingBottom: 12 }}>
      {back && <BackButton />}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          {title ? (
            <T variant="title" accessibilityRole="header" style={{ fontSize: back ? 26 : 32, lineHeight: back ? 32 : 38 }}>
              {title}
            </T>
          ) : null}
          {subtitle ? <T variant="footnote" color="text3" style={{ marginTop: 4 }}>{subtitle}</T> : null}
        </View>
        {right}
      </View>
    </View>
  );
  const bottom = (tabBar ? TAB_BAR_SPACE : 24) + insets.bottom;
  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        {header}
        <View style={[styles.flex, contentStyle]}>{children}</View>
      </View>
    );
  }
  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: c.bg }]}
      contentContainerStyle={[{ paddingBottom: bottom }, !header && { paddingTop: insets.top }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {header}
      {children}
    </ScrollView>
  );
}

export function BackButton({ label }: { label?: string }) {
  const router = useRouter();
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityLabel={label ?? 'Back'}
      hitSlop={12}
      style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2, marginBottom: 10 }}
    >
      <Icon name="chevronLeft" size={20} color={c.text} />
    </PressableScale>
  );
}

export function IconButton({ icon, onPress, label, tint }: { icon: IconName; onPress: () => void; label: string; tint?: string }) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2 }}
    >
      <Icon name={icon} size={20} color={tint ?? c.text} />
    </PressableScale>
  );
}

export function Section({ title, action, children, style }: { title?: string; action?: React.ReactNode; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginTop: 28 }, style]}>
      {(title || action) && (
        <View style={[styles.titleRow, { paddingHorizontal: SCREEN_PAD, marginBottom: 12 }]}>
          <T variant="caption" color="text3" style={{ flex: 1 }} accessibilityRole="header">
            {title}
          </T>
          {action}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
