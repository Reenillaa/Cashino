import React, { useEffect, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export interface TargetRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Controls the guided tutorial can point at, by id (normally the event the control emits, e.g. "dice:roll"). */
type ViewRef = React.ComponentRef<typeof View>;
const targets = new Map<string, React.RefObject<ViewRef | null>>();

export function registerTarget(id: string, ref: React.RefObject<ViewRef | null>) {
  targets.set(id, ref);
  return () => {
    if (targets.get(id) === ref) targets.delete(id);
  };
}

type Measurable = { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void; getBoundingClientRect?: () => DOMRect };

/** Where a registered control is on screen right now (window coordinates), or null if it is not mounted. */
export function measureTarget(id: string): Promise<TargetRect | null> {
  const node = targets.get(id)?.current as unknown as Measurable | null | undefined;
  return new Promise((resolve) => {
    if (!node) return resolve(null);
    if (typeof node.getBoundingClientRect === 'function') {
      const r = node.getBoundingClientRect();
      return resolve(r.width || r.height ? { x: r.left, y: r.top, w: r.width, h: r.height } : null);
    }
    if (typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, w, h) => resolve(w || h ? { x, y, w, h } : null));
      return;
    }
    resolve(null);
  });
}

/** Wrap a control so the guided tutorial can highlight it. Renders a plain View. */
export function TutorialTarget({ id, children, style }: { id?: string; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<ViewRef>(null);
  useEffect(() => (id ? registerTarget(id, ref) : undefined), [id]);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
