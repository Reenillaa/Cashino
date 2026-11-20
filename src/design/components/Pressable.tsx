import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion } from '../tokens';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';
import { captureOrigin } from '../motion/origin';

const APressable = Animated.createAnimatedComponent(Pressable);
const EASE = Easing.bezier(...motion.ease);

export interface ScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: 'none' | 'select' | 'light' | 'medium';
  sound?: boolean;
}

/** Pressable with Taste press feedback (scale .985 + 1px down in 90ms, release 120ms), haptic and optional sound. */
export function PressableScale({ style, scaleTo = 0.985, feedback = 'light', sound = false, onPressIn, onPressOut, onPress, disabled, ...rest }: ScaleProps) {
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: Math.min(1, (1 - s.value) * 66) }, { scale: s.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      onPressIn={(e) => {
        s.set(withTiming(scaleTo, { duration: motion.press, easing: EASE }));
        // remember what was pressed, so a game can open out of this very card
        captureOrigin(e.currentTarget, e.nativeEvent?.pageX, e.nativeEvent?.pageY);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.set(withTiming(1, { duration: motion.hoverOut, easing: EASE }));
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
