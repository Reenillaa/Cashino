import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableScale, T } from '@/design/components';

/**
 * Big table action in the poker style: its own gradient and a round badge with a symbol, so each action is
 * recognisable at a glance. `glow` marks the suggested move (basic-strategy hint).
 */
export function ActionButton({ symbol, label, sub, colors, onPress, disabled, glow }: { symbol: string; label: string; sub?: string; colors: [string, string]; onPress: () => void; disabled?: boolean; glow?: boolean }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} scaleTo={0.94} feedback="medium" accessibilityLabel={label} accessibilityState={{ disabled }}
      style={[styles.action, glow && styles.glow, disabled && { opacity: 0.35 }]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} end={{ x: 0, y: 0.6 }} style={StyleSheet.absoluteFill} />
      <View style={styles.badge}>
        <T weight="display" style={{ color: '#fff', fontSize: 17, lineHeight: 21 }}>{symbol}</T>
      </View>
      <T weight="displaySemi" numberOfLines={1} adjustsFontSizeToFit style={{ color: '#fff', fontSize: 13 }}>{label}</T>
      {sub ? <T weight="displaySemi" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{sub}</T> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  action: { flex: 1, height: 78, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)' },
  glow: { borderColor: '#FFE58A', shadowColor: '#FFD06B', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  badge: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.22)', alignItems: 'center', justifyContent: 'center' },
});
