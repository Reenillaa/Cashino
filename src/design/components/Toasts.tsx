import { useDesktop } from '../layout';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, FadeInUp, FadeOut, FadeOutUp, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { gameArt, motion, onPastel } from '../tokens';
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
  const desktop = useDesktop();
  useEffect(() => {
    if (!head) return;
    sfx(head.kind === 'level' ? 'levelup' : 'notify');
    haptic.success();
    const id = setTimeout(() => pop(head.id), head.kind === 'level' ? 3200 : 2800);
    return () => clearTimeout(id);
  }, [head?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!head) return null;
  if (head.kind === 'level') return <LevelUp key={head.id} level={head.title} gift={head.body} />;
  const isAch = head.kind === 'achievement';
  const ach = isAch ? (t(`achievements.${head.title}`, { returnObjects: true }) as unknown as [string, string]) : null;
  const title = ach ? ach[0] : head.title;
  const body = ach ? ach[1] : head.body;
  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 8 }, desktop && { left: undefined, right: 24, width: 400 }]}>
      <Animated.View key={head.id} entering={reduceMotion ? undefined : FadeInUp.springify().damping(18)} exiting={reduceMotion ? undefined : FadeOutUp} accessibilityLiveRegion="polite">
        <Glass radius={22} style={styles.toast}>
          <View style={[styles.icon, { backgroundColor: c.surface3 }]}>
            <Icon name={isAch ? 'medal' : 'bell'} size={18} color={c.text} />
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
  center: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  levelCard: { width: 280, alignItems: 'center', gap: 6, paddingVertical: 26, paddingHorizontal: 22, borderRadius: 30, overflow: 'hidden' },
});

const CONFETTI = Object.values(gameArt).flatMap((a) => a.colors);

/** Level-up moment: a pastel card rises in the middle while confetti falls. Never blocks touches. */
function LevelUp({ level, gift }: { level: string; gift?: string }) {
  const { t } = useT();
  const { reduceMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const fall = useSharedValue(0);
  useEffect(() => {
    if (!reduceMotion) fall.set(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }));
  }, [reduceMotion, fall]);
  const pieces = React.useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ x: ((i * 37) % 100) / 100, delay: (i % 7) * 0.05, spin: (i % 2 ? 1 : -1) * (180 + (i * 47) % 360), color: CONFETTI[i % CONFETTI.length], w: 6 + (i % 3) * 3 })),
    [],
  );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityLiveRegion="polite">
      {!reduceMotion && pieces.map((p, i) => <Piece key={i} p={p} fall={fall} width={width} height={height} />)}
      <View style={styles.center}>
        <Animated.View entering={reduceMotion ? undefined : FadeInUp.duration(motion.slow).easing(Easing.bezier(...motion.easeEnter))} exiting={reduceMotion ? undefined : FadeOut.duration(motion.base)}>
          <View style={styles.levelCard}>
            <LinearGradient colors={['#FFE6A7', '#FBD3E9', '#C7B9FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Text style={{ fontSize: 56 }} accessible={false}>🎉</Text>
            <T variant="title" weight="semibold" style={{ color: onPastel.text }}>{t('home.levelUp', { n: level })}</T>
            {gift ? <T variant="headline" weight="semibold" style={{ color: '#0F7A45' }}>{t('home.levelGift', { n: gift })}</T> : null}
            <T variant="footnote" style={{ color: onPastel.text2, textAlign: 'center' }}>{t('home.levelUpBody')}</T>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

function Piece({ p, fall, width, height }: { p: { x: number; delay: number; spin: number; color: string; w: number }; fall: SharedValue<number>; width: number; height: number }) {
  const style = useAnimatedStyle(() => {
    const v = Math.max(0, Math.min(1, (fall.value - p.delay) / (1 - p.delay)));
    return {
      opacity: v <= 0 ? 0 : 1 - Math.max(0, v - 0.8) * 5,
      transform: [{ translateX: p.x * width + Math.sin(v * 6 + p.x * 10) * 18 }, { translateY: -40 + v * (height * 0.85) }, { rotate: `${p.spin * v}deg` }],
    };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.w * 1.6, borderRadius: 2, backgroundColor: p.color }, style]} />;
}
