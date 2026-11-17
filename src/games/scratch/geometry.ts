import type { ScratchCardId, ScratchLayout } from '@/engine/games/scratch.ts';
import { PAELLA_PAYS } from '@/engine/games/scratch.ts';

/** Every ticket is drawn on a 300×440 artboard; the scratch spots are given in those units. */
export const TW = 300;
export const TH = 440;
export type Spot = { kind: 'rect'; x: number; y: number; w: number; h: number; r: number } | { kind: 'circle'; cx: number; cy: number; r: number };
export const spotBox = (s: Spot) => (s.kind === 'rect' ? { x: s.x, y: s.y, w: s.w, h: s.h } : { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 });
export const spotCenter = (s: Spot) => (s.kind === 'rect' ? { x: s.x + s.w / 2, y: s.y + s.h / 2 } : { x: s.cx, y: s.cy });

const grid = (x0: number, y0: number, w: number, h: number, cols: number, rows: number, inset: number, top = 0): Spot[] => {
  const cw = w / cols, ch = h / rows;
  const out: Spot[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ kind: 'rect', x: x0 + c * cw + inset, y: y0 + r * ch + inset + top, w: cw - inset * 2, h: ch - inset * 2 - top, r: 10 });
  return out;
};

/** Pan of Paella Premiada: centre and the ring of six ingredients. */
export const PAN = { cx: 150, cy: 238, r: 90, ring: 52, spot: 23 };

export const SPOTS: Record<ScratchCardId, Spot[]> = {
  tapas: grid(26, 160, 248, 198, 3, 3, 5),
  playa: [
    { kind: 'circle', cx: 112, cy: 180, r: 25 },
    { kind: 'circle', cx: 188, cy: 180, r: 25 },
    ...grid(22, 236, 256, 128, 3, 2, 5),
  ],
  feria: [...grid(24, 150, 252, 150, 3, 2, 6, 14), { kind: 'rect', x: 112, y: 314, w: 154, h: 46, r: 12 }],
  siesta: [
    { kind: 'rect', x: 62, y: 146, w: 176, h: 88, r: 18 },
    { kind: 'rect', x: 24, y: 264, w: 80, h: 90, r: 22 },
    { kind: 'rect', x: 110, y: 264, w: 80, h: 90, r: 22 },
    { kind: 'rect', x: 196, y: 264, w: 80, h: 90, r: 22 },
  ],
  paella: Array.from({ length: 6 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 3;
    return { kind: 'circle' as const, cx: PAN.cx + Math.cos(a) * PAN.ring, cy: PAN.cy + Math.sin(a) * PAN.ring, r: PAN.spot };
  }),
};

/** Spots that show the prize (lit up once everything is uncovered). */
export function winningSpots(card: ScratchCardId, l: ScratchLayout): number[] {
  const triple = <T,>(xs: T[]) => xs.find((v) => xs.filter((y) => y === v).length >= 3);
  if (l.kind === 'tapas') {
    const v = triple(l.amounts);
    return v === undefined ? [] : l.amounts.flatMap((a, i) => (a === v ? [i] : []));
  }
  if (l.kind === 'playa') {
    const out: number[] = [];
    l.mine.forEach((m, i) => {
      const w = l.winning.indexOf(m.n);
      if (w >= 0) out.push(w, i + 2);
    });
    return out;
  }
  if (l.kind === 'feria') {
    const idx = l.symbols.flatMap((s, i) => (s === 'farolillo' ? [i] : []));
    return idx.length >= 3 ? [...idx, 6] : [];
  }
  if (l.kind === 'siesta') {
    const i = l.pillows.indexOf('luna');
    return i >= 0 ? [0, i + 1] : [];
  }
  const ing = triple(l.cells);
  return ing && PAELLA_PAYS[ing] ? l.cells.flatMap((c, i) => (c === ing ? [i] : [])) : [];
}

/** 12 345 → "12.345" (Spanish grouping, the same on every platform). */
export const amount = (n: number) => `${Math.round(n)}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
