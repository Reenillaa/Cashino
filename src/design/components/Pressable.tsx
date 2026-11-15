import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '../tokens';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';

const APressable = Animated.createAnimatedComponent(Pressable);

export interface ScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: 'none' | 'select' | 'light' | 'medium';
  sound?: boolean;
}

/** Pressable with a physical spring scale, optional haptic and tap sound. */
export function PressableScale({ style, scaleTo = 0.97, feedback = 'light', sound = false, onPressIn, onPressOut, onPress, disabled, ...rest }: ScaleProps) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, motion.snappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, motion.snappy);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (feedback !== 'none') haptic[feedback]();
        if (sound) sfx('tap');
        onPress?.(e);
      }}
      style={[anim, style, disabled ? { opacity: 0.45 } : null]}
    />
  );
}
