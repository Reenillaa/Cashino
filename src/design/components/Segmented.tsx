import React, { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { motion, radius } from '../tokens';
import { T } from './Text';
import { PressableScale } from './Pressable';

/** iOS-style segmented control with a sliding glass thumb. */
export function Segmented<V extends string>({ options, value, onChange, style, size = 'md', disabled }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void; style?: StyleProp<ViewStyle>; size?: 'sm' | 'md'; disabled?: boolean }) {
  const { c, reduceMotion } = useTheme();
  const [w, setW] = useState(0);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const segW = w > 0 ? (w - 4) / options.length : 0;
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? idx * segW : withSpring(idx * segW, motion.snappy) }],
    width: segW,
  }));
  const h = size === 'sm' ? 32 : 38;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      style={[{ height: h, borderRadius: radius.sm, backgroundColor: c.surface2, padding: 2, flexDirection: 'row' }, disabled && { opacity: 0.5 }, style]}
    >
      {w > 0 && <Animated.View style={[styles.thumb, { height: h - 4, backgroundColor: c.surface3, borderColor: c.hairlineStrong }, thumb]} />}
      {options.map((o) => (
        <PressableScale
          key={o.value}
          disabled={disabled}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
          accessibilityLabel={o.label}
          feedback="select"
          scaleTo={0.98}
          onPress={() => onChange(o.value)}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        >
          <T variant="footnote" weight={o.value === value ? 'semibold' : 'medium'} color={o.value === value ? 'text' : 'text3'} numberOfLines={1}>
            {o.label}
          </T>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { position: 'absolute', top: 2, left: 2, borderRadius: radius.sm - 2, borderWidth: StyleSheet.hairlineWidth },
});
