import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut } from 'react-native-reanimated';
import type { GameId } from '@/engine/games/types.ts';
import { Icon, PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { motion } from '@/design/tokens';
import { useT } from '@/i18n';
import { useTutorialRuntime } from '@/features/tutorial/tutorial';

const EASE = Easing.bezier(...motion.easeEnter);

/**
 * Secondary settings of a game (risk, mines, target…) folded into one slim line that says what is chosen.
 * Tap to change. It opens by itself while the guided tutorial runs, so the guide can point inside it.
 */
export function MoreOptions({ game, summary, children, disabled }: { game: GameId; summary: string; children: React.ReactNode; disabled?: boolean }) {
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const guided = useTutorialRuntime((s) => s.game === game);
  const [open, setOpen] = useState(false);
  const shown = (open || guided) && !disabled;
  return (
    <View style={{ marginBottom: 10 }}>
      <PressableScale
        onPress={() => setOpen((o) => !o)}
        disabled={guided || disabled}
        feedback="select"
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
        accessibilityLabel={`${summary}. ${shown ? t('play.hideOptions') : t('play.change')}`}
        style={[styles.row, { backgroundColor: c.surface2 }]}
      >
        <Icon name="settings" size={16} color={c.text2} />
        <T variant="callout" weight="medium" numberOfLines={1} style={{ flex: 1 }}>{summary}</T>
        {!disabled && <T variant="footnote" weight="semibold" color="text2">{shown ? t('play.hideOptions') : t('play.change')}</T>}
      </PressableScale>
      {shown ? (
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(motion.slide).easing(EASE)} exiting={reduceMotion ? undefined : FadeOut.duration(motion.fast)} style={{ marginTop: 12 }}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
