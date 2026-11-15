import React, { useRef, useState } from 'react';
import { View, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { haptic } from '@/services/haptics';

/**
 * Lightweight slider built on the RN responder system (works on iOS, Android and web).
 * Children have pointerEvents="none" so locationX is always relative to the track.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onEnd,
  tint,
  style,
  accessibilityLabel,
  fillFrom = 'start',
  trackColors,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onEnd?: (v: number) => void;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  fillFrom?: 'start' | 'end';
  /** Optional [left, right] colours split at the thumb (used by Dice). */
  trackColors?: [string, string];
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const last = useRef(value);
  const pct = max > min ? (value - min) / (max - min) : 0;
  const fromX = (x: number) => {
    const p = Math.max(0, Math.min(1, x / Math.max(1, w)));
    const raw = min + p * (max - min);
    const v = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, Number(v.toFixed(6))));
  };
  const handle = (e: GestureResponderEvent) => {
    const v = fromX(e.nativeEvent.locationX);
    if (v !== last.current) {
      last.current = v;
      haptic.select();
      onChange(v);
    }
  };
  const col = tint ?? c.text;
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const v = Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step)));
        onChange(v);
        onEnd?.(v);
      }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handle}
      onResponderMove={handle}
      onResponderRelease={() => onEnd?.(last.current)}
      style={[{ height: 36, justifyContent: 'center' }, style]}
    >
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: trackColors ? trackColors[1] : c.surface3, overflow: 'hidden' }}>
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: fillFrom === 'start' ? 0 : `${pct * 100}%`,
            right: fillFrom === 'start' ? `${(1 - pct) * 100}%` : 0,
            backgroundColor: trackColors ? trackColors[0] : col,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: Math.max(0, pct * w - 14),
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      />
    </View>
  );
}
