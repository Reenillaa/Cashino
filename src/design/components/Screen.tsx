import React, { useCallback } from 'react';
import { StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { SCREEN_PAD, brand, motion } from '../tokens';
import { Aurora } from './Effects';
import { T } from './Text';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';

export const TAB_BAR_SPACE = 96;
const EASE_ENTER = Easing.bezier(...motion.easeEnter);

/**
 * Soft entrance every time a screen gains focus (tab switch, coming back from a game):
 * content fades in and rises 12 px. Transform/opacity only; disabled with reduced motion.
 */
export function useFocusEntrance() {
  const { reduceMotion } = useTheme();
  const p = useSharedValue(reduceMotion ? 1 : 0);
  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        p.set(1);
        return;
      }
      p.set(0);
      p.set(withTiming(1, { duration: 420, easing: EASE_ENTER }));
    }, [reduceMotion, p]),
  );
  return useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
}

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
  const entrance = useFocusEntrance();
  const focused = useIsFocused();
  const header = (title || back || right) && (
    <View style={{ paddingTop: insets.top + (back ? 6 : 12), paddingHorizontal: SCREEN_PAD, paddingBottom: 12 }}>
      {back && <BackButton />}
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          {title ? (
            <T variant="title" accessibilityRole="header" style={{ fontSize: back ? 28 : 34, lineHeight: back ? 34 : 40 }}>
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
      <Animated.View style={[styles.flex, { backgroundColor: c.bg }, entrance]}>
        {header}
        <View style={[styles.flex, contentStyle]}>{children}</View>
      </Animated.View>
    );
  }
  return (
    <Animated.ScrollView
      style={[styles.flex, { backgroundColor: c.bg }, entrance]}
      contentContainerStyle={[{ paddingBottom: bottom }, !header && { paddingTop: insets.top }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {header ? <Aurora colors={[brand.violet, brand.pink, brand.amber]} height={340} alpha={0.26} active={focused} /> : null}
      {header}
      {children}
    </Animated.ScrollView>
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
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2, marginBottom: 10 }}
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
    <View style={[{ marginTop: 32 }, style]}>
      {(title || action) && (
        <View style={[styles.titleRow, { paddingHorizontal: SCREEN_PAD, marginBottom: 14 }]}>
          <T weight="displaySemi" style={{ flex: 1, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 }} accessibilityRole="header">
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
