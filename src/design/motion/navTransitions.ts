import { Animated, Easing, Platform } from 'react-native';
import type { StackCardInterpolatedStyle, StackCardInterpolationProps, StackNavigationOptions } from 'expo-router/js-stack';
import type { BottomTabNavigationOptions } from 'expo-router/js-tabs';

/**
 * Screen-to-screen motion. Everything here runs on the JavaScript stack and tabs, so it looks the same on
 * phones and in the browser (the installed web app), where the native stack does not animate.
 *
 *  - push: the new page slides in over the old one, which drifts left, shrinks a touch and dims (parallax);
 *    on wide screens it is a soft rise and fade instead of a full-width slide.
 *  - game: entering a game zooms into it from the card you tapped, the lobby behind sinks and darkens.
 *  - sheet: modals (sign in, rules) rise from the bottom with rounded corners over a shrinking page.
 *  - tabs: the old tab slides out and the new one in, in the direction of the tab you picked.
 */
const { add, multiply } = Animated;
const WIDE = 900;

const clampLinear = (v: Animated.AnimatedInterpolation<number>, out: number[], inp = [0, 1]) => v.interpolate({ inputRange: inp, outputRange: out, extrapolate: 'clamp' });

/** Pages: parallax slide (phones) or rise and fade (computers). */
export function forPush({ current, next, inverted, layouts: { screen } }: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const wide = screen.width >= WIDE;
  const p = current.progress;
  const n = next ? next.progress : null;
  if (wide) {
    return {
      cardStyle: {
        opacity: add(clampLinear(p, [0, 1], [0, 0.6]), n ? clampLinear(n, [0, -0.6]) : 0),
        transform: [{ translateY: clampLinear(p, [28, 0]) }, { scale: add(clampLinear(p, [0.985, 1]), n ? clampLinear(n, [0, -0.02]) : 0) }],
      },
    };
  }
  return {
    cardStyle: {
      borderRadius: clampLinear(p, [28, 0], [0.6, 1]),
      overflow: 'hidden',
      transform: [
        { translateX: multiply(clampLinear(p, [screen.width, 0]), inverted) },
        { translateX: n ? multiply(clampLinear(n, [0, -screen.width * 0.28]), inverted) : 0 },
        { scale: n ? clampLinear(n, [1, 0.94]) : 1 },
      ],
    },
    overlayStyle: { opacity: clampLinear(p, [0, 0.55]) },
    shadowStyle: { shadowOpacity: clampLinear(p, [0, 0.45]), shadowRadius: 18, shadowOffset: { width: -6, height: 0 } },
  };
}

/** Games and live tables: the room opens up around you. */
export function forGame({ current, next }: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const p = current.progress;
  return {
    cardStyle: {
      opacity: clampLinear(p, [0, 1], [0, 0.45]),
      borderRadius: clampLinear(p, [36, 0], [0.5, 1]),
      overflow: 'hidden',
      transform: [{ scale: add(clampLinear(p, [0.86, 1]), next ? clampLinear(next.progress, [0, 0.06]) : 0) }],
    },
    overlayStyle: { opacity: clampLinear(p, [0, 0.75]) },
  };
}

/** Modals: a sheet rising from the bottom edge. */
export function forSheet({ current, next, layouts: { screen }, insets }: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const p = current.progress;
  const n = next ? next.progress : null;
  const top = Math.max(insets.top, 12);
  return {
    cardStyle: {
      borderTopLeftRadius: clampLinear(p, [30, 0], [0.7, 1]),
      borderTopRightRadius: clampLinear(p, [30, 0], [0.7, 1]),
      overflow: 'hidden',
      transform: [
        { translateY: clampLinear(p, [screen.height, 0]) },
        { translateY: n ? clampLinear(n, [0, top * 0.5]) : 0 },
        { scale: n ? clampLinear(n, [1, 0.93]) : 1 },
      ],
    },
    overlayStyle: { opacity: clampLinear(p, [0, 0.6]) },
  };
}

const openSpec = { animation: 'timing' as const, config: { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) } };
const closeSpec = { animation: 'timing' as const, config: { duration: 320, easing: Easing.bezier(0.4, 0, 0.2, 1) } };
const gameOpen = { animation: 'timing' as const, config: { duration: 520, easing: Easing.bezier(0.16, 1, 0.3, 1) } };

/** Options for every page of the root stack. */
export function pageOptions(bg: string): StackNavigationOptions {
  return {
    headerShown: false,
    // the JS stack turns animations off on the web unless asked; our interpolators below replace the preset
    animation: 'default',
    // 'float' keeps every card at the window's height on the web, so each page scrolls inside itself.
    // (With the default the card grows with its content for the browser to scroll, but our rounded,
    // clipped cards then cut the page off and nothing scrolls — e.g. the Academy.)
    headerMode: 'float',
    cardStyle: { backgroundColor: bg },
    cardOverlayEnabled: true,
    cardStyleInterpolator: forPush,
    transitionSpec: { open: openSpec, close: closeSpec },
    gestureEnabled: Platform.OS !== 'web',
    gestureDirection: 'horizontal',
  };
}
export const gameOptions: StackNavigationOptions = {
  cardStyleInterpolator: forGame,
  transitionSpec: { open: gameOpen, close: closeSpec },
  gestureEnabled: Platform.OS !== 'web',
};
export const sheetOptions: StackNavigationOptions = {
  cardStyleInterpolator: forSheet,
  transitionSpec: { open: { animation: 'timing', config: { duration: 460, easing: Easing.bezier(0.2, 1, 0.3, 1) } }, close: closeSpec },
  gestureDirection: 'vertical',
  gestureEnabled: Platform.OS !== 'web',
};

/* ------------------------------------------------------------------ tabs */

/** progress: −1 tab to the left of the active one, 0 active, 1 to the right. */
type TabProps = { current: { progress: Animated.Value } };
export function forTab({ current }: TabProps) {
  const p = current.progress;
  return {
    sceneStyle: {
      opacity: p.interpolate({ inputRange: [-1, -0.6, 0, 0.6, 1], outputRange: [0, 0.15, 1, 0.15, 0] }),
      transform: [
        { translateX: p.interpolate({ inputRange: [-1, 0, 1], outputRange: [-56, 0, 56] }) },
        { scale: p.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.97, 1, 0.97] }) },
      ],
    },
  };
}
export const tabOptions: BottomTabNavigationOptions = {
  sceneStyleInterpolator: forTab,
  transitionSpec: { animation: 'timing', config: { duration: 340, easing: Easing.bezier(0.22, 1, 0.36, 1) } },
};
