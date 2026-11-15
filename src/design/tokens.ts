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

/** Offsuit-like dark: pure black canvas, borderless graphite surfaces, white type, colour only for meaning. */
export const dark: ColorScheme = {
  bg: '#000000',
  bgElevated: '#111113',
  surface1: '#121214',
  surface2: '#1C1C1F',
  surface3: '#2A2A2F',
  text: '#FFFFFF',
  text2: '#A7A7AE',
  text3: '#6C6C74',
  hairline: 'rgba(255,255,255,0.07)',
  hairlineStrong: 'rgba(255,255,255,0.12)',
  primary: '#FFFFFF',
  onPrimary: '#000000',
  win: '#4ADE9B',
  loss: '#FF7A7A',
  warn: '#F5C26B',
  info: '#8FB8F0',
  overlay: 'rgba(0,0,0,0.6)',
  glassTint: 'rgba(18,18,20,0.82)',
  sheenTop: 'rgba(255,255,255,0)',
  cardFace: '#FFFFFF',
  cardInk: '#0B0B0F',
  cardRed: '#E5484D',
};

export const light: ColorScheme = {
  bg: '#F5F5F7',
  bgElevated: '#FFFFFF',
  surface1: '#FFFFFF',
  surface2: '#EDEDF0',
  surface3: '#E2E2E7',
  text: '#0B0B0F',
  text2: '#55555C',
  text3: '#8A8A92',
  hairline: 'rgba(0,0,0,0.07)',
  hairlineStrong: 'rgba(0,0,0,0.12)',
  primary: '#0B0B0F',
  onPrimary: '#FFFFFF',
  win: '#14995B',
  loss: '#D23F3F',
  warn: '#A86F12',
  info: '#2F6FC9',
  overlay: 'rgba(10,12,16,0.35)',
  glassTint: 'rgba(255,255,255,0.86)',
  sheenTop: 'rgba(255,255,255,0)',
  cardFace: '#FFFFFF',
  cardInk: '#0B0B0F',
  cardRed: '#D7373F',
};

/** In-game accent for each game: the saturated tone of its pastel card. */
export const gameTint: Record<GameId, string> = {
  poker: '#C7B9FF',
  blackjack: '#8EE3C0',
  crash: '#9DBBFF',
  dice: '#FFD38A',
  mines: '#7FE3C4',
  plinko: '#E2B8FF',
  crossing: '#F3E37A',
  roulette: '#FF9F94',
  limbo: '#8FDDF7',
  coinflip: '#F7D67E',
  baccarat: '#F0B8A0',
  hilo: '#AEB6FF',
  keno: '#86E6EE',
  sicbo: '#FFA9C0',
};

/**
 * Card art (Offsuit-style): a soft pastel gradient with a big emoji. Text on these is always dark.
 * Emoji render as the platform's colour emoji (Apple's on iPhone).
 */
export const gameArt: Record<GameId, { emoji: string; colors: [string, string] }> = {
  poker: { emoji: '🃏', colors: ['#FBD3E9', '#C7B9FF'] },
  blackjack: { emoji: '♦️', colors: ['#C8F5DF', '#A6DCEF'] },
  crash: { emoji: '🚀', colors: ['#BFD7FF', '#D8C8FF'] },
  dice: { emoji: '🎲', colors: ['#FFE6A7', '#FFC9A9'] },
  mines: { emoji: '💎', colors: ['#C9F2E7', '#B8D8FF'] },
  plinko: { emoji: '🪩', colors: ['#E7C9FF', '#FFC6E1'] },
  crossing: { emoji: '🐔', colors: ['#FFF1A8', '#C6F2B0'] },
  roulette: { emoji: '🎡', colors: ['#FFC8C2', '#FFD9A8'] },
  limbo: { emoji: '📈', colors: ['#C6F0FF', '#C8FFE6'] },
  coinflip: { emoji: '🪙', colors: ['#FFE9B0', '#F6D3A0'] },
  baccarat: { emoji: '👑', colors: ['#F2D5C4', '#E6C3F0'] },
  hilo: { emoji: '🎴', colors: ['#D3D8FF', '#C6E9FF'] },
  keno: { emoji: '🎱', colors: ['#C2F3F6', '#D6E6FF'] },
  sicbo: { emoji: '🏮', colors: ['#FFCFD9', '#E4CCFF'] },
};

/** Room cards: a "place" per stake level (Offsuit names its tables after places too). */
export const roomArt: Record<'practice' | 'r1' | 'r2' | 'r3', { emoji: string; colors: [string, string] }> = {
  practice: { emoji: '🏠', colors: ['#5C6B8A', '#2E3550'] },
  r1: { emoji: '☕️', colors: ['#12C08A', '#0B6E6E'] },
  r2: { emoji: '🎩', colors: ['#7B5CFF', '#D9217F'] },
  r3: { emoji: '💎', colors: ['#FFB938', '#C2410C'] },
};

/** Cashino brand: violet → pink → amber, plus money green. */
export const brand = {
  grad: ['#7B5CFF', '#FF4FA3', '#FFB547'] as [string, string, string],
  violet: '#7B5CFF',
  pink: '#FF4FA3',
  amber: '#FFB547',
  money: '#3BE39A',
  night: '#0B0716',
} as const;

/** Vivid gradient per game: cards, primary buttons and the in-game aurora. White text on top. */
export const gameVivid: Record<GameId, [string, string]> = {
  poker: ['#6A5CFF', '#C04BFF'],
  blackjack: ['#12C08A', '#0B6E6E'],
  crash: ['#3D7BFF', '#8A4DFF'],
  dice: ['#FF9F1C', '#FF4F6E'],
  mines: ['#00C2A8', '#1F7BFF'],
  plinko: ['#E040FB', '#FF4F9A'],
  crossing: ['#F7B500', '#3DBE5C'],
  roulette: ['#FF3B5C', '#9B1239'],
  limbo: ['#21C8FD', '#2F55FF'],
  coinflip: ['#FFB938', '#F2672E'],
  baccarat: ['#B8862B', '#5E2E8C'],
  hilo: ['#5B6CFF', '#00A8E8'],
  keno: ['#00C6E0', '#7A5CFF'],
  sicbo: ['#FF6A3D', '#D9217F'],
};

/** Ink used on pastel art. */
export const onPastel = { text: '#0B0B0F', text2: 'rgba(11,11,15,0.58)', chip: 'rgba(11,11,15,0.08)' } as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 56 } as const;
export const radius = { xs: 8, sm: 14, md: 18, lg: 22, xl: 28, pill: 999 } as const;
export const SCREEN_PAD = 20;

export const font = {
  light: 'Geist_300Light',
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_600SemiBold',
  mono: 'GeistMono_500Medium',
  monoMedium: 'GeistMono_500Medium',
  /** Display face with personality: brand, big numbers, game names, primary buttons. */
  display: 'Unbounded_800ExtraBold',
  displaySemi: 'Unbounded_600SemiBold',
} as const;

export const type = {
  hero: { fontFamily: font.display, fontSize: 56, lineHeight: 64, letterSpacing: -2 },
  display: { fontFamily: font.light, fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  title: { fontFamily: font.displaySemi, fontSize: 26, lineHeight: 34, letterSpacing: -0.8 },
  headline: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  callout: { fontFamily: font.medium, fontSize: 15, lineHeight: 20, letterSpacing: -0.1 },
  footnote: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  /** Small label above values (sentence case, Offsuit-style; no shouting caps). */
  caption: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, letterSpacing: 0 },
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
