import { Platform, useWindowDimensions } from 'react-native';

/** Width of the left navigation on computers. */
export const SIDEBAR_W = 248;
/** Widest the content of a page gets on a big screen. */
export const CONTENT_MAX = 1180;

// A computer: mouse/trackpad that can hover. Phones and tablets (touch) never match, so they keep the mobile UI.
const FINE_POINTER = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

/** True on a computer browser with a wide enough window: sidebar navigation and wide layouts. */
export function useDesktop(): boolean {
  const { width, height } = useWindowDimensions();
  return FINE_POINTER && width >= 1000 && height >= 560;
}

/** Usable width for the content of a tab page (window minus the sidebar, capped), or the window on phones. */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  const desktop = useDesktop();
  return desktop ? Math.min(width - SIDEBAR_W, CONTENT_MAX) : width;
}
