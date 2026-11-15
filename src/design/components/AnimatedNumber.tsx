import React, { useEffect, useRef, useState } from 'react';
import { T, type TProps } from './Text';
import { useTheme } from '../theme';

export function formatCoins(n: number): string {
  return Math.round(n).toLocaleString('es-ES').replace(/ /g, '.');
}

export function formatMult(m: number): string {
  if (!Number.isFinite(m)) return '—';
  if (m >= 1000) return `${Math.floor(m).toLocaleString('es-ES')}×`;
  return `${(Math.floor(m * 100 + 1e-9) / 100).toFixed(2)}×`;
}

/** Tweens numeric text (balance, payouts). Instant when motion is reduced. */
export function AnimatedNumber({ value, format = formatCoins, duration = 600, ...t }: Omit<TProps, 'children'> & { value: number; format?: (n: number) => string; duration?: number }) {
  const { reduceMotion } = useTheme();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (reduceMotion || value === from.current) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * e);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = value;
    };
  }, [value, reduceMotion, duration]);
  return (
    <T tabular accessibilityLabel={format(value)} {...t}>
      {format(shown)}
    </T>
  );
}
