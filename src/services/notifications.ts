import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '@/i18n';

/**
 * Local, opt-in daily reminder (no pressure wording, no streak threats). Remote push for social events
 * needs APNs credentials and is documented in docs/09-IOS-INSTALL.md.
 */
export async function scheduleDailyReminder(enabled: boolean) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;
    await Notifications.scheduleNotificationAsync({
      content: { title: i18n.t('home.daily'), body: i18n.t('settings.notifDaily') },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 18, minute: 30 },
    });
  } catch {
    // permissions denied or unsupported → silently ignore
  }
}
