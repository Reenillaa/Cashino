import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { radius as R } from '../tokens';

/**
 * Glass material for the control layer (tab bar, bet panel, sheets, "you" highlights).
 * Falls back to a solid surface when effects are reduced.
 */
export function Glass({ style, children, radius = R.lg, intensity = 40, solid, ...rest }: ViewProps & { style?: StyleProp<ViewStyle>; radius?: number; intensity?: number; solid?: boolean }) {
  const { c, isDark, reduceEffects } = useTheme();
  const useBlur = !solid && !reduceEffects && Platform.OS !== 'android';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, style]} {...rest}>
      {useBlur ? (
        <BlurView intensity={intensity} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: useBlur ? c.glassTint : c.surface2 }]} />
      <LinearGradient pointerEvents="none" colors={[c.sheenTop, 'rgba(255,255,255,0)']} end={{ x: 0, y: 0.35 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairlineStrong }]} />
      {children}
    </View>
  );
}
