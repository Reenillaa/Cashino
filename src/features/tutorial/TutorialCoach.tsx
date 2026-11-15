import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import type { GameId } from '@/engine/games/types.ts';
import { Icon, PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { motion } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { useLearning } from '@/state/learning';
import { useProgress } from '@/state/progress';
import { useRooms, type RoomId } from '@/features/play/rooms';
import { XP } from '@/engine/meta/progression.ts';
import { TUTORIALS } from './content';
import { useTutorialRuntime } from './tutorial';
import { measureTarget, type TargetRect } from './TutorialTarget';
import { haptic } from '@/services/haptics';

const EASE_ENTER = Easing.bezier(...motion.easeEnter);
const PAD = 8;
const INK = '#0B0B0F';
const INK2 = 'rgba(11,11,15,0.62)';
const GREEN = '#0F9D58';
const DIM = 'rgba(0,0,0,0.55)';

/** The guide is optional: it only starts from the "?" help (or a "show me" link elsewhere). */
export function useTutorialAutostart(game: GameId, force: boolean) {
  useEffect(() => {
    if (force) useTutorialRuntime.getState().start(game);
    return () => {
      if (useTutorialRuntime.getState().game === game) useTutorialRuntime.getState().stop();
    };
  }, [game, force]);
}

const same = (a: TargetRect | null, b: TargetRect | null) =>
  a === b || (!!a && !!b && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1 && Math.abs(a.h - b.h) < 1);

/**
 * Guided tutorial as coach marks: the screen dims except for the one control to use, which gets a soft
 * pulsing ring, and a small white bubble says what to do. The real game keeps working underneath.
 */
export function TutorialCoach({ game }: { game: GameId }) {
  const { t, lang } = useT();
  const { reduceMotion } = useTheme();
  const active = useTutorialRuntime((s) => s.game === game);
  const step = useTutorialRuntime((s) => s.step);
  const steps = TUTORIALS[game];
  const cur = active ? steps[step] : undefined;
  const targetId = !cur ? undefined : cur.target === undefined ? (cur.kind === 'do' ? cur.event : undefined) : cur.target ?? undefined;
  const [track, setTrack] = useState<{ id: string; r: TargetRect | null } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [pickedState, setPickedState] = useState<{ step: number; i: number } | null>(null);
  const picked = pickedState?.step === step ? pickedState.i : null;
  const prevRoom = useRef<RoomId | null | undefined>(undefined);
  const pulse = useSharedValue(0);

  const finish = (completed: boolean) => {
    useLearning.getState().completeTutorial(game);
    if (completed) {
      useProgress.getState().addXp(XP.tutorialComplete);
      useProgress.getState().pushToast({ kind: 'info', title: t('tutorial.finish'), body: `+${XP.tutorialComplete} XP` });
    }
    // Give the previous room back in the same update, so the room carousel that follows starts on it.
    if (prevRoom.current !== undefined) {
      useRooms.getState().choose(game, prevRoom.current ?? 'r1');
      prevRoom.current = undefined;
    }
    useTutorialRuntime.getState().stop();
  };
  const advance = () => {
    const s = useTutorialRuntime.getState().step;
    if (s + 1 >= steps.length) finish(true);
    else useTutorialRuntime.getState().next();
  };

  // Free practice room while the guide runs, previous room restored afterwards.
  useEffect(() => {
    const rooms = useRooms.getState();
    if (active) {
      prevRoom.current = rooms.byGame[game] ?? null;
      rooms.choose(game, 'practice');
    } else if (prevRoom.current !== undefined) {
      rooms.choose(game, prevRoom.current ?? 'r1');
      prevRoom.current = undefined;
    }
  }, [active, game]);

  // Advance "do" steps when the real game emits the expected event.
  useEffect(() => {
    if (!active) return;
    const rt = useTutorialRuntime.getState();
    const l = (g: GameId, e: string) => {
      const s = useTutorialRuntime.getState();
      const st = TUTORIALS[g]?.[s.step];
      if (g === game && st?.kind === 'do' && st.event === e) {
        haptic.success();
        advance();
      }
    };
    rt.listeners.add(l);
    return () => void rt.listeners.delete(l);
  }, [active, game]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the highlighted control: it can move while cards animate or the panel changes.
  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    const tick = () =>
      void measureTarget(targetId).then((r) => {
        if (alive) setTrack((prev) => (prev?.id === targetId && same(prev.r, r) ? prev : { id: targetId, r }));
      });
    tick();
    const iv = setInterval(tick, 250);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [targetId]);

  useEffect(() => {
    pulse.set(0);
    if (!reduceMotion) pulse.set(withRepeat(withSequence(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) })), -1));
  }, [targetId, reduceMotion, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.05 * pulse.value }], opacity: 1 - 0.45 * pulse.value }));

  if (!cur) return null;
  const r = targetId && track?.id === targetId ? track.r : null;
  const W = box.w, H = box.h;
  const hole = r && W > 0 ? { x: Math.max(4, r.x - PAD), y: Math.max(4, r.y - PAD), w: Math.min(W - 8, r.w + PAD * 2), h: r.h + PAD * 2 } : null;
  const below = hole ? hole.y + hole.h / 2 < H / 2 : false;
  const arrowX = hole ? Math.max(28, Math.min(W - 60, hole.x + hole.w / 2 - 16)) : 0;
  const answered = cur.kind === 'quiz' && picked !== null;
  const last = step + 1 >= steps.length;
  // "Do" steps point at a control in the game: keep the bubble small so the table stays visible.
  const compact = cur.kind === 'do' && !!hole;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* Dim everything except the hole around the control to use (touches still pass through). */}
      {hole ? (
        <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill} entering={reduceMotion ? undefined : FadeIn.duration(motion.base)} key={`dim-${step}`}>
          <View style={[styles.dim, { left: 0, top: 0, width: W, height: hole.y }]} />
          <View style={[styles.dim, { left: 0, top: hole.y + hole.h, width: W, height: Math.max(0, H - hole.y - hole.h) }]} />
          <View style={[styles.dim, { left: 0, top: hole.y, width: hole.x, height: hole.h }]} />
          <View style={[styles.dim, { left: hole.x + hole.w, top: hole.y, width: Math.max(0, W - hole.x - hole.w), height: hole.h }]} />
          <Animated.View style={[styles.ring, { left: hole.x, top: hole.y, width: hole.w, height: hole.h }, ring]} />
        </Animated.View>
      ) : (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} entering={reduceMotion ? undefined : FadeIn.duration(motion.base)} key={`dim-${step}`} />
      )}

      {/* The bubble: above the control when it is low on screen, below it otherwise. */}
      <Animated.View
        key={`bubble-${step}`}
        entering={reduceMotion ? undefined : FadeInDown.duration(motion.slow).easing(EASE_ENTER)}
        exiting={reduceMotion ? undefined : FadeOut.duration(motion.fast)}
        accessibilityLiveRegion="polite"
        style={[
          styles.bubbleWrap,
          hole ? (below ? { top: hole.y + hole.h + 14 } : { bottom: H - hole.y + 14 }) : { top: Math.max(90, H * 0.2) },
        ]}
      >
        {hole && below ? <View style={[styles.arrow, { top: -7, left: arrowX - 16 }]} /> : null}
        <View style={[styles.bubble, compact && { padding: 14, borderRadius: 20 }]}>
          <View style={styles.top}>
            <View style={{ flexDirection: 'row', gap: 5, flex: 1 }} accessibilityLabel={t('tutorial.step', { n: step + 1, total: steps.length })}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.dot, { width: i === step ? 18 : 6, backgroundColor: i <= step ? INK : 'rgba(11,11,15,0.18)' }]} />
              ))}
            </View>
            <PressableScale onPress={() => finish(false)} accessibilityLabel={t('tutorial.skip')} hitSlop={12} style={styles.exit}>
              <T variant="footnote" weight="medium" style={{ color: INK2 }}>{t('tutorial.skip')}</T>
              <Icon name="close" size={14} color={INK2} />
            </PressableScale>
          </View>
          <T variant="headline" weight="semibold" style={{ color: INK, marginTop: 8, fontSize: compact ? 17 : 20, lineHeight: compact ? 22 : 26 }}>{tr(cur.title, lang)}</T>
          <T variant="body" style={{ color: INK2, marginTop: 2, fontSize: compact ? 15 : 16, lineHeight: compact ? 20 : 22 }}>{tr(cur.body, lang)}</T>

          {cur.kind === 'quiz' && (
            <View style={{ gap: 8, marginTop: 12 }}>
              {cur.options!.map((o, i) => {
                const right = i === cur.answer;
                const show = picked !== null && (i === picked || right);
                return (
                  <PressableScale
                    key={i}
                    disabled={picked !== null}
                    onPress={() => {
                      setPickedState({ step, i });
                      if (right) haptic.success();
                      else haptic.warning();
                    }}
                    style={[styles.option, { borderColor: show ? (right ? GREEN : '#D23F3F') : 'rgba(11,11,15,0.12)', backgroundColor: show && right ? 'rgba(15,157,88,0.08)' : '#F3F3F5' }]}
                    accessibilityLabel={tr(o, lang)}
                  >
                    <T variant="callout" weight="medium" style={{ flex: 1, color: INK }}>{tr(o, lang)}</T>
                    {show && <Icon name={right ? 'check' : 'close'} size={18} color={right ? GREEN : '#D23F3F'} />}
                  </PressableScale>
                );
              })}
              {answered && <T variant="footnote" style={{ color: INK2 }}>{tr(cur.explain!, lang)}</T>}
            </View>
          )}

          <View style={[styles.actions, compact && { marginTop: 6 }]}>
            {cur.kind === 'do' ? (
              <T variant="callout" weight="semibold" style={{ color: GREEN }}>{hole ? `${below ? '👆' : '👇'} ${t('tutorial.tapHere')}` : t('tutorial.tapHere')}</T>
            ) : (
              <PressableScale
                onPress={advance}
                disabled={cur.kind === 'quiz' && !answered}
                accessibilityLabel={last ? t('tutorial.finish') : t('tutorial.gotIt')}
                style={[styles.next, cur.kind === 'quiz' && !answered && { opacity: 0.35 }]}
              >
                <T variant="callout" weight="semibold" style={{ color: '#fff' }}>{last ? t('tutorial.finish') : t('tutorial.gotIt')}</T>
              </PressableScale>
            )}
          </View>
        </View>
        {hole && !below ? <View style={[styles.arrow, { bottom: -7, left: arrowX - 16 }]} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderRadius: 22, borderWidth: 3, borderColor: '#4ADE9B' },
  bubbleWrap: { position: 'absolute', left: 16, right: 16 },
  bubble: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  arrow: { position: 'absolute', width: 16, height: 16, backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }], marginLeft: 16 },
  top: { flexDirection: 'row', alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  exit: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingLeft: 8 },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5 },
  actions: { marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  next: { height: 46, paddingHorizontal: 22, borderRadius: 23, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
});
