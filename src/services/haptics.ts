import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettings } from '@/state/settings';

const enabled = () => Platform.OS !== 'web' && useSettings.getState().haptics;
const safe = (p: Promise<void>) => p.catch(() => undefined);

const on = () => useSettings.getState().haptics;
/** Browsers that can vibrate (Android Chrome and installed web apps there; iPhones can't from the web). */
const vibrate = (pattern: number | number[]) => {
  if (Platform.OS !== 'web' || !on() || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* not allowed before a tap */
  }
};
/** A short rhythm of impacts on phones (ms after the start). */
const rhythm = (steps: [number, Haptics.ImpactFeedbackStyle][], then?: () => void) => {
  if (!enabled()) return;
  for (const [ms, style] of steps) setTimeout(() => void safe(Haptics.impactAsync(style)), ms);
  if (then) setTimeout(then, steps[steps.length - 1][0] + 90);
};
const H = Haptics.ImpactFeedbackStyle;

export const haptic = {
  /**
   * A win you can feel by its size: a small win is one soft tap, a big win (×10+) a quick double knock and
   * a success buzz, an epic win (×50+) a drum roll that builds up.
   */
  win: (mult: number) => {
    if (mult >= 50) {
      rhythm([[0, H.Light], [90, H.Light], [170, H.Medium], [240, H.Medium], [300, H.Heavy], [420, H.Heavy]], () => void (enabled() && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))));
      vibrate([30, 60, 30, 50, 45, 40, 70, 60, 120]);
    } else if (mult >= 10) {
      rhythm([[0, H.Medium], [110, H.Heavy]], () => void (enabled() && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))));
      vibrate([40, 70, 80]);
    } else if (mult >= 3) {
      rhythm([[0, H.Light], [100, H.Medium]]);
      vibrate([25, 60, 35]);
    } else {
      if (enabled()) void safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
      vibrate(20);
    }
  },
  select: () => enabled() && void safe(Haptics.selectionAsync()),
  light: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  soft: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  success: () => enabled() && void safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => enabled() && void safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => enabled() && void safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
