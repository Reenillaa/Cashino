import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Icon, type IconName } from './Icon';
import { T } from './Text';
import { PressableScale } from './Pressable';
import { useTheme } from '../theme';
import { brand, motion } from '../tokens';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
}

const EASE = Easing.bezier(...motion.ease);

/**
 * Floating capsule tab bar: a glowing brand-gradient bubble slides under the active tab (soft spring),
 * the active icon pops and its label appears; inactive tabs are icon-only for a calm, clear bar.
 */
export function GlassTabBar({ items, active, onSelect }: { items: TabItem[]; active: string; onSelect: (key: string) => void }) {
  const { reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const idx = Math.max(0, items.findIndex((i) => i.key === active));
  const seg = w / items.length;
  const x = useSharedValue(idx * seg);
  useEffect(() => {
    x.set(reduceMotion ? idx * seg : withSpring(idx * seg, { damping: 18, stiffness: 190, mass: 0.9 }));
  }, [idx, seg, reduceMotion, x]);
  const bubble = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: seg }));
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar} onLayout={(e) => setW(e.nativeEvent.layout.width - 12)} accessibilityRole="tablist">
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(18,14,30,0.82)' }]} />
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']} end={{ x: 0, y: 0.6 }} style={StyleSheet.absoluteFill} />
        {w > 0 && (
          <Animated.View pointerEvents="none" style={[styles.bubbleWrap, bubble]}>
            <View style={styles.bubble}>
              <LinearGradient colors={brand.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </View>
          </Animated.View>
        )}
        <View style={styles.row}>
          {items.map((it) => (
            <TabButton key={it.key} item={it} focused={it.key === active} onPress={() => onSelect(it.key)} />
          ))}
        </View>
      </View>
    </View>
  );
}

function TabButton({ item, focused, onPress }: { item: TabItem; focused: boolean; onPress: () => void }) {
  const { c, reduceMotion } = useTheme();
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.set(reduceMotion ? (focused ? 1 : 0) : focused ? withSpring(1, { damping: 12, stiffness: 220 }) : withTiming(0, { duration: motion.base, easing: EASE }));
  }, [focused, reduceMotion, p]);
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: 0.95 + 0.15 * p.value }, { translateY: -2 * p.value }] }));
  const label = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * p.value }));
  return (
    <PressableScale onPress={onPress} feedback="select" scaleTo={0.9} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.label} style={styles.item}>
      <Animated.View style={icon}>
        <Icon name={item.icon} size={24} color={focused ? '#FFFFFF' : c.text2} strokeWidth={focused ? 2.2 : 1.8} />
      </Animated.View>
      <Animated.View style={label}>
        <T variant="caption" weight={focused ? 'semibold' : 'medium'} style={{ fontSize: 11, marginTop: 2, color: focused ? '#FFFFFF' : c.text3 }}>{item.label}</T>
      </Animated.View>
      {item.badge ? (
        <View style={[styles.badge, { backgroundColor: c.loss }]}>
          <T variant="caption" style={{ fontSize: 10, color: '#fff' }}>{item.badge > 9 ? '9+' : item.badge}</T>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: { height: 68, borderRadius: 34, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  row: { flex: 1, flexDirection: 'row', paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleWrap: { position: 'absolute', top: 6, bottom: 6, left: 6, paddingHorizontal: 3 },
  bubble: { flex: 1, borderRadius: 28, overflow: 'hidden', shadowColor: brand.pink, shadowOpacity: 0.6, shadowRadius: 14 },
  badge: { position: 'absolute', top: 6, right: '24%', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
