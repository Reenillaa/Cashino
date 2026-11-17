import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import type { GameId } from '@/engine/games/types.ts';

/**
 * Illustrated cover for every game: a small cartoon scene drawn here (no photos, no licences needed).
 * 200×240 scene, cropped to fill whatever box it is given; the important art sits in the upper part so a
 * colour gradient and the title can go at the bottom.
 */
type Scene = (p: string) => React.ReactNode;

const sky = (p: string, a: string, b: string) => (
  <>
    <Defs>
      <LinearGradient id={`${p}sky`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={a} />
        <Stop offset="1" stopColor={b} />
      </LinearGradient>
    </Defs>
    <Rect x={0} y={0} width={200} height={240} fill={`url(#${p}sky)`} />
  </>
);
const stars = (n: number, seed: number, color = '#FFFFFF') =>
  Array.from({ length: n }, (_, i) => <Circle key={`s${i}`} cx={((i * 73 + seed * 31) % 200)} cy={((i * 41 + seed * 17) % 110)} r={0.8 + ((i * 7) % 3) * 0.5} fill={color} opacity={0.35 + ((i * 13) % 5) * 0.12} />);
const card = (x: number, y: number, rot: number, rank: string, suit: string, red: boolean, s = 1) => (
  <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <Rect x={-2} y={2} width={44} height={62} rx={6} fill="rgba(0,0,0,0.3)" />
    <Rect x={-4} y={0} width={44} height={62} rx={6} fill="#FFFFFF" />
    <SvgText x={2} y={16} fontSize={13} fontWeight="900" fill={red ? '#E8304F' : '#1A1430'}>{rank}</SvgText>
    <SvgText x={18} y={44} fontSize={24} textAnchor="middle" fill={red ? '#E8304F' : '#1A1430'}>{suit}</SvgText>
  </G>
);
const chip = (x: number, y: number, r: number, color: string) => (
  <G>
    <Circle cx={x} cy={y + 2} r={r} fill="rgba(0,0,0,0.3)" />
    <Circle cx={x} cy={y} r={r} fill={color} />
    <Circle cx={x} cy={y} r={r * 0.78} fill="none" stroke="#FFFFFF" strokeWidth={r * 0.18} strokeDasharray={`${r * 0.4} ${r * 0.35}`} />
    <Circle cx={x} cy={y} r={r * 0.5} fill={color} stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
  </G>
);
const stack = (x: number, y: number, n: number, color: string) => (
  <G>
    {Array.from({ length: n }, (_, i) => (
      <G key={i}>
        <Ellipse cx={x} cy={y - i * 5 + 3} rx={13} ry={5} fill="rgba(0,0,0,0.35)" />
        <Ellipse cx={x} cy={y - i * 5} rx={13} ry={5} fill={color} stroke="#FFFFFF" strokeWidth={1.2} strokeDasharray="3 3" />
      </G>
    ))}
  </G>
);
const die = (x: number, y: number, s: number, rot: number, pips: [number, number][], color = '#FFFFFF') => (
  <G transform={`translate(${x} ${y}) rotate(${rot})`}>
    <Rect x={-s / 2 + 3} y={-s / 2 + 4} width={s} height={s} rx={s * 0.2} fill="rgba(0,0,0,0.3)" />
    <Rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.2} fill={color} />
    {pips.map(([px, py], i) => <Circle key={i} cx={(px - 0.5) * s} cy={(py - 0.5) * s} r={s * 0.09} fill={i === 0 && pips.length === 1 ? '#E8304F' : '#1A1430'} />)}
  </G>
);
const P5: [number, number][] = [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]];
const P6: [number, number][] = [[0.27, 0.22], [0.73, 0.22], [0.27, 0.5], [0.73, 0.5], [0.27, 0.78], [0.73, 0.78]];
const P3: [number, number][] = [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]];
const gem = (x: number, y: number, s: number, c1: string, c2: string) => (
  <G transform={`translate(${x} ${y}) scale(${s})`}>
    <Polygon points="-14,-6 -7,-14 7,-14 14,-6 0,14" fill={c1} />
    <Polygon points="-14,-6 14,-6 0,14" fill={c2} />
    <Polygon points="-7,-14 0,-6 7,-14" fill="#FFFFFF" opacity={0.5} />
  </G>
);
const city = (y: number, color: string, lights: string) => (
  <G>
    {[[0, 34, 60], [30, 26, 90], [52, 40, 50], [86, 30, 110], [112, 44, 70], [150, 26, 95], [172, 30, 60]].map(([x, w, h], i) => (
      <G key={i}>
        <Rect x={x} y={y - h} width={w} height={h + 60} fill={color} />
        {Array.from({ length: Math.floor(h / 14) }, (_, k) => <Rect key={k} x={x + 5} y={y - h + 8 + k * 14} width={w - 10} height={4} fill={(i + k) % 3 ? lights : 'rgba(255,255,255,0.06)'} opacity={0.6} />)}
      </G>
    ))}
  </G>
);

const SCENES: Partial<Record<GameId, Scene>> = {
  blackjack: (p) => (
    <>
      {sky(p, '#0E5A3C', '#062A1E')}
      <Ellipse cx={100} cy={-30} rx={170} ry={150} fill="#11744C" />
      <Path d="M-10 92 Q100 150 210 92" stroke="#E8C77A" strokeWidth={2} fill="none" opacity={0.6} />
      <SvgText x={100} y={124} fontSize={9} fontWeight="800" fill="#E8C77A" textAnchor="middle" opacity={0.7}>BLACKJACK PAYS 3 TO 2</SvgText>
      {card(60, 22, -14, 'A', '♠', false, 1.15)}
      {card(98, 18, 10, 'K', '♥', true, 1.15)}
      {stack(34, 112, 5, '#E8304F')}
      {stack(168, 108, 7, '#1A1430')}
      {stack(150, 118, 3, '#2F6BFF')}
      <Circle cx={150} cy={34} r={18} fill="#FFD06B" />
      <SvgText x={150} y={40} fontSize={16} fontWeight="900" fill="#5A3200" textAnchor="middle">21</SvgText>
    </>
  ),
  poker: (p) => (
    <>
      {sky(p, '#5B1430', '#200614')}
      <Ellipse cx={100} cy={70} rx={130} ry={80} fill="#8A1F3E" />
      <Ellipse cx={100} cy={70} rx={118} ry={70} fill="#A82A4E" />
      {card(30, 40, -8, 'A', '♦', true, 0.8)}
      {card(64, 36, -3, 'K', '♦', true, 0.8)}
      {card(98, 34, 2, 'Q', '♦', true, 0.8)}
      {card(132, 36, 6, 'J', '♦', true, 0.8)}
      {card(166, 40, 10, '10', '♦', true, 0.8)}
      {chip(40, 112, 12, '#2F6BFF')}
      {chip(66, 120, 12, '#12C08A')}
      {chip(150, 114, 12, '#FFB938')}
      <Path d="M86 116 l14 -10 14 10 -14 10z" fill="#FFD06B" />
    </>
  ),
  roulette: (p) => (
    <>
      {sky(p, '#3A0E4A', '#14061E')}
      <G transform="translate(110 62)">
        <Circle r={92} fill="#5A2E14" />
        <Circle r={84} fill="#7A4420" />
        {Array.from({ length: 24 }, (_, i) => {
          const a1 = (i / 24) * Math.PI * 2, a2 = ((i + 1) / 24) * Math.PI * 2;
          return <Path key={i} d={`M0 0 L${Math.cos(a1) * 76} ${Math.sin(a1) * 76} A76 76 0 0 1 ${Math.cos(a2) * 76} ${Math.sin(a2) * 76} Z`} fill={i === 0 ? '#16C47F' : i % 2 ? '#E8304F' : '#1A1430'} stroke="#E8C77A" strokeWidth={0.8} />;
        })}
        <Circle r={48} fill="#8A5A2E" />
        <Circle r={40} fill="#B07A40" />
        <Path d="M0 -34 L5 -6 L34 0 L5 6 L0 34 L-5 6 L-34 0 L-5 -6 Z" fill="#E8C77A" />
        <Circle r={8} fill="#FFE8A8" />
        <Circle cx={56} cy={-40} r={6} fill="#FFFFFF" />
      </G>
      {chip(30, 140, 14, '#12C08A')}
    </>
  ),
  slots: (p) => (
    <>
      {sky(p, '#4A0C26', '#1A0414')}
      {stars(20, 3, '#FFD06B')}
      <Rect x={36} y={18} width={128} height={110} rx={18} fill="#FFB938" />
      <Path d="M50 18 Q100 -20 150 18 Z" fill="#E8304F" />
      <Rect x={46} y={40} width={108} height={58} rx={10} fill="#1A0414" />
      {[0, 1, 2].map((k) => (
        <G key={k}>
          <Rect x={52 + k * 34} y={46} width={30} height={46} rx={5} fill="#FFFFFF" />
          <SvgText x={67 + k * 34} y={80} fontSize={30} fontWeight="900" fill="#E8304F" textAnchor="middle">7</SvgText>
        </G>
      ))}
      <Rect x={166} y={40} width={8} height={50} rx={4} fill="#C9C4DA" />
      <Circle cx={170} cy={38} r={9} fill="#E8304F" />
      {[[22, 120], [178, 128], [60, 142], [140, 146]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={8} fill="#FFD06B" stroke="#C98B12" strokeWidth={2} />)}
    </>
  ),
  cascade: (p) => (
    <>
      {sky(p, '#FF8AC4', '#7B1FA2')}
      <Circle cx={160} cy={36} r={22} fill="#FFF3A0" opacity={0.9} />
      <Path d="M-10 120 Q50 70 110 110 T210 96 V240 H-10 Z" fill="#FF4FA3" />
      <Path d="M-10 140 Q60 110 120 136 T210 124 V240 H-10 Z" fill="#C2187A" />
      {[[40, 80, '#5BE3B0'], [150, 74, '#FFD06B']].map(([x, y, c], i) => (
        <G key={i}>
          <Rect x={Number(x) - 2} y={Number(y)} width={4} height={40} fill="#FFFFFF" />
          <Circle cx={Number(x)} cy={Number(y)} r={18} fill={String(c)} stroke="#FFFFFF" strokeWidth={3} />
          <Path d={`M${x} ${y} m0 -5 a5 5 0 1 1 -5 5 a10 10 0 1 0 10 -10`} stroke="#FFFFFF" strokeWidth={2.5} fill="none" />
        </G>
      ))}
      <Path d="M98 74 C84 62 82 52 90 49 C95 47 97 51 98 53 C99 51 101 47 106 49 C114 52 112 62 98 74 Z" fill="#E8183F" stroke="#FFFFFF" strokeWidth={2} />
      <Path d="M70 30 L74 39 L84 40 L76 46 L79 56 L70 50 L61 56 L64 46 L56 40 L66 39 Z" fill="#B98BFF" stroke="#FFFFFF" strokeWidth={1.5} />
      <Circle cx={124} cy={30} r={11} fill="#3D7BFF" stroke="#FFFFFF" strokeWidth={2} />
      <SvgText x={124} y={34} fontSize={9} fontWeight="900" fill="#FFFFFF" textAnchor="middle">×5</SvgText>
    </>
  ),
  fishing: (p) => (
    <>
      {sky(p, '#FFB36B', '#6FD0FF')}
      <Circle cx={150} cy={40} r={20} fill="#FFF3A0" opacity={0.95} />
      <Path d="M-10 92 L30 66 L60 86 L100 58 L140 84 L176 64 L210 88 V110 H-10 Z" fill="#2E8A6A" />
      <Rect x={0} y={100} width={200} height={140} fill="#1F7FC4" />
      {[110, 124, 140].map((y, i) => <Path key={i} d={`M${10 + i * 14} ${y} q10 -4 20 0 t20 0 M${110 - i * 10} ${y + 6} q10 -4 20 0 t20 0`} stroke="#9FD8FF" strokeWidth={2} fill="none" opacity={0.7} />)}
      {/* little boat with the fisherman and his rod */}
      <Path d="M24 98 L84 98 L76 112 L32 112 Z" fill="#8A4B1E" stroke="#5A2E10" strokeWidth={2} />
      <Circle cx={54} cy={78} r={7} fill="#FFD0A8" />
      <Path d="M44 72 L64 72 L60 66 L48 66 Z" fill="#FFD06B" />
      <Rect x={48} y={84} width={12} height={14} rx={3} fill="#E8304F" />
      <Path d="M60 88 L128 30" stroke="#5A2E10" strokeWidth={3} strokeLinecap="round" />
      <Path d="M128 30 Q140 60 136 104" stroke="#FFFFFF" strokeWidth={1} fill="none" />
      <Circle cx={136} cy={104} r={3.5} fill="#E8304F" stroke="#FFFFFF" strokeWidth={1.2} />
      {/* a jumping golden fish with a value tag */}
      <G transform="translate(150 70) rotate(-24)">
        <Path d="M-20 0 C-10 -14 12 -14 20 0 C12 14 -10 14 -20 0 Z" fill="#FFD06B" stroke="#FFFFFF" strokeWidth={2} />
        <Path d="M20 0 L32 -10 L32 10 Z" fill="#FFB938" stroke="#FFFFFF" strokeWidth={1.5} />
        <Circle cx={-11} cy={-3} r={2.5} fill="#231A3A" />
      </G>
      <Rect x={138} y={38} width={30} height={14} rx={7} fill="#231A3A" />
      <SvgText x={153} y={48} fontSize={9} fontWeight="900" fill="#FFD06B" textAnchor="middle">×50</SvgText>
      {[[170, 104], [180, 96], [186, 110]].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={2 + i} fill="none" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.8} />)}
    </>
  ),
  jade: (p) => (
    <>
      {sky(p, '#0E5E44', '#03221A')}
      {stars(14, 5, '#C8FFE6')}
      <Circle cx={40} cy={34} r={14} fill="#E8FFF3" opacity={0.85} />
      {/* stepped temple */}
      <Rect x={30} y={120} width={140} height={40} fill="#0B5E3E" />
      <Rect x={46} y={92} width={108} height={30} fill="#12C08A" />
      <Rect x={62} y={66} width={76} height={28} fill="#5BE3B0" />
      <Rect x={78} y={36} width={44} height={32} rx={4} fill="#FFD06B" stroke="#FFFFFF" strokeWidth={2} />
      <Rect x={86} y={45} width={10} height={6} rx={1} fill="#231A3A" />
      <Rect x={104} y={45} width={10} height={6} rx={1} fill="#231A3A" />
      <Rect x={92} y={57} width={16} height={4} rx={2} fill="#231A3A" />
      <Rect x={90} y={128} width={20} height={32} rx={3} fill="#021A12" />
      {[0, 1, 2].map((k) => <Rect key={k} x={92 - k * 2} y={122 + k * 6} width={16 + k * 4} height={3} fill="#3BE39A" opacity={0.6} />)}
      {/* jungle leaves */}
      <Path d="M-10 70 Q20 40 46 60 Q20 62 10 96 Z" fill="#1F9A5C" />
      <Path d="M210 66 Q180 36 152 58 Q180 60 190 94 Z" fill="#1F9A5C" />
      <Path d="M-10 150 Q30 120 50 150 Q24 150 6 180 Z" fill="#14804A" />
      <Path d="M210 150 Q170 122 150 150 Q176 150 194 180 Z" fill="#14804A" />
      <Path d="M140 0 Q146 30 136 60" stroke="#3BE39A" strokeWidth={2} fill="none" />
      <Circle cx={136} cy={62} r={4} fill="#FFD06B" />
    </>
  ),
  horses: (p) => (
    <>
      {sky(p, '#7FC8FF', '#CFEFFF')}
      <Circle cx={168} cy={28} r={14} fill="#FFF3A0" />
      <Rect x={0} y={44} width={200} height={34} fill="#3A2A7A" />
      {Array.from({ length: 40 }, (_, i) => <Circle key={i} cx={(i % 20) * 10 + 5 + (Math.floor(i / 20) % 2) * 5} cy={52 + Math.floor(i / 20) * 9} r={3} fill={['#FF4FA3', '#FFD06B', '#5BE3B0', '#FFFFFF'][i % 4]} />)}
      <Rect x={0} y={74} width={200} height={4} fill="#FFD06B" />
      <Rect x={0} y={78} width={200} height={170} fill="#1F9A5C" />
      {[0, 1, 2, 3].map((k) => <Rect key={k} x={k * 60 - 10} y={78} width={30} height={170} fill="#FFFFFF" opacity={0.06} />)}
      <Rect x={0} y={84} width={200} height={3} fill="#FFFFFF" />
      <G transform="translate(36 70) scale(1.25)">
        <Path d="M10 40 C8 30 18 28 28 30 L46 30 C54 29 60 33 62 40 C63 48 58 54 50 55 L24 55 C16 54 10 50 10 40 Z" fill="#8A4B1F" />
        <Path d="M46 32 C52 22 58 14 66 10 L72 14 C68 22 64 32 60 42 Z" fill="#8A4B1F" />
        <Path d="M64 8 C70 6 76 10 80 18 L76 22 L68 20 Z" fill="#8A4B1F" />
        <Path d="M10 38 C2 38 -4 46 -8 56 C0 50 4 48 10 46 Z" fill="#2B1A10" />
        <Path d="M50 54 L62 64 L70 66 M44 54 L52 70 M22 54 L10 64 L2 66 M28 54 L22 70" stroke="#5A3216" strokeWidth={4.5} strokeLinecap="round" fill="none" />
        <Path d="M30 30 C32 18 40 12 50 12 L54 18 C48 22 42 26 36 30 Z" fill="#FF4FA3" />
        <Circle cx={53} cy={8} r={5} fill="#F2C9A0" />
        <Path d="M48 7 C49 1 57 1 58 6 L60 7 L48 8 Z" fill="#FFD06B" />
        <Rect x={28} y={32} width={12} height={10} rx={2} fill="#FFFFFF" />
        <SvgText x={34} y={40} fontSize={8} fontWeight="900" fill="#231A3A" textAnchor="middle">7</SvgText>
      </G>
    </>
  ),
  crash: (p) => (
    <>
      {sky(p, '#1A0F4A', '#3B2399')}
      {stars(30, 5)}
      <Circle cx={160} cy={34} r={16} fill="#B9A6FF" />
      <Path d="M140 34 Q160 26 182 30" stroke="#FFD06B" strokeWidth={2.5} fill="none" />
      {city(150, '#140F2C', '#FFD06B')}
      <Path d="M10 150 Q80 140 130 64" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M10 150 Q80 140 130 64 L130 150 Z" fill="#A996FF" opacity={0.25} />
      <G transform="translate(132 60) rotate(-58) scale(2)">
        <Path d="M-15 -3.5 L-26 0 L-15 3.5 Z" fill="#FFB020" />
        <Path d="M-14 -5 L8 -5 Q18 0 8 5 L-14 5 Z" fill="#F4F2FA" />
        <Path d="M-14 -5 L-20 -11 L-10 -5 Z M-14 5 L-20 11 L-10 5 Z" fill="#FF4F7B" />
        <Circle cx={2} cy={0} r={2.6} fill="#3D7BFF" />
      </G>
      <SvgText x={40} y={60} fontSize={22} fontWeight="900" fill="#FFFFFF">3.47×</SvgText>
    </>
  ),
  dice: (p) => (
    <>
      {sky(p, '#7A4A00', '#2A1A00')}
      <Ellipse cx={100} cy={60} rx={140} ry={100} fill="#12804A" />
      <Path d="M-10 120 Q100 70 210 120" stroke="#FFD06B" strokeWidth={2} fill="none" opacity={0.5} />
      {die(72, 58, 52, -14, P5)}
      {die(132, 74, 46, 16, P6, '#FFD06B')}
      <SvgText x={100} y={140} fontSize={12} fontWeight="800" fill="#FFD06B" textAnchor="middle" opacity={0.7}>MENOS DE 50</SvgText>
    </>
  ),
  mines: (p) => (
    <>
      {sky(p, '#06403A', '#021A18')}
      {Array.from({ length: 16 }, (_, i) => {
        const x = 24 + (i % 4) * 40, y = 10 + Math.floor(i / 4) * 34;
        return <Rect key={i} x={x} y={y} width={34} height={28} rx={7} fill={i === 5 || i === 10 ? '#12C08A' : '#0E6B5E'} />;
      })}
      {gem(61, 62, 0.9, '#5BE3B0', '#12A07A')}
      {gem(101, 96, 0.9, '#5BE3B0', '#12A07A')}
      <G transform="translate(140 60)">
        <Circle r={14} fill="#1A1430" />
        <Path d="M6 -12 Q12 -22 20 -18" stroke="#C9A27A" strokeWidth={2.5} fill="none" />
        <Circle cx={21} cy={-18} r={4} fill="#FF8A3D" />
        <Circle cx={-4} cy={-4} r={4} fill="#FFFFFF" opacity={0.4} />
      </G>
    </>
  ),
  plinko: (p) => (
    <>
      {sky(p, '#4A0A3A', '#1A0414')}
      {Array.from({ length: 8 }, (_, r) => Array.from({ length: r + 3 }, (_, k) => <Circle key={`${r}-${k}`} cx={100 + (k - (r + 2) / 2) * 20} cy={16 + r * 16} r={3} fill="#FFFFFF" opacity={0.85} />))}
      <Circle cx={106} cy={58} r={7} fill="#FF4FA3" stroke="#FFFFFF" strokeWidth={2} />
      <Path d="M100 16 Q90 30 110 40 Q96 50 106 58" stroke="#FF8AC4" strokeWidth={2} strokeDasharray="3 3" fill="none" />
      {['#E8304F', '#FF8A3D', '#FFD06B', '#5BE3B0', '#FFD06B', '#FF8A3D', '#E8304F'].map((c, i) => <Rect key={i} x={30 + i * 20} y={146} width={18} height={14} rx={4} fill={c} />)}
    </>
  ),
  crossing: (p) => (
    <>
      {sky(p, '#7A5A00', '#2A1E00')}
      <Rect x={0} y={20} width={200} height={130} fill="#3A3A4A" />
      {[52, 86, 120].map((y) => <Path key={y} d={`M0 ${y} H200`} stroke="#FFFFFF" strokeWidth={3} strokeDasharray="14 10" />)}
      <Rect x={0} y={14} width={200} height={8} fill="#5BE3B0" />
      <Rect x={0} y={148} width={200} height={10} fill="#5BE3B0" />
      <G transform="translate(30 30)"><Rect width={46} height={18} rx={6} fill="#E8304F" /><Rect x={8} y={-8} width={26} height={10} rx={4} fill="#FF8A9A" /><Circle cx={10} cy={18} r={5} fill="#1A1430" /><Circle cx={36} cy={18} r={5} fill="#1A1430" /></G>
      <G transform="translate(130 96)"><Rect width={52} height={18} rx={6} fill="#2F6BFF" /><Rect x={10} y={-8} width={28} height={10} rx={4} fill="#9CD0FF" /><Circle cx={12} cy={18} r={5} fill="#1A1430" /><Circle cx={40} cy={18} r={5} fill="#1A1430" /></G>
      <G transform="translate(96 62)">
        <Ellipse cx={0} cy={6} rx={12} ry={11} fill="#FFFFFF" />
        <Circle cx={6} cy={-6} r={7} fill="#FFFFFF" />
        <Path d="M4 -14 l3 -4 2 4 3 -3 0 5z" fill="#E8304F" />
        <Path d="M12 -6 l6 2 -6 2z" fill="#FFB938" />
        <Circle cx={8} cy={-7} r={1.3} fill="#1A1430" />
      </G>
    </>
  ),
  limbo: (p) => (
    <>
      {sky(p, '#2A1A7A', '#0E0830')}
      {stars(24, 8)}
      <Path d="M0 160 L40 40 L60 160 Z" fill="#7B5CFF" opacity={0.5} />
      <Path d="M30 160 L100 10 L170 160 Z" fill="#A996FF" opacity={0.35} />
      <Path d="M120 160 L160 70 L200 160 Z" fill="#7B5CFF" opacity={0.5} />
      <Rect x={20} y={90} width={160} height={6} rx={3} fill="#FFD06B" />
      <SvgText x={100} y={74} fontSize={34} fontWeight="900" fill="#FFFFFF" textAnchor="middle">2.00×</SvgText>
    </>
  ),
  coinflip: (p) => (
    <>
      {sky(p, '#7A5A00', '#2A1A00')}
      {stars(14, 2, '#FFD06B')}
      <Path d="M30 120 Q60 20 100 60" stroke="#FFD06B" strokeWidth={2} strokeDasharray="4 5" fill="none" />
      <G transform="translate(110 64)">
        <Ellipse cx={4} cy={4} rx={42} ry={40} fill="rgba(0,0,0,0.3)" />
        <Ellipse rx={42} ry={40} fill="#C98B12" />
        <Ellipse rx={36} ry={34} fill="#FFD06B" />
        <Path d="M0 -20 L6 -6 L21 -6 L9 3 L13 18 L0 9 L-13 18 L-9 3 L-21 -6 L-6 -6 Z" fill="#C98B12" />
      </G>
      {chip(36, 132, 10, '#FFB938')}
    </>
  ),
  baccarat: (p) => (
    <>
      {sky(p, '#5A0A3E', '#1E0418')}
      <Path d="M100 0 V18" stroke="#E8C77A" strokeWidth={2} />
      <Path d="M70 30 Q100 50 130 30 L120 18 H80 Z" fill="#E8C77A" />
      {[76, 88, 100, 112, 124].map((x) => <Circle key={x} cx={x} cy={38} r={2.5} fill="#FFF3C4" />)}
      <Ellipse cx={100} cy={120} rx={130} ry={60} fill="#7A1450" />
      {card(56, 70, -10, '9', '♥', true, 0.9)}
      {card(104, 66, 8, '8', '♠', false, 0.9)}
      <Path d="M150 62 l6 -14 6 10 6 -10 6 14z" fill="#FFD06B" />
      <Rect x={150} y={62} width={24} height={6} rx={2} fill="#FFD06B" />
    </>
  ),
  hilo: (p) => (
    <>
      {sky(p, '#2A1A66', '#100A2A')}
      {card(54, 30, -6, '7', '♣', false, 1.3)}
      <Path d="M150 30 l18 22 h-11 v18 h-14 v-18 h-11z" fill="#5BE3B0" />
      <Path d="M150 130 l18 -22 h-11 v-18 h-14 v18 h-11z" fill="#FF5C7A" />
    </>
  ),
  keno: (p) => (
    <>
      {sky(p, '#06403A', '#021A18')}
      <Circle cx={100} cy={70} r={60} fill="#FFFFFF" opacity={0.12} stroke="#FFFFFF" strokeWidth={2} />
      {[[80, 60, '#FF4FA3', 7], [110, 50, '#FFD06B', 23], [96, 90, '#5BE3B0', 41], [126, 84, '#A996FF', 12], [70, 96, '#FF8A3D', 66]].map(([x, y, c, n], i) => (
        <G key={i}><Circle cx={Number(x)} cy={Number(y)} r={14} fill={String(c)} /><Circle cx={Number(x)} cy={Number(y)} r={8} fill="#FFFFFF" /><SvgText x={Number(x)} y={Number(y) + 4} fontSize={10} fontWeight="900" fill="#231A3A" textAnchor="middle">{n}</SvgText></G>
      ))}
    </>
  ),
  sicbo: (p) => (
    <>
      {sky(p, '#7A0A2A', '#2A0410')}
      {[30, 170].map((x) => <G key={x}><Path d={`M${x} 0 V16`} stroke="#FFD06B" /><Ellipse cx={x} cy={30} rx={14} ry={16} fill="#E8304F" /><Rect x={x - 8} y={12} width={16} height={4} fill="#FFD06B" /><Rect x={x - 8} y={44} width={16} height={4} fill="#FFD06B" /></G>)}
      {die(70, 84, 38, -10, P3)}
      {die(110, 72, 38, 8, P5)}
      {die(140, 100, 38, 20, P6)}
    </>
  ),
  trader: (p) => (
    <>
      {sky(p, '#06403A', '#021A18')}
      {city(160, '#0A2A26', '#5BE3B0')}
      {[[20, 110, 30, 1], [44, 90, 34, 0], [68, 96, 26, 1], [92, 70, 40, 1], [116, 60, 30, 0], [140, 40, 44, 1], [164, 24, 40, 1]].map(([x, y, h, up], i) => (
        <G key={i}><Path d={`M${x + 7} ${y - 8} V${y + h + 8}`} stroke={up ? '#5BE3B0' : '#FF5C7A'} strokeWidth={2} /><Rect x={x} y={y} width={14} height={h} rx={2} fill={up ? '#5BE3B0' : '#FF5C7A'} /></G>
      ))}
      <Path d="M10 130 L40 108 L70 112 L100 80 L130 76 L160 44 L190 30" stroke="#FFFFFF" strokeWidth={3} fill="none" />
    </>
  ),
  videopoker: (p) => (
    <>
      {sky(p, '#2A1A66', '#0E0830')}
      <Rect x={26} y={8} width={148} height={130} rx={16} fill="#4B2BD6" />
      <Rect x={36} y={18} width={128} height={70} rx={8} fill="#0E0830" />
      {[0, 1, 2, 3, 4].map((k) => <G key={k}><Rect x={42 + k * 24} y={34} width={21} height={32} rx={3} fill="#FFFFFF" /><SvgText x={52 + k * 24} y={56} fontSize={12} fontWeight="900" fill={k % 2 ? '#E8304F' : '#1A1430'} textAnchor="middle">{['A', 'A', 'K', 'K', 'A'][k]}</SvgText></G>)}
      <SvgText x={100} y={30} fontSize={8} fontWeight="800" fill="#FFD06B" textAnchor="middle">FULL HOUSE ×9</SvgText>
      {[0, 1, 2, 3, 4].map((k) => <Rect key={k} x={42 + k * 24} y={98} width={21} height={12} rx={4} fill="#FFD06B" />)}
    </>
  ),
  wheel: (p) => (
    <>
      {sky(p, '#7A5A00', '#2A1A00')}
      <G transform="translate(100 74)">
        <Circle r={66} fill="#FFD06B" />
        {Array.from({ length: 12 }, (_, i) => {
          const a1 = (i / 12) * Math.PI * 2, a2 = ((i + 1) / 12) * Math.PI * 2;
          return <Path key={i} d={`M0 0 L${Math.cos(a1) * 60} ${Math.sin(a1) * 60} A60 60 0 0 1 ${Math.cos(a2) * 60} ${Math.sin(a2) * 60} Z`} fill={['#FF4FA3', '#7B5CFF', '#12C08A', '#FF8A3D'][i % 4]} />;
        })}
        {Array.from({ length: 12 }, (_, i) => <Circle key={i} cx={Math.cos((i / 12) * Math.PI * 2) * 63} cy={Math.sin((i / 12) * Math.PI * 2) * 63} r={2.5} fill="#FFFFFF" />)}
        <Circle r={12} fill="#FFFFFF" />
      </G>
      <Path d="M92 0 L108 0 L100 18 Z" fill="#FFFFFF" />
    </>
  ),
  towers: (p) => (
    <>
      {sky(p, '#2A1A66', '#0E0830')}
      {stars(18, 6)}
      <Circle cx={40} cy={30} r={14} fill="#FFF3C4" />
      <Rect x={66} y={40} width={68} height={140} fill="#5A4A8A" />
      {[66, 82, 98, 114].map((x) => <Rect key={x} x={x} y={30} width={12} height={12} fill="#5A4A8A" />)}
      {[[78, 60], [104, 60], [78, 96], [104, 96], [78, 132], [104, 132]].map(([x, y], i) => <Rect key={i} x={x} y={y} width={18} height={24} rx={9} fill={i === 1 ? '#FFD06B' : '#2A1A4A'} />)}
      <G transform="translate(150 50)">
        <Path d="M0 20 C10 0 30 -6 44 4 L36 12 C28 6 18 10 12 22 Z" fill="#12C08A" />
        <Path d="M30 0 L36 -10 L40 2 Z M40 2 L48 -6 L48 6 Z" fill="#0B6E52" />
        <Circle cx={36} cy={6} r={2.5} fill="#FFD06B" />
        <Path d="M44 8 Q56 4 60 14 Q52 12 46 14 Z" fill="#FF8A3D" />
      </G>
    </>
  ),
  diamonds: (p) => (
    <>
      {sky(p, '#06403A', '#021A18')}
      <Path d="M0 30 L30 10 L60 34 L90 6 L130 30 L170 8 L200 26 V0 H0 Z" fill="#042A26" />
      {gem(60, 62, 1.6, '#5BE3B0', '#12A07A')}
      {gem(120, 52, 1.9, '#FF4FA3', '#B3127A')}
      {gem(160, 96, 1.2, '#FFD06B', '#C98B12')}
      {gem(40, 110, 1.1, '#A996FF', '#5A2BC9')}
      {gem(100, 112, 1.3, '#3D9BFF', '#1A5ACF')}
    </>
  ),
  pump: (p) => (
    <>
      {sky(p, '#FF8AC4', '#B3127A')}
      {[[40, 50, 26, '#FFD06B'], [100, 36, 38, '#FF4FA3'], [158, 60, 24, '#5BE3B0']].map(([x, y, r, c], i) => (
        <G key={i}>
          <Path d={`M${x} ${Number(y) + Number(r)} Q${Number(x) - 6} ${Number(y) + Number(r) + 30} ${x} ${Number(y) + Number(r) + 60}`} stroke="#FFFFFF" strokeWidth={1.5} fill="none" />
          <Ellipse cx={Number(x)} cy={Number(y)} rx={Number(r)} ry={Number(r) * 1.15} fill={String(c)} stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
          <Ellipse cx={Number(x) - Number(r) * 0.35} cy={Number(y) - Number(r) * 0.4} rx={Number(r) * 0.22} ry={Number(r) * 0.35} fill="#FFFFFF" opacity={0.5} />
        </G>
      ))}
    </>
  ),
  dragontiger: (p) => (
    <>
      <Rect x={0} y={0} width={100} height={240} fill="#B3127A" />
      <Rect x={100} y={0} width={100} height={240} fill="#C96A10" />
      <Path d="M100 0 L112 120 L100 240 L88 120 Z" fill="#FFD06B" />
      <SvgText x={50} y={86} fontSize={56} fontWeight="900" fill="#FFFFFF" opacity={0.9} textAnchor="middle">龍</SvgText>
      <SvgText x={150} y={86} fontSize={56} fontWeight="900" fill="#FFFFFF" opacity={0.9} textAnchor="middle">虎</SvgText>
      {card(28, 100, -10, 'K', '♥', true, 0.8)}
      {card(138, 100, 10, '9', '♠', false, 0.8)}
    </>
  ),
};

export const LIVE_SCENES: Record<'horses' | 'roulette' | 'crash', GameId> = { horses: 'horses', roulette: 'roulette', crash: 'crash' };

export const GameCover = React.memo(function GameCover({ id, width, height }: { id: GameId; width: number; height: number }) {
  const scene = SCENES[id];
  const p = `cv${id}`;
  return (
    <Svg width={width} height={height} viewBox="0 0 200 240" preserveAspectRatio="xMidYMin slice">
      {scene ? scene(p) : (
        <>
          <Defs>
            <RadialGradient id={`${p}r`} cx="0.5" cy="0.3" r="0.8"><Stop offset="0" stopColor="#3A2A7A" /><Stop offset="1" stopColor="#0E0830" /></RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={200} height={240} fill={`url(#${p}r)`} />
        </>
      )}
    </Svg>
  );
});
