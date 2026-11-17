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

/** In-game accent: one of the 4 brand families (violet, pink, gold, emerald) — never a rainbow. */
export const gameTint: Record<GameId, string> = {
  poker: '#A996FF',
  blackjack: '#5BE3B0',
  crash: '#A996FF',
  dice: '#FFD06B',
  mines: '#5BE3B0',
  plinko: '#FF8AC4',
  crossing: '#FFD06B',
  roulette: '#FF8AC4',
  limbo: '#A996FF',
  coinflip: '#FFD06B',
  baccarat: '#FF8AC4',
  hilo: '#A996FF',
  keno: '#5BE3B0',
  sicbo: '#FF8AC4',
  slots: '#FFD06B',
  trader: '#5BE3B0',
  videopoker: '#A996FF',
  wheel: '#FFD06B',
  towers: '#A996FF',
  diamonds: '#5BE3B0',
  pump: '#FF8AC4',
  dragontiger: '#FFD06B',
  horses: '#5BE3B0',
  cascade: '#FF8AC4',
  fishing: '#5BE3B0',
  jade: '#5BE3B0',
  goldmine: '#FFD06B',
  fruits: '#FF8A3D',
  pirate: '#A996FF',
};

/**
 * Card art (Offsuit-style): a soft pastel gradient with a big emoji. Text on these is always dark.
 * Emoji render as the platform's colour emoji (Apple's on iPhone).
 */
export const gameArt: Record<GameId, { emoji: string; colors: [string, string] }> = {
  poker: { emoji: '🃏', colors: ['#E3DBFF', '#C7B9FF'] },
  blackjack: { emoji: '♦️', colors: ['#C8F5DF', '#A6DCEF'] },
  crash: { emoji: '🚀', colors: ['#E3DBFF', '#C7B9FF'] },
  dice: { emoji: '🎲', colors: ['#FFE9B0', '#FFD38A'] },
  mines: { emoji: '💎', colors: ['#C8F5DF', '#A6DCEF'] },
  plinko: { emoji: '🪩', colors: ['#FFD3E6', '#FBB6D6'] },
  crossing: { emoji: '🐔', colors: ['#FFE9B0', '#FFD38A'] },
  roulette: { emoji: '🎡', colors: ['#FFD3E6', '#FBB6D6'] },
  limbo: { emoji: '📈', colors: ['#E3DBFF', '#C7B9FF'] },
  coinflip: { emoji: '🪙', colors: ['#FFE9B0', '#FFD38A'] },
  baccarat: { emoji: '👑', colors: ['#FFD3E6', '#FBB6D6'] },
  hilo: { emoji: '🎴', colors: ['#E3DBFF', '#C7B9FF'] },
  keno: { emoji: '🎱', colors: ['#C8F5DF', '#A6DCEF'] },
  sicbo: { emoji: '🏮', colors: ['#FFD3E6', '#FBB6D6'] },
  slots: { emoji: '🎰', colors: ['#FFE9B0', '#FFD38A'] },
  trader: { emoji: '💹', colors: ['#C8F5DF', '#A6DCEF'] },
  videopoker: { emoji: '🃏', colors: ['#DCD3FF', '#BFAEFF'] },
  wheel: { emoji: '🎡', colors: ['#FFE9B0', '#FFD38A'] },
  towers: { emoji: '🐉', colors: ['#DCD3FF', '#BFAEFF'] },
  diamonds: { emoji: '💎', colors: ['#C8F5DF', '#A6DCEF'] },
  pump: { emoji: '🎈', colors: ['#FFD3E8', '#FFB3D6'] },
  cascade: { emoji: '🍭', colors: ['#FFD3E8', '#FFB3D6'] },
  fishing: { emoji: '🎣', colors: ['#C8F5DF', '#A6DCEF'] },
  jade: { emoji: '🗿', colors: ['#C8F5DF', '#A6DCEF'] },
  goldmine: { emoji: '⛏️', colors: ['#FFE6A7', '#E8C9A0'] },
  fruits: { emoji: '🍒', colors: ['#FFD0B8', '#FFC6D9'] },
  pirate: { emoji: '🦜', colors: ['#D8D0FF', '#A6DCEF'] },
  dragontiger: { emoji: '🐯', colors: ['#FFE9B0', '#FFD38A'] },
  horses: { emoji: '🏇', colors: ['#C8F5DF', '#A6DCEF'] },
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
  poker: ['#7B5CFF', '#4B2BD6'],
  blackjack: ['#12C08A', '#0B6E6E'],
  crash: ['#7B5CFF', '#4B2BD6'],
  dice: ['#FFB938', '#D9741C'],
  mines: ['#12C08A', '#0B6E6E'],
  plinko: ['#FF4FA3', '#B3127A'],
  crossing: ['#FFB938', '#D9741C'],
  roulette: ['#FF4FA3', '#B3127A'],
  limbo: ['#7B5CFF', '#4B2BD6'],
  coinflip: ['#FFB938', '#D9741C'],
  baccarat: ['#FF4FA3', '#B3127A'],
  hilo: ['#7B5CFF', '#4B2BD6'],
  keno: ['#12C08A', '#0B6E6E'],
  sicbo: ['#FF4FA3', '#B3127A'],
  slots: ['#FFB938', '#D9741C'],
  trader: ['#12C08A', '#0B6E6E'],
  videopoker: ['#7B5CFF', '#4B2BD6'],
  wheel: ['#FFB938', '#D9741C'],
  towers: ['#7B5CFF', '#4B2BD6'],
  diamonds: ['#12C08A', '#0B6E6E'],
  pump: ['#FF4FA3', '#B3127A'],
  cascade: ['#FF4FA3', '#B3127A'],
  fishing: ['#1FA7E0', '#0B4E7A'],
  jade: ['#12C08A', '#0B5E3E'],
  goldmine: ['#C98B12', '#4A2A08'],
  fruits: ['#FF5A2A', '#8A0F3A'],
  pirate: ['#3D2BC9', '#0E0830'],
  dragontiger: ['#FFB938', '#D9741C'],
  horses: ['#12C08A', '#0B6E6E'],
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
