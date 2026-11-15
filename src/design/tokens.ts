import type { GameId } from '@/engine/games/types.ts';

export const palette = {
  obsidian: '#08090B',
  basalt: '#0E1013',
  graphite1: '#15171B',
  graphite2: '#1C1F24',
  graphite3: '#262A30',
  graphite4: '#30343B',
  titanium: '#8E959F',
  silver: '#C5CAD1',
  ivory: '#F3F4F6',
  white: '#FFFFFF',
  porcelain: '#F4F5F7',
  mist: '#ECEEF1',
  fog: '#E2E5E9',
  ink: '#0B0C0E',
  slate: '#4A4F57',
  pewter: '#737A84',
} as const;

export interface ColorScheme {
  bg: string;
  bgElevated: string;
  surface1: string;
  surface2: string;
  surface3: string;
  text: string;
  text2: string;
  text3: string;
  hairline: string;
  hairlineStrong: string;
  primary: string;
  onPrimary: string;
  win: string;
  loss: string;
  warn: string;
  info: string;
  overlay: string;
  glassTint: string;
  sheenTop: string;
  cardFace: string;
  cardInk: string;
  cardRed: string;
}

export const dark: ColorScheme = {
  bg: palette.obsidian,
  bgElevated: palette.basalt,
  surface1: palette.graphite1,
  surface2: palette.graphite2,
  surface3: palette.graphite3,
  text: palette.ivory,
  text2: palette.silver,
  text3: palette.titanium,
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.16)',
  primary: palette.ivory,
  onPrimary: palette.obsidian,
  win: '#6FD3A0',
  loss: '#F0716B',
  warn: '#E9B65C',
  info: '#8FB8F0',
  overlay: 'rgba(0,0,0,0.55)',
  glassTint: 'rgba(22,24,28,0.62)',
  sheenTop: 'rgba(255,255,255,0.10)',
  cardFace: '#F6F7F9',
  cardInk: '#111317',
  cardRed: '#D8434A',
};

export const light: ColorScheme = {
  bg: palette.porcelain,
  bgElevated: palette.white,
  surface1: palette.white,
  surface2: palette.mist,
  surface3: palette.fog,
  text: palette.ink,
  text2: palette.slate,
  text3: palette.pewter,
  hairline: 'rgba(0,0,0,0.08)',
  hairlineStrong: 'rgba(0,0,0,0.16)',
  primary: palette.ink,
  onPrimary: palette.ivory,
  win: '#1E8E5A',
  loss: '#C8372F',
  warn: '#A86F12',
  info: '#2F6FC9',
  overlay: 'rgba(10,12,16,0.35)',
  glassTint: 'rgba(250,251,252,0.72)',
  sheenTop: 'rgba(255,255,255,0.7)',
  cardFace: '#FFFFFF',
  cardInk: '#111317',
  cardRed: '#C8323A',
};

/** Anodized titanium accent for each game (used only inside the game). */
export const gameTint: Record<GameId, string> = {
  poker: '#D9DCE1',
  blackjack: '#D8B56A',
  crash: '#5B8CFF',
  dice: '#3FC1B0',
  mines: '#63C98A',
  plinko: '#9B7BFF',
  crossing: '#D08F55',
  roulette: '#E2668F',
  limbo: '#7FC8F8',
  coinflip: '#E6C98A',
  baccarat: '#C27E62',
  hilo: '#8A93FF',
  keno: '#4FD1E0',
  sicbo: '#C77DDB',
};

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 56 } as const;
export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const SCREEN_PAD = 20;

export const font = {
  light: 'Geist_300Light',
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_600SemiBold',
  mono: 'GeistMono_500Medium',
  monoMedium: 'GeistMono_500Medium',
} as const;

export const type = {
  hero: { fontFamily: font.light, fontSize: 56, lineHeight: 60, letterSpacing: -1.6 },
  display: { fontFamily: font.light, fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  title: { fontFamily: font.medium, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  headline: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  callout: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  footnote: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  caption: { fontFamily: font.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  mono: { fontFamily: font.mono, fontSize: 15, lineHeight: 20, letterSpacing: 0 },
} as const;
export type TypeVariant = keyof typeof type;

/**
 * Motion (Taste skill rules): transform/opacity only, one ease-out curve for UI, a softer one for
 * entrances, critically-damped springs (no bounce, no overshoot). Durations in ms.
 */
export const motion = {
  snappy: { damping: 38, stiffness: 340, mass: 1 },
  smooth: { damping: 30, stiffness: 220, mass: 1 },
  /** Kept for celebratory moments only; still never overshoots. */
  bouncy: { damping: 26, stiffness: 170, mass: 1 },
  press: 90,
  hoverIn: 150,
  hoverOut: 120,
  fast: 120,
  base: 200,
  slide: 240,
  slow: 420,
  enter: 1100,
  ease: [0.2, 0.8, 0.2, 1] as const,
  easeEnter: [0.22, 1, 0.36, 1] as const,
} as const;
