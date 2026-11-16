import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Going } from '@/engine/games/horses.ts';

const COAT = ['#8A4B1F', '#5A3216', '#B8743A', '#2B1A10', '#9A6A44', '#6E3A1C', '#C9A27A', '#3E2516'];
export const coatFor = (n: number) => COAT[(n * 5) % COAT.length];

/**
 * Side view of a galloping horse with its jockey in silks. `frame` 0..3 gives the four leg positions of
 * the gallop, so swapping frames fast makes it run.
 */
export function HorseSprite({ n, silks, frame, size = 64 }: { n: number; silks: [string, string]; frame: number; size?: number }) {
  const coat = coatFor(n);
  const dark = '#24140A';
  // legs: [front-near, front-far, back-near, back-far] as (hip x, hip y, foot x, foot y)
  const LEGS: [number, number, number, number][][] = [
    [[66, 44, 80, 60], [62, 44, 70, 62], [30, 46, 18, 60], [34, 46, 26, 62]],
    [[66, 44, 72, 62], [62, 44, 60, 62], [30, 46, 24, 62], [34, 46, 36, 62]],
    [[66, 44, 62, 62], [62, 44, 54, 60], [30, 46, 34, 62], [34, 46, 44, 60]],
    [[66, 44, 76, 56], [62, 44, 78, 58], [30, 46, 14, 56], [34, 46, 16, 58]],
  ];
  const legs = LEGS[frame % 4];
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 96 72">
      <Ellipse cx={46} cy={66} rx={30} ry={3.5} fill="rgba(0,0,0,0.25)" />
      {/* far legs first */}
      {[legs[1], legs[3]].map(([x1, y1, x2, y2], i) => (
        <Path key={`f${i}`} d={`M${x1} ${y1} L${(x1 + x2) / 2 + 2} ${(y1 + y2) / 2} L${x2} ${y2}`} stroke={dark} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      {/* tail */}
      <Path d="M24 34 Q10 36 6 50 Q14 42 24 40 Z" fill={dark} />
      {/* body, neck and head */}
      <Path d="M24 36 Q26 28 40 28 L62 28 Q70 22 74 14 L82 10 L90 16 L88 22 L80 24 Q76 34 70 42 Q64 48 54 48 L34 48 Q24 46 24 36 Z" fill={coat} />
      <Path d="M74 14 Q68 18 64 28 L70 28 Q76 20 82 10 Z" fill={dark} />
      <Circle cx={84} cy={15} r={1.4} fill="#fff" />
      {/* near legs */}
      {[legs[0], legs[2]].map(([x1, y1, x2, y2], i) => (
        <Path key={`n${i}`} d={`M${x1} ${y1} L${(x1 + x2) / 2 + 2} ${(y1 + y2) / 2} L${x2} ${y2}`} stroke={coat} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
      {/* saddle cloth with the number */}
      <Rect x={38} y={30} width={15} height={13} rx={2} fill="#FFFFFF" />
      <SvgText x={45.5} y={40.5} fontSize={10} fontWeight="900" fill="#231A3A" textAnchor="middle">{n}</SvgText>
      {/* jockey crouched: silks body + sleeve stripe + cap */}
      <Path d="M40 28 Q42 14 54 12 L60 18 L52 28 Z" fill={silks[0]} />
      <Path d="M46 20 L58 16 L60 20 L48 24 Z" fill={silks[1]} />
      <Path d="M56 18 L66 22 L64 25 L55 22 Z" fill={silks[0]} />
      <Circle cx={57} cy={8.5} r={5} fill="#F2C9A0" />
      <Path d="M52 8 Q57 1 62 7 L64 8 L52 9 Z" fill={silks[1]} />
    </Svg>
  );
}

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
