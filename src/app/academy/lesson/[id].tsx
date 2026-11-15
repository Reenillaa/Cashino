import React, { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Icon, PressableScale, ProgressBar, Screen, Surface, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { lessonById } from '@/features/academy/content';
import { useLearning } from '@/state/learning';
import { useProgress } from '@/state/progress';
import { XP } from '@/engine/meta/progression.ts';
import { SP } from '@/engine/meta/ranking.ts';
import { haptic } from '@/services/haptics';
import { sfx } from '@/services/audio';
import { syncLearningSoon } from '@/features/sync/sync';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const { c, reduceMotion } = useTheme();
  const router = useRouter();
  const lesson = lessonById(id);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  if (!lesson) return <Screen back tabBar={false} />;
  const total = lesson.cards.length + lesson.quiz.length;
  const inQuiz = step >= lesson.cards.length;
  const qi = step - lesson.cards.length;
  const qq = inQuiz ? lesson.quiz[qi] : null;
  const picked = inQuiz ? answers[qi] ?? null : null;
  const finish = () => {
    const score = lesson.quiz.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    const learning = useLearning.getState();
    const firstTime = learning.completeLesson(lesson.id);
    const perfectFirst = learning.recordQuiz(lesson.id, score, lesson.quiz.length);
    const p = useProgress.getState();
    if (firstTime) {
      p.addXp(XP.lessonComplete);
      p.addSeasonPoints(SP.lesson);
      p.missionEvent({ type: 'lesson', game: lesson.game });
    }
    if (perfectFirst) {
      p.addXp(XP.quizPerfect);
      p.missionEvent({ type: 'quiz', game: lesson.game });
    }
    p.checkAchievements({ lessons: Object.keys(useLearning.getState().lessons).length, tutorials: Object.values(useLearning.getState().tutorials).filter(Boolean).length });
    syncLearningSoon();
    sfx('levelup', 0.6);
    p.pushToast({ kind: 'info', title: t('academy.completed'), body: `${t('academy.score', { n: score, total: lesson.quiz.length })}${firstTime ? ` · +${XP.lessonComplete} XP` : ''}` });
    router.back();
  };
  return (
    <Screen title={tr(lesson.title, lang)} subtitle={`${t(`games.names.${lesson.game}`)} · ${t(`academy.${lesson.level}`)}`} back tabBar={false} scroll={false}>
      <View style={{ paddingHorizontal: SCREEN_PAD }}>
        <ProgressBar value={(step + 1) / total} height={4} />
      </View>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: SCREEN_PAD }}>
        <Animated.View key={step} entering={reduceMotion ? undefined : FadeInRight.springify().damping(20)}>
          {!inQuiz ? (
            <Surface brushed style={{ padding: 24, minHeight: 220, justifyContent: 'center' }}>
              <T variant="caption" color="text3">{step + 1} / {lesson.cards.length}</T>
              <T variant="headline" style={{ marginTop: 10, lineHeight: 28 }}>{tr(lesson.cards[step], lang)}</T>
            </Surface>
          ) : (
            <View style={{ gap: 10 }}>
              <T variant="caption" color="text3">{t('academy.quiz')} · {qi + 1}/{lesson.quiz.length}</T>
              <T variant="headline">{tr(qq!.q, lang)}</T>
              {qq!.options.map((o, i) => {
                const right = i === qq!.answer;
                const show = picked !== null && (i === picked || right);
                return (
                  <PressableScale
                    key={i}
                    disabled={picked !== null}
                    onPress={() => {
                      setAnswers((a) => {
                        const n = [...a];
                        n[qi] = i;
                        return n;
                      });
                      if (right) haptic.success();
                      else haptic.warning();
                    }}
                    accessibilityLabel={tr(o, lang)}
                    style={{ minHeight: 52, borderRadius: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface1, borderWidth: 1.5, borderColor: show ? (right ? c.win : c.loss) : c.hairline }}
                  >
                    <T variant="body" style={{ flex: 1 }}>{tr(o, lang)}</T>
                    {show && <Icon name={right ? 'check' : 'close'} size={18} color={right ? c.win : c.loss} />}
                  </PressableScale>
                );
              })}
              {picked !== null && (
                <Surface level={2}>
                  <T variant="callout" weight="semibold" color={picked === qq!.answer ? 'win' : 'loss'}>{picked === qq!.answer ? t('academy.correct') : t('academy.incorrect')}</T>
                  <T variant="footnote" color="text2" style={{ marginTop: 4 }}>{tr(qq!.explain, lang)}</T>
                </Surface>
              )}
            </View>
          )}
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: SCREEN_PAD, paddingBottom: 34 }}>
        <Button title={t('common.back')} kind="secondary" disabled={step === 0} onPress={() => setStep((s) => s - 1)} style={{ flex: 1 }} />
        {step + 1 < total ? (
          <Button title={t('common.next')} disabled={inQuiz && picked === null} onPress={() => setStep((s) => s + 1)} style={{ flex: 2 }} />
        ) : (
          <Button title={t('academy.finish')} disabled={inQuiz && picked === null} onPress={finish} style={{ flex: 2 }} />
        )}
      </View>
    </Screen>
  );
}
