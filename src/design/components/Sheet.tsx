import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { motion, radius, SCREEN_PAD } from '../tokens';
import { T } from './Text';
import { IconButton } from './Screen';

/** Bottom sheet (glass-like, spring in, fade backdrop). Content scrolls when long. */
export function Sheet({ visible, onClose, title, children, maxHeight = 0.86 }: { visible: boolean; onClose: () => void; title?: string; children: React.ReactNode; maxHeight?: number }) {
  const { c, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  // Derived state: mount immediately when opened; unmount after the closing animation.
  if (visible && !mounted) setMounted(true);
  const y = useSharedValue(height);
  const fade = useSharedValue(0);
  useEffect(() => {
    if (visible) {
      fade.set(withTiming(1, { duration: reduceMotion ? 0 : motion.base }));
      y.set(reduceMotion ? 0 : withSpring(0, motion.smooth));
    } else {
      fade.set(withTiming(0, { duration: reduceMotion ? 0 : motion.fast }));
      y.set(
        withTiming(height, { duration: reduceMotion ? 0 : 220, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(setMounted)(false);
        }),
      );
    }
  }, [visible, reduceMotion, height, fade, y]);
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  if (!mounted) return null;
  return (
    <Modal transparent visible onRequestClose={onClose} statusBarTranslucent animationType="none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }, backdrop]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: c.bgElevated, maxHeight: height * maxHeight, paddingBottom: insets.bottom + 16, borderColor: c.hairlineStrong }, sheet]}
      >
        <View style={[styles.grabber, { backgroundColor: c.hairlineStrong }]} />
        {title ? (
          <View style={styles.header}>
            <T variant="headline" style={{ flex: 1 }} accessibilityRole="header">{title}</T>
            <IconButton icon="close" onPress={onClose} label="Close" />
          </View>
        ) : null}
        <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_PAD, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_PAD, paddingBottom: 12, gap: 12 },
});
