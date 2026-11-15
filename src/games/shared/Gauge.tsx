import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/design/theme';
import { T } from '@/design/components';
import { haptic } from '@/services/haptics';

const A0 = -210, SWEEP = 240;
const MAXV = 100;
const angleOf = (v: number) => A0 + SWEEP * Math.min(1, Math.max(0, Math.log(Math.max(1, v)) / Math.log(MAXV)));

/**
 * Speedometer for multipliers (×1 … ×100, log scale): red below your target, green above it,
 * a white mark on the target and a needle that swings up to the result.
 */
export function Gauge({ value, target, size = 270, spinning, children, onTarget, hint }: { value: number; target: number; size?: number; spinning?: boolean; children?: React.ReactNode; onTarget?: (v: number) => void; hint?: string }) {
  const { reduceMotion } = useTheme();
  const r = size / 2 - 18, cx = size / 2, cy = size / 2;
  const p = (deg: number, rr = r) => `${(cx + rr * Math.cos((deg * Math.PI) / 180)).toFixed(2)},${(cy + rr * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;
  const arc = (a: number, b: number, rr = r) => `M${p(a, rr)} A${rr},${rr} 0 ${b - a > 180 ? 1 : 0} 1 ${p(b, rr)}`;
  const ta = angleOf(target);
  const needle = useSharedValue(A0);
  useEffect(() => {
    if (reduceMotion) needle.set(angleOf(value));
    else if (spinning) needle.set(withTiming(A0 + 30, { duration: 200, easing: Easing.out(Easing.quad) }));
    else needle.set(withSpring(angleOf(value), { damping: 9, stiffness: 70, mass: 0.8 }));
  }, [value, spinning, reduceMotion, needle]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${needle.value}deg` }] }));
  // Drag anywhere on the dial to move the white target knob (log scale ×1.01 … ×100).
  const fromTouch = (x: number, y: number) => {
    let a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
    if (a > 30) a -= 360;
    if (a < A0) a = a < A0 - 60 ? A0 + SWEEP : A0;
    const v = Math.exp(((a - A0) / SWEEP) * Math.log(MAXV));
    const snapped = Math.max(1.01, v < 10 ? Math.round(v * 20) / 20 : Math.round(v));
    if (snapped !== target) {
      haptic.select();
      onTarget?.(snapped);
    }
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id="gaugeWin" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor="#3BE39A" />
            <Stop offset="1" stopColor="#21C8FD" />
          </LinearGradient>
        </Defs>
        <Path d={arc(A0, A0 + SWEEP)} stroke="rgba(255,255,255,0.08)" strokeWidth={26} fill="none" strokeLinecap="round" />
        <Path d={arc(A0, ta)} stroke="#FF5C7A" strokeOpacity={0.75} strokeWidth={18} fill="none" strokeLinecap="round" />
        <Path d={arc(ta, A0 + SWEEP)} stroke="url(#gaugeWin)" strokeWidth={18} fill="none" strokeLinecap="round" />
        {[1, 2, 5, 10, 25, 100].map((v) => {
          const a = angleOf(v);
          return (
            <React.Fragment key={v}>
              <Path d={`M${p(a, r - 16)} L${p(a, r - 24)}`} stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeLinecap="round" />
              <SvgText x={Number(p(a, r - 38).split(',')[0])} y={Number(p(a, r - 38).split(',')[1]) + 4} fontSize={11} fontWeight="700" fill="rgba(255,255,255,0.6)" textAnchor="middle">{`${v}×`}</SvgText>
            </React.Fragment>
          );
        })}
        <Circle cx={Number(p(ta, r).split(',')[0])} cy={Number(p(ta, r).split(',')[1])} r={onTarget ? 14 : 9} fill="#FFFFFF" stroke="#231A3A" strokeWidth={3} />
      </Svg>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
        <View style={{ position: 'absolute', left: cx - 4, top: cy - 4, width: r - 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF', shadowColor: '#fff', shadowOpacity: 0.7, shadowRadius: 8 }} />
      </Animated.View>
      <View style={{ position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 5, borderColor: '#231A3A' }} />
      <View style={{ position: 'absolute', bottom: size * 0.04, alignItems: 'center' }}>{children}</View>
      {onTarget ? (
        <View
          style={{ position: 'absolute', left: 0, top: 0, width: size, height: size * 0.78 }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => fromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          onResponderMove={(e) => fromTouch(e.nativeEvent.locationX, e.nativeEvent.locationY)}
          accessibilityRole="adjustable"
          accessibilityLabel={hint}
        />
      ) : null}
      {hint ? <View pointerEvents="none" style={{ position: 'absolute', top: -6 }}><T variant="footnote" color="text2">{hint}</T></View> : null}
    </View>
  );
}
