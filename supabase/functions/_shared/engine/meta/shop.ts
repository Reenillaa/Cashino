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
  { id: 'royal', name: { es: 'Real', en: 'Royal' }, price: 6000, colors: ['#5B3BE0', '#2A1878'], accent: '#FFD06B', pattern: 'diamonds' },
  { id: 'ruby', name: { es: 'Rubí', en: 'Ruby' }, price: 6000, colors: ['#E0306E', '#7A0D3C'], accent: '#FFE1EC', pattern: 'dots' },
  { id: 'emerald', name: { es: 'Esmeralda', en: 'Emerald' }, price: 9000, colors: ['#12C08A', '#0B5E4E'], accent: '#E1FFF2', pattern: 'diamonds' },
  { id: 'neon', name: { es: 'Neón', en: 'Neon' }, price: 12000, colors: ['#FF4FA3', '#4B2BD6'], accent: '#FFFFFF', pattern: 'rays' },
  { id: 'midnight', name: { es: 'Medianoche', en: 'Midnight' }, price: 15000, colors: ['#151A33', '#05060F'], accent: '#A996FF', pattern: 'rays' },
  { id: 'carbon', name: { es: 'Carbono', en: 'Carbon' }, price: 20000, colors: ['#3A3A44', '#111116'], accent: '#5BE3B0', pattern: 'stripes' },
  { id: 'gold', name: { es: 'Oro', en: 'Gold' }, price: 40000, colors: ['#FFC93C', '#B8740A'], accent: '#5A3200', pattern: 'rays' },
  { id: 'dragon', name: { es: 'Dragón', en: 'Dragon' }, price: 75000, colors: ['#0B6E6E', '#04201F'], accent: '#FFD06B', pattern: 'diamonds' },
  { id: 'diamond', name: { es: 'Diamante', en: 'Diamond' }, price: 120000, colors: ['#DDF3FF', '#7FB2FF'], accent: '#1B3A7A', pattern: 'diamonds' },
];

export const FELTS: FeltItem[] = [
  { id: 'green', name: { es: 'Verde casino', en: 'Casino green' }, price: 0, colors: ['#14905F', '#075239'] },
  { id: 'blue', name: { es: 'Azul Montecarlo', en: 'Monte Carlo blue' }, price: 10000, colors: ['#1F5FB8', '#0B2A5C'] },
  { id: 'wine', name: { es: 'Burdeos', en: 'Burgundy' }, price: 10000, colors: ['#8A2346', '#3A0C24'] },
  { id: 'violet', name: { es: 'Violeta Cashino', en: 'Cashino violet' }, price: 25000, colors: ['#5B3BE0', '#24124F'] },
  { id: 'black', name: { es: 'Negro VIP', en: 'VIP black' }, price: 50000, colors: ['#2B2B33', '#0B0B0F'] },
  { id: 'ice', name: { es: 'Hielo', en: 'Ice' }, price: 60000, colors: ['#5FA8C8', '#1A3E57'] },
  { id: 'goldfelt', name: { es: 'Oro VIP', en: 'VIP gold' }, price: 150000, colors: ['#B8862A', '#4A3008'] },
];

export const PREMIUM_AVATARS: AvatarItem[] = [
  { id: 'p0', name: { es: 'Rey', en: 'King' }, price: 8000, emoji: '👑', colors: ['#FFD06B', '#D9741C'] },
  { id: 'p1', name: { es: 'Mago', en: 'Wizard' }, price: 8000, emoji: '🧙', colors: ['#A996FF', '#4B2BD6'] },
  { id: 'p3', name: { es: 'Jugador de cartas', en: 'Card shark' }, price: 12000, emoji: '🃏', colors: ['#FF8AC4', '#B3127A'] },
  { id: 'p4', name: { es: 'Chistera', en: 'Top hat' }, price: 12000, emoji: '🎩', colors: ['#3A3350', '#120A33'] },
  { id: 'p6', name: { es: 'Tiburón', en: 'Shark' }, price: 15000, emoji: '🦈', colors: ['#5FA8C8', '#1A3E57'] },
  { id: 'p7', name: { es: 'Vampiro', en: 'Vampire' }, price: 18000, emoji: '🧛', colors: ['#8A2346', '#2A0718'] },
  { id: 'p8', name: { es: 'Alien', en: 'Alien' }, price: 20000, emoji: '👽', colors: ['#5BE3B0', '#0B6E6E'] },
  { id: 'p2', name: { es: 'Dragón', en: 'Dragon' }, price: 25000, emoji: '🐉', colors: ['#5BE3B0', '#0B6E6E'] },
  { id: 'p5', name: { es: 'Diamante', en: 'Diamond' }, price: 100000, emoji: '💎', colors: ['#B9E8FF', '#3B7BFF'] },
  { id: 'p9', name: { es: 'Ballena', en: 'Whale' }, price: 250000, emoji: '🐋', colors: ['#7B5CFF', '#1F5FB8'] },
];

export interface FrameItem { id: string; name: Lang2; price: number; colors: [string, string]; glow: string }
/** Rings around your own avatar. */
export const FRAMES: FrameItem[] = [
  { id: 'silver', name: { es: 'Plata', en: 'Silver' }, price: 5000, colors: ['#F4F6FA', '#8A919C'], glow: 'rgba(255,255,255,0.4)' },
  { id: 'gold', name: { es: 'Oro', en: 'Gold' }, price: 20000, colors: ['#FFE58A', '#B8740A'], glow: 'rgba(255,208,107,0.6)' },
  { id: 'neon', name: { es: 'Neón', en: 'Neon' }, price: 35000, colors: ['#FF4FA3', '#7B5CFF'], glow: 'rgba(255,79,163,0.7)' },
  { id: 'emerald', name: { es: 'Esmeralda', en: 'Emerald' }, price: 50000, colors: ['#5BE3B0', '#0B6E6E'], glow: 'rgba(91,227,176,0.6)' },
  { id: 'diamond', name: { es: 'Diamante', en: 'Diamond' }, price: 150000, colors: ['#FFFFFF', '#7FB2FF'], glow: 'rgba(185,232,255,0.9)' },
];

export interface TitleItem { id: string; name: Lang2; price: number; color: string }
/** A title shown under your name. */
export const TITLES: TitleItem[] = [
  { id: 'fine', name: { es: 'Jugador fino', en: 'Smooth player' }, price: 3000, color: '#A996FF' },
  { id: 'lucky', name: { es: 'Con suerte', en: 'Lucky one' }, price: 8000, color: '#5BE3B0' },
  { id: 'shark', name: { es: 'Tiburón', en: 'Shark' }, price: 15000, color: '#5FA8C8' },
  { id: 'highroller', name: { es: 'High Roller', en: 'High Roller' }, price: 50000, color: '#FF8AC4' },
  { id: 'whale', name: { es: 'Ballena 🐋', en: 'Whale 🐋' }, price: 200000, color: '#7FB2FF' },
  { id: 'legend', name: { es: 'Leyenda 👑', en: 'Legend 👑' }, price: 500000, color: '#FFD06B' },
];

export const backById = (id: string) => CARD_BACKS.find((b) => b.id === id) ?? CARD_BACKS[0];
export const feltById = (id: string) => FELTS.find((f) => f.id === id) ?? FELTS[0];
export const premiumAvatar = (id: string) => PREMIUM_AVATARS.find((a) => a.id === id);
export const frameById = (id: string | null) => (id ? FRAMES.find((f) => f.id === id) : undefined);
export const titleById = (id: string | null) => (id ? TITLES.find((t) => t.id === id) : undefined);

/** Every item for sale as `${slot}:${id}` → price (the server only accepts these). */
export const SHOP_PRICES: Record<string, number> = Object.fromEntries([
  ...CARD_BACKS.map((x) => [`back:${x.id}`, x.price]),
  ...FELTS.map((x) => [`felt:${x.id}`, x.price]),
  ...PREMIUM_AVATARS.map((x) => [`avatar:${x.id}`, x.price]),
  ...FRAMES.map((x) => [`frame:${x.id}`, x.price]),
  ...TITLES.map((x) => [`title:${x.id}`, x.price]),
]);
export const SHOP_SLOTS = ['back', 'felt', 'avatar', 'frame', 'title'] as const;
export type ShopSlot = (typeof SHOP_SLOTS)[number];
export const FREE_ITEMS = ['back:classic', 'felt:green'];
