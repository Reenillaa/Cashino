import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme';

export function ProgressBar({ value, tint, height = 6, style }: { value: number; tint?: string; height?: number; style?: StyleProp<ViewStyle> }) {
  const { c, reduceMotion } = useTheme();
  const [w, setW] = React.useState(0);
  const v = Math.max(0, Math.min(1, value));
  const fill = useAnimatedStyle(() => ({ width: reduceMotion ? v * w : withTiming(v * w, { duration: 500 }) }));
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: c.surface3, overflow: 'hidden' }, style]}
    >
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: tint ?? c.text }, fill]} />
    </View>
  );
}

export function ProgressRing({ value, size = 44, stroke = 4, tint, children }: { value: number; size?: number; stroke?: number; tint?: string; children?: React.ReactNode }) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.surface3} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={tint ?? c.text} strokeWidth={stroke} fill="none" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - v)} strokeLinecap="round" />
      </Svg>
      {children}
    </View>
  );
}
