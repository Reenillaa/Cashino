import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, FadeInLeft } from 'react-native-reanimated';
import { T } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { motion } from '@/design/tokens';

export interface HistoryItem {
  id: string;
  label: string;
  win: boolean | null; // null = neutral (push / info)
}

const EASE_ENTER = Easing.bezier(...motion.easeEnter);

/** Recent results; wins/losses also carry a sign/label so colour is never the only cue. */
export function HistoryStrip({ items }: { items: HistoryItem[] }) {
  const { c, reduceMotion } = useTheme();
  if (items.length === 0) return <View style={{ height: 30 }} />;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }} style={{ flexGrow: 0 }}>
      {items.slice(0, 16).map((h) => {
        const col = h.win === null ? c.text2 : h.win ? c.win : c.text3;
        return (
          <Animated.View
            key={h.id}
            entering={reduceMotion ? undefined : FadeInLeft.duration(motion.slow).easing(EASE_ENTER)}
            accessibilityLabel={`${h.label} ${h.win === null ? '' : h.win ? '✓' : '✗'}`}
            style={{ paddingHorizontal: 11, height: 30, borderRadius: 15, justifyContent: 'center', backgroundColor: h.win ? alpha(c.win, 0.14) : c.surface1 }}
          >
            <T variant="footnote" weight="semibold" tabular style={{ color: col }}>{h.label}</T>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}
