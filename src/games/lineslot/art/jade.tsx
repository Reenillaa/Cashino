import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { IDOL } from '@/engine/games/jade.ts';
import { Glint, Gloss, Ribbon, Shadow, dg, ol, rg, vg } from './kit';

/** Templo de Jade symbols, drawn on a 100×100 artboard. */
export const JadeArt = React.memo(function JadeArt({ code, size }: { code: number; size: number }) {
  let body: React.ReactNode = null;
  switch (code) {
    case 0: // jungle leaf
      body = (
        <G>
          <Defs>{dg('j0l', ['#B8FF8A', '#3BC24A', '#0B6E32'], '0', '0', '1', '1')}</Defs>
          <Shadow cy={90} rx={26} />
          <Path d="M50 88 C50 70 48 56 50 44" stroke="#0B4A1A" strokeWidth={5} strokeLinecap="round" />
          <Path d="M50 46 C22 46 10 26 16 8 C34 6 52 14 58 30 C66 18 82 14 92 18 C92 38 78 52 50 46 Z" fill="url(#j0l)" {...ol('#063A1A', 3)} />
          <Path d="M50 46 C42 34 32 22 18 10 M50 46 C62 36 76 26 90 20" stroke="#0B5A2A" strokeWidth={2.4} fill="none" strokeLinecap="round" />
          {[[38, 34, 26, 36], [32, 26, 22, 22], [44, 40, 34, 46], [62, 38, 74, 42], [70, 30, 82, 30]].map(([a, b, c, d], k) => <Path key={k} d={`M${a} ${b} L${c} ${d}`} stroke="#0B5A2A" strokeWidth={1.4} strokeLinecap="round" />)}
          <Gloss d="M20 12 C30 12 40 18 44 26 C36 22 28 20 22 22 Z" o={0.55} />
          <Glint x={78} y={24} s={0.7} />
          <Circle cx={30} cy={40} r={2.6} fill="#E8FFFF" opacity={0.85} />
        </G>
      );
      break;
    case 1: // quetzal feather
      body = (
        <G>
          <Defs>{dg('j1f', ['#9CFFE8', '#12C08A', '#0B6EA0', '#3D2BC9'], '0', '0', '1', '1')}</Defs>
          <Shadow cy={90} rx={22} />
          <Path d="M24 88 C34 70 52 40 82 10" stroke="#E8E2D6" strokeWidth={3} strokeLinecap="round" />
          <Path d="M28 80 C30 56 50 30 82 10 C78 40 60 66 30 82 Z" fill="url(#j1f)" {...ol('#0A2A5A', 3)} />
          {Array.from({ length: 9 }, (_, k) => {
            const t = 0.12 + k * 0.09;
            const x = 28 + (82 - 28) * t, y = 80 - (80 - 10) * t;
            return <Path key={k} d={`M${x} ${y} l${-8 + k * 0.3} ${-4 - k * 0.3} M${x} ${y} l${7} ${6}`} stroke="#0A3A6A" strokeWidth={1.2} strokeOpacity={0.55} />;
          })}
          <Ellipse cx={66} cy={30} rx={6} ry={8} fill="#FFD06B" transform="rotate(40 66 30)" {...ol('#7A4A00', 1.6)} />
          <Ellipse cx={66} cy={30} rx={2.6} ry={3.6} fill="#3D2BC9" transform="rotate(40 66 30)" />
          <Gloss d="M34 70 C40 52 54 36 70 22 C58 38 46 54 38 72 Z" o={0.45} />
        </G>
      );
      break;
    case 2: // conch shell
      body = (
        <G>
          <Defs>
            {rg('j2s', ['#FFF4EC', '#FFC2B0', '#E07A6A'])}
            {vg('j2i', ['#FFE0D4', '#FF8A8A'])}
          </Defs>
          <Shadow cy={88} rx={30} />
          <Path d="M12 60 C10 36 34 14 60 18 C80 22 90 40 84 56 C80 70 64 82 46 84 L20 84 C26 76 18 70 12 60 Z" fill="url(#j2s)" {...ol('#8A3A2A', 3)} />
          <Path d="M24 70 C30 56 48 50 62 56 C70 60 72 70 64 76" fill="url(#j2i)" {...ol('#8A3A2A', 2.2)} />
          {[[22, 40, 46, 30], [26, 52, 56, 42], [36, 62, 70, 52], [48, 22, 70, 30]].map(([a, b, c, d], k) => <Path key={k} d={`M${a} ${b} Q${(a + c) / 2} ${b - 10} ${c} ${d}`} stroke="#C2624A" strokeWidth={2} fill="none" strokeLinecap="round" />)}
          {[[30, 30], [44, 22], [58, 20]].map(([x, y], k) => <Path key={k} d={`M${x} ${y} l-3 -7 l7 3 Z`} fill="#FFE0D4" {...ol('#8A3A2A', 1.4)} />)}
          <Gloss d="M30 30 C40 22 54 20 64 22 C52 26 42 30 34 38 Z" o={0.6} />
          <Glint x={74} y={36} s={0.7} />
        </G>
      );
      break;
    case 3: // jade amulet
      body = (
        <G>
          <Defs>
            {rg('j3j', ['#B8FFE0', '#12C08A', '#06603E'])}
            {dg('j3g', ['#FFF3A0', '#E0A010', '#8A5200'])}
          </Defs>
          <Shadow cy={92} rx={24} />
          <Path d="M30 8 C30 24 40 26 50 26 C60 26 70 24 70 8" stroke="#5A2E10" strokeWidth={3} fill="none" />
          <Circle cx={50} cy={58} r={32} fill="url(#j3g)" {...ol('#5A3200', 3)} />
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            return <Circle key={k} cx={50 + Math.cos(a) * 28} cy={58 + Math.sin(a) * 28} r={1.8} fill="#FFF3C4" {...ol('#8A5200', 0.8)} />;
          })}
          <Circle cx={50} cy={58} r={22} fill="url(#j3j)" {...ol('#04402A', 2.6)} />
          {/* carved glyph */}
          <Path d="M40 50 L60 50 L60 66 L48 66 L48 58 L54 58" stroke="#04402A" strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx={42} cy={64} r={2.4} fill="#04402A" />
          <Rect x={44} y={22} width={12} height={10} rx={3} fill="url(#j3g)" {...ol('#5A3200', 2)} />
          <Gloss d="M34 46 C38 40 44 37 50 36 C44 40 40 46 38 52 Z" o={0.6} />
          <Glint x={62} y={44} s={0.8} />
        </G>
      );
      break;
    case 4: // tribal drum
      body = (
        <G>
          <Defs>
            {vg('j4b', ['#D88A4A', '#9A4A1E', '#5A2A0A'])}
            {rg('j4t', ['#FFF6E0', '#E8D0A0', '#B89060'], '0.5', '0.4', '0.6')}
          </Defs>
          <Shadow cy={92} rx={28} />
          <Path d="M20 26 L80 26 L74 84 C64 90 36 90 26 84 Z" fill="url(#j4b)" {...ol('#3A1A08', 3)} />
          {/* zig-zag band */}
          <Path d="M22 48 L32 40 L42 48 L52 40 L62 48 L72 40 L79 46 L78 56 L70 50 L60 58 L50 50 L40 58 L30 50 L22 56 Z" fill="#12C08A" {...ol('#063A22', 1.6)} />
          <Path d="M26 68 L74 68" stroke="#FFD06B" strokeWidth={3} />
          <Path d="M27 74 L73 74" stroke="#E8304F" strokeWidth={2} />
          {/* cords */}
          {[30, 42, 58, 70].map((x) => <Path key={x} d={`M${x} 28 L${x + (x < 50 ? -2 : 2)} 40`} stroke="#F4E2C0" strokeWidth={1.6} />)}
          <Ellipse cx={50} cy={26} rx={31} ry={10} fill="url(#j4t)" {...ol('#3A1A08', 2.6)} />
          <Ellipse cx={50} cy={26} rx={20} ry={5.5} fill="none" stroke="#B89060" strokeWidth={1.2} />
          <Gloss d="M26 34 L32 34 L34 80 L30 80 Z" o={0.3} />
          <Glint x={66} y={22} s={0.6} />
        </G>
      );
      break;
    case 5: // jade mask
      body = (
        <G>
          <Defs>
            {rg('j5m', ['#B8FFE0', '#2EC48A', '#06603E'], '0.4', '0.3', '0.8')}
            {dg('j5g', ['#FFF3A0', '#E0A010'])}
          </Defs>
          <Shadow cy={92} rx={26} />
          {/* ear plugs */}
          <Circle cx={14} cy={48} r={8} fill="url(#j5g)" {...ol('#5A3200', 2.2)} />
          <Circle cx={86} cy={48} r={8} fill="url(#j5g)" {...ol('#5A3200', 2.2)} />
          <Path d="M20 22 C20 10 80 10 80 22 L82 56 C82 76 66 88 50 88 C34 88 18 76 18 56 Z" fill="url(#j5m)" {...ol('#04402A', 3)} />
          {/* brow band with gold inlays */}
          <Path d="M22 28 L78 28 L78 36 L22 36 Z" fill="#0B6E4A" {...ol('#04402A', 1.8)} />
          {[30, 42, 58, 70].map((x) => <Rect key={x} x={x - 3} y={29.5} width={6} height={5} rx={1} fill="url(#j5g)" />)}
          {/* eyes */}
          <Path d="M28 46 Q36 40 44 46 Q36 50 28 46 Z" fill="#FFFFFF" {...ol('#04402A', 2)} />
          <Path d="M56 46 Q64 40 72 46 Q64 50 56 46 Z" fill="#FFFFFF" {...ol('#04402A', 2)} />
          <Circle cx={36} cy={45.5} r={2.6} fill="#1A1430" />
          <Circle cx={64} cy={45.5} r={2.6} fill="#1A1430" />
          <Path d="M50 46 L46 62 L54 62 Z" fill="#0B6E4A" {...ol('#04402A', 1.8)} />
          <Path d="M36 72 Q50 66 64 72 Q50 80 36 72 Z" fill="#E8304F" {...ol('#5A0A1A', 2)} />
          <Path d="M40 72 L60 72" stroke="#FFFFFF" strokeWidth={2.2} strokeDasharray="3 2" />
          <Gloss d="M26 40 C28 30 36 24 46 22 C38 28 32 34 30 46 Z" o={0.45} />
          <Glint x={70} y={24} s={0.8} />
        </G>
      );
      break;
    case 6: // jaguar
      body = (
        <G>
          <Defs>
            {rg('j6f', ['#FFE0A0', '#FFA83A', '#C2620A'], '0.45', '0.4', '0.75')}
            {rg('j6m', ['#FFFFFF', '#F4E2C8'])}
            {rg('j6e', ['#E8FF8A', '#7AC22A'])}
          </Defs>
          <Shadow cy={92} rx={28} />
          <Path d="M18 30 L14 8 L36 20 Z" fill="url(#j6f)" {...ol('#5A2A00', 2.6)} />
          <Path d="M82 30 L86 8 L64 20 Z" fill="url(#j6f)" {...ol('#5A2A00', 2.6)} />
          <Path d="M20 16 L32 22 L22 26 Z M80 16 L68 22 L78 26 Z" fill="#FFB0A0" />
          <Path d="M14 46 C14 24 30 14 50 14 C70 14 86 24 86 46 C86 70 70 86 50 86 C30 86 14 70 14 46 Z" fill="url(#j6f)" {...ol('#5A2A00', 3)} />
          {/* rosettes */}
          {[[26, 34], [36, 24], [64, 24], [74, 34], [22, 54], [78, 54], [50, 22]].map(([x, y], k) => (
            <G key={k}>
              <Circle cx={x} cy={y} r={4.2} fill="none" stroke="#3A1A08" strokeWidth={2} strokeDasharray="4 2" />
              <Circle cx={x} cy={y} r={1.6} fill="#9A4A0A" />
            </G>
          ))}
          <Path d="M30 60 C30 50 42 46 50 50 C58 46 70 50 70 60 C70 74 60 80 50 80 C40 80 30 74 30 60 Z" fill="url(#j6m)" {...ol('#7A4A1A', 1.6)} />
          {/* eyes */}
          <Path d="M28 42 Q36 34 44 42 Q36 47 28 42 Z" fill="url(#j6e)" {...ol('#1A1430', 2)} />
          <Path d="M56 42 Q64 34 72 42 Q64 47 56 42 Z" fill="url(#j6e)" {...ol('#1A1430', 2)} />
          <Ellipse cx={36} cy={41.5} rx={1.4} ry={3.2} fill="#1A1430" />
          <Ellipse cx={64} cy={41.5} rx={1.4} ry={3.2} fill="#1A1430" />
          <Path d="M44 56 L56 56 L50 63 Z" fill="#3A1A08" />
          <Path d="M50 63 L50 67 M50 67 Q44 72 40 68 M50 67 Q56 72 60 68" stroke="#3A1A08" strokeWidth={2} fill="none" strokeLinecap="round" />
          {[[36, 64], [36, 68], [64, 64], [64, 68]].map(([x, y], k) => <Path key={k} d={`M${x} ${y} l${x < 50 ? -12 : 12} ${k % 2 ? 3 : -2}`} stroke="#5A4A3A" strokeWidth={1} />)}
          <Gloss d="M26 26 C34 18 44 16 52 16 C42 20 34 24 30 32 Z" o={0.45} />
        </G>
      );
      break;
    case 7: // feathered serpent
      body = (
        <G>
          <Defs>
            {dg('j7s', ['#B8FF8A', '#2EC44A', '#0B6E2A'])}
            {vg('j7c', ['#FF6A8A', '#E8304F'])}
          </Defs>
          <Shadow cy={92} rx={30} />
          {/* coil */}
          <Path d="M20 84 C6 74 14 56 34 58 C56 60 74 66 82 56 C90 44 72 36 58 42" stroke="#063A12" strokeWidth={18} fill="none" strokeLinecap="round" />
          <Path d="M20 84 C6 74 14 56 34 58 C56 60 74 66 82 56 C90 44 72 36 58 42" stroke="url(#j7s)" strokeWidth={13} fill="none" strokeLinecap="round" />
          <Path d="M20 84 C6 74 14 56 34 58 C56 60 74 66 82 56" stroke="#FFE58A" strokeWidth={3} fill="none" strokeDasharray="2 6" strokeLinecap="round" />
          {/* feather crest */}
          {[['#E8304F', -40], ['#FFB938', -15], ['#3D9BFF', 10], ['#12C08A', 35]].map(([c, r], k) => (
            <Path key={k} d="M46 30 C40 16 44 6 50 4 C54 12 54 22 48 30 Z" fill={String(c)} {...ol('#3A0A1A', 1.6)} transform={`rotate(${r} 48 32)`} />
          ))}
          {/* head */}
          <Path d="M36 40 C34 28 46 22 56 26 C66 30 66 42 58 46 C50 50 38 50 36 40 Z" fill="url(#j7s)" {...ol('#063A12', 2.8)} />
          <Circle cx={52} cy={34} r={4} fill="#FFE58A" {...ol('#063A12', 1.4)} />
          <Ellipse cx={52.5} cy={34} rx={1.2} ry={3} fill="#1A1430" />
          <Path d="M60 42 L72 44 L68 47 L72 50 L60 46" fill="url(#j7c)" {...ol('#5A0A1A', 1.2)} />
          <Path d="M40 44 L46 46" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          <Gloss d="M42 30 C46 26 52 25 56 26 C50 28 46 32 44 36 Z" o={0.55} />
        </G>
      );
      break;
    case 8: // explorer
      body = (
        <G>
          <Defs>
            {rg('j8b', ['#9CFFD8', '#2EC48A', '#0B5E3E'], '0.5', '0.3', '0.75')}
            {vg('j8h', ['#FFF0C8', '#D8B878', '#9A7A3A'])}
            {vg('j8s', ['#FFDDBC', '#E8A878'])}
            {vg('j8c', ['#C8A060', '#8A6A2A'])}
          </Defs>
          <Circle cx={50} cy={48} r={42} fill="url(#j8b)" {...ol('#04402A', 3)} />
          <Path d="M18 90 C20 70 32 62 50 62 C68 62 80 70 82 90 Z" fill="url(#j8c)" {...ol('#4A3210', 2.6)} />
          <Path d="M40 62 L50 76 L60 62" fill="#E8304F" {...ol('#5A0A1A', 1.8)} />
          <Path d="M34 46 C34 32 66 32 66 46 C66 58 58 66 50 66 C42 66 34 58 34 46 Z" fill="url(#j8s)" {...ol('#7A3A1A', 2.4)} />
          <Path d="M38 50 Q42 47 46 50 M54 50 Q58 47 62 50" stroke="#1A1430" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d="M42 58 Q50 63 58 58" stroke="#7A3A1A" strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M40 55 Q50 54 60 55" stroke="#6A3A1A" strokeWidth={2.6} strokeLinecap="round" />
          {/* pith helmet */}
          <Path d="M24 40 C24 20 36 12 50 12 C64 12 76 20 76 40 Z" fill="url(#j8h)" {...ol('#5A4210', 2.6)} />
          <Path d="M16 42 C30 36 70 36 84 42 C78 47 22 47 16 42 Z" fill="#C8A060" {...ol('#5A4210', 2.4)} />
          <Path d="M26 34 C40 31 60 31 74 34" stroke="#8A6A2A" strokeWidth={3} />
          <Gloss d="M32 22 C38 16 46 14 52 14 C44 18 38 24 36 30 Z" o={0.6} />
          <Glint x={78} y={18} s={0.8} />
        </G>
      );
      break;
    case IDOL:
      body = (
        <G>
          <Defs>
            {rg('jib', ['#FFF6C4', '#FFC21C', '#B06A08'], '0.5', '0.35', '0.8')}
            {rg('jir', ['#FFE58A', '#FFB938'], '0.5', '0.5', '0.5')}
            {rg('jie', ['#B8FFE0', '#12C08A', '#04402A'])}
          </Defs>
          {/* sun rays */}
          {Array.from({ length: 12 }, (_, k) => <Path key={k} d="M50 44 L46 4 L54 4 Z" fill="url(#jir)" opacity={0.85} transform={`rotate(${k * 30} 50 44)`} />)}
          <Circle cx={50} cy={44} r={34} fill="#3A2008" opacity={0.25} />
          {/* stepped headdress */}
          <Path d="M22 34 L22 22 L32 22 L32 14 L68 14 L68 22 L78 22 L78 34 Z" fill="url(#jib)" {...ol('#5A3200', 2.6)} />
          <Path d="M24 34 C24 64 32 76 50 76 C68 76 76 64 76 34 Z" fill="url(#jib)" {...ol('#5A3200', 3)} />
          <Path d="M32 22 L68 22" stroke="#8A5200" strokeWidth={1.6} />
          <Rect x={45} y={16} width={10} height={6} rx={1} fill="url(#jie)" {...ol('#04402A', 1.2)} />
          {/* emerald eyes */}
          <Path d="M32 44 L44 42 L44 50 L32 50 Z" fill="url(#jie)" {...ol('#04402A', 2)} />
          <Path d="M68 44 L56 42 L56 50 L68 50 Z" fill="url(#jie)" {...ol('#04402A', 2)} />
          <Circle cx={37} cy={45} r={1.4} fill="#FFFFFF" />
          <Circle cx={61} cy={45} r={1.4} fill="#FFFFFF" />
          <Path d="M50 48 L46 60 L54 60 Z" fill="#E0A010" {...ol('#5A3200', 1.6)} />
          <Path d="M38 66 L62 66 L58 70 L42 70 Z" fill="#5A3200" />
          <Path d="M40 66 L60 66" stroke="#FFF3C4" strokeWidth={1.5} strokeDasharray="2 2" />
          <Gloss d="M30 36 C32 30 38 28 44 28 C38 32 34 38 34 46 Z" o={0.6} />
          <Glint x={70} y={28} s={1} />
          <Ribbon id="jir2" text="WILD" colors={['#FF6A8A', '#C8103A']} dark="#5A0A1A" y={87} />
        </G>
      );
      break;
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100">{body}</Svg>;
});
