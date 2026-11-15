import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettings } from '@/state/settings';

const enabled = () => Platform.OS !== 'web' && useSettings.getState().haptics;
const safe = (p: Promise<void>) => p.catch(() => undefined);

export const haptic = {
  select: () => enabled() && void safe(Haptics.selectionAsync()),
  light: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  heavy: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
  soft: () => enabled() && void safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  success: () => enabled() && void safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => enabled() && void safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => enabled() && void safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
