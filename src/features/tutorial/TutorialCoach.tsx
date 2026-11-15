import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut } from 'react-native-reanimated';
import type { GameId } from '@/engine/games/types.ts';
import { Button, Icon, PressableScale, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { motion } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { useLearning } from '@/state/learning';
import { useProgress } from '@/state/progress';
import { useRooms, type RoomId } from '@/features/play/rooms';
import { XP } from '@/engine/meta/progression.ts';
import { TUTORIALS } from './content';
import { useTutorialRuntime } from './tutorial';
import { haptic } from '@/services/haptics';

/** Starts the tutorial automatically the first time, or when `force` is set (Rules/Help → replay). */
export function useTutorialAutostart(game: GameId, force: boolean) {
  const done = useLearning((s) => s.isTutorialDone(game));
  useEffect(() => {
    if (force || !done) useTutorialRuntime.getState().start(game);
    return () => {
      if (useTutorialRuntime.getState().game === game) useTutorialRuntime.getState().stop();
    };
  }, [game, force]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function TutorialCoach({ game }: { game: GameId }) {
  const { t, lang } = useT();
  const { c, reduceMotion } = useTheme();
  const active = useTutorialRuntime((s) => s.game === game);
  const step = useTutorialRuntime((s) => s.step);
  const steps = TUTORIALS[game];
  const cur = steps[step];
  const [pickedState, setPickedState] = useState<{ step: number; i: number } | null>(null);
  const picked = pickedState?.step === step ? pickedState.i : null;
  const setPicked = (i: number) => setPickedState({ step, i });
  const prevRoom = useRef<RoomId | null | undefined>(undefined);

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

  // Free practice room while the tutorial runs, previous room restored afterwards.
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

  if (!active || !cur) return null;
  const answered = cur.kind === 'quiz' && picked !== null;
  return (
    <Animated.View key={step} entering={reduceMotion ? undefined : FadeInDown.duration(motion.slow).easing(Easing.bezier(...motion.easeEnter))} exiting={reduceMotion ? undefined : FadeOut.duration(motion.fast)} style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={[styles.card, { backgroundColor: c.surface2 }]}>
        <View style={styles.top}>
          <T variant="caption" color="text3" style={{ flex: 1 }}>{t('tutorial.step', { n: step + 1, total: steps.length })}</T>
          <PressableScale onPress={() => finish(false)} accessibilityLabel={t('tutorial.skip')} hitSlop={10}>
            <T variant="footnote" color="text3">{t('tutorial.skip')}</T>
          </PressableScale>
        </View>
        <T variant="headline" weight="semibold" style={{ marginTop: 6, fontSize: 18 }}>{tr(cur.title, lang)}</T>
        <T variant="body" color="text2" style={{ marginTop: 4 }}>{tr(cur.body, lang)}</T>
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
                    setPicked(i);
                    if (right) haptic.success();
                    else haptic.warning();
                  }}
                  style={[styles.option, { borderColor: show ? (right ? c.win : c.loss) : 'transparent', backgroundColor: c.surface3 }]}
                  accessibilityLabel={tr(o, lang)}
                >
                  <T variant="callout" weight="medium" style={{ flex: 1 }}>{tr(o, lang)}</T>
                  {show && <Icon name={right ? 'check' : 'close'} size={16} color={right ? c.win : c.loss} />}
                </PressableScale>
              );
            })}
            {answered && (
              <T variant="footnote" color="text2">
                <T variant="footnote" weight="semibold" color={picked === cur.answer ? 'win' : 'loss'}>{picked === cur.answer ? t('academy.correct') : t('academy.incorrect')} </T>
                {tr(cur.explain!, lang)}
              </T>
            )}
          </View>
        )}
        <View style={styles.actions}>
          {cur.kind === 'do' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="arrowDown" size={16} color={c.text3} />
              <T variant="footnote" color="text3">{lang === 'en' ? 'Do it in the game below' : 'Hazlo en el juego'}</T>
            </View>
          ) : (
            <Button
              title={step + 1 >= steps.length ? t('tutorial.finish') : cur.kind === 'quiz' ? t('common.next') : t('tutorial.gotIt')}
              size="sm"
              disabled={cur.kind === 'quiz' && !answered}
              onPress={advance}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, zIndex: 20 },
  card: { padding: 18, borderRadius: 24 },
  top: { flexDirection: 'row', alignItems: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5 },
  actions: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },
});
