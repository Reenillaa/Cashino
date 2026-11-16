import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { BOMB, SCATTER } from '@/engine/games/cascade.ts';

/** Bomb colour by value: the bigger the multiplier, the hotter the bomb. */
export const bombColor = (v: number) => (v >= 50 ? '#FF3B5C' : v >= 15 ? '#FF8A3D' : v >= 5 ? '#B06BFF' : '#3D9BFF');

/** Cartoon art for every cell of Dulce Cascada (all drawn here, no images). */
export const SweetArt = React.memo(function SweetArt({ code, size }: { code: number; size: number }) {
  const id = `sw${code}`;
  if (code >= BOMB) {
    const v = code - BOMB;
    const c = bombColor(v);
    return (
      <Svg width={size} height={size} viewBox="0 0 60 60">
        <Defs>
          <RadialGradient id={id} cx="0.38" cy="0.35" r="0.7">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
            <Stop offset="0.25" stopColor={c} />
            <Stop offset="1" stopColor="#1A0F3A" />
          </RadialGradient>
        </Defs>
        <Path d="M38 12 Q44 4 50 8" stroke="#C9A27A" strokeWidth={3} fill="none" strokeLinecap="round" />
        <Circle cx={51} cy={8} r={3.5} fill="#FFD06B" />
        <Circle cx={30} cy={34} r={22} fill={`url(#${id})`} stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} />
        <SvgText x={30} y={41} fontSize={v >= 100 ? 15 : 18} fontWeight="900" fill="#FFFFFF" stroke="#1A0F3A" strokeWidth={0.8} textAnchor="middle">{`×${v}`}</SvgText>
      </Svg>
    );
  }
  const body = (() => {
    switch (code) {
      case 0: // heart candy
        return (
          <>
            <Path d="M30 52 C8 36 6 18 18 13 C25 10 29 15 30 19 C31 15 35 10 42 13 C54 18 52 36 30 52 Z" fill={`url(#${id})`} stroke="#8A0F2E" strokeWidth={2} />
            <Ellipse cx={21} cy={21} rx={5} ry={3} fill="#fff" opacity={0.7} rotation={-30} origin="21,21" />
          </>
        );
      case 1: // star candy
        return (
          <>
            <Path d="M30 6 L37 22 L54 23 L41 34 L45 52 L30 42 L15 52 L19 34 L6 23 L23 22 Z" fill={`url(#${id})`} stroke="#4B1F99" strokeWidth={2} strokeLinejoin="round" />
            <Circle cx={25} cy={22} r={3} fill="#fff" opacity={0.7} />
          </>
        );
      case 2: // gumdrop
        return (
          <>
            <Path d="M10 48 Q10 12 30 10 Q50 12 50 48 Z" fill={`url(#${id})`} stroke="#0B6E3E" strokeWidth={2} />
            {[[20, 24], [33, 18], [40, 32], [24, 38], [32, 30]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={1.6} fill="#fff" opacity={0.85} />)}
          </>
        );
      case 3: // jelly cube
        return (
          <>
            <Path d="M14 22 L30 13 L46 22 L46 42 L30 51 L14 42 Z" fill={`url(#${id})`} stroke="#123F99" strokeWidth={2} strokeLinejoin="round" />
            <Path d="M14 22 L30 31 L46 22 M30 31 L30 51" stroke="#fff" strokeOpacity={0.45} strokeWidth={2} fill="none" />
          </>
        );
      case 4: // plum
        return (
          <>
            <Circle cx={30} cy={33} r={19} fill={`url(#${id})`} stroke="#3A0F5A" strokeWidth={2} />
            <Path d="M30 15 Q31 9 36 7" stroke="#5A3216" strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M32 13 Q42 6 46 14 Q38 18 32 13 Z" fill="#3EBE6E" />
            <Ellipse cx={23} cy={26} rx={4} ry={6} fill="#fff" opacity={0.35} />
          </>
        );
      case 5: // apple
        return (
          <>
            <Path d="M30 18 C20 10 8 18 10 32 C12 46 22 54 30 50 C38 54 48 46 50 32 C52 18 40 10 30 18 Z" fill={`url(#${id})`} stroke="#7A0F1E" strokeWidth={2} />
            <Path d="M30 18 Q29 10 33 6" stroke="#5A3216" strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M32 12 Q42 4 46 12 Q38 16 32 12 Z" fill="#3EBE6E" />
            <Ellipse cx={19} cy={28} rx={3.5} ry={6} fill="#fff" opacity={0.45} />
          </>
        );
      case 6: // melon slice
        return (
          <>
            <Path d="M6 22 Q30 62 54 22 Z" fill="#2E9E4E" />
            <Path d="M10 22 Q30 54 50 22 Z" fill="#F4FFE0" />
            <Path d="M13 22 Q30 49 47 22 Z" fill={`url(#${id})`} />
            {[[22, 28], [30, 34], [38, 28], [30, 26]].map(([x, y], k) => <Ellipse key={k} cx={x} cy={y} rx={1.6} ry={2.4} fill="#231A3A" />)}
          </>
        );
      case 7: // grapes
        return (
          <>
            <Path d="M30 12 Q32 6 38 5" stroke="#5A3216" strokeWidth={3} fill="none" strokeLinecap="round" />
            {[[22, 20], [30, 18], [38, 20], [18, 30], [26, 29], [34, 29], [42, 30], [22, 39], [30, 39], [38, 39], [26, 48], [34, 48]].map(([x, y], k) => (
              <Circle key={k} cx={x} cy={y} r={6} fill={`url(#${id})`} stroke="#2A0F4A" strokeWidth={1} />
            ))}
          </>
        );
      case 8: // banana
        return (
          <>
            <Path d="M10 18 Q14 48 46 46 Q52 45 50 40 Q24 40 18 14 Q14 10 10 18 Z" fill={`url(#${id})`} stroke="#9A6A00" strokeWidth={2} strokeLinejoin="round" />
            <Path d="M10 18 L8 13" stroke="#5A3216" strokeWidth={3} strokeLinecap="round" />
          </>
        );
      default: // lollipop (scatter)
        return (
          <>
            <Rect x={28} y={34} width={4} height={24} rx={2} fill="#F4F2FA" />
            <Circle cx={30} cy={24} r={20} fill="#FF4FA3" stroke="#FFFFFF" strokeWidth={2.5} />
            <Path d="M30 24 m0 -4 a4 4 0 1 1 -4 4 a8 8 0 1 0 8 -8 a12 12 0 1 1 -12 12 a16 16 0 1 0 16 -16" stroke="#FFFFFF" strokeWidth={3.2} fill="none" strokeLinecap="round" />
          </>
        );
    }
  })();
  const g = GRAD[code] ?? GRAD[SCATTER];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={g[0]} />
          <Stop offset="1" stopColor={g[1]} />
        </LinearGradient>
      </Defs>
      <G>{body}</G>
    </Svg>
  );
});

const GRAD: Record<number, [string, string]> = {
  0: ['#FF7A9E', '#E8183F'],
  1: ['#D9B8FF', '#8A4BFF'],
  2: ['#9CF5B8', '#19B65A'],
  3: ['#9CD0FF', '#2F6BFF'],
  4: ['#C58BFF', '#6A1FA6'],
  5: ['#FF8A8A', '#D11F2E'],
  6: ['#FF9AA8', '#FF4F6A'],
  7: ['#B9A6FF', '#5A2BC9'],
  8: ['#FFF09A', '#FFC21F'],
  [SCATTER]: ['#FF4FA3', '#FF4FA3'],
};
