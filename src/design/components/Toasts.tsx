import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProgress } from '@/state/progress';
import { useT } from '@/i18n';
import { Glass } from './Glass';
import { T } from './Text';
import { Icon } from './Icon';
import { useTheme } from '../theme';
import { sfx } from '@/services/audio';
import { haptic } from '@/services/haptics';

/** In-app notifications for level-ups, achievements and missions. Non-blocking, auto-dismiss. */
export function Toasts() {
  const toasts = useProgress((s) => s.toasts);
  const pop = useProgress((s) => s.popToast);
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { c, reduceMotion } = useTheme();
  const head = toasts[0];
  useEffect(() => {
    if (!head) return;
    sfx(head.kind === 'level' ? 'levelup' : 'notify');
    haptic.success();
    const id = setTimeout(() => pop(head.id), 2800);
    return () => clearTimeout(id);
  }, [head?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!head) return null;
  const isAch = head.kind === 'achievement';
  const ach = isAch ? (t(`achievements.${head.title}`, { returnObjects: true }) as unknown as [string, string]) : null;
  const title = head.kind === 'level' ? `${t('common.level')} ${head.title}` : ach ? ach[0] : head.title;
  const body = head.kind === 'level' ? '🎉' : ach ? ach[1] : head.body;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Animated.View key={head.id} entering={reduceMotion ? undefined : FadeInUp.springify().damping(18)} exiting={reduceMotion ? undefined : FadeOutUp} accessibilityLiveRegion="polite">
        <Glass radius={22} style={styles.toast}>
          <View style={[styles.icon, { backgroundColor: c.surface3 }]}>
            <Icon name={head.kind === 'level' ? 'arrowUp' : isAch ? 'medal' : 'bell'} size={18} color={c.text} />
          </View>
          <View style={{ flex: 1 }}>
            <T variant="callout" weight="semibold">{title}</T>
            {body ? <T variant="footnote" color="text2">{body}</T> : null}
          </View>
        </Glass>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 16 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
