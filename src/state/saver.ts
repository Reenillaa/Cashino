import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { useSettings } from './settings';

/**
 * Battery saver: when the phone is low on battery and not charging (or the device is clearly slow), the
 * app quietly lowers its effects — no flames, embers, glints or blur — until things are fine again.
 * Only the browser can tell us about the battery (Chrome/Android); elsewhere it simply stays off.
 */
interface SaverState { active: boolean; reason: 'battery' | 'device' | null; set: (s: { active: boolean; reason: SaverState['reason'] }) => void }
export const useSaver = create<SaverState>()((set) => ({ active: false, reason: null, set: (s) => set(s) }));

type BatteryManager = { level: number; charging: boolean; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void };

export function useBatterySaver() {
  const enabled = useSettings((s) => s.autoSaver);
  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof navigator === 'undefined') {
      useSaver.getState().set({ active: false, reason: null });
      return;
    }
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager>; deviceMemory?: number };
    const slow = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 1;
    if (slow) useSaver.getState().set({ active: true, reason: 'device' });
    let battery: BatteryManager | null = null;
    const check = () => {
      if (!battery) return;
      const low = battery.level <= 0.2 && !battery.charging;
      useSaver.getState().set(low ? { active: true, reason: 'battery' } : slow ? { active: true, reason: 'device' } : { active: false, reason: null });
    };
    let alive = true;
    nav.getBattery?.().then((b) => {
      if (!alive) return;
      battery = b;
      b.addEventListener('levelchange', check);
      b.addEventListener('chargingchange', check);
      check();
    }).catch(() => undefined);
    return () => {
      alive = false;
      battery?.removeEventListener('levelchange', check);
      battery?.removeEventListener('chargingchange', check);
    };
  }, [enabled]);
}
