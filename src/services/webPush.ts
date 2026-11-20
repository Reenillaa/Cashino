import { Platform } from 'react-native';
import { callFn } from './supabase';
import { useSession } from '@/state/session';

/**
 * Web push for the installed web app (iPhone from iOS 16.4 once it is on the home screen, Android, computers).
 * The public VAPID key is public by design; the private one lives only in the server's secrets.
 */
export const VAPID_PUBLIC = 'BK8s-G3tjDpZEjpgsKH2pnaIwbtpVjDK1XXDbHaFqxEW44oyXPrigICYwtN14GvtVW6dBjaP8NIaV7N68JlPEpg';
export type PushPrefs = { daily: boolean; social: boolean; tournaments: boolean };
export type PushResult = 'ok' | 'off' | 'denied' | 'unsupported' | 'signin' | 'error';

export function webPushSupported(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

const key = (b64: string) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(s, (ch) => ch.charCodeAt(0));
};
/** The service worker sits next to manifest.json (the app may live under a sub-path such as /Cashino/). */
const swUrl = () => {
  const href = (document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null)?.href;
  return href ? href.replace(/manifest\.json(\?.*)?$/, 'sw.js') : `${location.origin}/sw.js`;
};

/** Ask once (from a tap), subscribe this browser and tell the server which notifications you want. */
export async function syncWebPush(prefs: PushPrefs): Promise<PushResult> {
  if (!webPushSupported()) return 'unsupported';
  const anyOn = prefs.daily || prefs.social || prefs.tournaments;
  try {
    const url = swUrl();
    if (!anyOn) {
      const reg = await navigator.serviceWorker.getRegistration(url.replace(/sw\.js$/, ''));
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await callFn('push', { action: 'unsubscribe', endpoint: sub.endpoint }).catch(() => undefined);
        await sub.unsubscribe();
      }
      return 'off';
    }
    if (!useSession.getState().userId) return 'signin';
    const perm = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (perm !== 'granted') return 'denied';
    const reg = await navigator.serviceWorker.register(url, { scope: url.replace(/sw\.js$/, '') });
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID_PUBLIC) }));
    await callFn('push', { action: 'subscribe', subscription: sub.toJSON(), prefs });
    return 'ok';
  } catch {
    return 'error';
  }
}

/** After sending chips: deliver the friend's notification now instead of at the next scheduled run. */
export function pokePush(to: string) {
  void callFn('push', { action: 'poke', to }).catch(() => undefined);
}
