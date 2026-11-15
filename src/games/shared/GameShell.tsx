import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameId } from '@/engine/games/types.ts';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';
import { AnimatedNumber, Icon, IconButton, PressableScale, Sheet, T, formatCoins } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { gameArt, motion, roomArt } from '@/design/tokens';
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
 * Common frame for every game: header (back, name, balance), room carousel, stage, docked control panel,
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
  const art = gameArt[game];
  const [sheet, setSheet] = useState<null | 'rules' | 'fair'>(null);
  const tutorialActive = useTutorialRuntime((s) => s.game === game);
  const room = useRoom(game);
  const chooseRoom = useRooms((s) => s.choose);
  // Every visit opens on the room carousel, unless a round is still running or the first-game tutorial starts.
  const [picked, setPicked] = useState(() => !!locked || !!forceTutorial || !useLearning.getState().isTutorialDone(game));
  // When the tutorial ends (finished or skipped) the player chooses a real room next.
  const [wasTutorial, setWasTutorial] = useState(tutorialActive);
  if (wasTutorial !== tutorialActive) {
    setWasTutorial(tutorialActive);
    if (!tutorialActive && !locked) setPicked(false);
  }
  const showPicker = !picked && !locked && !tutorialActive;
  useTutorialAutostart(game, !!forceTutorial);
  const rules = RULES[game];
  const enter = reduceMotion ? undefined : FadeInDown.duration(motion.slow).easing(Easing.bezier(...motion.easeEnter));
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient pointerEvents="none" colors={[alpha(art.colors[1], 0.13), alpha(art.colors[0], 0.04), alpha(art.colors[0], 0)]} locations={[0, 0.55, 1]} style={[StyleSheet.absoluteFill, { height: 420 }]} />
      {/* Header: back · game + balance · rules */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <IconButton icon="chevronLeft" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label={t('common.back')} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18 }} accessible={false}>{art.emoji}</Text>
            <T variant="callout" weight="semibold">{t(`games.names.${game}`)}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <AnimatedNumber value={balance} variant="footnote" weight="medium" color="text2" />
            <T variant="footnote" color="text3">{mode === 'practice' ? `· ${t('common.practice')}` : t('common.coins')}</T>
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
        <Animated.View style={{ flex: 1 }} entering={reduceMotion ? undefined : FadeIn.duration(motion.slow)}>
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <PressableScale
              onPress={() => setPicked(false)}
              disabled={locked || tutorialActive}
              feedback="select"
              scaleTo={0.96}
              accessibilityLabel={`${t('rooms.change')}: ${t(`rooms.${room.id}`)} ${room.min}–${room.max}`}
              style={[styles.roomChip, { backgroundColor: c.surface2 }]}
            >
              <Text style={{ fontSize: 15 }} accessible={false}>{roomArt[room.id].emoji}</Text>
              <T variant="footnote" weight="semibold">{t(`rooms.${room.id}`)}</T>
              <T variant="footnote" color="text3" tabular>{formatCoins(room.min)}–{formatCoins(room.max)}</T>
              {!locked && !tutorialActive ? <Icon name="chevronDown" size={14} color={c.text3} /> : null}
            </PressableScale>
          </View>
          {mode === 'practice' && !tutorialActive && (
            <PressableScale onPress={() => useWallet.getState().resetPractice()} feedback="select" style={{ alignSelf: 'center', marginTop: 6 }} accessibilityLabel={t('common.reset')}>
              <T variant="footnote" color="text3">{t('common.practiceBanner')} · {t('common.reset')}</T>
            </PressableScale>
          )}
          <View style={{ marginTop: 10 }}>
            <TutorialCoach game={game} />
          </View>
          {history ? <View style={{ marginTop: 10 }}>{history}</View> : null}
          {/* Stage */}
          <Animated.View style={[{ flex: 1, marginTop: 8 }, stageStyle]} entering={enter}>
            {stage}
          </Animated.View>
          {/* Controls: a solid panel docked to the bottom edge */}
          {controls ? (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(motion.slow).delay(70).easing(Easing.bezier(...motion.easeEnter))}>
              <View style={[styles.panel, { backgroundColor: c.surface1, paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
                {controls}
              </View>
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
        <PressableScale onPress={() => setSheet('fair')} style={[styles.linkBtn, { backgroundColor: c.surface2, marginTop: 10, flex: 0 }]} accessibilityLabel={t('play.fairness')}>
          <Icon name="shield" size={16} color={c.text} />
          <T variant="footnote" weight="semibold">{t('play.fairness')}</T>
        </PressableScale>
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
  roomChip: { height: 36, borderRadius: 18, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  panel: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 16 },
  oddsRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  linkBtn: { flex: 1, height: 44, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
});
