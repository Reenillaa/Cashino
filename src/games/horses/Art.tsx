import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import type { Going } from '@/engine/games/horses.ts';

const COAT = ['#8A4B1F', '#5A3216', '#B8743A', '#2B1A10', '#9A6A44', '#6E3A1C', '#C9A27A', '#3E2516'];
export const coatFor = (n: number) => COAT[(n * 5) % COAT.length];

type Leg = [number, number, number, number, number, number]; // top x,y · knee x,y · hoof x,y
/** Legs per frame: [front near, front far, hind near, hind far]. Frames 0–3 gallop, 4 stands still. */
const LEGS: Leg[][] = [
  [[84, 54, 93, 65, 103, 72], [80, 54, 88, 67, 95, 77], [38, 52, 28, 64, 16, 71], [42, 52, 33, 66, 24, 77]],
  [[84, 54, 89, 68, 91, 82], [80, 54, 84, 68, 80, 82], [38, 52, 34, 67, 30, 82], [42, 52, 39, 68, 41, 82]],
  [[84, 54, 86, 67, 80, 78], [80, 54, 80, 68, 72, 80], [38, 52, 43, 65, 51, 78], [42, 52, 46, 66, 57, 80]],
  [[84, 54, 95, 61, 105, 64], [80, 54, 92, 63, 101, 70], [38, 52, 30, 62, 18, 65], [42, 52, 34, 64, 22, 70]],
  [[84, 54, 85, 68, 86, 82], [80, 54, 80, 68, 80, 82], [38, 52, 36, 67, 36, 82], [42, 52, 41, 68, 43, 82]],
];
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
};

/** A tapered leg: thick forearm/gaskin, thin cannon, fetlock and hoof (white sock on some horses). */
function LegPath({ l, color, sock, far }: { l: Leg; color: string; sock: boolean; far?: boolean }) {
  const [x1, y1, x2, y2, x3, y3] = l;
  return (
    <G opacity={far ? 0.82 : 1}>
      <Path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={color} strokeWidth={7} strokeLinecap="round" />
      <Path d={`M${x2} ${y2} L${x3} ${y3}`} stroke={sock ? '#F4EFE6' : color} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={x2} cy={y2} r={3.2} fill={color} />
      <Path d={`M${x3 - 3} ${y3 - 1.5} L${x3 + 3} ${y3 - 1.5} L${x3 + 3.5} ${y3 + 2} L${x3 - 3.5} ${y3 + 2} Z`} fill="#1A120C" />
    </G>
  );
}

/**
 * Side view of a racehorse with its jockey in silks: shaded coat, muscles, mane and tail, bridle and reins,
 * jointed legs with hooves. `frame` 0..3 are the four gallop positions (swapping them fast makes it run);
 * 4 is standing still (used in the race card).
 */
export const HorseSprite = React.memo(function HorseSprite({ n, silks, frame, size = 64 }: { n: number; silks: [string, string]; frame: number; size?: number }) {
  const coat = coatFor(n);
  const dark = shade(coat, -0.45);
  const light = shade(coat, 0.28);
  const mane = n % 3 === 0 ? '#1A120C' : shade(coat, -0.6);
  const sock = n % 4 === 1;
  const blaze = n % 2 === 0;
  const legs = LEGS[Math.max(0, Math.min(4, frame))];
  const run = frame < 4;
  const g = `hc${n}`;
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 120 90">
      <Defs>
        <LinearGradient id={g} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={light} />
          <Stop offset="0.55" stopColor={coat} />
          <Stop offset="1" stopColor={dark} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={60} cy={84} rx={36} ry={3.5} fill="rgba(0,0,0,0.28)" />
      {/* far legs */}
      <LegPath l={legs[1]} color={dark} sock={false} far />
      <LegPath l={legs[3]} color={dark} sock={false} far />
      {/* tail, flowing back when running */}
      <Path d={run ? 'M32 36 C20 34 10 40 4 50 C12 46 18 46 24 47 C16 50 12 56 10 62 C20 54 26 48 32 44 Z' : 'M32 36 C24 38 22 48 22 66 C26 58 28 50 32 44 Z'} fill={mane} />
      {/* body with chest, belly and hindquarter */}
      <Path d="M30 40 C29 31 38 28 50 30 L72 30 C80 29 87 33 90 41 C92 49 87 57 77 58 C68 59 54 59 45 58 C34 57 30 50 30 40 Z" fill={`url(#${g})`} />
      <Ellipse cx={40} cy={42} rx={10} ry={9} fill={light} opacity={0.35} />
      <Ellipse cx={81} cy={44} rx={7} ry={8} fill={light} opacity={0.3} />
      <Path d="M48 57 C56 59 66 59 74 57" stroke={dark} strokeWidth={1.2} fill="none" opacity={0.6} />
      {/* neck and head */}
      <Path d="M74 33 C80 23 86 15 94 10 L101 14 C97 23 93 34 89 45 C84 42 78 38 74 33 Z" fill={`url(#${g})`} />
      <Path d="M93 7 C98 5 104 8 110 17 C113 21 111 25 107 25 L99 23 C95 21 91 14 93 7 Z" fill={`url(#${g})`} />
      {blaze ? <Path d="M100 9 C103 12 106 16 108 21 L106 22 C104 17 101 13 99 10 Z" fill="#F4EFE6" opacity={0.9} /> : null}
      <Path d="M95 8 L96 0 L99 7 Z" fill={dark} />
      <Path d="M92 9 L92 2 L95 8 Z" fill={dark} opacity={0.8} />
      <Circle cx={100.5} cy={12.5} r={1.6} fill="#120A06" />
      <Circle cx={101} cy={12} r={0.5} fill="#fff" />
      <Circle cx={109} cy={21} r={0.9} fill="#120A06" />
      {/* mane */}
      <Path d="M92 8 C86 13 82 19 77 26 C75 29 73 31 72 32 C77 30 80 27 83 24 C81 28 79 31 78 33 C83 28 87 21 93 13 Z" fill={mane} />
      {/* bridle and reins */}
      <Path d="M97 11 L104 24 M96 18 L108 19" stroke="#2A1A10" strokeWidth={1.3} fill="none" />
      <Path d="M106 22 C100 26 94 28 86 26" stroke="#2A1A10" strokeWidth={1.1} fill="none" />
      {/* saddle cloth with the number, saddle */}
      <Path d="M52 30 L70 30 L71 46 L51 46 Z" fill="#FFFFFF" />
      <SvgText x={61} y={42.5} fontSize={11} fontWeight="900" fill="#231A3A" textAnchor="middle">{n}</SvgText>
      <Path d="M54 29 C58 26 66 26 70 29 L69 32 L55 32 Z" fill="#2A1A10" />
      {/* near legs */}
      <LegPath l={legs[2]} color={coat} sock={sock} />
      <LegPath l={legs[0]} color={coat} sock={sock} />
      {/* jockey: boot in the stirrup, white breeches, silks, cap, goggles, whip */}
      <Path d="M62 28 L70 36 L66 44" stroke="#F4F2FA" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M63 42 L69 42 L69 47 L62 47 Z" fill="#1A120C" />
      <Path d="M58 28 C60 18 68 12 78 12 L82 18 C76 22 70 26 64 30 Z" fill={silks[0]} />
      <Path d="M63 22 C68 18 74 15 79 15 L80 18 C74 19 68 22 64 26 Z" fill={silks[1]} />
      <Path d="M77 17 L87 25" stroke={silks[0]} strokeWidth={4} strokeLinecap="round" />
      <Path d="M80 19 L84 22" stroke={silks[1]} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={88} cy={26} r={2} fill="#F2C9A0" />
      <Path d="M88 26 L80 40" stroke="#3A2A1A" strokeWidth={1.2} />
      <Circle cx={82} cy={8} r={5.2} fill="#F2C9A0" />
      <Path d="M76 7 C77 0 87 0 88 6 L90 7 L76 8 Z" fill={silks[1]} />
      <Path d="M77 6 L88 6" stroke={silks[0]} strokeWidth={1.4} />
      <Path d="M83 8 L88 8" stroke="#1A1A2A" strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
});

/** The jockey's silks as a little shirt, for the race card. */
export function Silks({ colors, size = 30 }: { colors: [string, string]; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Path d="M9 3 L21 3 L28 9 L24 13 L22 11 L22 27 L8 27 L8 11 L6 13 L2 9 Z" fill={colors[0]} stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
      <Path d="M8 14 L22 14 L22 19 L8 19 Z" fill={colors[1]} />
      <Path d="M12 3 Q15 7 18 3" stroke={colors[1]} strokeWidth={2} fill="none" />
    </Svg>
  );
}

export const GOING_ICON: Record<Going, string> = { firm: '☀️', good: '🌤️', soft: '🌧️', heavy: '⛈️' };

/** Small numbered disc in the horse's silks. */
export function Saddle({ n, silks, size = 30, selected }: { n: number; silks: [string, string]; size?: number; selected?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={14} fill={silks[0]} stroke={selected ? '#FFD06B' : 'rgba(255,255,255,0.7)'} strokeWidth={selected ? 3 : 1.5} />
      <G>
        <Circle cx={15} cy={15} r={9} fill="#FFFFFF" />
        <SvgText x={15} y={19.5} fontSize={12} fontWeight="900" fill="#231A3A" textAnchor="middle">{n}</SvgText>
      </G>
    </Svg>
  );
}
