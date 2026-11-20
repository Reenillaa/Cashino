/**
 * Where the last tap happened (the rectangle of the button or tile that was pressed), so the next screen
 * can grow out of it — a game opens from the very card you touched. Kept for 2 s.
 */
export interface Origin { x: number; y: number; w: number; h: number; at: number }
let last: Origin | null = null;

type Measurable = { getBoundingClientRect?: () => { left: number; top: number; width: number; height: number }; measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void };

export function captureOrigin(target: unknown, pageX?: number, pageY?: number) {
  const t = target as Measurable | null;
  const at = Date.now();
  if (t && typeof t.getBoundingClientRect === 'function') {
    const r = t.getBoundingClientRect();
    last = { x: r.left, y: r.top, w: r.width, h: r.height, at };
  } else if (t && typeof t.measureInWindow === 'function') {
    t.measureInWindow((x, y, w, h) => {
      last = { x, y, w, h, at };
    });
  } else if (pageX !== undefined && pageY !== undefined) {
    last = { x: pageX - 60, y: pageY - 60, w: 120, h: 120, at };
  }
}

export function recentOrigin(maxAge = 2000): Origin | null {
  return last && Date.now() - last.at < maxAge && last.w > 0 ? last : null;
}
