import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { PARROT } from '@/engine/games/pirate.ts';
import { GameText, Glint, Gloss, Ribbon, Shadow, dg, ol, rg, vg } from './kit';

/** Noche Pirata symbols, drawn on a 100×100 artboard. */
export const PirateArt = React.memo(function PirateArt({ code, size }: { code: number; size: number }) {
  let body: React.ReactNode = null;
  switch (code) {
    case 0: // anchor with rope
      body = (
        <G>
          <Defs>{dg('p0m', ['#E8F0FF', '#8A9AB8', '#3A4460'])}</Defs>
          <Shadow cy={92} rx={30} />
          <Circle cx={50} cy={14} r={8} fill="none" stroke="#1A2034" strokeWidth={8} />
          <Circle cx={50} cy={14} r={8} fill="none" stroke="url(#p0m)" strokeWidth={4.5} />
          <Path d="M50 22 L50 84 M32 32 L68 32" stroke="#1A2034" strokeWidth={12} strokeLinecap="round" />
          <Path d="M50 22 L50 84 M32 32 L68 32" stroke="url(#p0m)" strokeWidth={7.5} strokeLinecap="round" />
          <Path d="M14 60 C16 78 34 88 50 86 C66 88 84 78 86 60" stroke="#1A2034" strokeWidth={12} fill="none" strokeLinecap="round" />
          <Path d="M14 60 C16 78 34 88 50 86 C66 88 84 78 86 60" stroke="url(#p0m)" strokeWidth={7.5} fill="none" strokeLinecap="round" />
          <Polygon points="6,64 14,50 22,64" fill="url(#p0m)" {...ol('#1A2034', 2.4)} />
          <Polygon points="78,64 86,50 94,64" fill="url(#p0m)" {...ol('#1A2034', 2.4)} />
          {/* rope */}
          <Path d="M50 24 C70 26 74 46 56 50 C40 54 36 70 52 74" stroke="#5A3210" strokeWidth={6} fill="none" strokeLinecap="round" />
          <Path d="M50 24 C70 26 74 46 56 50 C40 54 36 70 52 74" stroke="#D8B070" strokeWidth={3.6} fill="none" strokeLinecap="round" strokeDasharray="4 2" />
          <Path d="M48 26 L48 80" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={1.6} />
          <Glint x={70} y={24} s={0.7} />
        </G>
      );
      break;
    case 1: // brass compass
      body = (
        <G>
          <Defs>
            {dg('p1b', ['#FFF3A0', '#E0A010', '#8A5200'])}
            {rg('p1f', ['#FFFBF0', '#F2DDB0'], '0.5', '0.4', '0.6')}
          </Defs>
          <Shadow cy={92} rx={30} />
          <Rect x={44} y={4} width={12} height={10} rx={3} fill="url(#p1b)" {...ol('#5A3200', 2.2)} />
          <Circle cx={50} cy={52} r={38} fill="url(#p1b)" {...ol('#4A2A00', 3)} />
          <Circle cx={50} cy={52} r={30} fill="url(#p1f)" {...ol('#8A5200', 2)} />
          {Array.from({ length: 16 }, (_, k) => <Path key={k} d={`M50 ${k % 4 ? 25 : 23} L50 ${k % 4 ? 28 : 30}`} stroke="#8A5200" strokeWidth={k % 4 ? 1.2 : 2} transform={`rotate(${k * 22.5} 50 52)`} />)}
          <Polygon points="50,26 56,52 50,78 44,52" fill="#3A3550" opacity={0.25} transform="rotate(45 50 52)" />
          <Polygon points="50,24 57,52 50,52" fill="#E8304F" />
          <Polygon points="50,24 43,52 50,52" fill="#A8102A" />
          <Polygon points="50,80 57,52 50,52" fill="#3A3550" />
          <Polygon points="50,80 43,52 50,52" fill="#1A1430" />
          <Circle cx={50} cy={52} r={4} fill="url(#p1b)" {...ol('#4A2A00', 1.6)} />
          <GameText x={50} y={38} text="N" size={8} fill="#E8304F" stroke="#FFFBF0" sw={1} />
          <Gloss d="M26 40 C30 30 38 24 48 22 C40 28 34 34 30 44 Z" o={0.55} />
          <Glint x={72} y={30} s={0.8} />
        </G>
      );
      break;
    case 2: // rum bottle
      body = (
        <G>
          <Defs>
            {dg('p2g', ['#9CE8A0', '#2E8A3A', '#0B4A1A'], '0', '0', '1', '0')}
            {vg('p2l', ['#FFF6E0', '#E8D0A0'])}
          </Defs>
          <Shadow cy={92} rx={24} />
          <Rect x={42} y={4} width={16} height={12} rx={3} fill="#8A4B1E" {...ol('#3A1A08', 2.2)} />
          <Path d="M42 16 L58 16 L58 28 C72 32 74 42 74 50 L74 84 C74 90 26 90 26 84 L26 50 C26 42 28 32 42 28 Z" fill="url(#p2g)" {...ol('#063A12', 3)} />
          <Path d="M30 52 L70 52 L70 76 L30 76 Z" fill="url(#p2l)" {...ol('#8A6A3A', 1.8)} />
          <GameText x={50} y={66} text="RUM" size={11} fill="#A8102A" stroke="#FFF6E0" sw={1.2} />
          <Path d="M36 70 L64 70" stroke="#8A6A3A" strokeWidth={1} />
          <Path d="M34 36 L34 82" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
          <Path d="M28 46 L72 46" stroke="#E0A010" strokeWidth={2.4} />
          <Glint x={66} y={40} s={0.7} />
        </G>
      );
      break;
    case 3: // treasure map scroll
      body = (
        <G>
          <Defs>
            {vg('p3p', ['#FFF6E0', '#F2DDB0', '#D8B070'])}
            {vg('p3r', ['#D8955A', '#8A4A1E'])}
          </Defs>
          <Shadow cy={90} rx={36} />
          <Path d="M14 18 L86 18 L86 78 L14 78 Z" fill="url(#p3p)" {...ol('#6A4A1E', 2.6)} />
          <Path d="M14 18 L86 18 M14 78 L86 78" stroke="#B08A50" strokeWidth={1.2} />
          {/* island, path and the X */}
          <Path d="M24 60 C22 48 34 44 40 48 C46 40 58 42 60 50 C68 50 72 58 66 64 C58 70 30 70 24 60 Z" fill="#9CD86A" {...ol('#4A6A1E', 1.6)} opacity={0.85} />
          <Path d="M20 32 C30 30 32 40 40 42 C48 44 50 52 56 56" stroke="#A8102A" strokeWidth={2.2} strokeDasharray="3 3" fill="none" />
          <Path d="M52 52 L60 60 M60 52 L52 60" stroke="#E8304F" strokeWidth={3.4} strokeLinecap="round" />
          <Path d="M70 26 L74 34 L70 32 L66 34 Z" fill="#3A3550" />
          <Path d="M24 30 Q28 28 30 32" stroke="#3D7BFF" strokeWidth={1.4} fill="none" opacity={0.7} />
          {/* rolled ends */}
          <Rect x={6} y={12} width={12} height={72} rx={6} fill="url(#p3r)" {...ol('#3A1A08', 2.4)} />
          <Rect x={82} y={12} width={12} height={72} rx={6} fill="url(#p3r)" {...ol('#3A1A08', 2.4)} />
          <Path d="M10 18 L10 78 M86 18 L86 78" stroke="#FFD0A0" strokeOpacity={0.5} strokeWidth={1.6} />
          <Glint x={78} y={24} s={0.6} />
        </G>
      );
      break;
    case 4: // cannon
      body = (
        <G>
          <Defs>
            {dg('p4b', ['#9AA0B8', '#3A3E50', '#14141E'], '0', '0', '0', '1')}
            {vg('p4w', ['#B06A2A', '#5A2E10'])}
          </Defs>
          <Shadow cy={90} rx={38} />
          <Path d="M8 34 L70 46 C78 47 80 58 72 60 L8 50 Z" fill="url(#p4b)" {...ol('#0A0A12', 3)} />
          <Ellipse cx={74} cy={53} rx={6} ry={9} fill="#2A2E40" {...ol('#0A0A12', 2.4)} />
          <Ellipse cx={75} cy={53} rx={3} ry={5.5} fill="#05050A" />
          {[24, 44].map((x) => <Path key={x} d={`M${x} ${36 + (x - 8) * 0.19} L${x} ${48 + (x - 8) * 0.16}`} stroke="#6A7090" strokeWidth={3} />)}
          <Path d="M12 38 L64 48" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2} />
          {/* wooden carriage */}
          <Path d="M16 52 L62 58 L58 74 L20 74 Z" fill="url(#p4w)" {...ol('#2A0E04', 2.6)} />
          <Circle cx={26} cy={78} r={10} fill="url(#p4w)" {...ol('#2A0E04', 2.6)} />
          <Circle cx={54} cy={78} r={10} fill="url(#p4w)" {...ol('#2A0E04', 2.6)} />
          <Circle cx={26} cy={78} r={3} fill="#E0A010" />
          <Circle cx={54} cy={78} r={3} fill="#E0A010" />
          {/* smoke puff */}
          <Circle cx={88} cy={44} r={7} fill="#E8E8F4" opacity={0.8} />
          <Circle cx={92} cy={34} r={5} fill="#E8E8F4" opacity={0.6} />
        </G>
      );
      break;
    case 5: // open treasure chest
      body = (
        <G>
          <Defs>
            {vg('p5w', ['#C27A3A', '#8A4A1E', '#5A2E10'])}
            {dg('p5g', ['#FFF3A0', '#E0A010', '#8A5200'])}
            {rg('p5c', ['#FFF8D0', '#FFC21C', '#9A5200'])}
          </Defs>
          <Shadow cy={92} rx={40} />
          <Path d="M12 40 C12 16 88 16 88 40 L88 44 L12 44 Z" fill="url(#p5w)" {...ol('#2A0E04', 2.8)} transform="rotate(-8 50 40)" />
          {/* glow and coins spilling */}
          <Ellipse cx={50} cy={46} rx={36} ry={12} fill="#FFE58A" opacity={0.6} />
          {[[30, 44], [42, 40], [56, 41], [68, 45], [36, 50], [50, 48], [62, 50]].map(([x, y], k) => (
            <G key={k}>
              <Circle cx={x} cy={y} r={7} fill="url(#p5c)" {...ol('#6A3A00', 1.6)} />
              <Circle cx={x} cy={y} r={4} fill="none" stroke="#C27A08" strokeWidth={1} />
            </G>
          ))}
          <Path d="M44 34 L50 26 L56 34 L50 40 Z" fill="#E8304F" {...ol('#5A0A1A', 1.6)} />
          <Path d="M12 50 L88 50 L84 88 L16 88 Z" fill="url(#p5w)" {...ol('#2A0E04', 3)} />
          <Path d="M14 60 L86 60 M16 74 L84 74" stroke="#2A0E04" strokeOpacity={0.4} strokeWidth={1.6} />
          {[20, 74].map((x) => <Rect key={x} x={x} y={50} width={6} height={38} fill="url(#p5g)" {...ol('#4A2A00', 1.4)} />)}
          <Rect x={42} y={54} width={16} height={16} rx={3} fill="url(#p5g)" {...ol('#4A2A00', 2)} />
          <Path d="M50 59 L50 66" stroke="#4A2A00" strokeWidth={2.6} strokeLinecap="round" />
          <Glint x={78} y={34} s={0.9} />
          <Glint x={24} y={38} s={0.6} />
        </G>
      );
      break;
    case 6: // galleon
      body = (
        <G>
          <Defs>
            {vg('p6h', ['#B06A2A', '#6A3410', '#3A1A08'])}
            {vg('p6s', ['#FFFFFF', '#E8E2D0', '#B8B0A0'])}
          </Defs>
          <Path d="M2 84 Q18 78 34 84 T66 84 T98 84 L98 96 L2 96 Z" fill="#1F5AA0" opacity={0.8} />
          {[30, 58].map((x, k) => (
            <G key={x}>
              <Path d={`M${x} ${10 + k * 6} L${x} 66`} stroke="#3A1A08" strokeWidth={3.5} />
              <Path d={`M${x - 16} ${16 + k * 6} Q${x} ${10 + k * 6} ${x + 16} ${16 + k * 6} L${x + 14} ${36 + k * 4} Q${x} ${32 + k * 4} ${x - 14} ${36 + k * 4} Z`} fill="url(#p6s)" {...ol('#6A6480', 1.8)} />
              <Path d={`M${x - 18} ${40 + k * 4} Q${x} ${34 + k * 4} ${x + 18} ${40 + k * 4} L${x + 16} ${58} Q${x} ${54} ${x - 16} ${58} Z`} fill="url(#p6s)" {...ol('#6A6480', 1.8)} />
            </G>
          ))}
          <Circle cx={30} cy={46} r={5} fill="#1A1430" />
          <Path d="M27 45 L33 47 M27 47 L33 45" stroke="#FFFFFF" strokeWidth={1.2} />
          <Path d="M58 6 L72 2 L58 0 Z" fill="#E8304F" />
          <Path d="M30 4 L42 2 L30 0 Z" fill="#1A1430" />
          <Path d="M6 64 L94 64 L84 84 C70 88 30 88 16 84 Z" fill="url(#p6h)" {...ol('#1A0804', 3)} />
          <Path d="M6 64 L94 64 L92 68 L8 68 Z" fill="#E0A010" />
          {[22, 36, 50, 64, 78].map((x) => <Circle key={x} cx={x} cy={74} r={3} fill="#1A0804" {...ol('#E0A010', 1)} />)}
          <Path d="M84 62 L98 54" stroke="#3A1A08" strokeWidth={3} />
          <Gloss d="M12 68 L60 68 L58 70 L14 70 Z" o={0.4} />
        </G>
      );
      break;
    case 7: // pirate captain
      body = (
        <G>
          <Defs>
            {rg('p7b', ['#8A7AFF', '#3D2BC9', '#14083A'], '0.5', '0.35', '0.75')}
            {vg('p7s', ['#FFDDBC', '#E8A878'])}
            {vg('p7c', ['#E8304F', '#8A0A1A'])}
            {vg('p7h', ['#3A3550', '#14101E'])}
          </Defs>
          <Circle cx={50} cy={48} r={42} fill="url(#p7b)" {...ol('#0A0420', 3)} />
          <Path d="M18 90 C20 70 32 62 50 62 C68 62 80 70 82 90 Z" fill="url(#p7c)" {...ol('#4A0410', 2.6)} />
          <Path d="M42 62 L50 72 L58 62" fill="#FFFFFF" {...ol('#9A94B0', 1.4)} />
          {[46, 54].map((x) => <Circle key={x} cx={x} cy={80} r={2} fill="#FFD06B" />)}
          <Path d="M33 44 C33 30 67 30 67 44 C67 56 60 64 50 64 C40 64 33 56 33 44 Z" fill="url(#p7s)" {...ol('#7A3A1A', 2.4)} />
          {/* beard */}
          <Path d="M34 50 C36 68 64 68 66 50 C62 58 56 60 50 60 C44 60 38 58 34 50 Z" fill="#2A1A10" {...ol('#14080A', 1.4)} />
          <Path d="M44 56 Q50 59 56 56" stroke="#E8987A" strokeWidth={2} fill="none" strokeLinecap="round" />
          {/* eye patch and eye */}
          <Path d="M32 38 L68 36" stroke="#14101E" strokeWidth={1.8} />
          <Ellipse cx={42} cy={45} rx={6} ry={5} fill="#14101E" />
          <Circle cx={58} cy={45} r={2.6} fill="#1A1430" />
          <Circle cx={57.2} cy={44.2} r={0.9} fill="#FFFFFF" />
          <Path d="M52 39 L63 40" stroke="#2A1A10" strokeWidth={2.2} strokeLinecap="round" />
          {/* tricorn hat */}
          <Path d="M14 36 C20 18 34 12 50 12 C66 12 80 18 86 36 C72 30 62 34 50 34 C38 34 28 30 14 36 Z" fill="url(#p7h)" {...ol('#05030A', 2.6)} />
          <Path d="M16 34 C30 28 70 28 84 34" stroke="#FFD06B" strokeWidth={2.4} fill="none" />
          <Circle cx={50} cy={22} r={5} fill="#FFFFFF" />
          <Path d="M46.5 25 L53.5 25 M48 26.5 L48 28 M52 26.5 L52 28" stroke="#1A1430" strokeWidth={1} />
          <Circle cx={48} cy={21.5} r={1.1} fill="#1A1430" />
          <Circle cx={52} cy={21.5} r={1.1} fill="#1A1430" />
          <Gloss d="M24 28 C30 20 38 16 46 15 C38 20 32 24 28 32 Z" o={0.35} />
          <Glint x={80} y={22} s={0.7} />
        </G>
      );
      break;
    case PARROT:
      body = (
        <G>
          <Defs>
            {rg('ppb', ['#7FFFD0', '#12A07A', '#04402A'], '0.5', '0.35', '0.75')}
            {dg('ppr', ['#FF8A6A', '#E8183F', '#8A0A1A'])}
            {vg('ppy', ['#FFF3A0', '#FFB938'])}
            {vg('ppk', ['#FFE58A', '#C27A08'])}
          </Defs>
          <Circle cx={50} cy={46} r={42} fill="url(#ppb)" {...ol('#022A1A', 3)} />
          {/* perch */}
          <Path d="M14 80 L86 74" stroke="#3A1A08" strokeWidth={7} strokeLinecap="round" />
          <Path d="M14 80 L86 74" stroke="#8A4A1E" strokeWidth={4} strokeLinecap="round" />
          {/* tail feathers */}
          <Path d="M36 70 C30 82 28 90 30 96 C38 90 42 82 44 72 Z" fill="#3D7BFF" {...ol('#0A1A5A', 2)} />
          <Path d="M42 72 C40 84 42 92 46 96 C50 88 50 80 48 72 Z" fill="url(#ppy)" {...ol('#7A4A00', 2)} />
          {/* body */}
          <Path d="M30 66 C22 50 26 28 44 20 C58 14 70 22 70 36 C70 54 60 70 44 74 C38 75 33 72 30 66 Z" fill="url(#ppr)" {...ol('#4A0410', 3)} />
          {/* wing */}
          <Path d="M36 44 C30 56 32 68 42 72 C50 66 54 54 52 42 C48 38 40 38 36 44 Z" fill="#3D7BFF" {...ol('#0A1A5A', 2)} />
          <Path d="M38 50 C42 52 46 52 50 50 M38 58 C42 60 46 60 50 58" stroke="url(#ppy)" strokeWidth={3} fill="none" />
          {/* face: white patch, eye, curved beak */}
          <Path d="M54 26 C62 24 68 30 66 38 C60 40 54 36 54 26 Z" fill="#FFFFFF" {...ol('#9A94B0', 1.2)} />
          <Circle cx={60} cy={31} r={3.6} fill="#1A1430" />
          <Circle cx={59} cy={30} r={1.2} fill="#FFFFFF" />
          <Path d="M66 32 C76 30 82 38 76 46 C74 42 70 40 66 40 Z" fill="url(#ppk)" {...ol('#4A2A00', 2.2)} />
          <Path d="M66 40 C70 42 72 44 72 46" stroke="#1A1430" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M48 18 C46 10 52 4 56 6 C54 10 54 14 52 18 Z" fill="url(#ppr)" {...ol('#4A0410', 1.6)} />
          <Gloss d="M34 40 C34 32 40 24 48 22 C42 28 38 34 38 44 Z" o={0.5} />
          {/* feet on the perch */}
          <Path d="M44 74 L42 79 M50 73 L50 78" stroke="#4A2A00" strokeWidth={2.6} strokeLinecap="round" />
          <Ribbon id="ppr2" text="WILD" colors={['#FF6A8A', '#C8103A']} dark="#5A0A1A" y={88} />
        </G>
      );
      break;
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100">{body}</Svg>;
});
