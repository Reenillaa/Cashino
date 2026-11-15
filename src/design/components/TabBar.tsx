import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Glass } from './Glass';
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

/** Floating glass tab bar (control layer). */
export function GlassTabBar({ items, active, onSelect }: { items: TabItem[]; active: string; onSelect: (key: string) => void }) {
  const { c, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [w, setW] = React.useState(0);
  const idx = Math.max(0, items.findIndex((i) => i.key === active));
  const seg = w / items.length;
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: reduceMotion ? idx * seg : withSpring(idx * seg, motion.smooth) }],
    width: seg,
  }));
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Glass radius={30} intensity={50} style={styles.bar} onLayout={(e) => setW(e.nativeEvent.layout.width - 12)}>
        <View style={styles.row} accessibilityRole="tablist">
          {w > 0 && (
            <Animated.View pointerEvents="none" style={[styles.pillWrap, pill]}>
              <View style={[styles.pill, { backgroundColor: c.surface3, borderColor: c.hairlineStrong }]} />
            </Animated.View>
          )}
          {items.map((it) => {
            const focused = it.key === active;
            return (
              <PressableScale
                key={it.key}
                onPress={() => onSelect(it.key)}
                feedback="select"
                scaleTo={0.92}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={it.label}
                style={styles.item}
              >
                <Icon name={it.icon} size={22} color={focused ? c.text : c.text3} strokeWidth={focused ? 2 : 1.75} />
                <T variant="caption" style={{ fontSize: 10, letterSpacing: 0.2, textTransform: 'none', marginTop: 2, color: focused ? c.text : c.text3 }}>
                  {it.label}
                </T>
                {it.badge ? (
                  <View style={[styles.badge, { backgroundColor: c.loss }]}>
                    <T variant="caption" style={{ fontSize: 9, color: '#fff', letterSpacing: 0 }}>{it.badge > 9 ? '9+' : it.badge}</T>
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </View>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: { height: 64 },
  row: { flex: 1, flexDirection: 'row', paddingHorizontal: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pillWrap: { position: 'absolute', top: 6, bottom: 6, left: 6, paddingHorizontal: 4 },
  pill: { flex: 1, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth },
  badge: { position: 'absolute', top: 8, right: '28%', minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
});
