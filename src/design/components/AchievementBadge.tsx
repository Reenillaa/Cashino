import React from 'react';
import Svg, { Circle, Defs, G, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import type { Tier } from '@/engine/meta/achievements.ts';

/** Metals: rim gradient, face gradient, ribbon colour. */
const METAL: Record<Tier, { rim: [string, string]; face: [string, string]; ribbon: [string, string]; glyph: string }> = {
  bronze: { rim: ['#F2B88A', '#8A4A20'], face: ['#D98A52', '#A85A2A'], ribbon: ['#3D7BFF', '#1A4ACF'], glyph: '#FFE9D6' },
  silver: { rim: ['#FFFFFF', '#8A90A8'], face: ['#DDE2F0', '#9AA2BC'], ribbon: ['#12C08A', '#0B6E52'], glyph: '#3A4060' },
  gold: { rim: ['#FFF3B0', '#B07A10'], face: ['#FFD86B', '#D99A1C'], ribbon: ['#FF4FA3', '#B3127A'], glyph: '#7A4A00' },
  diamond: { rim: ['#E8FBFF', '#5AB8E8'], face: ['#A8E8FF', '#5A8AFF'], ribbon: ['#7B5CFF', '#3A1FA8'], glyph: '#14205A' },
};

/** Little drawings for each achievement icon, on a 24 grid centred at 0,0. */
const GLYPH: Record<string, (c: string) => React.ReactNode> = {
  spark: (c) => <Path d="M0 -10 L2.6 -2.6 L10 0 L2.6 2.6 L0 10 L-2.6 2.6 L-10 0 L-2.6 -2.6 Z" fill={c} />,
  stack: (c) => <G>{[4, 0, -4].map((y) => <Rect key={y} x={-8} y={y - 2} width={16} height={4} rx={2} fill={c} />)}</G>,
  compass: (c) => <G><Circle r={9} fill="none" stroke={c} strokeWidth={2} /><Polygon points="0,-7 3,0 0,7 -3,0" fill={c} /></G>,
  grid: (c) => <G>{[-5, 5].flatMap((x) => [-5, 5].map((y) => <Rect key={`${x}${y}`} x={x - 4} y={y - 4} width={8} height={8} rx={2} fill={c} />))}</G>,
  book: (c) => <Path d="M-9 -7 C-5 -9 -2 -8 0 -6 C2 -8 5 -9 9 -7 V8 C5 6 2 7 0 9 C-2 7 -5 6 -9 8 Z" fill={c} />,
  check: (c) => <Path d="M-8 0 L-3 6 L9 -7" stroke={c} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  rise: (c) => <G><Path d="M-9 7 L-3 0 L2 4 L9 -6" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" /><Path d="M4 -7 L9 -7 L9 -2" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" /></G>,
  rocket: (c) => <G rotation={-45}><Path d="M-8 -3 L5 -3 Q11 0 5 3 L-8 3 Z" fill={c} /><Path d="M-8 -3 L-11 -7 L-5 -3 Z M-8 3 L-11 7 L-5 3 Z" fill={c} /></G>,
  bolt: (c) => <Polygon points="2,-10 -6,1 -1,1 -3,10 6,-2 1,-2" fill={c} />,
  gem: (c) => <G><Polygon points="-9,-3 -5,-8 5,-8 9,-3 0,9" fill={c} /><Path d="M-9 -3 H9" stroke="rgba(255,255,255,0.5)" strokeWidth={1} /></G>,
  drop: (c) => <Path d="M0 -10 C5 -3 8 1 8 4 A8 8 0 0 1 -8 4 C-8 1 -5 -3 0 -10 Z" fill={c} />,
  coin: (c) => <G><Circle r={9} fill={c} /><Circle r={6} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} /></G>,
  cards: (c) => <G><Rect x={-9} y={-8} width={11} height={15} rx={2} fill={c} rotation={-12} /><Rect x={-2} y={-7} width={11} height={15} rx={2} fill={c} opacity={0.75} rotation={10} /></G>,
  road: (c) => <G><Path d="M-5 9 L-2 -9 M5 9 L2 -9" stroke={c} strokeWidth={2.5} /><Path d="M0 6 V3 M0 -1 V-4" stroke={c} strokeWidth={2} /></G>,
  wheel: (c) => <G><Circle r={9} fill="none" stroke={c} strokeWidth={2.5} /><Path d="M0 -9 V9 M-9 0 H9 M-6.4 -6.4 L6.4 6.4 M6.4 -6.4 L-6.4 6.4" stroke={c} strokeWidth={1.5} /><Circle r={2.5} fill={c} /></G>,
  chip: (c) => <G><Circle r={9} fill={c} /><Circle r={6.5} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} strokeDasharray="3 2.5" /></G>,
  dice: (c) => <G><Rect x={-8} y={-8} width={16} height={16} rx={4} fill={c} />{[[-4, -4], [4, 4], [0, 0]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={1.7} fill="rgba(255,255,255,0.8)" />)}</G>,
  fire: (c) => <Path d="M0 10 C6 10 8 6 8 2 C8 -3 4 -5 3 -10 C0 -7 -1 -5 -1 -2 C-3 -4 -3 -6 -3 -7 C-6 -4 -8 -1 -8 2 C-8 6 -5 10 0 10 Z" fill={c} />,
  trophy: (c) => <G><Path d="M-6 -8 H6 V-2 A6 6 0 0 1 -6 -2 Z" fill={c} /><Path d="M-6 -6 H-9 C-9 -2 -7 0 -5 0 M6 -6 H9 C9 -2 7 0 5 0" stroke={c} strokeWidth={1.8} fill="none" /><Rect x={-1.5} y={3} width={3} height={4} fill={c} /><Rect x={-5} y={7} width={10} height={3} rx={1} fill={c} /></G>,
  crown: (c) => <Path d="M-9 6 L-10 -6 L-4 -1 L0 -8 L4 -1 L10 -6 L9 6 Z" fill={c} />,
  candy: (c) => <G><Circle r={6} fill={c} /><Path d="M-6 0 L-10 -4 L-10 4 Z M6 0 L10 -4 L10 4 Z" fill={c} /></G>,
  horse: (c) => <Path d="M-8 8 L-6 -1 C-6 -5 -3 -8 1 -8 L4 -10 L5 -7 C8 -5 9 -2 8 0 L5 -1 L3 2 L4 8 Z" fill={c} />,
  castle: (c) => <Path d="M-9 9 V-4 H-6 V-8 H-3 V-4 H-1 V-8 H1 V-4 H3 V-8 H6 V-4 H9 V9 H3 V4 A3 3 0 0 0 -3 4 V9 Z" fill={c} />,
};

/**
 * A medal for an achievement: metal by difficulty (bronze → diamond), ribbon, shine and its own drawing.
 * Locked medals are grey with a padlock.
 */
export const AchievementBadge = React.memo(function AchievementBadge({ icon, tier, got, size = 64 }: { icon: string; tier: Tier; got: boolean; size?: number }) {
  const m = got ? METAL[tier] : { rim: ['#5A5670', '#2A2640'] as [string, string], face: ['#3A3650', '#262238'] as [string, string], ribbon: ['#3A3650', '#262238'] as [string, string], glyph: '#6A6680' };
  const id = `ab${icon}${tier}${got ? 1 : 0}`;
  const draw = GLYPH[icon] ?? GLYPH.spark;
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 64 74">
      <Defs>
        <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={m.rim[0]} /><Stop offset="1" stopColor={m.rim[1]} /></LinearGradient>
        <LinearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={m.face[0]} /><Stop offset="1" stopColor={m.face[1]} /></LinearGradient>
        <LinearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={m.ribbon[0]} /><Stop offset="1" stopColor={m.ribbon[1]} /></LinearGradient>
      </Defs>
      {/* ribbon tails */}
      <Path d="M18 44 L12 72 L20 66 L26 72 L30 48 Z" fill={`url(#${id}b)`} />
      <Path d="M46 44 L52 72 L44 66 L38 72 L34 48 Z" fill={`url(#${id}b)`} />
      {/* scalloped rim */}
      <G transform="translate(32 32)">
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return <Circle key={i} cx={Math.cos(a) * 26} cy={Math.sin(a) * 26} r={5} fill={`url(#${id}r)`} />;
        })}
        <Circle r={27} fill={`url(#${id}r)`} />
        <Circle r={21} fill={`url(#${id}f)`} />
        <Circle r={21} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.2} />
        {tier === 'diamond' && got ? <Path d="M-14 -14 L-10 -18 L-6 -14 L-10 -10 Z" fill="#FFFFFF" opacity={0.8} /> : null}
        <G scale={1.2}>{draw(m.glyph)}</G>
        {/* shine */}
        {got ? <Path d="M-17 -8 A19 19 0 0 1 -6 -18" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.55} /> : null}
        {!got ? (
          <G transform="translate(13 13)">
            <Circle r={9} fill="#1A1430" stroke="#5A5670" strokeWidth={1.5} />
            <Rect x={-4.5} y={-1} width={9} height={7} rx={1.5} fill="#8A86A0" />
            <Path d="M-2.8 -1 V-3.5 A2.8 2.8 0 0 1 2.8 -3.5 V-1" stroke="#8A86A0" strokeWidth={1.6} fill="none" />
          </G>
        ) : null}
      </G>
    </Svg>
  );
});
