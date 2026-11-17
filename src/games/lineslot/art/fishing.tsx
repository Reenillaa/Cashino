import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { BOX, FISH, FISHER } from '@/engine/games/fishing.ts';
import { Glint, Gloss, Plaque, Ribbon, Shadow, dg, ol, rg, vg } from './kit';

/** Lago de Oro symbols, drawn on a 100×100 artboard. Fish carry their prize on a plaque. */
export const FishArt = React.memo(function FishArt({ code, size, fishText }: { code: number; size: number; fishText?: string }) {
  let body: React.ReactNode = null;
  if (code >= FISH) {
    body = (
      <G>
        <Defs>
          {dg('fxb', ['#FFF3A0', '#FFC21C', '#E07A10'], '0', '0', '0.4', '1')}
          {vg('fxf', ['#FFB938', '#E0560A'])}
          {rg('fxe', ['#FFFFFF', '#E8F4FF'])}
        </Defs>
        <Shadow cy={74} rx={32} ry={4} />
        {/* tail and fins behind the body */}
        <Path d="M74 40 C84 30 92 26 96 24 C92 36 92 46 96 58 C90 56 84 52 74 46 Z" fill="url(#fxf)" {...ol('#7A2A00', 2.6)} />
        <Path d="M80 31 L90 29 M80 41 L93 42 M80 50 L91 54" stroke="#9A3A00" strokeWidth={1.4} strokeOpacity={0.6} />
        <Path d="M42 20 C48 10 60 10 66 18 C60 20 54 22 48 26 Z" fill="url(#fxf)" {...ol('#7A2A00', 2.4)} />
        <Path d="M46 58 C50 66 58 68 62 64 C58 60 54 58 50 56 Z" fill="url(#fxf)" {...ol('#7A2A00', 2.2)} />
        {/* body */}
        <Path d="M8 42 C14 24 34 16 54 18 C68 20 76 32 78 43 C76 54 66 62 52 64 C32 66 14 58 8 42 Z" fill="url(#fxb)" {...ol('#7A2A00', 3)} />
        {/* shaded belly side and gill */}
        <Path d="M14 50 C26 62 48 64 64 58 C56 64 44 66 32 64 C24 62 18 58 14 50 Z" fill="#B85A00" opacity={0.45} />
        <Path d="M30 26 C36 34 36 48 30 56" stroke="#9A4A00" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        {/* scales */}
        {[[42, 30], [52, 30], [62, 34], [42, 40], [52, 40], [62, 44], [46, 50], [56, 51]].map(([x, y], k) => (
          <Path key={k} d={`M${x - 4} ${y} Q${x} ${y + 6} ${x + 4} ${y}`} stroke="#C2620A" strokeWidth={1.5} fill="none" strokeOpacity={0.75} />
        ))}
        {/* eye and mouth */}
        <Circle cx={20} cy={37} r={7} fill="url(#fxe)" {...ol('#7A2A00', 2)} />
        <Circle cx={19} cy={37} r={4} fill="#1A1430" />
        <Circle cx={17.5} cy={35.2} r={1.6} fill="#FFFFFF" />
        <Path d="M9 46 Q13 49 17 46" stroke="#7A2A00" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Gloss d="M24 24 C34 18 50 18 58 22 C48 22 36 24 28 30 Z" o={0.6} />
        <Glint x={64} y={26} s={0.8} />
        {fishText ? <Plaque id="fxp" text={fishText} colors={['#3BE39A', '#0B7A4A']} dark="#063A22" y={84} /> : null}
      </G>
    );
  } else if (code === FISHER) {
    body = (
      <G>
        <Defs>
          {rg('fwb', ['#7FE6FF', '#1FA7E0', '#0B4E7A'], '0.5', '0.35', '0.7')}
          {vg('fwh', ['#FFE58A', '#E0A010', '#9A6A00'])}
          {vg('fwj', ['#FFD06B', '#E0890A'])}
          {vg('fws', ['#FFDDBC', '#E8A878'])}
        </Defs>
        {/* badge */}
        <Circle cx={50} cy={46} r={42} fill="url(#fwb)" {...ol('#06283A', 3)} />
        <Circle cx={50} cy={46} r={37} fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2} />
        <Path d="M14 58 Q32 52 50 58 T86 58 L86 64 Q68 70 50 64 T14 64 Z" fill="#9FE8FF" opacity={0.5} />
        {/* yellow raincoat */}
        <Path d="M20 86 C22 66 34 58 50 58 C66 58 78 66 80 86 Z" fill="url(#fwj)" {...ol('#7A4A00', 2.6)} />
        <Path d="M50 60 L50 86" stroke="#9A5A00" strokeWidth={1.6} />
        <Circle cx={50} cy={68} r={1.8} fill="#7A4A00" />
        <Circle cx={50} cy={77} r={1.8} fill="#7A4A00" />
        {/* face */}
        <Path d="M33 42 C33 28 67 28 67 42 C67 54 60 62 50 62 C40 62 33 54 33 42 Z" fill="url(#fws)" {...ol('#7A3A1A', 2.4)} />
        <Path d="M34 46 C36 60 64 60 66 46 C62 54 56 56 50 56 C44 56 38 54 34 46 Z" fill="#F4F2FA" {...ol('#9A94B0', 1.4)} />
        <Path d="M42 50 Q50 46 58 50 Q50 53 42 50 Z" fill="#E8E2D6" />
        <Path d="M45 52 Q50 56 55 52" stroke="#7A3A1A" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Circle cx={43} cy={42} r={2.4} fill="#1A1430" />
        <Circle cx={57} cy={42} r={2.4} fill="#1A1430" />
        <Circle cx={42.2} cy={41.2} r={0.9} fill="#FFFFFF" />
        <Circle cx={56.2} cy={41.2} r={0.9} fill="#FFFFFF" />
        <Ellipse cx={39} cy={47} rx={3} ry={1.8} fill="#FF8A8A" opacity={0.5} />
        <Ellipse cx={61} cy={47} rx={3} ry={1.8} fill="#FF8A8A" opacity={0.5} />
        {/* sou'wester hat with fishing flies */}
        <Path d="M24 36 C24 22 34 14 50 14 C66 14 76 22 76 36 C68 32 32 32 24 36 Z" fill="url(#fwh)" {...ol('#7A4A00', 2.6)} />
        <Path d="M18 38 C30 30 70 30 82 38 C76 42 24 42 18 38 Z" fill="#E0A010" {...ol('#7A4A00', 2.4)} />
        <Path d="M66 20 L72 16 L70 24 Z" fill="#E8304F" {...ol('#7A0A1A', 1.2)} />
        <Path d="M62 22 L64 15" stroke="#3BE39A" strokeWidth={2} strokeLinecap="round" />
        <Gloss d="M32 22 C38 17 46 16 52 17 C44 19 38 22 34 27 Z" o={0.6} />
        <Ribbon id="fwr" text="WILD" colors={['#FF6A8A', '#C8103A']} dark="#5A0A1A" y={86} />
      </G>
    );
  } else if (code === BOX) {
    body = (
      <G>
        <Defs>
          {vg('fbb', ['#FF8A5A', '#E0401A', '#9A1A08'])}
          {vg('fbl', ['#FFB070', '#E06A2A'])}
          {vg('fbm', ['#F4F2FA', '#9A94B0'])}
        </Defs>
        <Shadow cy={80} rx={36} />
        {/* open lid behind */}
        <Path d="M16 34 L84 34 L78 12 L22 12 Z" fill="url(#fbl)" {...ol('#6A1A08', 2.6)} />
        <Path d="M24 16 L76 16 L80 30 L20 30 Z" fill="#7A2208" opacity={0.55} />
        {/* trays with lures */}
        <Rect x={14} y={30} width={72} height={14} rx={3} fill="#3A1A08" {...ol('#2A0A04', 2)} />
        {[[22, '#FFD06B'], [36, '#3BE39A'], [50, '#E8304F'], [64, '#7FE6FF'], [76, '#FFB938']].map(([x, c], k) => (
          <G key={k}>
            <Ellipse cx={Number(x)} cy={37} rx={4.5} ry={3} fill={String(c)} {...ol('#2A0A04', 1)} />
            <Circle cx={Number(x) - 2} cy={36.4} r={0.9} fill="#1A1430" />
          </G>
        ))}
        {/* box body */}
        <Path d="M12 42 L88 42 L84 78 L16 78 Z" fill="url(#fbb)" {...ol('#5A0A04', 3)} />
        <Path d="M16 50 L84 50" stroke="#FFB070" strokeOpacity={0.5} strokeWidth={1.6} />
        <Path d="M18 72 L82 72" stroke="#5A0A04" strokeOpacity={0.4} strokeWidth={2} />
        {/* latch and corner rivets */}
        <Rect x={42} y={46} width={16} height={14} rx={3} fill="url(#fbm)" {...ol('#4A4560', 2)} />
        <Circle cx={50} cy={53} r={2.4} fill="#4A4560" />
        {[[18, 46], [82, 46], [20, 74], [80, 74]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={2} fill="url(#fbm)" {...ol('#4A4560', 1)} />)}
        <Gloss d="M18 46 C30 44 40 44 46 45 L44 48 C34 48 26 48 18 50 Z" o={0.45} />
        <Glint x={78} y={16} s={0.9} />
        <Ribbon id="fbr" text="FREE" colors={['#8A7AFF', '#3D2BC9']} dark="#1A0F6A" y={86} />
      </G>
    );
  } else {
    switch (code) {
      case 0: // float (bobber) on the water
        body = (
          <G>
            <Defs>
              {rg('f0r', ['#FF8A9A', '#E8183F', '#8A0A1A'])}
              {rg('f0w', ['#FFFFFF', '#E8EEF8', '#9AA8C0'])}
              {vg('f0s', ['#FFE58A', '#E0A010'])}
            </Defs>
            <Ellipse cx={50} cy={82} rx={36} ry={7} fill="none" stroke="#7FE6FF" strokeWidth={2} opacity={0.55} />
            <Ellipse cx={50} cy={82} rx={24} ry={4.5} fill="none" stroke="#B8F1FF" strokeWidth={2} opacity={0.7} />
            <Rect x={46} y={6} width={8} height={24} rx={4} fill="url(#f0s)" {...ol('#7A4A00', 2.2)} />
            <Path d="M22 52 A28 28 0 0 1 78 52 Z" fill="url(#f0r)" />
            <Path d="M22 52 A28 28 0 0 0 78 52 Z" fill="url(#f0w)" />
            <Rect x={20} y={48} width={60} height={8} rx={4} fill="url(#f0s)" {...ol('#7A4A00', 2)} />
            <Circle cx={50} cy={52} r={28} fill="none" {...ol('#4A0A14', 3)} />
            <Path d="M50 80 L50 92" stroke="#E8EEF8" strokeWidth={2} />
            <Gloss d="M30 40 C32 32 40 26 48 25 C42 30 38 36 36 44 Z" o={0.7} />
            <Glint x={66} y={34} s={0.8} />
          </G>
        );
        break;
      case 1: // hook with a worm
        body = (
          <G>
            <Defs>{dg('f1m', ['#FFFFFF', '#B8C4D8', '#6A7490'])}</Defs>
            <Shadow cy={90} rx={22} />
            <Circle cx={56} cy={14} r={7} fill="none" stroke="#2A2440" strokeWidth={8} />
            <Circle cx={56} cy={14} r={7} fill="none" stroke="url(#f1m)" strokeWidth={4.5} />
            <Path d="M56 21 L56 64 C56 84 26 86 26 64 L26 56" stroke="#2A2440" strokeWidth={12} fill="none" strokeLinecap="round" />
            <Path d="M56 21 L56 64 C56 84 26 86 26 64 L26 56" stroke="url(#f1m)" strokeWidth={7} fill="none" strokeLinecap="round" />
            <Path d="M54 24 L54 62" stroke="#FFFFFF" strokeWidth={1.6} strokeOpacity={0.8} />
            <Path d="M26 52 L18 62 L30 60 Z" fill="url(#f1m)" {...ol('#2A2440', 2.2)} />
            {/* worm */}
            <Path d="M56 36 C70 32 74 44 62 46 C50 48 52 58 66 56" stroke="#9A1A4A" strokeWidth={10} fill="none" strokeLinecap="round" />
            <Path d="M56 36 C70 32 74 44 62 46 C50 48 52 58 66 56" stroke="#FF7AA8" strokeWidth={6.5} fill="none" strokeLinecap="round" />
            <Path d="M62 37 C66 37 68 39 68 41" stroke="#FFD0E0" strokeWidth={1.6} fill="none" strokeLinecap="round" />
            {[[60, 47], [57, 50], [64, 55]].map(([x, y], k) => <Path key={k} d={`M${x - 2} ${y - 2} L${x + 2} ${y + 2}`} stroke="#9A1A4A" strokeWidth={1.2} />)}
            <Glint x={30} y={72} s={0.7} />
          </G>
        );
        break;
      case 2: // spoon lure
        body = (
          <G>
            <Defs>
              {dg('f2b', ['#FFF6C4', '#FFC21C', '#C2620A'])}
              {dg('f2m', ['#FFFFFF', '#9AA8C0'])}
            </Defs>
            <Shadow cy={90} rx={24} />
            <Path d="M50 6 L50 14" stroke="#4A4560" strokeWidth={2.4} />
            <Circle cx={50} cy={16} r={3.5} fill="none" stroke="#4A4560" strokeWidth={2.2} />
            <Path d="M50 20 C70 24 74 48 66 64 C60 74 40 74 34 64 C26 48 30 24 50 20 Z" fill="url(#f2b)" {...ol('#7A3A00', 3)} />
            {[32, 42, 52].map((y, k) => <Path key={k} d={`M${36 + k} ${y} Q50 ${y + 6} ${64 - k} ${y}`} stroke="#E8304F" strokeWidth={3.5} fill="none" strokeLinecap="round" />)}
            <Circle cx={50} cy={28} r={4.5} fill="#FFFFFF" {...ol('#1A1430', 1.6)} />
            <Circle cx={50} cy={28} r={2.2} fill="#1A1430" />
            <Gloss d="M40 30 C42 24 46 22 50 22 C46 26 44 34 42 44 Z" o={0.65} />
            {/* treble hook */}
            <Path d="M50 72 L50 84 M50 84 C44 90 38 86 40 80 M50 84 C56 90 62 86 60 80" stroke="#2A2440" strokeWidth={5} fill="none" strokeLinecap="round" />
            <Path d="M50 72 L50 84 M50 84 C44 90 38 86 40 80 M50 84 C56 90 62 86 60 80" stroke="url(#f2m)" strokeWidth={2.6} fill="none" strokeLinecap="round" />
            <Glint x={62} y={40} s={0.7} />
          </G>
        );
        break;
      case 3: // reel
        body = (
          <G>
            <Defs>
              {rg('f3s', ['#E8F4FF', '#7AA8E0', '#2A4A9A'])}
              {dg('f3m', ['#FFFFFF', '#9AA8C0', '#4A5470'])}
            </Defs>
            <Shadow cy={88} rx={30} />
            <Path d="M30 78 L70 78 L64 86 L36 86 Z" fill="url(#f3m)" {...ol('#2A2440', 2.4)} />
            <Rect x={44} y={64} width={12} height={16} fill="url(#f3m)" {...ol('#2A2440', 2.2)} />
            <Circle cx={46} cy={42} r={30} fill="url(#f3s)" {...ol('#14204A', 3)} />
            <Circle cx={46} cy={42} r={20} fill="#3D7BFF" {...ol('#14204A', 2)} />
            {[0, 1, 2, 3, 4].map((k) => <Circle key={k} cx={46} cy={42} r={19 - k * 3} fill="none" stroke="#9AD4FF" strokeWidth={1} strokeOpacity={0.6} />)}
            <Circle cx={46} cy={42} r={6} fill="url(#f3m)" {...ol('#14204A', 2)} />
            {/* crank */}
            <Path d="M46 42 L78 28" stroke="#2A2440" strokeWidth={7} strokeLinecap="round" />
            <Path d="M46 42 L78 28" stroke="url(#f3m)" strokeWidth={4} strokeLinecap="round" />
            <Rect x={74} y={16} width={10} height={16} rx={5} fill="#E8304F" {...ol('#5A0A1A', 2.2)} />
            <Gloss d="M24 32 C28 22 38 16 48 15 C40 20 32 26 28 38 Z" o={0.6} />
            <Glint x={66} y={58} s={0.7} />
          </G>
        );
        break;
      case 4: // dragonfly
        body = (
          <G>
            <Defs>
              {dg('f4w', ['#E8FBFF', '#7FE6FF', '#3D9BFF'], '0', '0', '1', '0')}
              {vg('f4b', ['#5BE3B0', '#0B7A60'])}
              {rg('f4e', ['#7FE6FF', '#1A4ACF'])}
            </Defs>
            <Shadow cy={90} rx={24} />
            {/* wings */}
            {[['M48 36 C30 20 8 22 6 32 C10 42 32 42 48 38 Z', 0.85], ['M52 36 C70 20 92 22 94 32 C90 42 68 42 52 38 Z', 0.85], ['M48 44 C32 46 12 56 14 64 C22 68 40 56 48 46 Z', 0.75], ['M52 44 C68 46 88 56 86 64 C78 68 60 56 52 46 Z', 0.75]].map(([d, o], k) => (
              <G key={k}>
                <Path d={String(d)} fill="url(#f4w)" opacity={Number(o)} {...ol('#1A4A9A', 1.8)} />
                <Path d={String(d)} fill="none" stroke="#FFFFFF" strokeWidth={0.8} strokeOpacity={0.6} strokeDasharray="3 3" />
              </G>
            ))}
            {/* body */}
            <Path d="M50 30 C54 30 55 40 54 48 L52 86 C52 90 48 90 48 86 L46 48 C45 40 46 30 50 30 Z" fill="url(#f4b)" {...ol('#063A22', 2.4)} />
            {[52, 60, 68, 76].map((y) => <Path key={y} d={`M47 ${y} L53 ${y}`} stroke="#063A22" strokeWidth={1.4} />)}
            <Circle cx={44} cy={26} r={7} fill="url(#f4e)" {...ol('#0A1A4A', 2)} />
            <Circle cx={56} cy={26} r={7} fill="url(#f4e)" {...ol('#0A1A4A', 2)} />
            <Circle cx={42} cy={24} r={2} fill="#FFFFFF" />
            <Circle cx={54} cy={24} r={2} fill="#FFFFFF" />
            <Glint x={80} y={24} s={0.6} />
          </G>
        );
        break;
      case 5: // frog on a lily pad
        body = (
          <G>
            <Defs>
              {rg('f5b', ['#B8FF8A', '#3BC24A', '#14702A'])}
              {vg('f5p', ['#2E9A5A', '#0B5A32'])}
              {rg('f5e', ['#FFFFFF', '#DDE8D0'])}
            </Defs>
            <Path d="M8 76 C8 64 30 58 50 58 C70 58 92 64 92 76 C92 88 70 92 50 92 C38 92 30 90 24 88 L50 78 Z" fill="url(#f5p)" {...ol('#063A22', 2.4)} />
            <Path d="M30 84 Q50 76 72 86" stroke="#5BE3B0" strokeOpacity={0.5} strokeWidth={1.4} fill="none" />
            {/* legs */}
            <Path d="M22 72 C16 60 26 52 34 60 L30 72 Z" fill="#2E9A3A" {...ol('#0B4A1A', 2.2)} />
            <Path d="M78 72 C84 60 74 52 66 60 L70 72 Z" fill="#2E9A3A" {...ol('#0B4A1A', 2.2)} />
            {/* body */}
            <Path d="M24 60 C24 40 36 32 50 32 C64 32 76 40 76 60 C76 72 64 78 50 78 C36 78 24 72 24 60 Z" fill="url(#f5b)" {...ol('#0B4A1A', 3)} />
            <Path d="M34 62 C36 72 64 72 66 62 C62 68 38 68 34 62 Z" fill="#E8FFB8" opacity={0.7} />
            {/* eyes */}
            <Circle cx={36} cy={32} r={10} fill="url(#f5b)" {...ol('#0B4A1A', 2.6)} />
            <Circle cx={64} cy={32} r={10} fill="url(#f5b)" {...ol('#0B4A1A', 2.6)} />
            <Circle cx={36} cy={31} r={6.5} fill="url(#f5e)" />
            <Circle cx={64} cy={31} r={6.5} fill="url(#f5e)" />
            <Ellipse cx={37} cy={32} rx={3} ry={4} fill="#1A1430" />
            <Ellipse cx={63} cy={32} rx={3} ry={4} fill="#1A1430" />
            <Circle cx={35.5} cy={29.6} r={1.3} fill="#FFFFFF" />
            <Circle cx={61.5} cy={29.6} r={1.3} fill="#FFFFFF" />
            <Path d="M36 52 Q50 62 64 52" stroke="#0B4A1A" strokeWidth={2.4} fill="none" strokeLinecap="round" />
            <Ellipse cx={32} cy={50} rx={4} ry={2.4} fill="#FF8A8A" opacity={0.45} />
            <Ellipse cx={68} cy={50} rx={4} ry={2.4} fill="#FF8A8A" opacity={0.45} />
            <Gloss d="M32 42 C36 38 42 36 48 36 C42 40 38 44 36 50 Z" o={0.5} />
          </G>
        );
        break;
      case 6: // rowing boat
        body = (
          <G>
            <Defs>
              {vg('f6h', ['#C27A3A', '#8A4A1E', '#5A2E10'])}
              {vg('f6s', ['#FFFFFF', '#D8D4E8'])}
            </Defs>
            <Path d="M4 80 Q26 74 50 80 T96 80" stroke="#7FE6FF" strokeWidth={2.4} fill="none" opacity={0.7} />
            <Path d="M48 14 L48 62" stroke="#5A2E10" strokeWidth={4} strokeLinecap="round" />
            <Path d="M50 16 C70 24 74 46 52 58 Z" fill="url(#f6s)" {...ol('#6A6480', 2.2)} />
            <Path d="M54 24 L54 52" stroke="#E8304F" strokeWidth={3} />
            <Path d="M46 20 C32 28 30 46 44 56 Z" fill="url(#f6s)" opacity={0.9} {...ol('#6A6480', 2)} />
            <Path d="M48 12 L62 8 L48 4 Z" fill="#E8304F" {...ol('#7A0A1A', 1.6)} />
            <Path d="M8 58 L92 58 L80 80 C70 84 30 84 20 80 Z" fill="url(#f6h)" {...ol('#3A1A08', 3)} />
            <Path d="M14 66 L86 66 M18 73 L82 73" stroke="#3A1A08" strokeOpacity={0.45} strokeWidth={1.6} />
            <Path d="M8 58 L92 58 L90 62 L10 62 Z" fill="#F4E2C0" {...ol('#3A1A08', 1.6)} />
            {[24, 38, 62, 76].map((x) => <Circle key={x} cx={x} cy={70} r={1.4} fill="#3A1A08" />)}
            <Gloss d="M16 62 L60 62 L58 64 L18 64 Z" o={0.45} />
            <Glint x={70} y={22} s={0.7} />
          </G>
        );
        break;
      case 7: // fishing rod with line and bobber
        body = (
          <G>
            <Defs>
              {dg('f7r', ['#5A6A9A', '#14204A'])}
              {vg('f7c', ['#E8C08A', '#B07A3A'])}
              {dg('f7m', ['#FFFFFF', '#9AA8C0', '#4A5470'])}
            </Defs>
            <Shadow cy={90} rx={30} />
            <Path d="M86 12 C86 40 82 60 76 72" stroke="#E8EEF8" strokeWidth={1.2} fill="none" strokeDasharray="2 2" />
            <Circle cx={76} cy={76} r={5} fill="#E8183F" {...ol('#5A0A1A', 1.6)} />
            <Path d="M71 76 A5 5 0 0 0 81 76 Z" fill="#FFFFFF" />
            <Path d="M14 86 L86 12" stroke="#0A1030" strokeWidth={8} strokeLinecap="round" />
            <Path d="M14 86 L86 12" stroke="url(#f7r)" strokeWidth={5} strokeLinecap="round" />
            {[[62, 36], [72, 26], [80, 18]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={2.6} fill="none" stroke="url(#f7m)" strokeWidth={1.8} />)}
            <Path d="M14 86 L34 66" stroke="#5A3210" strokeWidth={11} strokeLinecap="round" />
            <Path d="M14 86 L34 66" stroke="url(#f7c)" strokeWidth={8} strokeLinecap="round" />
            {[0, 1, 2, 3].map((k) => <Path key={k} d={`M${18 + k * 4.5} ${78 - k * 4.5} l3 3`} stroke="#8A5A2A" strokeWidth={1.2} />)}
            <Circle cx={38} cy={62} r={9} fill="url(#f7m)" {...ol('#2A2440', 2.4)} />
            <Circle cx={38} cy={62} r={4} fill="#3D7BFF" {...ol('#14204A', 1.4)} />
            <Path d="M38 62 L46 70" stroke="#2A2440" strokeWidth={3} strokeLinecap="round" />
            <Path d="M30 54 L80 14" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.2} />
            <Glint x={58} y={70} s={0.7} />
          </G>
        );
        break;
    }
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100">{body}</Svg>;
});
