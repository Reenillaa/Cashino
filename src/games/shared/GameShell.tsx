import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameId } from '@/engine/games/types.ts';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { AnimatedNumber, Glass, Icon, IconButton, PressableScale, Sheet, T, formatCoins } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { SCREEN_PAD, motion } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { META } from '@/games/catalog';
import { RULES } from '@/games/rules';
import { type PlayMode } from '@/features/play/session';
import { useRoom, useRooms } from '@/features/play/rooms';
import type { Room } from '@/engine/meta/rooms.ts';
import { useLearning } from '@/state/learning';
import { RoomPicker } from './RoomPicker';
import { TutorialCoach, useTutorialAutostart } from '@/features/tutorial/TutorialCoach';
import { useTutorialRuntime } from '@/features/tutorial/tutorial';
import { FairnessPanel } from './FairnessPanel';
import { useWallet } from '@/state/wallet';

/**
 * Common frame for every game: header (back, name, balance, mode), stage, glass control panel,
 * rules / fairness sheets and the interactive tutorial coach.
 */
export function GameShell({
  game,
  mode,
  balance,
  locked,
  stage,
  controls,
  history,
  forceTutorial,
  stageStyle,
  describeRoom,
}: {
  game: GameId;
  mode: PlayMode;
  balance: number;
  /** True while a round is running (mode switch disabled). */
  locked?: boolean;
  stage: React.ReactNode;
  controls: React.ReactNode;
  history?: React.ReactNode;
  forceTutorial?: boolean;
  stageStyle?: object;
  /** Extra line on each room card (e.g. poker blinds, table chips). */
  describeRoom?: (r: Room) => string | null;
}) {
  const { t, lang } = useT();
  const { c, reduceMotion } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const meta = META[game];
  const [sheet, setSheet] = useState<null | 'rules' | 'fair'>(null);
  const tutorialActive = useTutorialRuntime((s) => s.game === game);
  const room = useRoom(game);
  const chooseRoom = useRooms((s) => s.choose);
  // Every visit opens on the room carousel, unless a round is still running or the first-game tutorial starts.
  const [picked, setPicked] = useState(() => !!locked || !!forceTutorial || !useLearning.getState().isTutorialDone(game));
  const showPicker = !picked && !locked && !tutorialActive;
  useTutorialAutostart(game, !!forceTutorial);
  const rules = RULES[game];
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient pointerEvents="none" colors={[alpha(meta.tint, 0.16), alpha(meta.tint, 0)]} style={[StyleSheet.absoluteFill, { height: 360 }]} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <IconButton icon="chevronLeft" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label={t('common.back')} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T variant="callout" weight="semibold">{t(`games.names.${game}`)}</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <AnimatedNumber value={balance} variant="footnote" weight="medium" color={mode === 'practice' ? 'text3' : 'text2'} />
            <T variant="footnote" color="text3">{mode === 'practice' ? `· ${t('common.practice')}` : 'Ti'}</T>
          </View>
        </View>
        <IconButton icon="info" onPress={() => setSheet('rules')} label={t('common.rules')} />
      </View>
      {showPicker ? (
        <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 10) }}>
          <RoomPicker
            game={game}
            balance={balance}
            initial={room.id}
            describe={describeRoom}
            onPick={(r) => {
              chooseRoom(game, r.id);
              setPicked(true);
            }}
          />
        </View>
      ) : (
        <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(motion.base)}>
          <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PressableScale
              onPress={() => setPicked(false)}
              disabled={locked || tutorialActive}
              feedback="select"
              accessibilityLabel={`${t('rooms.change')}: ${t(`rooms.${room.id}`)} ${room.min}–${room.max}`}
              style={[styles.roomChip, { backgroundColor: c.surface2, borderColor: c.hairlineStrong }]}
            >
              <View style={[styles.roomDot, { backgroundColor: room.practice ? c.text3 : meta.tint }]} />
              <T variant="footnote" weight="semibold">{t(`rooms.${room.id}`)}</T>
              <T variant="footnote" color="text3" tabular>{formatCoins(room.min)}–{formatCoins(room.max)} Ti</T>
              <View style={{ flex: 1 }} />
              {!locked && !tutorialActive ? <Icon name="chevronDown" size={14} color={c.text3} /> : null}
            </PressableScale>
            <PressableScale onPress={() => setSheet('fair')} accessibilityLabel={t('play.fairness')} style={[styles.fairBtn, { backgroundColor: c.surface2 }]}>
              <Icon name="shield" size={16} color={c.text2} />
            </PressableScale>
          </View>
          {mode === 'practice' && (
            <PressableScale onPress={() => useWallet.getState().resetPractice()} feedback="select" style={{ alignSelf: 'center', marginTop: 6 }} accessibilityLabel={t('common.reset')}>
              <T variant="footnote" color="text3">{t('common.practiceBanner')} · {t('common.reset')}</T>
            </PressableScale>
          )}
          <View style={{ marginTop: 10 }}>
            <TutorialCoach game={game} />
          </View>
          {history ? <View style={{ marginTop: 10 }}>{history}</View> : null}
          {/* Stage */}
          <Animated.View style={[{ flex: 1, marginTop: 8 }, stageStyle]} entering={reduceMotion ? undefined : FadeInDown.duration(motion.slow).easing(Easing.bezier(...motion.easeEnter))}>
            {stage}
          </Animated.View>
          {/* Controls (glass, control layer) */}
          {controls ? (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(motion.slow).delay(60).easing(Easing.bezier(...motion.easeEnter))}>
              <Glass radius={28} style={{ marginHorizontal: 10, marginBottom: Math.max(insets.bottom, 10), padding: 14 }}>
                {controls}
              </Glass>
            </Animated.View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, 10) }} />
          )}
        </Animated.View>
      )}
      <Sheet visible={sheet === 'rules'} onClose={() => setSheet(null)} title={`${t('common.rules')} · ${t(`games.names.${game}`)}`}>
        <T variant="body" color="text2">{tr(rules.summary, lang)}</T>
        <View style={{ gap: 10, marginTop: 16 }}>
          {rules.rules.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: meta.tint, marginTop: 8 }} />
              <T variant="body" style={{ flex: 1 }}>{tr(r, lang)}</T>
            </View>
          ))}
        </View>
        <T variant="caption" color="text3" style={{ marginTop: 24, marginBottom: 8 }}>{t('play.probability')}</T>
        {rules.odds.map((o, i) => (
          <View key={i} style={[styles.oddsRow, { borderBottomColor: c.hairline }]}>
            <T variant="footnote" color="text2" style={{ flex: 1 }}>{tr(o.label, lang)}</T>
            <T variant="footnote" weight="semibold" tabular>{o.value}</T>
          </View>
        ))}
        <View style={[styles.oddsRow, { borderBottomColor: c.hairline }]}>
          <T variant="footnote" color="text2" style={{ flex: 1 }}>{t('games.rtp')} · {t('games.houseEdge')}</T>
          <T variant="footnote" weight="semibold" tabular>{meta.rtp} · {meta.edge}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <PressableScale
            onPress={() => {
              setSheet(null);
              useTutorialRuntime.getState().start(game);
            }}
            style={[styles.linkBtn, { backgroundColor: c.surface2 }]}
            accessibilityLabel={t('tutorial.replay')}
          >
            <Icon name="sparkles" size={16} color={c.text} />
            <T variant="footnote" weight="semibold">{t('tutorial.replay')}</T>
          </PressableScale>
          <PressableScale
            onPress={() => {
              setSheet(null);
              router.push(`/academy/${game}`);
            }}
            style={[styles.linkBtn, { backgroundColor: c.surface2 }]}
            accessibilityLabel={t('academy.title')}
          >
            <Icon name="book" size={16} color={c.text} />
            <T variant="footnote" weight="semibold">{t('academy.title')}</T>
          </PressableScale>
        </View>
        <T variant="footnote" color="text3" style={{ marginTop: 20 }}>{t('common.noMoneyDisclaimer')}</T>
      </Sheet>
      <Sheet visible={sheet === 'fair'} onClose={() => setSheet(null)} title={t('play.fairness')}>
        <FairnessPanel online={mode === 'online'} locked={!!locked} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

/** Scrollable row of option controls inside the glass panel. */
export function ControlRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0, marginBottom: 10 }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 },
  fairBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roomChip: { flex: 1, height: 36, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth },
  roomDot: { width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  oddsRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  linkBtn: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
