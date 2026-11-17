import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import type { SlotSymbol } from '@/engine/games/slots.ts';
import { GameText, Glint, Gloss, Shadow, dg, ol, rg, vg } from './kit';

/** The classic three-reel machine, in vintage Las Vegas style: chrome, gold and ruby. */
export function ClassicArt({ sym, size = 56 }: { sym: SlotSymbol; size?: number }) {
  let body: React.ReactNode = null;
  switch (sym) {
    case 'cherry':
      body = (
        <G>
          <Defs>
            {rg('kc', ['#FFC0CC', '#F01840', '#6A0010'], '0.35', '0.3', '0.75')}
            {dg('kcl', ['#B8FF8A', '#2E8A3A'])}
          </Defs>
          <Shadow cy={91} rx={34} />
          <Path d="M28 56 C30 34 44 18 62 8 M70 60 C66 40 64 22 62 8" stroke="#2A1A08" strokeWidth={6} fill="none" strokeLinecap="round" />
          <Path d="M28 56 C30 34 44 18 62 8 M70 60 C66 40 64 22 62 8" stroke="#7AB02A" strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <Path d="M62 8 C70 0 90 2 92 12 C80 20 68 18 62 8 Z" fill="url(#kcl)" {...ol('#0B4A1A', 2.2)} />
          <Path d="M64 9 C74 8 84 10 90 12" stroke="#0B4A1A" strokeWidth={1.2} fill="none" />
          <Circle cx={28} cy={68} r={20} fill="url(#kc)" {...ol('#3A0008', 3)} />
          <Circle cx={70} cy={72} r={20} fill="url(#kc)" {...ol('#3A0008', 3)} />
          <Gloss d="M15 62 C17 52 24 48 31 48 C24 53 20 60 20 69 Z" o={0.8} />
          <Gloss d="M57 66 C59 56 66 52 73 52 C66 57 62 64 62 73 Z" o={0.8} />
          <Glint x={40} y={58} s={0.6} />
          <Glint x={82} y={62} s={0.5} />
        </G>
      );
      break;
    case 'lemon':
      body = (
        <G>
          <Defs>{rg('kl', ['#FFFDE0', '#FFE83A', '#B89000'], '0.38', '0.3', '0.8')}</Defs>
          <Shadow cy={86} rx={36} />
          <Path d="M8 52 C2 48 4 42 10 41 C18 24 34 18 50 18 C66 18 82 24 90 41 C96 42 98 48 92 52 C96 56 94 62 88 62 C80 76 66 84 50 84 C34 84 20 76 12 62 C6 62 4 56 8 52 Z" fill="url(#kl)" {...ol('#6A5000', 3)} />
          {[[28, 34], [42, 28], [60, 30], [74, 42], [34, 64], [58, 68], [22, 50], [78, 58]].map(([x, y], k) => <Circle key={k} cx={x} cy={y} r={1.4} fill="#B89000" opacity={0.55} />)}
          <Path d="M50 18 C52 10 60 6 66 9 C62 14 56 16 50 18 Z" fill="#3BC24A" {...ol('#0B4A1A', 1.8)} />
          <Gloss d="M20 44 C24 32 36 26 50 25 C40 30 30 36 26 48 Z" o={0.75} />
          <Glint x={72} y={34} s={0.8} />
        </G>
      );
      break;
    case 'bell':
      body = (
        <G>
          <Defs>
            {dg('kb', ['#FFFBE0', '#FFD84D', '#E09A10', '#7A4A00'], '0.1', '0', '0.9', '1')}
            {rg('kbc', ['#FFF3A0', '#B06A08'])}
          </Defs>
          <Shadow cy={93} rx={34} />
          <Path d="M44 10 C44 4 56 4 56 10" stroke="#6A3A00" strokeWidth={4} fill="none" />
          <Path d="M50 12 C70 12 76 30 76 44 C76 60 80 68 92 76 L8 76 C20 68 24 60 24 44 C24 30 30 12 50 12 Z" fill="url(#kb)" {...ol('#4A2A00', 3)} />
          <Path d="M6 76 L94 76 C94 82 90 84 84 84 L16 84 C10 84 6 82 6 76 Z" fill="#E09A10" {...ol('#4A2A00', 2.6)} />
          <Circle cx={50} cy={88} r={7} fill="url(#kbc)" {...ol('#4A2A00', 2.4)} />
          <Path d="M30 60 C30 46 32 28 44 20" stroke="#FFFFFF" strokeWidth={5} fill="none" strokeLinecap="round" strokeOpacity={0.75} />
          <Path d="M26 66 L74 66" stroke="#9A6A00" strokeWidth={2} strokeOpacity={0.6} />
          <Path d="M28 70 L72 70" stroke="#FFF3A0" strokeWidth={1.2} strokeOpacity={0.6} />
          <Glint x={68} y={26} s={1} />
        </G>
      );
      break;
    case 'bar':
      body = (
        <G>
          <Defs>
            {vg('kbr', ['#3A3550', '#14101E'])}
            {dg('kbg', ['#FFFBE0', '#FFD84D', '#C2820A'])}
          </Defs>
          <Shadow cy={84} rx={42} />
          {[[10, 22, 80], [16, 48, 68]].map(([x, y, w], k) => (
            <G key={k}>
              <Rect x={x} y={y} width={w} height={k ? 24 : 26} rx={6} fill="url(#kbg)" {...ol('#4A2A00', 3)} />
              <Rect x={x + 5} y={y + 4} width={w - 10} height={k ? 16 : 18} rx={4} fill="url(#kbr)" />
              <GameText x={50} y={y + (k ? 18 : 19)} text="BAR" size={k ? 14 : 16} fill="#FFD84D" stroke="#4A2A00" sw={2.2} ls={2} />
            </G>
          ))}
          <Path d="M16 26 L84 26" stroke="#FFFFFF" strokeOpacity={0.7} strokeWidth={1.6} />
          <Glint x={86} y={22} s={0.8} />
        </G>
      );
      break;
    case 'seven':
      body = (
        <G>
          <Defs>
            {dg('ks', ['#FFC0C8', '#FF1A3C', '#9A0018'], '0', '0', '0.6', '1')}
            {dg('ksg', ['#FFFBE0', '#FFC21C', '#8A5200'])}
          </Defs>
          <Shadow cy={93} rx={30} />
          <Path d="M12 8 L88 8 L88 26 C72 40 58 60 54 90 L28 90 C32 62 46 42 60 28 L32 28 L30 36 L12 36 Z" fill="url(#ksg)" {...ol('#3A1E00', 3.2)} />
          <Path d="M17 13 L83 13 L83 24 C67 38 54 58 49 85 L33 85 C37 61 51 42 68 23 L28 23 L26 31 L17 31 Z" fill="url(#ks)" />
          <Path d="M21 16 L79 16" stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2.6} strokeLinecap="round" />
          <Path d="M60 30 C51 41 45 56 42 72" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={3} strokeLinecap="round" />
          <Glint x={82} y={12} s={1.1} />
          <Glint x={36} y={82} s={0.6} />
        </G>
      );
      break;
    case 'diamond':
      body = (
        <G>
          <Defs>
            {dg('kd1', ['#FFFFFF', '#9CF0FF', '#3D9BFF'])}
            {dg('kd2', ['#C8F8FF', '#3D7BFF', '#14308A'], '1', '0', '0', '1')}
            {rg('kdh', ['#B8F4FF', '#3D9BFF'], '0.5', '0.5', '0.5')}
          </Defs>
          <Circle cx={50} cy={46} r={40} fill="url(#kdh)" opacity={0.25} />
          <Shadow cy={92} rx={26} />
          <Polygon points="22,32 34,16 66,16 78,32 50,88" fill="url(#kd2)" {...ol('#0A1A5A', 3)} />
          <Polygon points="22,32 34,16 42,32" fill="#E8FCFF" />
          <Polygon points="42,32 50,16 58,32" fill="url(#kd1)" />
          <Polygon points="58,32 66,16 78,32" fill="#9CDCFF" />
          <Polygon points="22,32 42,32 50,88" fill="url(#kd1)" />
          <Polygon points="42,32 58,32 50,88" fill="#7FC8FF" />
          <Path d="M22 32 L78 32 M34 16 L42 32 L50 16 L58 32 L66 16 M42 32 L50 88 L58 32" stroke="#0A1A5A" strokeWidth={1.4} strokeOpacity={0.55} fill="none" />
          <Glint x={34} y={26} s={1.1} />
          <Glint x={70} y={46} s={0.7} />
          <Ellipse cx={30} cy={44} rx={3} ry={8} fill="#FFFFFF" opacity={0.55} transform="rotate(-25 30 44)" />
        </G>
      );
      break;
  }
  return <Svg width={size} height={size} viewBox="0 0 100 100">{body}</Svg>;
}
