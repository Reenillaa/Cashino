import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistStorage, STORAGE_PREFIX } from '@/services/storage';

export type ThemePref = 'dark' | 'light' | 'system';
export type LangPref = 'es' | 'en' | 'system';
export type Quality = 'high' | 'balanced' | 'low';

export interface SettingsState {
  theme: ThemePref;
  language: LangPref;
  sound: boolean;
  soundVolume: number;
  music: boolean;
  musicVolume: number;
  haptics: boolean;
  animations: boolean;
  reduceMotion: boolean;
  reduceEffects: boolean;
  quality: Quality;
  showOdds: boolean;
  confirmBigBets: boolean;
  breakReminderMin: number; // 0 = never
  notifications: { daily: boolean; social: boolean; tournaments: boolean };
  privacy: { publicProfile: boolean; showOnline: boolean; allowInvites: boolean };
  set: (patch: Partial<Omit<SettingsState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const defaults = {
  theme: 'dark' as ThemePref,
  language: 'system' as LangPref,
  sound: true,
  soundVolume: 0.8,
  music: false,
  musicVolume: 0.35,
  haptics: true,
  animations: true,
  reduceMotion: false,
  reduceEffects: false,
  quality: 'high' as Quality,
  showOdds: true,
  confirmBigBets: true,
  breakReminderMin: 0,
  notifications: { daily: false, social: true, tournaments: true },
  privacy: { publicProfile: true, showOnline: true, allowInvites: true },
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaults,
      set: (patch) => set(patch),
      reset: () => set(defaults),
    }),
    { name: `${STORAGE_PREFIX}settings`, storage: persistStorage, version: 1 },
  ),
);
