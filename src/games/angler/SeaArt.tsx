import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { AnglerCatch } from '@/engine/games/angler.ts';
import { Glint, Gloss, dg, ol, rg, vg } from '../lineslot/art/kit';

/**
 * Sea life of Pesca Profunda on a 120×70 artboard, nose to the LEFT (flip with scaleX: -1 to swim right).
 * Same recipe as the slot symbols: dark outline, body gradient, shaded belly, fins, scales and a glossy eye.
 */
const eye = (x: number, y: number, r = 4.5) => (
  <G>
    <Circle cx={x} cy={y} r={r} fill="#FFFFFF" {...ol('#14101E', 1.4)} />
    <Circle cx={x - r * 0.2} cy={y} r={r * 0.55} fill="#14101E" />
    <Circle cx={x - r * 0.45} cy={y - r * 0.35} r={r * 0.22} fill="#FFFFFF" />
  </G>
);

export const SeaFish = React.memo(function SeaFish({ kind, size }: { kind: AnglerCatch; size: number }) {
  const id = `sf${kind}`;
  let body: React.ReactNode = null;
  switch (kind) {
    case 'sardine':
      body = (
        <G>
          <Defs>{vg(`${id}b`, ['#5A7AA0', '#C8D8E8', '#F4F8FF'])}</Defs>
          <Path d="M96 35 L114 22 L110 35 L114 48 Z" fill="#7A9AC0" {...ol('#2A3A5A', 2)} />
          <Path d="M10 35 C22 24 60 22 96 33 L96 37 C60 48 22 46 10 35 Z" fill={`url(#${id}b)`} {...ol('#2A3A5A', 2.4)} />
          <Path d="M24 32 L92 32" stroke="#3A5A8A" strokeWidth={2} strokeOpacity={0.6} />
          {[40, 52, 64, 76].map((x) => <Circle key={x} cx={x} cy={29} r={1.4} fill="#2A3A5A" opacity={0.5} />)}
          {eye(20, 33, 3.6)}
          <Gloss d="M26 29 C44 25 66 25 84 28 C66 29 44 30 30 33 Z" o={0.7} />
        </G>
      );
      break;
    case 'mackerel':
      body = (
        <G>
          <Defs>{vg(`${id}b`, ['#1F6A6A', '#5AB0A0', '#E8F4F0'])}</Defs>
          <Path d="M94 35 L114 18 L108 35 L114 52 Z" fill="#2E7A70" {...ol('#0B3A34', 2)} />
          <Path d="M50 22 L62 12 L68 24 Z" fill="#2E7A70" {...ol('#0B3A34', 1.6)} />
          <Path d="M8 36 C20 20 60 18 94 32 L94 38 C60 52 20 50 8 36 Z" fill={`url(#${id}b)`} {...ol('#0B3A34', 2.4)} />
          {[30, 40, 50, 60, 70, 80].map((x, k) => <Path key={x} d={`M${x} 25 Q${x + 4} ${30 - (k % 2) * 2} ${x + 2} 34`} stroke="#0B3A34" strokeWidth={2} fill="none" />)}
          {eye(18, 33, 4)}
          <Gloss d="M22 28 C40 22 62 22 80 26 C62 27 42 29 28 33 Z" o={0.45} />
        </G>
      );
      break;
    case 'bream':
      body = (
        <G>
          <Defs>{dg(`${id}b`, ['#FFF3D6', '#FFC8A0', '#E8907A'], '0', '0', '0.3', '1')}</Defs>
          <Path d="M92 35 L112 18 L106 35 L112 52 Z" fill="#E8A07A" {...ol('#7A3A1A', 2)} />
          <Path d="M38 16 C48 6 70 6 80 18 L70 22 Z" fill="#FFB0A0" {...ol('#7A3A1A', 1.6)} />
          <Path d="M8 35 C16 16 52 10 92 32 L92 38 C52 60 16 54 8 35 Z" fill={`url(#${id}b)`} {...ol('#7A3A1A', 2.4)} />
          <Path d="M26 22 C30 30 30 40 26 48" stroke="#FFD06B" strokeWidth={3} fill="none" />
          <Path d="M22 35 L90 35" stroke="#C86A5A" strokeWidth={1.2} strokeOpacity={0.5} />
          {eye(17, 31, 4.5)}
          <Gloss d="M30 22 C46 16 64 18 78 24 C62 24 46 26 34 30 Z" o={0.6} />
          <Glint x={56} y={22} s={0.6} />
        </G>
      );
      break;
    case 'clownfish':
      body = (
        <G>
          <Defs>{rg(`${id}b`, ['#FFD0A0', '#FF8A1C', '#C2420A'], '0.4', '0.35', '0.8')}</Defs>
          <Path d="M84 35 C96 22 108 22 110 26 C104 32 104 38 110 44 C108 48 96 48 84 35 Z" fill="#FF8A1C" {...ol('#3A1408', 2)} />
          <Path d="M40 16 C50 8 66 10 72 18 L62 22 Z" fill="#FF8A1C" {...ol('#3A1408', 1.6)} />
          <Path d="M10 35 C14 18 46 12 84 30 L84 40 C46 58 14 52 10 35 Z" fill={`url(#${id}b)`} {...ol('#3A1408', 2.4)} />
          {[[28, 20, 50], [52, 18, 52], [76, 28, 42]].map(([x, y1, y2], k) => (
            <Path key={k} d={`M${x - 4} ${y1} C${x - 8} 30 ${x - 8} 40 ${x - 4} ${y2} L${x + 4} ${y2} C${x} 40 ${x} 30 ${x + 4} ${y1} Z`} fill="#FFFFFF" stroke="#14101E" strokeWidth={1.6} />
          ))}
          {eye(17, 31, 4.5)}
          <Gloss d="M20 24 C34 18 50 18 62 22 C48 24 34 26 24 30 Z" o={0.55} />
        </G>
      );
      break;
    case 'swordfish':
      body = (
        <G>
          <Defs>{vg(`${id}b`, ['#1A3A8A', '#3D7BFF', '#C8E0FF'])}</Defs>
          <Path d="M2 34 L26 32 L26 36 Z" fill="#9AA8C0" {...ol('#14204A', 1.4)} />
          <Path d="M96 35 L116 14 L110 35 L116 56 Z" fill="#2A4ACF" {...ol('#0A1A4A', 2)} />
          <Path d="M44 22 L56 4 L66 24 Z" fill="#2A4ACF" {...ol('#0A1A4A', 1.6)} />
          <Path d="M24 35 C34 22 64 20 96 32 L96 38 C64 50 34 48 24 35 Z" fill={`url(#${id}b)`} {...ol('#0A1A4A', 2.4)} />
          <Path d="M36 32 L90 32" stroke="#9AD4FF" strokeWidth={1.6} strokeOpacity={0.7} />
          {eye(32, 32, 3.8)}
          <Gloss d="M38 28 C54 24 72 24 88 27 C72 28 54 29 42 32 Z" o={0.5} />
        </G>
      );
      break;
    case 'octopus':
      body = (
        <G>
          <Defs>{rg(`${id}b`, ['#F0C8FF', '#B05ADF', '#5A1A8A'], '0.4', '0.3', '0.8')}</Defs>
          {[[30, 44], [44, 50], [60, 52], [76, 50], [90, 44]].map(([x, y], k) => (
            <Path key={k} d={`M${x} 38 C${x - 6 + k * 2} ${y} ${x + 8 - k} ${y + 8} ${x + (k % 2 ? 6 : -6)} ${y + 14}`} stroke="#5A1A8A" strokeWidth={8} fill="none" strokeLinecap="round" />
          ))}
          {[[30, 44], [44, 50], [60, 52], [76, 50], [90, 44]].map(([x, y], k) => (
            <Path key={`i${k}`} d={`M${x} 38 C${x - 6 + k * 2} ${y} ${x + 8 - k} ${y + 8} ${x + (k % 2 ? 6 : -6)} ${y + 14}`} stroke="#C07AEF" strokeWidth={5} fill="none" strokeLinecap="round" />
          ))}
          <Path d="M28 38 C26 14 94 14 92 38 C82 46 38 46 28 38 Z" fill={`url(#${id}b)`} {...ol('#3A0A5A', 2.4)} />
          {[[48, 26], [70, 24], [58, 34]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={2} fill="#E0A8FF" />)}
          {eye(46, 34, 4.2)}
          {eye(72, 34, 4.2)}
          <Gloss d="M40 22 C48 16 60 15 70 16 C60 20 50 24 44 30 Z" o={0.6} />
        </G>
      );
      break;
    case 'lanternfish':
      body = (
        <G>
          <Defs>
            {vg(`${id}b`, ['#2A1E5A', '#14103A', '#0A0820'])}
            {rg(`${id}l`, ['#FFFFFF', '#FFF3A0', '#FFD06B'], '0.5', '0.5', '0.5')}
          </Defs>
          <Circle cx={18} cy={6} r={12} fill="#FFF3A0" opacity={0.25} />
          <Path d="M40 22 C34 8 24 4 18 6" stroke="#5A4A9A" strokeWidth={2} fill="none" />
          <Circle cx={18} cy={6} r={5} fill={`url(#${id}l)`} />
          <Path d="M92 35 L112 20 L106 35 L112 50 Z" fill="#2A1E5A" {...ol('#05030A', 2)} />
          <Path d="M10 38 C14 18 56 14 92 32 L92 38 C56 56 20 60 10 38 Z" fill={`url(#${id}b)`} {...ol('#05030A', 2.4)} />
          <Path d="M12 40 L30 46 L14 46 Z" fill="#FFFFFF" />
          <Path d="M12 40 L22 42 L20 38 L28 42 L26 38 L34 42" stroke="#FFFFFF" strokeWidth={1.4} fill="none" />
          {[40, 54, 68, 80].map((x) => <Circle key={x} cx={x} cy={44} r={1.8} fill="#7FE6FF" />)}
          <Circle cx={26} cy={28} r={6} fill="#FFFFFF" {...ol('#05030A', 1.4)} />
          <Circle cx={25} cy={28} r={3.4} fill="#7FE6FF" />
          <Circle cx={24} cy={26.5} r={1.2} fill="#FFFFFF" />
        </G>
      );
      break;
    case 'tuna':
      body = (
        <G>
          <Defs>{vg(`${id}b`, ['#0A2A6A', '#3D7BFF', '#B8D8F8', '#F4F8FF'])}</Defs>
          <Path d="M96 35 L118 12 L110 35 L118 58 Z" fill="#1A3A8A" {...ol('#05143A', 2)} />
          <Path d="M48 16 L60 2 L68 18 Z M54 54 L62 64 L68 52 Z" fill="#FFD06B" {...ol('#7A4A00', 1.4)} />
          <Path d="M4 36 C14 14 60 10 96 30 L96 40 C60 60 14 58 4 36 Z" fill={`url(#${id}b)`} {...ol('#05143A', 2.6)} />
          {[74, 80, 86, 92].map((x) => <Path key={x} d={`M${x} 26 L${x + 3} 22 L${x + 6} 26`} fill="#FFD06B" />)}
          <Path d="M24 22 C30 30 30 42 24 50" stroke="#05143A" strokeWidth={2} fill="none" />
          {eye(14, 32, 4.6)}
          <Gloss d="M22 22 C40 14 64 14 84 20 C64 22 42 24 26 28 Z" o={0.55} />
          <Glint x={66} y={20} s={0.7} />
        </G>
      );
      break;
    case 'goldshark':
      body = (
        <G>
          <Defs>
            {dg(`${id}b`, ['#FFF8D0', '#FFC21C', '#B06A08'], '0', '0', '0.3', '1')}
            {rg(`${id}h`, ['#FFE58A', '#FFB938'], '0.5', '0.5', '0.5')}
          </Defs>
          <Ellipse cx={60} cy={35} rx={56} ry={30} fill={`url(#${id}h)`} opacity={0.3} />
          <Path d="M94 34 L116 8 L110 34 L118 58 Z" fill="#E0A010" {...ol('#5A3200', 2)} />
          <Path d="M50 18 L60 0 L70 20 Z" fill="#E0A010" {...ol('#5A3200', 1.8)} />
          <Path d="M2 38 C10 18 58 14 94 30 L94 40 C66 52 30 56 2 38 Z" fill={`url(#${id}b)`} {...ol('#5A3200', 2.6)} />
          <Path d="M6 40 C14 46 22 46 30 42" stroke="#5A3200" strokeWidth={1.8} fill="none" />
          <Path d="M8 40 L10 43 L12 40 L14 43 L16 40 L18 43 L20 40" stroke="#FFFFFF" strokeWidth={1.2} fill="none" />
          {[32, 36, 40].map((x) => <Path key={x} d={`M${x} 28 Q${x + 2} 34 ${x} 40`} stroke="#8A5200" strokeWidth={1.4} fill="none" />)}
          {eye(16, 32, 3.6)}
          <Gloss d="M20 26 C40 18 64 18 84 24 C64 25 42 27 26 31 Z" o={0.7} />
          <Glint x={50} y={24} s={0.9} />
          <Glint x={80} y={40} s={0.6} />
        </G>
      );
      break;
    case 'boot':
      body = (
        <G>
          <Defs>{vg(`${id}b`, ['#7A5A3A', '#4A3220', '#2A1A0E'])}</Defs>
          <Path d="M40 6 L66 6 L66 40 C80 40 98 44 100 54 L100 62 L28 62 L28 52 C28 46 34 42 40 40 Z" fill={`url(#${id}b)`} {...ol('#14080A', 2.4)} />
          <Path d="M28 58 L100 58" stroke="#14080A" strokeWidth={3} />
          {[16, 24, 32].map((y) => <Path key={y} d={`M44 ${y} L62 ${y + 2}`} stroke="#C8B090" strokeWidth={1.6} />)}
          <Path d="M66 44 C72 42 78 44 80 48" stroke="#2A1A0E" strokeWidth={1.4} fill="none" />
          <Path d="M50 6 C46 0 54 -2 56 4" stroke="#2E9A5A" strokeWidth={2.4} fill="none" />
          <Path d="M84 60 C88 66 92 64 94 60" stroke="#2E9A5A" strokeWidth={2} fill="none" />
          <Circle cx={92} cy={48} r={2.4} fill="none" stroke="#FFFFFF" strokeWidth={1} opacity={0.7} />
        </G>
      );
      break;
    case 'deadfish':
      body = (
        <G>
          <Path d="M92 35 L112 22 L108 35 L112 48 Z" fill="none" stroke="#C8C4B0" strokeWidth={2.4} />
          <Path d="M10 35 C22 22 62 22 92 33 L92 37 C62 48 22 48 10 35 Z" fill="#9AA090" opacity={0.85} {...ol('#4A4E40', 2.2)} />
          {/* bones showing through */}
          <Path d="M28 35 L90 35" stroke="#F4F0E0" strokeWidth={2.4} />
          {[38, 48, 58, 68, 78].map((x) => <Path key={x} d={`M${x} 26 L${x + 4} 35 L${x} 44`} stroke="#F4F0E0" strokeWidth={1.8} fill="none" />)}
          <Path d="M15 30 L23 38 M23 30 L15 38" stroke="#14101E" strokeWidth={2.4} strokeLinecap="round" />
          <Path d="M10 40 Q14 42 18 40" stroke="#4A4E40" strokeWidth={1.4} fill="none" />
          <Path d="M50 18 Q54 10 50 4 M62 18 Q66 12 62 6" stroke="#9CC860" strokeWidth={2} fill="none" opacity={0.8} />
        </G>
      );
      break;
    case 'puffer':
      body = (
        <G>
          <Defs>{rg(`${id}b`, ['#FFFBD0', '#FFE03A', '#C29A00'], '0.4', '0.35', '0.8')}</Defs>
          {Array.from({ length: 16 }, (_, k) => {
            const a = (k / 16) * Math.PI * 2;
            return <Path key={k} d={`M${60 + Math.cos(a) * 26} ${35 + Math.sin(a) * 24} L${60 + Math.cos(a) * 34} ${35 + Math.sin(a) * 32}`} stroke="#7A5A00" strokeWidth={2.2} strokeLinecap="round" />;
          })}
          <Path d="M86 35 L102 26 L100 35 L102 44 Z" fill="#E0B020" {...ol('#5A4200', 1.8)} />
          <Ellipse cx={60} cy={35} rx={27} ry={25} fill={`url(#${id}b)`} {...ol('#5A4200', 2.4)} />
          <Ellipse cx={60} cy={44} rx={18} ry={11} fill="#FFFFFF" opacity={0.6} />
          {[[52, 22], [66, 20], [72, 32], [48, 32]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={2.2} fill="#7A5A00" opacity={0.6} />)}
          {eye(44, 32, 5)}
          <Ellipse cx={36} cy={42} rx={4} ry={3} fill="#FF7A6A" {...ol('#5A1A0A', 1.2)} />
        </G>
      );
      break;
  }
  return <Svg width={size} height={size * (70 / 120)} viewBox="0 0 120 70">{body}</Svg>;
});

/** The fisherman in his boat (drawn once at the surface). */
export function Boat({ w }: { w: number }) {
  return (
    <Svg width={w} height={w * 0.7} viewBox="0 0 140 98">
      <Defs>
        {vg('bth', ['#C27A3A', '#8A4A1E', '#5A2E10'])}
        {vg('btc', ['#FFE070', '#E0A010'])}
        {vg('bts', ['#FFDDBC', '#E8A878'])}
      </Defs>
      {/* fisherman */}
      <Path d="M52 72 C52 56 58 50 66 50 C74 50 80 56 80 72 Z" fill="url(#btc)" {...ol('#7A4A00', 2)} />
      <Path d="M58 40 C58 30 74 30 74 40 C74 48 70 52 66 52 C62 52 58 48 58 40 Z" fill="url(#bts)" {...ol('#7A3A1A', 1.8)} />
      <Path d="M58 44 C60 54 72 54 74 44 C70 48 62 48 58 44 Z" fill="#E8E2D6" />
      <Circle cx={63} cy={40} r={1.3} fill="#1A1430" />
      <Circle cx={70} cy={40} r={1.3} fill="#1A1430" />
      <Path d="M52 34 C56 24 76 24 80 34 C74 32 58 32 52 34 Z" fill="url(#btc)" {...ol('#7A4A00', 1.6)} />
      <Path d="M48 35 C58 30 74 30 84 35 C76 38 56 38 48 35 Z" fill="#E0A010" {...ol('#7A4A00', 1.4)} />
      {/* arms holding the rod */}
      <Path d="M76 60 L94 52" stroke="#E0A010" strokeWidth={6} strokeLinecap="round" />
      {/* hull */}
      <Path d="M8 70 L132 70 L118 94 C100 98 40 98 22 94 Z" fill="url(#bth)" {...ol('#2A0E04', 2.6)} />
      <Path d="M8 70 L132 70 L130 75 L10 75 Z" fill="#F4E2C0" {...ol('#2A0E04', 1.4)} />
      <Path d="M18 82 L122 82 M22 89 L118 89" stroke="#2A0E04" strokeOpacity={0.4} strokeWidth={1.4} />
      <Path d="M30 70 L26 60 M110 70 L114 58" stroke="#5A2E10" strokeWidth={2.4} />
      <Gloss d="M14 75 L80 75 L78 77 L16 77 Z" o={0.4} />
    </Svg>
  );
}

/** Seabed: sand, rocks, weed and coral, drawn to the scene's width. */
export function Seabed({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox="0 0 400 80" preserveAspectRatio="none">
      <Defs>{vg('sbs', ['#C8A060', '#7A5A2A'])}</Defs>
      {[[30, 8], [52, 14], [330, 10], [356, 6]].map(([x, s], k) => (
        <Path key={k} d={`M${x} 60 C${x - 6} ${40 - s} ${x + 6} ${30 - s} ${x} ${10 - s} C${x + 8} ${30 - s} ${x - 2} ${40 - s} ${x + 4} 60 Z`} fill={k % 2 ? '#14804A' : '#2EB04A'} opacity={0.9} />
      ))}
      {[[300, '#FF7AA8'], [80, '#FF8A3D']].map(([x, c], k) => (
        <G key={k} transform={`translate(${x} 50)`}>
          <Path d="M0 10 L0 -10 M0 -2 L-8 -12 M0 -4 L8 -16 M-8 -12 L-12 -18 M8 -16 L12 -22" stroke={String(c)} strokeWidth={4} strokeLinecap="round" />
        </G>
      ))}
      <Path d="M0 56 Q60 46 120 56 T240 54 T400 56 V80 H0 Z" fill="url(#sbs)" />
      {[[150, 58, 18, 10], [190, 60, 12, 7], [260, 58, 22, 12]].map(([x, y, rx, ry], k) => <Ellipse key={k} cx={x} cy={y} rx={rx} ry={ry} fill="#5A5470" stroke="#2A2440" strokeWidth={1.4} />)}
      <Rect x={210} y={52} width={26} height={14} rx={3} fill="#8A4B1E" stroke="#3A1A08" strokeWidth={1.4} />
      <Path d="M210 52 Q223 42 236 52 Z" fill="#A0602A" stroke="#3A1A08" strokeWidth={1.4} />
      <Rect x={221} y={54} width={4} height={6} fill="#FFD06B" />
    </Svg>
  );
}
