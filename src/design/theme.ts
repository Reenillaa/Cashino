import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useSettings } from '@/state/settings';
import { useSaver } from '@/state/saver';
import { dark, type ColorScheme } from './tokens';

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
  const animations = useSettings((s) => s.animations);
  const rm = useSettings((s) => s.reduceMotion);
  const re = useSettings((s) => s.reduceEffects);
  const quality = useSettings((s) => s.quality);
  const saver = useSaver((s) => s.active);
  const systemReduced = useReducedMotion();
  // Cashino is a dark casino: every table, stage and card is designed on dark surfaces, so the app stays
  // dark whatever the phone's appearance (a light background made white text unreadable).
  const isDark = true;
  return useMemo(
    () => ({
      c: dark,
      isDark,
      reduceMotion: !animations || rm || systemReduced,
      // the battery saver lowers effects on its own while the battery is low
      reduceEffects: re || quality === 'low' || saver,
      quality,
    }),
    [isDark, animations, rm, systemReduced, re, quality, saver],
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
