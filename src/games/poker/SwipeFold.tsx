import React, { useMemo } from 'react';
import { PanResponder, View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptic } from '@/services/haptics';

const THRESHOLD = 70;

/**
 * Wraps the hero's hole cards: drag them up and let go to fold (like throwing them to the dealer).
 * A short drag springs back. Only active when folding is legal.
 */
export function SwipeFold({ enabled, onFold, children, style }: { enabled: boolean; onFold: () => void; children: React.ReactNode; style?: ViewStyle }) {
  const y = useSharedValue(0);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => enabled && g.dy < -6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => y.set(Math.min(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -THRESHOLD || g.vy < -0.9) {
            haptic.medium();
            y.set(withTiming(-420, { duration: 260, easing: Easing.in(Easing.quad) }));
            setTimeout(onFold, 200);
          } else {
            y.set(withSpring(0, { damping: 14 }));
          }
        },
        onPanResponderTerminate: () => y.set(withSpring(0, { damping: 14 })),
      }),
    [enabled, onFold, y],
  );
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { rotate: `${y.value / 30}deg` }, { scale: 1 + Math.max(-0.15, y.value / 1400) }],
    opacity: Math.max(0, 1 + y.value / 300),
  }));
  return (
    <View {...responder.panHandlers} style={style}>
      <Animated.View style={anim}>{children}</Animated.View>
    </View>
  );
}
