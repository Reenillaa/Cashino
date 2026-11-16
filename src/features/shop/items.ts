/**
 * Cosmetic shop: things you buy with play chips that only change how the app looks.
 * No item gives any advantage in a game, and nothing here can be bought with real money.
 */
export type Lang2 = { es: string; en: string };
export type BackPattern = 'stripes' | 'diamonds' | 'dots' | 'rays';

export interface CardBackItem { id: string; name: Lang2; price: number; colors: [string, string]; accent: string; pattern: BackPattern }
export interface FeltItem { id: string; name: Lang2; price: number; colors: [string, string] }
export interface AvatarItem { id: string; name: Lang2; price: number; emoji: string; colors: [string, string] }

export const CARD_BACKS: CardBackItem[] = [
  { id: 'classic', name: { es: 'Clásico', en: 'Classic' }, price: 0, colors: ['#2A2E35', '#22262C'], accent: 'rgba(255,255,255,0.35)', pattern: 'stripes' },
  { id: 'royal', name: { es: 'Real', en: 'Royal' }, price: 800, colors: ['#5B3BE0', '#2A1878'], accent: '#FFD06B', pattern: 'diamonds' },
  { id: 'ruby', name: { es: 'Rubí', en: 'Ruby' }, price: 800, colors: ['#E0306E', '#7A0D3C'], accent: '#FFE1EC', pattern: 'dots' },
  { id: 'emerald', name: { es: 'Esmeralda', en: 'Emerald' }, price: 1200, colors: ['#12C08A', '#0B5E4E'], accent: '#E1FFF2', pattern: 'diamonds' },
  { id: 'gold', name: { es: 'Oro', en: 'Gold' }, price: 3000, colors: ['#FFC93C', '#B8740A'], accent: '#5A3200', pattern: 'rays' },
  { id: 'midnight', name: { es: 'Medianoche', en: 'Midnight' }, price: 2000, colors: ['#151A33', '#05060F'], accent: '#A996FF', pattern: 'rays' },
];

export const FELTS: FeltItem[] = [
  { id: 'green', name: { es: 'Verde casino', en: 'Casino green' }, price: 0, colors: ['#14905F', '#075239'] },
  { id: 'blue', name: { es: 'Azul Montecarlo', en: 'Monte Carlo blue' }, price: 1500, colors: ['#1F5FB8', '#0B2A5C'] },
  { id: 'wine', name: { es: 'Burdeos', en: 'Burgundy' }, price: 1500, colors: ['#8A2346', '#3A0C24'] },
  { id: 'violet', name: { es: 'Violeta Cashino', en: 'Cashino violet' }, price: 2500, colors: ['#5B3BE0', '#24124F'] },
  { id: 'black', name: { es: 'Negro VIP', en: 'VIP black' }, price: 4000, colors: ['#2B2B33', '#0B0B0F'] },
];

export const PREMIUM_AVATARS: AvatarItem[] = [
  { id: 'p0', name: { es: 'Rey', en: 'King' }, price: 1000, emoji: '👑', colors: ['#FFD06B', '#D9741C'] },
  { id: 'p1', name: { es: 'Mago', en: 'Wizard' }, price: 1000, emoji: '🧙', colors: ['#A996FF', '#4B2BD6'] },
  { id: 'p2', name: { es: 'Dragón', en: 'Dragon' }, price: 2000, emoji: '🐉', colors: ['#5BE3B0', '#0B6E6E'] },
  { id: 'p3', name: { es: 'Jugador de cartas', en: 'Card shark' }, price: 1500, emoji: '🃏', colors: ['#FF8AC4', '#B3127A'] },
  { id: 'p4', name: { es: 'Chistera', en: 'Top hat' }, price: 1500, emoji: '🎩', colors: ['#3A3350', '#120A33'] },
  { id: 'p5', name: { es: 'Diamante', en: 'Diamond' }, price: 5000, emoji: '💎', colors: ['#B9E8FF', '#3B7BFF'] },
];

export const backById = (id: string) => CARD_BACKS.find((b) => b.id === id) ?? CARD_BACKS[0];
export const feltById = (id: string) => FELTS.find((f) => f.id === id) ?? FELTS[0];
export const premiumAvatar = (id: string) => PREMIUM_AVATARS.find((a) => a.id === id);
