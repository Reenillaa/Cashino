import React from 'react';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';
import type { GameId } from '@/engine/games/types.ts';
import { adaptTint, useTheme } from '../theme';

/** Geometric glyph per game, same 24-grid and stroke language as the UI icons. */
const GLYPHS: Record<GameId, React.ReactNode> = {
  poker: (<><Rect x="4" y="5.5" width="10" height="14" rx="2" transform="rotate(-10 9 12.5)" /><Rect x="10" y="4.5" width="10" height="14" rx="2" transform="rotate(8 15 11.5)" /><Path d="M15.2 9.2c.9-1.2 2.6-.3 1.9 1l-1.9 2.3-1.9-2.3c-.7-1.3 1-2.2 1.9-1z" /></>),
  blackjack: (<><Rect x="3.5" y="6" width="10" height="14" rx="2" /><Rect x="10.5" y="4" width="10" height="14" rx="2" /><Path d="M14 8.5h3l-2 3.5M14.5 14h3" /></>),
  crash: (<><Path d="M4 19.5c5-1 9.5-5 13-12" /><Path d="M17 7.5l2.5-3 .5 4z" /><Circle cx="6" cy="18.5" r=".6" /></>),
  dice: (<><Rect x="4.5" y="4.5" width="15" height="15" rx="3.5" /><Circle cx="9" cy="9" r=".9" /><Circle cx="15" cy="15" r=".9" /><Circle cx="12" cy="12" r=".9" /></>),
  mines: (<><Path d="M12 4l6.5 6-6.5 10-6.5-10z" /><Path d="M5.5 10h13M9.5 4.5 12 10l2.5-5.5" /></>),
  plinko: (<><Circle cx="12" cy="5.5" r="1.6" /><Circle cx="8" cy="10" r=".8" /><Circle cx="16" cy="10" r=".8" /><Circle cx="5" cy="14.5" r=".8" /><Circle cx="12" cy="14.5" r=".8" /><Circle cx="19" cy="14.5" r=".8" /><Path d="M3.5 19.5h17" /></>),
  crossing: (<><Path d="M3.5 8h17M3.5 16h17" strokeDasharray="2.5 2.5" /><Circle cx="12" cy="12" r="2.6" /><Path d="M12 9.4V7.8M13.8 12.6l1.2.6" /></>),
  roulette: (<><Circle cx="12" cy="12" r="8" /><Circle cx="12" cy="12" r="3.5" /><Path d="M12 4v4.5M12 15.5V20M4 12h4.5M15.5 12H20" /><Circle cx="17" cy="8" r="1" /></>),
  limbo: (<><Path d="M4 17.5h16" /><Path d="M6 13.5c3-6 9-6 12 0" /><Path d="M12 4.5v3" /></>),
  coinflip: (<><Circle cx="12" cy="12" r="8" /><Path d="M12 4v16" /><Path d="M8.5 9.5h1M14.5 14.5h1" /></>),
  baccarat: (<><Rect x="3.5" y="7" width="8" height="12" rx="1.8" /><Rect x="12.5" y="5" width="8" height="12" rx="1.8" /><Path d="M7.5 11v4M16.5 9v4" /></>),
  hilo: (<><Rect x="6" y="4.5" width="12" height="15" rx="2.5" /><Path d="M12 8.5v7M9.5 11 12 8.5l2.5 2.5" /></>),
  keno: (<><Circle cx="7" cy="7" r="2" /><Circle cx="17" cy="7" r="2" /><Circle cx="7" cy="17" r="2" /><Circle cx="17" cy="17" r="2" /><Circle cx="12" cy="12" r="2" /></>),
  sicbo: (<><Rect x="3.5" y="10" width="8" height="8" rx="2" /><Rect x="12.5" y="10" width="8" height="8" rx="2" /><Rect x="8" y="3" width="8" height="8" rx="2" /><Circle cx="12" cy="7" r=".7" /><Circle cx="7.5" cy="14" r=".7" /><Circle cx="16.5" cy="14" r=".7" /></>),
};

export function GameGlyph({ game, size = 28, color }: { game: GameId; size?: number; color: string }) {
  const { isDark } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={adaptTint(color, isDark)} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <G>{GLYPHS[game]}</G>
    </Svg>
  );
}
