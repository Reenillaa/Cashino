import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { radius } from '../tokens';

/** Solid content-layer card. `brushed` adds the subtle titanium gradient. */
export function Surface({ style, children, level = 1, brushed, padded = true, ...rest }: ViewProps & { style?: StyleProp<ViewStyle>; level?: 1 | 2 | 3; brushed?: boolean; padded?: boolean }) {
  const { c, isDark } = useTheme();
  const bg = level === 1 ? c.surface1 : level === 2 ? c.surface2 : c.surface3;
  return (
    <View
      style={[
        { backgroundColor: bg, borderRadius: radius.lg, padding: padded ? 16 : 0, borderWidth: StyleSheet.hairlineWidth, borderColor: c.hairline, overflow: 'hidden' },
        !isDark && { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
        style,
      ]}
      {...rest}
    >
      {brushed && (
        <LinearGradient
          pointerEvents="none"
          colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.03)'] : ['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.025)', 'rgba(0,0,0,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </View>
  );
}
