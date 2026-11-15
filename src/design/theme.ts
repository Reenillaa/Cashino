import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSettings } from '@/state/settings';
import { dark, light, type ColorScheme } from './tokens';

export interface Theme {
  c: ColorScheme;
  isDark: boolean;
  /** True when animations should be replaced by fades / instant changes. */
  reduceMotion: boolean;
  /** True when blur, particles and glow should be simplified. */
  reduceEffects: boolean;
  quality: 'high' | 'balanced' | 'low';
}

export function useTheme(): Theme {
  const pref = useSettings((s) => s.theme);
  const animations = useSettings((s) => s.animations);
  const rm = useSettings((s) => s.reduceMotion);
  const re = useSettings((s) => s.reduceEffects);
  const quality = useSettings((s) => s.quality);
  const scheme = useColorScheme();
  const systemReduced = useReducedMotion();
  const isDark = pref === 'system' ? scheme !== 'light' : pref === 'dark';
  return useMemo(
    () => ({
      c: isDark ? dark : light,
      isDark,
      reduceMotion: !animations || rm || systemReduced,
      reduceEffects: re || quality === 'low',
      quality,
    }),
    [isDark, animations, rm, systemReduced, re, quality],
  );
}

/** Adds alpha to a #RRGGBB colour. */
export function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Anodized tints are tuned for dark surfaces; in light mode they are darkened to keep contrast. */
export function adaptTint(hex: string, isDark: boolean): string {
  if (isDark || !hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const mix = (v: number) => Math.round(v * 0.62);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
