import React from 'react';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

/** Original line icon set on a 24 pt grid, 1.75 pt stroke, round caps. */
const ICONS = {
  home: <Path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  games: (<><Rect x="4" y="4" width="7" height="7" rx="2" /><Rect x="13" y="4" width="7" height="7" rx="2" /><Rect x="4" y="13" width="7" height="7" rx="2" /><Circle cx="16.5" cy="16.5" r="3.5" /></>),
  ranking: (<><Path d="M8 20v-6M12 20V8M16 20v-9" /><Path d="M5 20h14" /><Path d="m12 3 1.1 2.2 2.4.3-1.75 1.7.4 2.4L12 8.5 9.85 9.6l.4-2.4L8.5 5.5l2.4-.3z" /></>),
  social: (<><Circle cx="9" cy="8.5" r="3.2" /><Path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" /><Circle cx="16.8" cy="9.5" r="2.5" /><Path d="M16 14.6c2.3.1 4 1.7 4.5 4.4" /></>),
  profile: (<><Circle cx="12" cy="8.5" r="3.8" /><Path d="M4.5 20c.9-3.9 3.9-6 7.5-6s6.6 2.1 7.5 6" /></>),
  settings: (<><Path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><Circle cx="15" cy="7" r="2.2" /><Circle cx="9" cy="17" r="2.2" /></>),
  chevronRight: <Polyline points="9.5 5.5 16 12 9.5 18.5" />,
  chevronLeft: <Polyline points="14.5 5.5 8 12 14.5 18.5" />,
  chevronDown: <Polyline points="5.5 9.5 12 16 18.5 9.5" />,
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  minus: <Path d="M5 12h14" />,
  check: <Polyline points="5 12.5 10 17.5 19 7" />,
  info: (<><Circle cx="12" cy="12" r="8.5" /><Path d="M12 11v5.5M12 7.6v.1" /></>),
  book: (<><Path d="M4.5 5.5c2.6-1 5.1-.8 7.5.8 2.4-1.6 4.9-1.8 7.5-.8V19c-2.6-1-5.1-.8-7.5.8-2.4-1.6-4.9-1.8-7.5-.8z" /><Path d="M12 6.3v13.5" /></>),
  play: <Path d="M8 5.5v13l10.5-6.5z" />,
  lock: (<><Rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>),
  bell: (<><Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" /><Path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>),
  globe: (<><Circle cx="12" cy="12" r="8.5" /><Path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z" /></>),
  moon: <Path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  sun: (<><Circle cx="12" cy="12" r="4" /><Path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4M18.7 18.7l-1.4-1.4M6.7 6.7 5.3 5.3" /></>),
  volume: (<><Path d="M4.5 9.5h3.5l4.5-4v13l-4.5-4H4.5z" /><Path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></>),
  music: (<><Path d="M9 17.5V6l10-2v11.5" /><Circle cx="6.8" cy="17.5" r="2.2" /><Circle cx="16.8" cy="15.5" r="2.2" /></>),
  vibrate: (<><Rect x="8" y="4" width="8" height="16" rx="2" /><Path d="M4.5 9v6M19.5 9v6" /></>),
  sparkles: (<><Path d="M12 3.5l1.6 4.4 4.4 1.6-4.4 1.6L12 15.5l-1.6-4.4L6 9.5l4.4-1.6z" /><Path d="M18 15l.7 1.8 1.8.7-1.8.7L18 20l-.7-1.8-1.8-.7 1.8-.7z" /></>),
  refresh: (<><Path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><Polyline points="19.5 4.5 19.5 8.5 15.5 8.5" /></>),
  shield: (<><Path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.4 7 9 4.1-1.6 7-4.7 7-9V6z" /><Polyline points="9 12 11.2 14.2 15.5 9.8" /></>),
  trash: (<><Path d="M5 7h14M9.5 7V5h5v2M7 7l.8 12.2a1 1 0 0 0 1 .8h6.4a1 1 0 0 0 1-.8L17 7" /></>),
  logout: (<><Path d="M14 4.5H6.5v15H14" /><Path d="M11 12h9M17 8.5l3.5 3.5-3.5 3.5" /></>),
  copy: (<><Rect x="8.5" y="8.5" width="11" height="11" rx="2" /><Path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></>),
  share: (<><Path d="M12 15V3.8M8 7.5l4-4 4 4" /><Path d="M6 11v8.5h12V11" /></>),
  search: (<><Circle cx="10.5" cy="10.5" r="6" /><Path d="m15 15 5 5" /></>),
  gift: (<><Rect x="4" y="9" width="16" height="11" rx="2" /><Path d="M12 9v11M4 13h16" /><Path d="M12 9c-1.5-3.5-5.5-4-5.5-1.5 0 1.3 1.5 1.5 5.5 1.5zM12 9c1.5-3.5 5.5-4 5.5-1.5 0 1.3-1.5 1.5-5.5 1.5z" /></>),
  flame: <Path d="M12 20.5c3.6 0 6-2.4 6-5.8 0-3.6-3-5.6-3.6-9.2-2 1.4-3 3.2-3.2 5-1-.8-1.6-1.9-1.8-3C7.4 9.5 6 11.9 6 14.7c0 3.4 2.4 5.8 6 5.8z" />,
  star: <Path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3l-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" />,
  clock: (<><Circle cx="12" cy="12" r="8.5" /><Path d="M12 7.5V12l3 2" /></>),
  wifiOff: (<><Path d="M4 4l16 16" /><Path d="M8.5 15.5a5 5 0 0 1 7 0M5.5 12.2a9.5 9.5 0 0 1 4-2.1M14.5 10.1a9.5 9.5 0 0 1 4 2.1M12 19.2v.1" /></>),
  bot: (<><Rect x="5" y="8" width="14" height="11" rx="3" /><Path d="M12 4.5V8M9.5 13v.5M14.5 13v.5M9.5 16.2h5" /></>),
  users: (<><Circle cx="9" cy="9" r="3" /><Circle cx="16.5" cy="10" r="2.4" /><Path d="M3.8 19c.6-3 2.6-4.6 5.2-4.6s4.6 1.6 5.2 4.6M15.2 14.5c2.5 0 4.3 1.5 4.9 4.5" /></>),
  crown: <Path d="M4.5 17.5 3.5 7.5l5 4 3.5-6 3.5 6 5-4-1 10z" />,
  medal: (<><Circle cx="12" cy="14.5" r="5" /><Path d="M8.5 10.8 6 3.5h4l2 5M15.5 10.8 18 3.5h-4l-2 5" /></>),
  eye: (<><Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><Circle cx="12" cy="12" r="3" /></>),
  chart: (<><Path d="M4 19.5h16" /><Polyline points="5 15.5 9.5 10.5 13 13.5 19 6.5" /></>),
  flag: (<><Path d="M6 20.5V4" /><Path d="M6 4.5h11l-2 4 2 4H6" /></>),
  link: (<><Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  arrowUp: <Path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />,
  arrowDown: <Path d="M12 5v14M6.5 13.5 12 19l5.5-5.5" />,
  shuffle: (<><Path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.2 3.4-2.8M13.1 9.8C13.9 8.2 14.9 7 16.5 7H20" /><Polyline points="17.5 4.5 20 7 17.5 9.5" /><Polyline points="17.5 14.5 20 17 17.5 19.5" /></>),
  smile: (<><Circle cx="12" cy="12" r="8.5" /><Path d="M8.5 14c.8 1.4 2 2.1 3.5 2.1s2.7-.7 3.5-2.1M9.2 9.7v.1M14.8 9.7v.1" /></>),
  target: (<><Circle cx="12" cy="12" r="8.5" /><Circle cx="12" cy="12" r="4.5" /><Circle cx="12" cy="12" r="1" /></>),
  layers: (<><Path d="M12 4 3.5 8.5 12 13l8.5-4.5z" /><Path d="m3.5 12.5 8.5 4.5 8.5-4.5M3.5 16.5 12 21l8.5-4.5" /></>),
  key: (<><Circle cx="8" cy="15" r="4" /><Path d="m11 12 8.5-8.5M16 7l2.5 2.5M14 9l1.8 1.8" /></>),
  mail: (<><Rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><Path d="m4 7 8 6 8-6" /></>),
  edit: (<><Path d="M15.5 5 19 8.5 9 18.5H5.5V15z" /><Path d="M13 7.5 16.5 11" /></>),
  hourglass: <Path d="M7 3.5h10M7 20.5h10M8 3.5c0 4.5 4 5.5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5.5-4 8.5s4 4 4 8.5" />,
  dot: <Circle cx="12" cy="12" r="3" />,
  ball: (<><Circle cx="12" cy="12" r="8.5" /><Path d="m12 8.2 3.4 2.5-1.3 4h-4.2l-1.3-4z" /><Path d="M12 3.5v4.7M20.2 9.4l-4.8 1.3M17.3 18.6l-3.2-3.9M6.7 18.6l3.2-3.9M3.8 9.4l4.8 1.3" /></>),
  bag: (<><Path d="M5.5 8h13l-1 12h-11z" /><Path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>),
  userPlus: (<><Circle cx="10" cy="8.5" r="3.6" /><Path d="M3.5 19.5c.8-3.6 3.4-5.6 6.5-5.6 1.4 0 2.6.4 3.6 1" /><Path d="M18.5 13v6M15.5 16h6" /></>),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color, strokeWidth = 1.75, fill = 'none' }: { name: IconName; size?: number; color: string; strokeWidth?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </Svg>
  );
}

