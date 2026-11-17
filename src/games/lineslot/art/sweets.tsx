import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';
import { BOMB } from '@/engine/games/cascade.ts';
import { GameText, Glint, Gloss, dg, ol, rg } from './kit';

/** Bomb colour by value: the bigger the multiplier, the hotter the bomb. */
export const bombColor = (v: number) => (v >= 50 ? '#FF3B5C' : v >= 15 ? '#FF8A3D' : v >= 5 ? '#B06BFF' : '#3D9BFF');

/** Little sugar crystals sprinkled on a gummy. */
const sugar = (pts: [number, number][]) => pts.map(([x, y], k) => <Rect key={k} x={x} y={y} width={2.4} height={2.4} rx={0.6} fill="#FFFFFF" opacity={0.85} transform={`rotate(${k * 37} ${x + 1.2} ${y + 1.2})`} />);

/**
 * Dulce Cascada art: translucent gummy candies with a jelly glow, glossy highlights and sugar crystals,
 * a striped lollipop and fizzing multiplier bombs.
 */
export const SweetsArt = React.memo(function SweetsArt({ code, size }: { code: number; size: number }) {
  let body: React.ReactNode = null;
  if (code >= BOMB) {
    const v = code - BOMB;
    const c = bombColor(v);
    body = (
      <G>
        <Defs>
          {rg(`sb${c.slice(1)}`, ['#FFFFFF', c, '#14082A'], '0.36', '0.32', '0.78')}
        </Defs>
        <Path d="M64 20 C70 10 80 8 86 12" stroke="#3A2A1A" strokeWidth={6} fill="none" strokeLinecap="round" />
        <Path d="M64 20 C70 10 80 8 86 12" stroke="#D8B070" strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="3 2" />
        <Rect x={56} y={18} width={14} height={10} rx={3} fill="#4A4560" transform="rotate(35 63 23)" {...ol('#14101E', 2)} />
        <Circle cx={88} cy={11} r={7} fill="#FFF3A0" />
        {Array.from({ length: 6 }, (_, k) => <Path key={k} d="M88 11 L88 1" stroke="#FFD06B" strokeWidth={2.2} strokeLinecap="round" transform={`rotate(${k * 60} 88 11)`} />)}
        <Circle cx={46} cy={56} r={36} fill={`url(#sb${c.slice(1)})`} {...ol('#0A0418', 3)} />
        <Gloss d="M22 44 C26 32 36 24 48 23 C38 30 30 38 28 52 Z" o={0.7} />
        <GameText x={46} y={66} text={`×${v}`} size={v >= 100 ? 22 : 27} fill="#FFFFFF" stroke="#14082A" sw={4} />
      </G>
    );
  } else {
    switch (code) {
      case 0: // gummy heart
        body = (
          <G>
            <Defs>{rg('s0', ['#FFD0DC', '#FF2A5A', '#8A0024'], '0.35', '0.3', '0.8')}</Defs>
            <Path d="M50 90 C14 66 4 38 20 22 C32 10 46 18 50 28 C54 18 68 10 80 22 C96 38 86 66 50 90 Z" fill="url(#s0)" {...ol('#5A0018', 3)} />
            <Path d="M50 80 C24 62 18 42 28 30" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={6} fill="none" strokeLinecap="round" />
            <Gloss d="M22 34 C24 24 32 20 40 22 C32 26 28 32 28 42 Z" o={0.85} />
            {sugar([[60, 34], [70, 44], [44, 52], [58, 62], [34, 44]])}
            <Glint x={74} y={30} s={0.8} />
          </G>
        );
        break;
      case 1: // star candy
        body = (
          <G>
            <Defs>{rg('s1', ['#F0E0FF', '#9A5AFF', '#3A0A8A'], '0.4', '0.32', '0.8')}</Defs>
            <Path d="M50 6 L62 34 L92 36 L68 56 L76 88 L50 70 L24 88 L32 56 L8 36 L38 34 Z" fill="url(#s1)" {...ol('#24064A', 3)} strokeLinejoin="round" />
            <Path d="M50 20 L57 37 L50 56 L43 37 Z" fill="#FFFFFF" opacity={0.35} />
            <Gloss d="M34 38 C36 32 40 30 46 30 C42 34 40 38 40 44 Z" o={0.7} />
            {sugar([[60, 46], [44, 62], [30, 44], [64, 64]])}
            <Glint x={72} y={28} s={0.8} />
          </G>
        );
        break;
      case 2: // gumdrop
        body = (
          <G>
            <Defs>{rg('s2', ['#E0FFE8', '#2EE07A', '#0B7A3A'], '0.38', '0.3', '0.8')}</Defs>
            <Path d="M14 84 C12 44 28 14 50 14 C72 14 88 44 86 84 C70 90 30 90 14 84 Z" fill="url(#s2)" {...ol('#04401A', 3)} />
            <Path d="M18 80 C42 86 58 86 82 80" stroke="#04401A" strokeOpacity={0.3} strokeWidth={3} fill="none" />
            <Gloss d="M28 48 C30 30 38 22 48 20 C40 28 36 38 36 54 Z" o={0.8} />
            {sugar([[56, 30], [66, 46], [48, 44], [58, 62], [40, 66], [72, 66], [30, 60]])}
          </G>
        );
        break;
      case 3: // sugar cube candy
        body = (
          <G>
            <Defs>
              {dg('s3t', ['#E0F0FF', '#8AC4FF'])}
              {dg('s3l', ['#5A9AFF', '#1A4ACF'])}
              {dg('s3r', ['#3D7BFF', '#0A2A8A'])}
            </Defs>
            <Path d="M50 10 L88 28 L50 46 L12 28 Z" fill="url(#s3t)" {...ol('#0A1A5A', 2.8)} />
            <Path d="M12 28 L50 46 L50 90 L12 72 Z" fill="url(#s3l)" {...ol('#0A1A5A', 2.8)} />
            <Path d="M88 28 L50 46 L50 90 L88 72 Z" fill="url(#s3r)" {...ol('#0A1A5A', 2.8)} />
            <Path d="M50 16 L78 29 L50 42 L22 29 Z" fill="#FFFFFF" opacity={0.35} />
            {sugar([[24, 48], [34, 62], [62, 54], [72, 66], [40, 24], [60, 24]])}
            <Glint x={30} y={34} s={0.8} />
          </G>
        );
        break;
      case 4: // plum jelly
        body = (
          <G>
            <Defs>{rg('s4', ['#F0C8FF', '#A23ADF', '#40086A'], '0.36', '0.3', '0.8')}</Defs>
            <Path d="M50 22 C76 20 88 42 84 62 C80 82 64 90 50 90 C36 90 20 82 16 62 C12 42 24 20 50 22 Z" fill="url(#s4)" {...ol('#2A0448', 3)} />
            <Path d="M50 24 C46 44 46 68 50 88" stroke="#6A1A9A" strokeWidth={2.6} fill="none" />
            <Path d="M50 22 C50 12 56 6 62 6" stroke="#4A2A10" strokeWidth={4} fill="none" strokeLinecap="round" />
            <Path d="M56 12 C64 4 80 6 82 14 C72 20 62 18 56 12 Z" fill="#3BE39A" {...ol('#0B4A1A', 1.8)} />
            <Gloss d="M26 48 C28 36 36 28 44 27 C38 34 32 42 32 54 Z" o={0.75} />
            {sugar([[62, 44], [68, 60], [36, 64], [56, 72]])}
          </G>
        );
        break;
      case 5: // candy apple
        body = (
          <G>
            <Defs>{rg('s5', ['#FFC8C8', '#F0182A', '#7A0010'], '0.36', '0.32', '0.8')}</Defs>
            <Path d="M50 26 C40 14 14 18 14 46 C14 72 34 92 50 86 C66 92 86 72 86 46 C86 18 60 14 50 26 Z" fill="url(#s5)" {...ol('#4A0008', 3)} />
            <Path d="M50 26 C50 16 52 8 56 4" stroke="#4A2A10" strokeWidth={4} fill="none" strokeLinecap="round" />
            <Path d="M54 14 C62 6 78 8 80 16 C70 22 60 20 54 14 Z" fill="#3BE39A" {...ol('#0B4A1A', 1.8)} />
            <Gloss d="M24 40 C26 30 34 24 42 24 C34 30 30 38 30 50 Z" o={0.85} />
            <Ellipse cx={68} cy={66} rx={4} ry={7} fill="#FFFFFF" opacity={0.25} transform="rotate(30 68 66)" />
            <Glint x={70} y={34} s={0.8} />
          </G>
        );
        break;
      case 6: // watermelon gummy slice
        body = (
          <G>
            <Defs>{rg('s6', ['#FFE0E6', '#FF4F6A', '#B0103A'], '0.5', '0.2', '0.8')}</Defs>
            <Path d="M6 30 L94 30 C92 60 72 84 50 84 C28 84 8 60 6 30 Z" fill="#2EB04A" {...ol('#063A12', 3)} />
            <Path d="M12 30 L88 30 C86 56 68 76 50 76 C32 76 14 56 12 30 Z" fill="#F4FFE8" />
            <Path d="M16 30 L84 30 C82 52 66 70 50 70 C34 70 18 52 16 30 Z" fill="url(#s6)" />
            {[[30, 40], [44, 50], [56, 50], [70, 40], [50, 38]].map(([x, y], k) => <Ellipse key={k} cx={x} cy={y} rx={2.4} ry={3.8} fill="#2A0A14" />)}
            <Path d="M10 30 L90 30" stroke="#063A12" strokeWidth={3} />
            <Gloss d="M20 34 L56 34 C42 38 30 44 24 54 Z" o={0.45} />
            {sugar([[64, 56], [36, 60], [76, 36]])}
          </G>
        );
        break;
      case 7: // grape gummies
        body = (
          <G>
            <Defs>{rg('s7', ['#E0D8FF', '#7A4BFF', '#24104A'], '0.35', '0.3', '0.8')}</Defs>
            <Path d="M50 14 C50 8 54 4 58 4" stroke="#4A2A10" strokeWidth={3.5} fill="none" strokeLinecap="round" />
            {[[36, 26], [54, 24], [70, 30], [28, 44], [46, 42], [64, 44], [36, 60], [54, 60], [46, 76]].map(([x, y], k) => (
              <G key={k}>
                <Circle cx={x} cy={y} r={11} fill="url(#s7)" {...ol('#1A0838', 2.2)} />
                <Ellipse cx={x - 4} cy={y - 4} rx={3.4} ry={2.2} fill="#FFFFFF" opacity={0.75} transform={`rotate(-35 ${x - 4} ${y - 4})`} />
              </G>
            ))}
          </G>
        );
        break;
      case 8: // banana candy
        body = (
          <G>
            <Defs>{dg('s8', ['#FFFBD0', '#FFD82A', '#C29A00'], '0', '0', '0.3', '1')}</Defs>
            <Path d="M14 30 C14 64 44 86 86 74 C88 70 86 66 82 66 C50 72 30 56 26 30 C24 24 14 24 14 30 Z" fill="url(#s8)" {...ol('#6A5000', 3)} />
            <Path d="M22 34 C26 56 46 70 76 68" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={4} fill="none" strokeLinecap="round" />
            <Path d="M30 44 C36 58 50 66 66 66" stroke="#C29A00" strokeOpacity={0.45} strokeWidth={2} fill="none" />
            <Path d="M14 30 L12 22 L20 22 Z" fill="#6A4A10" {...ol('#3A2A08', 1.4)} />
            <Path d="M84 66 L92 72 L86 76 Z" fill="#3A2A08" />
            {sugar([[40, 58], [56, 70], [30, 48]])}
          </G>
        );
        break;
      default: // striped lollipop (scatter)
        body = (
          <G>
            <Defs>{rg('s9', ['#FFE0F0', '#FF4FA3', '#9A0A5A'], '0.38', '0.32', '0.8')}</Defs>
            <Rect x={45} y={58} width={10} height={40} rx={5} fill="#F4F2FA" {...ol('#8A84A0', 2)} />
            <Circle cx={50} cy={40} r={34} fill="url(#s9)" {...ol('#5A0034', 3)} />
            <Path d="M50 40 m0 -6 a6 6 0 1 1 -6 6 a12 12 0 1 0 12 -12 a18 18 0 1 1 -18 18 a24 24 0 1 0 24 -24" stroke="#FFFFFF" strokeWidth={5.5} fill="none" strokeLinecap="round" />
            <Gloss d="M24 30 C28 18 38 12 48 11 C38 18 32 26 30 38 Z" o={0.7} />
            <Path d="M40 62 C46 66 54 66 60 62 L56 70 L44 70 Z" fill="#7FE6FF" {...ol('#1A4ACF', 1.4)} />
            <Glint x={74} y={20} s={1} />
          </G>
        );
    }
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100">{body}</Svg>;
});
