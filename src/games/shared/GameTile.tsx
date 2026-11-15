import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameId } from '@/engine/games/types.ts';
import { PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { gameArt, motion, onPastel, radius } from '@/design/tokens';
import { useT } from '@/i18n';

const EASE_ENTER = Easing.bezier(...motion.easeEnter);

/**
 * Offsuit-style game card: soft pastel gradient, big emoji, dark type. One tap opens the game
 * (which then asks for the room). `big` is the wide carousel card, otherwise a grid tile.
 */
export function GameTile({
  id, onPress, big, index = 0, badge, style,
}: { id: GameId; onPress: () => void; big?: boolean; index?: number; badge?: string; style?: StyleProp<ViewStyle> }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const art = gameArt[id];
  const name = t(`games.names.${id}`);
  const blurb = t(`games.blurbs.${id}`);
  return (
    <Animated.View
      style={style}
      entering={reduceMotion ? undefined : FadeInDown.duration(520).delay(Math.min(index, 10) * 45).easing(EASE_ENTER)}
    >
      <PressableScale onPress={onPress} scaleTo={0.965} feedback="light" accessibilityLabel={`${name}. ${blurb}`}>
        <View style={[styles.card, big ? styles.big : styles.tile]}>
          <LinearGradient colors={art.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.top}>
            <Text style={{ fontSize: big ? 46 : 38, lineHeight: big ? 54 : 46 }} accessible={false}>{art.emoji}</Text>
            {badge ? (
              <View style={[styles.badge, { backgroundColor: onPastel.chip }]}>
                <T variant="caption" weight="semibold" style={{ color: onPastel.text, fontSize: 11 }}>{badge}</T>
              </View>
            ) : null}
          </View>
          <View style={{ flex: 1 }} />
          <T variant="headline" weight="semibold" numberOfLines={1} style={{ color: onPastel.text, fontSize: big ? 22 : 18, lineHeight: big ? 28 : 23 }}>
            {name}
          </T>
          <T variant="footnote" numberOfLines={2} style={{ color: onPastel.text2, marginTop: 2, fontSize: big ? 14 : 13 }}>
            {blurb}
          </T>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, padding: 16, overflow: 'hidden' },
  tile: { height: 172 },
  big: { width: 270, height: 196, padding: 20 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
});
