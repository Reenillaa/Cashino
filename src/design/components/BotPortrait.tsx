import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/** Illustrated portraits for the poker bots, one per playing style (rock, shark, maniac, calling station). */
export const BOT_STYLES = ['rock', 'shark', 'maniac', 'station'] as const;
const BG: Record<string, [string, string]> = {
  shark: ['#3D7BFF', '#0A1A5A'],
  rock: ['#8A8AA0', '#2A2A3A'],
  maniac: ['#FF4FA3', '#5A0A3A'],
  station: ['#2EC48A', '#0B4E32'],
};
const ol = (c: string, w = 2) => ({ stroke: c, strokeWidth: w, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const });

export function BotPortrait({ style, size }: { style: string; size: number }) {
  const bg = BG[style] ?? BG.rock;
  const id = `bp${style}`;
  let face: React.ReactNode;
  switch (style) {
    case 'shark':
      face = (
        <G>
          {/* suit, shirt and tie */}
          <Path d="M14 100 C16 78 32 70 50 70 C68 70 84 78 86 100 Z" fill="#1A1430" {...ol('#05030A')} />
          <Path d="M42 70 L50 84 L58 70 Z" fill="#FFFFFF" />
          <Path d="M48 74 L52 74 L54 92 L50 96 L46 92 Z" fill="#E8304F" {...ol('#5A0A1A', 1)} />
          {/* shark head */}
          <Path d="M50 12 L58 30 C74 34 82 46 80 58 C78 70 64 74 50 74 C36 74 22 70 20 58 C18 46 26 34 42 30 Z" fill={`url(#${id}h)`} {...ol('#1A2440', 2.4)} />
          <Path d="M24 58 C30 66 70 66 76 58 C70 70 30 70 24 58 Z" fill="#F4F2FA" />
          <Path d="M32 60 L35 64 L38 60 L41 64 L44 60 L47 64 L50 60 L53 64 L56 60 L59 64 L62 60 L65 64 L68 60" stroke="#9A94B0" strokeWidth={1} fill="none" />
          {/* sunglasses */}
          <Path d="M26 44 L48 44 C48 52 44 54 37 54 C30 54 26 50 26 44 Z M52 44 L74 44 C74 50 70 54 63 54 C56 54 52 52 52 44 Z" fill="#0A0812" {...ol('#000000', 1.5)} />
          <Path d="M48 45 L52 45" stroke="#0A0812" strokeWidth={2.4} />
          <Path d="M30 47 L38 47 M56 47 L64 47" stroke="#7FE6FF" strokeWidth={1.6} strokeOpacity={0.7} strokeLinecap="round" />
          <Path d="M36 32 C40 31 44 31 46 32" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />
        </G>
      );
      break;
    case 'maniac':
      face = (
        <G>
          <Path d="M14 100 C16 78 32 70 50 70 C68 70 84 78 86 100 Z" fill="#FFD06B" {...ol('#7A4A00')} />
          {[[26, 84], [44, 92], [62, 84], [76, 94], [34, 96]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={3.5} fill={k % 2 ? '#3D9BFF' : '#E8304F'} />)}
          {/* wild hair */}
          <Path d="M20 44 L10 30 L24 32 L18 14 L34 24 L38 6 L48 22 L58 4 L62 22 L76 10 L74 28 L90 26 L80 42 Z" fill="#FF8A1C" {...ol('#7A2A00', 2)} />
          <Path d="M28 42 C28 26 72 26 72 42 C72 62 62 72 50 72 C38 72 28 62 28 42 Z" fill={`url(#${id}s)`} {...ol('#7A3A1A', 2.2)} />
          {/* crazy eyes */}
          <Circle cx={40} cy={42} r={7} fill="#FFFFFF" {...ol('#1A1430', 1.6)} />
          <Circle cx={60} cy={42} r={8.5} fill="#FFFFFF" {...ol('#1A1430', 1.6)} />
          <Circle cx={42} cy={43} r={3} fill="#1A1430" />
          <Circle cx={57} cy={41} r={3.4} fill="#1A1430" />
          <Path d="M32 33 L46 36 M54 34 L68 30" stroke="#7A2A00" strokeWidth={2.6} strokeLinecap="round" />
          {/* huge grin */}
          <Path d="M36 54 Q50 70 64 54 Z" fill="#5A0A1A" {...ol('#3A0A0A', 1.6)} />
          <Path d="M38 55 L62 55 L60 58 L40 58 Z" fill="#FFFFFF" />
          <Ellipse cx={34} cy={52} rx={4} ry={2.4} fill="#FF7A8A" opacity={0.55} />
          <Ellipse cx={66} cy={52} rx={4} ry={2.4} fill="#FF7A8A" opacity={0.55} />
        </G>
      );
      break;
    case 'station':
      face = (
        <G>
          <Path d="M14 100 C16 78 32 70 50 70 C68 70 84 78 86 100 Z" fill="#B0602A" {...ol('#4A2008')} />
          <Path d="M40 72 L50 86 L60 72" fill="#E8304F" {...ol('#5A0A1A', 1.2)} />
          <Path d="M30 42 C30 28 70 28 70 42 C70 60 62 70 50 70 C38 70 30 60 30 42 Z" fill={`url(#${id}s)`} {...ol('#7A3A1A', 2.2)} />
          <Circle cx={42} cy={44} r={2.6} fill="#1A1430" />
          <Circle cx={58} cy={44} r={2.6} fill="#1A1430" />
          <Path d="M38 39 Q42 37 46 39 M54 39 Q58 37 62 39" stroke="#5A3210" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          {/* moustache and smile */}
          <Path d="M36 56 C42 50 48 52 50 54 C52 52 58 50 64 56 C58 58 52 56 50 56 C48 56 42 58 36 56 Z" fill="#6A3A1A" />
          <Path d="M43 61 Q50 65 57 61" stroke="#7A3A1A" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Ellipse cx={50} cy={50} rx={3.4} ry={2.6} fill="#E8987A" />
          {/* cowboy hat */}
          <Path d="M8 34 C20 40 80 40 92 34 C88 42 70 44 50 44 C30 44 12 42 8 34 Z" fill="#C2823A" {...ol('#4A2A08', 2)} />
          <Path d="M30 36 C30 18 36 10 42 14 C46 10 54 10 58 14 C64 10 70 18 70 36 Z" fill="url(#bphat)" {...ol('#4A2A08', 2)} />
          <Path d="M30 30 L70 30" stroke="#5A2E10" strokeWidth={3} />
        </G>
      );
      break;
    default: // rock
      face = (
        <G>
          <Path d="M14 100 C16 78 32 70 50 70 C68 70 84 78 86 100 Z" fill="#3A3E50" {...ol('#14141E')} />
          <Path d="M24 86 L76 86" stroke="#5A5E70" strokeWidth={2} />
          {/* stone head */}
          <Path d="M26 46 L30 26 L44 18 L62 20 L74 30 L76 52 L68 68 L50 74 L32 68 Z" fill={`url(#${id}r)`} {...ol('#2A2A3A', 2.4)} />
          <Path d="M34 30 L40 38 L36 44 M64 26 L60 34 M66 58 L60 62" stroke="#4A4A5A" strokeWidth={1.4} fill="none" />
          {/* calm, half-closed eyes */}
          <Path d="M36 46 L46 46 M54 46 L64 46" stroke="#14141E" strokeWidth={3} strokeLinecap="round" />
          <Path d="M36 43 L46 43 M54 43 L64 43" stroke="#4A4A5A" strokeWidth={2} strokeLinecap="round" />
          <Path d="M42 60 L58 60" stroke="#14141E" strokeWidth={2.6} strokeLinecap="round" />
          {/* beanie */}
          <Path d="M28 30 C28 12 72 12 72 30 Z" fill="#E8304F" {...ol('#5A0A1A', 2)} />
          <Rect x={26} y={26} width={48} height={8} rx={3} fill="#C8183A" {...ol('#5A0A1A', 1.6)} />
          <Circle cx={50} cy={11} r={5} fill="#FFFFFF" {...ol('#9A94B0', 1.2)} />
        </G>
      );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${id}bg`} cx="0.5" cy="0.35" r="0.75">
          <Stop offset="0" stopColor={bg[0]} />
          <Stop offset="1" stopColor={bg[1]} />
        </RadialGradient>
        <LinearGradient id={`${id}h`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B8C8E8" />
          <Stop offset="1" stopColor="#5A6A9A" />
        </LinearGradient>
        <LinearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFE0C4" />
          <Stop offset="1" stopColor="#E8A878" />
        </LinearGradient>
        <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#C8C8D8" />
          <Stop offset="1" stopColor="#6A6A80" />
        </LinearGradient>
        <LinearGradient id="bphat" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E0A060" />
          <Stop offset="1" stopColor="#9A5A20" />
        </LinearGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill={`url(#${id}bg)`} />
      <G>{face}</G>
      <Circle cx={50} cy={50} r={48.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={3} />
    </Svg>
  );
}
