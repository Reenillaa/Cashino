import React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInLeft } from 'react-native-reanimated';
import { T } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';

export interface HistoryItem {
  id: string;
  label: string;
  win: boolean | null; // null = neutral (push / info)
}

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
            entering={reduceMotion ? undefined : FadeInLeft.springify().damping(18)}
            accessibilityLabel={`${h.label} ${h.win === null ? '' : h.win ? '✓' : '✗'}`}
            style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, justifyContent: 'center', backgroundColor: h.win ? alpha(c.win, 0.14) : c.surface2 }}
          >
            <T variant="footnote" weight="semibold" tabular style={{ color: col }}>{h.label}</T>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}
