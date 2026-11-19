import React, { useCallback } from 'react';
import { StyleSheet, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { SCREEN_PAD, brand, motion } from '../tokens';
import { Aurora } from './Effects';
import { CONTENT_MAX, useDesktop } from '../layout';
import { T } from './Text';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './Pressable';
import { useT } from '@/i18n';

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

/**
 * Cascade: every time a screen gains focus, its blocks come in one after another (title first, then each
 * section 55 ms later, rising 18 px and settling), driven by one clock so long pages stay cheap.
 */
const STEP = 55;
const DUR = 420;
const StaggerContext = React.createContext<SharedValue<number> | null>(null);

export function useFocusCascade() {
  const { reduceMotion } = useTheme();
  const p = useSharedValue(reduceMotion ? 10_000 : 0);
  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        p.set(10_000);
        return;
      }
      p.set(0);
      p.set(withTiming(1600, { duration: 1600, easing: Easing.linear }));
    }, [reduceMotion, p]),
  );
  return p;
}

/** One block of the cascade (`i` = its place on the page). */
export function Stagger({ i, children, style, from = 'below' }: { i: number; children: React.ReactNode; style?: StyleProp<ViewStyle>; from?: 'below' | 'left' }) {
  const p = React.useContext(StaggerContext);
  const st = useAnimatedStyle(() => {
    if (!p) return {};
    const t = Math.min(1, Math.max(0, (p.value - Math.min(i, 9) * STEP) / DUR));
    const e = 1 - (1 - t) * (1 - t) * (1 - t);
    return from === 'left'
      ? { opacity: e, transform: [{ translateX: (1 - e) * -14 }] }
      : { opacity: e, transform: [{ translateY: (1 - e) * 18 }, { scale: 0.985 + 0.015 * e }] };
  });
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/** The small brand bar under a big title: it draws itself from the left after the title lands. */
function TitleAccent() {
  const p = React.useContext(StaggerContext);
  const st = useAnimatedStyle(() => {
    const t = p ? Math.min(1, Math.max(0, (p.value - 160) / 360)) : 1;
    const e = 1 - (1 - t) * (1 - t);
    return { opacity: e, transform: [{ translateX: -14 * (1 - e) }, { scaleX: e }] };
  });
  return (
    <Animated.View style={[styles.accent, { transformOrigin: 'left' }, st]}>
      <LinearGradient colors={[brand.violet, brand.pink, brand.amber]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

/** Scrollable screen with large iOS-style title, safe areas and tab-bar clearance. */
export function Screen({
  title,
  subtitle,
  right,
  back,
  wide,
  children,
  scroll = true,
  tabBar = true,
  contentStyle,
  ...rest
}: ScrollViewProps & { title?: string; subtitle?: string; right?: React.ReactNode; back?: boolean; wide?: boolean; scroll?: boolean; tabBar?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const cascade = useFocusCascade();
  const focused = useIsFocused();
  const desktop = useDesktop();
  // on a computer the page is a centred column instead of the full window width
  const column = desktop ? { width: '100%' as const, maxWidth: back && !wide ? 860 : CONTENT_MAX, alignSelf: 'center' as const } : null;
  const header = (title || back || right) && (
    <View style={[{ paddingTop: insets.top + (back ? 6 : desktop ? 28 : 12), paddingHorizontal: SCREEN_PAD, paddingBottom: 12 }, column]}>
      {back && <BackButton />}
      <View style={styles.titleRow}>
        <Stagger i={0} from="left" style={{ flex: 1 }}>
          {title ? (
            <T variant="title" accessibilityRole="header" style={{ fontSize: back ? 28 : 34, lineHeight: back ? 34 : 40 }}>
              {title}
            </T>
          ) : null}
          {title && !back ? <TitleAccent /> : null}
          {subtitle ? <T variant="footnote" color="text3" style={{ marginTop: title && !back ? 8 : 4 }}>{subtitle}</T> : null}
        </Stagger>
        {right ? <Stagger i={1}>{right}</Stagger> : null}
      </View>
    </View>
  );
  const bottom = (tabBar && !desktop ? TAB_BAR_SPACE : desktop ? 48 : 24) + insets.bottom;
  if (!scroll) {
    return (
      <StaggerContext.Provider value={cascade}>
        <View style={[styles.flex, { backgroundColor: c.bg }]}>
          {header}
          <Stagger i={1} style={[styles.flex, contentStyle, column]}>{children}</Stagger>
        </View>
      </StaggerContext.Provider>
    );
  }
  // each top-level block of the page is one step of the cascade
  const blocks = React.Children.toArray(children).map((child, k) => (
    <Stagger key={(child as { key?: string }).key ?? k} i={k + (header ? 1 : 0)}>{child}</Stagger>
  ));
  return (
    <StaggerContext.Provider value={cascade}>
    <Animated.ScrollView
      style={[styles.flex, { backgroundColor: c.bg }]}
      contentContainerStyle={[{ paddingBottom: bottom }, !header && { paddingTop: insets.top }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {header ? <Aurora colors={[brand.violet, brand.pink, brand.amber]} height={340} alpha={0.26} active={focused} /> : null}
      {header}
      {column ? <View style={column}>{blocks}</View> : blocks}
    </Animated.ScrollView>
    </StaggerContext.Provider>
  );
}

export function BackButton({ label }: { label?: string }) {
  const router = useRouter();
  const { t } = useT();
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityLabel={label ?? t('common.back')}
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
  accent: { width: 34, height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
