import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { MAJOR, MINER, MINI, isNugget, nuggetValue } from '@/engine/games/goldmine.ts';
import { GameText, Glint, Gloss, Plaque, Ribbon, Shadow, dg, ol, rg, vg } from './kit';

/** A gold nugget (or a MINI / MAJOR gem-nugget) with its value plaque. */
export function NuggetArt({ value, size, text }: { value: number; size: number; text?: string }) {
  const jp = value === MINI ? 'MINI' : value === MAJOR ? 'MAJOR' : null;
  const tone = jp === 'MAJOR' ? ['#FFE0F0', '#FF4FA3', '#8A0A4A'] : jp ? ['#E0F8FF', '#3D9BFF', '#0A2A8A'] : ['#FFF8D0', '#FFC21C', '#9A5200'];
  const id = `mn${jp ?? 'g'}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>{rg(`${id}r`, tone, '0.35', '0.3', '0.8')}</Defs>
      <Shadow cy={74} rx={30} ry={4} />
      <Path d="M18 52 C10 38 20 18 38 18 C46 8 66 10 72 22 C86 26 90 46 80 56 C78 68 60 74 48 70 C34 74 20 66 18 52 Z" fill={`url(#${id}r)`} {...ol(tone[2], 3)} />
      {/* facets */}
      <Path d="M38 18 L44 36 L72 22 M44 36 L26 56 M44 36 L66 50 L80 56 M66 50 L48 70" stroke={tone[2]} strokeOpacity={0.35} strokeWidth={1.6} fill="none" />
      <Path d="M44 36 L66 50 L72 22 Z" fill="#FFFFFF" opacity={0.18} />
      <Gloss d="M28 30 C34 22 42 20 50 21 C42 26 36 30 32 38 Z" o={0.75} />
      <Glint x={64} y={28} s={0.9} />
      <Glint x={30} y={56} s={0.55} o={0.7} />
      <Plaque id={`${id}p`} text={jp ?? text ?? `×${value}`} colors={jp === 'MAJOR' ? ['#FF6AB8', '#A0126A'] : jp ? ['#5AB0FF', '#1A4ACF'] : ['#FFB938', '#9A5200']} dark={jp === 'MAJOR' ? '#4A0A2A' : jp ? '#0A1A5A' : '#4A2A00'} y={85} />
    </Svg>
  );
}

/** Mina de Oro symbols, drawn on a 100×100 artboard. */
export const MineArt = React.memo(function MineArt({ code, size, nuggetText }: { code: number; size: number; nuggetText?: string }) {
  if (isNugget(code)) return <NuggetArt value={nuggetValue(code)} size={size} text={nuggetText} />;
  let body: React.ReactNode = null;
  switch (code) {
    case 0: // pickaxe
      body = (
        <G>
          <Defs>
            {dg('m0h', ['#D8955A', '#8A4A1E', '#5A2E10'])}
            {dg('m0m', ['#FFFFFF', '#B8C4D8', '#5A6480'])}
          </Defs>
          <Shadow cy={90} rx={30} />
          <Path d="M22 88 L70 26" stroke="#3A1A08" strokeWidth={13} strokeLinecap="round" />
          <Path d="M22 88 L70 26" stroke="url(#m0h)" strokeWidth={9} strokeLinecap="round" />
          <Path d="M24 82 L66 28" stroke="#FFD0A0" strokeOpacity={0.45} strokeWidth={2} />
          <Path d="M26 78 l6 4 M34 68 l6 4" stroke="#5A2E10" strokeWidth={1.4} />
          <Path d="M10 34 C24 14 52 4 80 10 C92 12 96 18 92 22 C78 16 60 18 46 26 C36 32 26 42 18 52 C14 48 10 42 10 34 Z" fill="url(#m0m)" {...ol('#2A2440', 3)} />
          <Path d="M18 34 C30 20 52 12 74 14" stroke="#FFFFFF" strokeWidth={2} fill="none" strokeOpacity={0.8} />
          <Rect x={62} y={18} width={14} height={14} rx={3} fill="#4A4560" transform="rotate(-38 69 25)" {...ol('#1A1430', 1.6)} />
          <Glint x={86} y={14} s={0.8} />
        </G>
      );
      break;
    case 1: // shovel
      body = (
        <G>
          <Defs>
            {dg('m1h', ['#D8955A', '#8A4A1E'])}
            {dg('m1m', ['#E8F4FF', '#9AB0C8', '#4A5A78'])}
          </Defs>
          <Shadow cy={92} rx={22} />
          <Path d="M50 10 L50 52" stroke="#3A1A08" strokeWidth={11} strokeLinecap="round" />
          <Path d="M50 10 L50 52" stroke="url(#m1h)" strokeWidth={7} strokeLinecap="round" />
          <Path d="M36 8 C36 2 64 2 64 8 L62 14 L38 14 Z" fill="#E8304F" {...ol('#5A0A1A', 2.4)} />
          <Path d="M30 50 L70 50 L70 70 C70 84 58 92 50 92 C42 92 30 84 30 70 Z" fill="url(#m1m)" {...ol('#1A2440', 3)} />
          <Path d="M50 50 L50 86" stroke="#4A5A78" strokeWidth={1.6} strokeOpacity={0.6} />
          <Path d="M36 56 L38 76" stroke="#FFFFFF" strokeWidth={2.4} strokeOpacity={0.75} strokeLinecap="round" />
          <Path d="M58 80 C62 84 66 80 66 76" stroke="#8A5A2A" strokeWidth={4} strokeLinecap="round" opacity={0.6} />
          <Glint x={64} y={58} s={0.7} />
        </G>
      );
      break;
    case 2: // lantern
      body = (
        <G>
          <Defs>
            {rg('m2g', ['#FFFFFF', '#FFF3A0', '#FFB938', '#FF8A1C'], '0.5', '0.55', '0.6')}
            {rg('m2h', ['#FFE58A', '#FFB938'], '0.5', '0.5', '0.5')}
            {dg('m2m', ['#5A6480', '#2A2440'])}
          </Defs>
          <Circle cx={50} cy={52} r={44} fill="url(#m2h)" opacity={0.28} />
          <Shadow cy={92} rx={24} />
          <Path d="M38 14 C38 4 62 4 62 14" stroke="#2A2440" strokeWidth={4} fill="none" />
          <Path d="M32 16 L68 16 L64 26 L36 26 Z" fill="url(#m2m)" {...ol('#1A1430', 2.2)} />
          <Path d="M34 26 L66 26 L64 78 L36 78 Z" fill="url(#m2g)" {...ol('#7A4A00', 2.6)} />
          {[42, 50, 58].map((x) => <Path key={x} d={`M${x} 26 L${x} 78`} stroke="#2A2440" strokeWidth={2.4} />)}
          <Path d="M50 40 C56 48 56 56 50 62 C44 56 44 48 50 40 Z" fill="#FFFFFF" />
          <Path d="M50 46 C53 50 53 55 50 58 C47 55 47 50 50 46 Z" fill="#FFB938" />
          <Path d="M30 78 L70 78 L66 88 L34 88 Z" fill="url(#m2m)" {...ol('#1A1430', 2.2)} />
          <Gloss d="M37 30 L41 30 L41 72 L37 72 Z" o={0.5} />
          <Glint x={72} y={30} s={0.8} />
        </G>
      );
      break;
    case 3: // miner helmet with headlamp beam
      body = (
        <G>
          <Defs>
            {rg('m3h', ['#FFF3A0', '#FFC21C', '#C27A08'], '0.4', '0.3', '0.8')}
            {dg('m3b', ['#FFF6C4', '#FFF6C4'], '0', '0', '0', '1')}
            {rg('m3l', ['#FFFFFF', '#FFF3A0', '#FFB938'])}
          </Defs>
          <Shadow cy={88} rx={36} />
          <Path d="M58 30 L98 6 L98 54 Z" fill="#FFF6C4" opacity={0.28} />
          <Path d="M12 68 C12 36 28 20 50 20 C72 20 88 36 88 68 Z" fill="url(#m3h)" {...ol('#6A3A00', 3)} />
          <Path d="M50 20 L50 66" stroke="#C27A08" strokeWidth={6} opacity={0.5} />
          <Path d="M4 66 C20 60 80 60 96 66 L94 76 C78 72 22 72 6 76 Z" fill="#E0A010" {...ol('#6A3A00', 2.6)} />
          <Circle cx={50} cy={38} r={12} fill="#4A4560" {...ol('#1A1430', 2.4)} />
          <Circle cx={50} cy={38} r={8} fill="url(#m3l)" />
          <Path d="M46 34 L50 32" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          <Gloss d="M22 54 C24 38 34 28 46 25 C36 32 30 42 28 56 Z" o={0.55} />
          <Glint x={74} y={40} s={0.7} />
        </G>
      );
      break;
    case 4: // mine cart full of gold
      body = (
        <G>
          <Defs>
            {vg('m4c', ['#B05A2A', '#7A3A1A', '#4A1E08'])}
            {rg('m4g', ['#FFF8D0', '#FFC21C', '#9A5200'])}
            {dg('m4w', ['#9AA8C0', '#3A3550'])}
          </Defs>
          <Path d="M4 88 L96 88" stroke="#6A6480" strokeWidth={3} />
          {[[30, 36, 11], [48, 30, 13], [66, 36, 11], [40, 42, 9], [58, 42, 9]].map(([x, y, r], k) => (
            <G key={k}>
              <Circle cx={x} cy={y} r={r} fill="url(#m4g)" {...ol('#6A3A00', 2)} />
              <Circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.25} fill="#FFFFFF" opacity={0.7} />
            </G>
          ))}
          <Path d="M10 42 L90 42 L80 74 L20 74 Z" fill="url(#m4c)" {...ol('#2A0E04', 3)} />
          <Rect x={10} y={42} width={80} height={6} fill="#8A4A1E" {...ol('#2A0E04', 2)} />
          {[30, 50, 70].map((x) => <Path key={x} d={`M${x} 50 L${x - (x - 50) * 0.2} 72`} stroke="#2A0E04" strokeWidth={1.6} strokeOpacity={0.5} />)}
          {[[16, 46], [84, 46], [24, 70], [76, 70]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={1.8} fill="#C8C4D8" />)}
          <Circle cx={30} cy={80} r={8} fill="url(#m4w)" {...ol('#1A1430', 2.4)} />
          <Circle cx={70} cy={80} r={8} fill="url(#m4w)" {...ol('#1A1430', 2.4)} />
          <Circle cx={30} cy={80} r={2.4} fill="#1A1430" />
          <Circle cx={70} cy={80} r={2.4} fill="#1A1430" />
          <Glint x={78} y={26} s={0.9} />
        </G>
      );
      break;
    case 5: // dynamite with a lit fuse
      body = (
        <G>
          <Defs>
            {dg('m5d', ['#FF8A8A', '#E8183F', '#8A0A1A'], '0', '0', '1', '0')}
            {rg('m5s', ['#FFFFFF', '#FFF3A0', '#FF8A1C'], '0.5', '0.5', '0.5')}
          </Defs>
          <Shadow cy={92} rx={28} />
          {[22, 38, 54].map((x, k) => (
            <G key={x}>
              <Rect x={x} y={k === 1 ? 24 : 30} width={18} height={k === 1 ? 62 : 56} rx={6} fill="url(#m5d)" {...ol('#4A0410', 2.6)} />
              <Path d={`M${x + 4} ${k === 1 ? 30 : 36} L${x + 4} ${k === 1 ? 80 : 80}`} stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2.4} strokeLinecap="round" />
            </G>
          ))}
          <Rect x={18} y={52} width={58} height={10} rx={2} fill="#3A3550" {...ol('#1A1430', 2)} />
          <Rect x={18} y={52} width={58} height={3} fill="#6A6480" />
          <Path d="M47 24 C48 14 58 12 66 10" stroke="#3A3550" strokeWidth={3} fill="none" strokeLinecap="round" />
          <Circle cx={68} cy={10} r={9} fill="url(#m5s)" />
          {Array.from({ length: 8 }, (_, k) => <Path key={k} d="M68 10 L68 -2" stroke="#FFE58A" strokeWidth={2} strokeLinecap="round" transform={`rotate(${k * 45} 68 10)`} />)}
          <GameText x={47} y={45} text="TNT" size={10} fill="#FFF3C4" stroke="#4A0410" sw={2} />
        </G>
      );
      break;
    case 6: // stacked gold bars
      body = (
        <G>
          <Defs>
            {vg('m6t', ['#FFF8D0', '#FFD84D'])}
            {vg('m6f', ['#FFC21C', '#B06A08'])}
          </Defs>
          <Shadow cy={88} rx={40} />
          {[[8, 62], [48, 62], [28, 38]].map(([x, y], k) => (
            <G key={k}>
              <Polygon points={`${x + 8},${y} ${x + 36},${y} ${x + 44},${y + 22} ${x},${y + 22}`} fill="url(#m6f)" {...ol('#5A3200', 2.6)} />
              <Polygon points={`${x + 8},${y} ${x + 36},${y} ${x + 32},${y + 7} ${x + 12},${y + 7}`} fill="url(#m6t)" />
              <Path d={`M${x + 12} ${y + 12} L${x + 32} ${y + 12}`} stroke="#8A5200" strokeWidth={1.4} />
              <GameText x={x + 22} y={y + 19} text="999" size={6.5} fill="#FFF3C4" stroke="#8A5200" sw={1.2} />
            </G>
          ))}
          <Glint x={58} y={34} s={1} />
          <Glint x={22} y={58} s={0.6} />
        </G>
      );
      break;
    case MINER:
      body = (
        <G>
          <Defs>
            {rg('m7b', ['#FFD06B', '#C27A08', '#4A2A08'], '0.5', '0.35', '0.75')}
            {vg('m7h', ['#FFF3A0', '#FFC21C', '#C27A08'])}
            {vg('m7s', ['#FFDDBC', '#E8A878'])}
            {vg('m7o', ['#5A8AE0', '#2A4A9A'])}
          </Defs>
          <Circle cx={50} cy={46} r={42} fill="url(#m7b)" {...ol('#3A1E06', 3)} />
          {/* overalls */}
          <Path d="M18 90 C20 70 32 62 50 62 C68 62 80 70 82 90 Z" fill="url(#m7o)" {...ol('#14204A', 2.6)} />
          <Rect x={36} y={66} width={5} height={20} fill="#FFD06B" />
          <Rect x={59} y={66} width={5} height={20} fill="#FFD06B" />
          {/* face with moustache */}
          <Path d="M33 44 C33 30 67 30 67 44 C67 56 60 64 50 64 C40 64 33 56 33 44 Z" fill="url(#m7s)" {...ol('#7A3A1A', 2.4)} />
          <Path d="M38 54 C42 50 48 52 50 54 C52 52 58 50 62 54 C58 58 52 56 50 56 C48 56 42 58 38 54 Z" fill="#5A2E10" />
          <Circle cx={43} cy={45} r={2.4} fill="#1A1430" />
          <Circle cx={57} cy={45} r={2.4} fill="#1A1430" />
          <Circle cx={42.2} cy={44.2} r={0.9} fill="#FFFFFF" />
          <Circle cx={56.2} cy={44.2} r={0.9} fill="#FFFFFF" />
          <Ellipse cx={50} cy={50} rx={3.4} ry={2.6} fill="#E8987A" />
          <Path d="M40 60 Q50 64 60 60" stroke="#7A3A1A" strokeWidth={1.6} fill="none" />
          {/* helmet */}
          <Path d="M26 38 C26 22 36 14 50 14 C64 14 74 22 74 38 Z" fill="url(#m7h)" {...ol('#6A3A00', 2.6)} />
          <Path d="M20 38 L80 38 L78 43 L22 43 Z" fill="#E0A010" {...ol('#6A3A00', 2)} />
          <Circle cx={50} cy={26} r={6} fill="#FFFFFF" {...ol('#6A3A00', 2)} />
          <Circle cx={50} cy={26} r={3} fill="#FFF3A0" />
          <Gloss d="M32 26 C36 20 42 17 48 16 C42 20 38 26 36 32 Z" o={0.6} />
          <Ribbon id="m7r" text="WILD" colors={['#FF6A8A', '#C8103A']} dark="#5A0A1A" y={87} />
        </G>
      );
      break;
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100">{body}</Svg>;
});
