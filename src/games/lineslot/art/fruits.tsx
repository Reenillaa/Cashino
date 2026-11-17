import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path } from 'react-native-svg';
import { STAR, isWild, wildMult } from '@/engine/games/fruits.ts';
import { GameText, Glint, Gloss, Ribbon, Shadow, dg, ol, rg, vg } from './kit';

/** Fuego Frutal symbols, drawn on a 100×100 artboard: juicy, glossy, classic fruit-machine style. */
export const FruitArt = React.memo(function FruitArt({ code, size }: { code: number; size: number }) {
  let body: React.ReactNode = null;
  if (isWild(code)) {
    const m = wildMult(code);
    body = (
      <G>
        <Defs>
          {rg('qwf', ['#FFFFFF', '#FFF3A0', '#FFB938', '#FF5A1C', '#C0180A'], '0.5', '0.62', '0.62')}
          {rg('qwc', ['#FFF6C4', '#FFD06B'], '0.5', '0.4', '0.6')}
        </Defs>
        {/* outer flame tongues */}
        <Path d="M50 2 C56 14 70 14 72 30 C78 22 80 16 78 10 C92 24 94 50 86 66 C80 82 66 92 50 92 C34 92 20 82 14 66 C6 48 10 30 22 20 C22 30 26 34 30 36 C26 18 40 12 50 2 Z" fill="url(#qwf)" {...ol('#7A0A00', 3)} />
        <Path d="M50 26 C56 36 66 40 66 56 C66 70 58 78 50 78 C42 78 34 70 34 56 C34 46 42 42 44 34 C46 40 48 40 50 26 Z" fill="url(#qwc)" opacity={0.95} />
        <GameText x={50} y={66} text={`×${m}`} size={m >= 10 ? 22 : 26} fill="#FFFFFF" stroke="#9A1A00" sw={4} />
        <Glint x={30} y={34} s={0.8} />
        <Ribbon id="qwr" text="WILD" colors={['#FF6A8A', '#C8103A']} dark="#5A0A1A" y={88} w={62} />
      </G>
    );
  } else if (code === STAR) {
    body = (
      <G>
        <Defs>
          {rg('qsb', ['#FFFFFF', '#FFF3A0', '#FFC21C', '#C27A08'], '0.42', '0.36', '0.7')}
          {rg('qsh', ['#A996FF', '#3D2BC9'], '0.5', '0.5', '0.5')}
        </Defs>
        <Circle cx={50} cy={44} r={40} fill="url(#qsh)" opacity={0.6} />
        {Array.from({ length: 8 }, (_, k) => <Path key={k} d="M50 44 L48 8 L52 8 Z" fill="#FFFFFF" opacity={0.35} transform={`rotate(${k * 45 + 22} 50 44)`} />)}
        <Path d="M50 6 L60 32 L88 34 L66 52 L74 80 L50 64 L26 80 L34 52 L12 34 L40 32 Z" fill="url(#qsb)" {...ol('#6A3A00', 3)} />
        <Path d="M50 18 L56 34 L50 50 L44 34 Z" fill="#FFFFFF" opacity={0.45} />
        <Glint x={68} y={22} s={0.9} />
        <Ribbon id="qsr" text="FREE" colors={['#8A7AFF', '#3D2BC9']} dark="#1A0F6A" y={88} w={62} />
      </G>
    );
  } else {
    switch (code) {
      case 0: // cherries
        body = (
          <G>
            <Defs>
              {rg('qc', ['#FFB0C0', '#E8183F', '#7A0018'], '0.35', '0.3', '0.75')}
              {dg('qcl', ['#9CFF6A', '#2E8A3A'])}
            </Defs>
            <Shadow cy={90} rx={32} />
            <Path d="M30 54 C34 32 46 18 64 10 M68 58 C64 40 64 24 64 10" stroke="#3A1A08" strokeWidth={5} fill="none" strokeLinecap="round" />
            <Path d="M30 54 C34 32 46 18 64 10 M68 58 C64 40 64 24 64 10" stroke="#6AA02A" strokeWidth={3} fill="none" strokeLinecap="round" />
            <Path d="M64 10 C74 2 90 6 90 16 C78 22 68 18 64 10 Z" fill="url(#qcl)" {...ol('#0B4A1A', 2.2)} />
            <Path d="M66 11 C74 10 82 12 88 15" stroke="#0B4A1A" strokeWidth={1.2} fill="none" />
            <Circle cx={30} cy={66} r={19} fill="url(#qc)" {...ol('#4A0010', 3)} />
            <Circle cx={68} cy={70} r={19} fill="url(#qc)" {...ol('#4A0010', 3)} />
            <Gloss d="M18 60 C20 52 26 48 32 48 C26 52 22 58 22 66 Z" o={0.75} />
            <Gloss d="M56 64 C58 56 64 52 70 52 C64 56 60 62 60 70 Z" o={0.75} />
            <Glint x={40} y={58} s={0.6} />
          </G>
        );
        break;
      case 1: // lemon
        body = (
          <G>
            <Defs>{rg('ql', ['#FFFBD0', '#FFE03A', '#C29A00'], '0.38', '0.32', '0.8')}</Defs>
            <Shadow cy={84} rx={34} />
            <Path d="M10 50 C4 46 6 40 12 40 C20 24 36 18 50 18 C64 18 80 24 88 40 C94 40 96 46 90 50 C94 54 92 60 86 60 C78 74 64 82 50 82 C36 82 22 74 14 60 C8 60 6 54 10 50 Z" fill="url(#ql)" {...ol('#7A5A00', 3)} />
            {[[30, 36], [44, 30], [60, 32], [72, 44], [36, 60], [58, 66], [26, 50]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={1.2} fill="#C29A00" opacity={0.6} />)}
            <Path d="M50 18 C52 12 58 8 64 10 C60 14 56 16 50 18 Z" fill="#3BC24A" {...ol('#0B4A1A', 1.8)} />
            <Gloss d="M22 44 C26 32 38 26 50 25 C40 30 32 36 28 48 Z" o={0.7} />
            <Glint x={70} y={34} s={0.7} />
          </G>
        );
        break;
      case 2: // orange with a slice
        body = (
          <G>
            <Defs>
              {rg('qo', ['#FFD8A0', '#FF8A1C', '#B04A00'], '0.38', '0.32', '0.8')}
              {rg('qos', ['#FFF6E0', '#FFB938'], '0.5', '0.5', '0.6')}
            </Defs>
            <Shadow cy={90} rx={32} />
            <Circle cx={42} cy={50} r={32} fill="url(#qo)" {...ol('#6A2A00', 3)} />
            {[[30, 40], [46, 34], [54, 52], [36, 62], [24, 54]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={1.3} fill="#B04A00" opacity={0.55} />)}
            <Path d="M42 18 C46 10 54 8 60 12 C56 16 50 18 42 18 Z" fill="#3BC24A" {...ol('#0B4A1A', 1.8)} />
            <Gloss d="M20 40 C24 28 34 22 44 21 C36 26 28 32 26 44 Z" o={0.6} />
            {/* slice in front */}
            <Path d="M50 88 A26 26 0 0 1 98 70 Z" fill="#FF8A1C" {...ol('#6A2A00', 2.6)} />
            <Path d="M54 85 A21 21 0 0 1 93 71 Z" fill="url(#qos)" />
            {[0, 1, 2, 3].map((k) => <Path key={k} d={`M73.5 78 L${73.5 + Math.cos(Math.PI + 0.35 + k * 0.62) * 19} ${78 + Math.sin(Math.PI + 0.35 + k * 0.62) * 19 * 0.9}`} stroke="#FFFFFF" strokeWidth={1.6} transform="rotate(35 73.5 78)" />)}
          </G>
        );
        break;
      case 3: // plum
        body = (
          <G>
            <Defs>{rg('qp', ['#E0A8FF', '#8A3DCF', '#3A0A6A'], '0.36', '0.3', '0.8')}</Defs>
            <Shadow cy={90} rx={30} />
            <Path d="M50 20 C74 18 86 38 82 58 C78 78 62 88 50 88 C38 88 22 78 18 58 C14 38 26 18 50 20 Z" fill="url(#qp)" {...ol('#24083A', 3)} />
            <Path d="M50 22 C46 40 46 66 50 86" stroke="#5A1A9A" strokeWidth={2.4} fill="none" />
            <Path d="M50 20 C50 12 56 6 62 6" stroke="#5A2E10" strokeWidth={3.5} fill="none" strokeLinecap="round" />
            <Path d="M54 14 C62 6 78 8 80 16 C70 20 60 20 54 14 Z" fill="#3BC24A" {...ol('#0B4A1A', 1.8)} />
            <Gloss d="M26 46 C28 34 36 26 44 25 C38 32 32 40 32 52 Z" o={0.55} />
            <Glint x={66} y={36} s={0.6} />
          </G>
        );
        break;
      case 4: // grapes
        body = (
          <G>
            <Defs>{rg('qg', ['#C8B0FF', '#6A3DCF', '#24104A'], '0.35', '0.3', '0.8')}</Defs>
            <Shadow cy={92} rx={26} />
            <Path d="M50 16 C50 8 56 4 60 4" stroke="#5A2E10" strokeWidth={3.5} fill="none" strokeLinecap="round" />
            <Path d="M52 12 C60 2 80 4 84 14 C72 22 58 20 52 12 Z" fill="#3BC24A" {...ol('#0B4A1A', 1.8)} />
            <Path d="M58 12 C66 10 74 11 80 14" stroke="#0B4A1A" strokeWidth={1} fill="none" />
            {[[36, 28], [52, 26], [68, 30], [28, 44], [44, 42], [60, 42], [74, 46], [36, 58], [52, 58], [66, 60], [44, 72], [58, 74], [51, 86]].map(([x, y], k) => (
              <G key={k}>
                <Circle cx={x} cy={y} r={10} fill="url(#qg)" {...ol('#1A0838', 2.2)} />
                <Ellipse cx={x - 3.5} cy={y - 3.5} rx={3} ry={2} fill="#FFFFFF" opacity={0.6} transform={`rotate(-35 ${x - 3.5} ${y - 3.5})`} />
              </G>
            ))}
          </G>
        );
        break;
      case 5: // watermelon slice
        body = (
          <G>
            <Defs>
              {vg('qwr2', ['#3BC24A', '#0B5A2A'])}
              {rg('qwf2', ['#FFB0B8', '#FF4F6A', '#C8183A'], '0.5', '0.2', '0.8')}
            </Defs>
            <Shadow cy={86} rx={40} />
            <Path d="M4 28 L96 28 C94 58 74 80 50 80 C26 80 6 58 4 28 Z" fill="url(#qwr2)" {...ol('#063A12', 3)} />
            <Path d="M10 28 L90 28 C88 52 70 72 50 72 C30 72 12 52 10 28 Z" fill="#F4FFE0" />
            <Path d="M14 28 L86 28 C84 48 68 66 50 66 C32 66 16 48 14 28 Z" fill="url(#qwf2)" />
            {[[30, 38], [44, 46], [56, 46], [70, 38], [38, 56], [62, 56], [50, 36]].map(([x, y], k) => (
              <Path key={k} d={`M${x} ${y - 4} C${x + 3} ${y - 1} ${x + 2} ${y + 3} ${x} ${y + 4} C${x - 2} ${y + 3} ${x - 3} ${y - 1} ${x} ${y - 4} Z`} fill="#1A1430" />
            ))}
            <Path d="M10 28 L90 28" stroke="#063A12" strokeWidth={3} />
            {[[20, 64], [38, 76], [62, 76], [80, 64]].map(([x, y], k) => <Path key={k} d={`M${x} ${y - 4} L${x + 2} ${y + 3}`} stroke="#9CFF6A" strokeWidth={2} strokeOpacity={0.6} strokeLinecap="round" />)}
            <Gloss d="M18 32 L52 32 C40 36 28 40 22 48 Z" o={0.35} />
          </G>
        );
        break;
      case 6: // bell
        body = (
          <G>
            <Defs>
              {dg('qb', ['#FFF8D0', '#FFD84D', '#E0A010', '#9A6A00'], '0.1', '0', '0.9', '1')}
              {rg('qbc', ['#FFF3A0', '#C27A08'])}
            </Defs>
            <Shadow cy={92} rx={32} />
            <Circle cx={50} cy={10} r={5} fill="none" stroke="#7A4A00" strokeWidth={3} />
            <Path d="M50 14 C68 14 74 30 74 44 C74 58 78 66 88 74 L12 74 C22 66 26 58 26 44 C26 30 32 14 50 14 Z" fill="url(#qb)" {...ol('#5A3200', 3)} />
            <Path d="M10 74 L90 74 C90 80 86 82 80 82 L20 82 C14 82 10 80 10 74 Z" fill="#E0A010" {...ol('#5A3200', 2.6)} />
            <Circle cx={50} cy={86} r={7} fill="url(#qbc)" {...ol('#5A3200', 2.4)} />
            <Path d="M32 58 C32 46 34 30 44 22" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" strokeOpacity={0.7} />
            <Path d="M30 66 L70 66" stroke="#9A6A00" strokeWidth={1.6} strokeOpacity={0.6} />
            <Glint x={66} y={28} s={0.9} />
          </G>
        );
        break;
      case 7: // red seven
        body = (
          <G>
            <Defs>
              {dg('q7r', ['#FFB0B8', '#FF2A4A', '#A8001E'], '0', '0', '0.6', '1')}
              {dg('q7g', ['#FFF8D0', '#FFC21C', '#9A6A00'])}
            </Defs>
            <Shadow cy={92} rx={28} />
            <Path d="M14 10 L86 10 L86 26 C70 40 56 60 52 88 L28 88 C32 62 46 42 60 28 L32 28 L30 36 L14 36 Z" fill="url(#q7g)" {...ol('#4A2A00', 3)} />
            <Path d="M19 15 L81 15 L81 25 C66 38 52 58 47 83 L33 83 C37 60 50 42 66 24 L28 24 L26 31 L19 31 Z" fill="url(#q7r)" />
            <Path d="M22 18 L76 18" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={2.4} strokeLinecap="round" />
            <Path d="M58 30 C50 40 44 54 41 70" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={2.6} strokeLinecap="round" />
            <Glint x={78} y={14} s={0.9} />
            <Glint x={36} y={80} s={0.6} />
          </G>
        );
        break;
    }
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100">{body}</Svg>;
});
