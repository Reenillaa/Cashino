import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { T } from './Text';
import { PressableScale } from './Pressable';
import { useTheme } from '../theme';
import { motion } from '../tokens';

export interface TabItem {
  key: string;
  label: string;
  icon: IconName;
  badge?: number;
}

const EASE = Easing.bezier(...motion.ease);

/**
 * Offsuit-style bottom bar: flat black, big icons with labels, nothing floating.
 * The active item brightens and its icon settles from slightly smaller (no bounce).
 */
export function GlassTabBar({ items, active, onSelect }: { items: TabItem[]; active: string; onSelect: (key: string) => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: c.bg, borderTopColor: c.hairline, paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {items.map((it) => (
        <TabButton key={it.key} item={it} focused={it.key === active} onPress={() => onSelect(it.key)} />
      ))}
    </View>
  );
}

function TabButton({ item, focused, onPress }: { item: TabItem; focused: boolean; onPress: () => void }) {
  const { c, reduceMotion } = useTheme();
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.set(reduceMotion ? (focused ? 1 : 0) : withTiming(focused ? 1 : 0, { duration: motion.slide, easing: EASE }));
  }, [focused, reduceMotion, p]);
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + 0.08 * p.value }], opacity: 0.55 + 0.45 * p.value }));
  return (
    <PressableScale
      onPress={onPress}
      feedback="select"
      scaleTo={0.94}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.label}
      style={styles.item}
    >
      <Animated.View style={icon}>
        <Icon name={item.icon} size={26} color={focused ? c.text : c.text2} strokeWidth={focused ? 2 : 1.7} />
      </Animated.View>
      <T variant="caption" weight={focused ? 'semibold' : 'medium'} style={{ fontSize: 12, marginTop: 3, color: focused ? c.text : c.text3 }}>
        {item.label}
      </T>
      {item.badge ? (
        <View style={[styles.badge, { backgroundColor: c.loss }]}>
          <T variant="caption" style={{ fontSize: 10, color: '#fff' }}>{item.badge > 9 ? '9+' : item.badge}</T>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  badge: { position: 'absolute', top: 2, right: '26%', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
