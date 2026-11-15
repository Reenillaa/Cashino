import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { GameId } from '@/engine/games/types.ts';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { AccentContext, AnimatedNumber, Aurora, GameGlyph, Icon, IconButton, PressableScale, Sheet, T, formatCoins } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { gameVivid, motion, roomArt } from '@/design/tokens';
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
import { GameIntro } from '@/features/brand/Splash';
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
  const vivid = gameVivid[game];
  const [sheet, setSheet] = useState<null | 'rules' | 'fair'>(null);
  const tutorialActive = useTutorialRuntime((s) => s.game === game);
  const room = useRoom(game);
  const chooseRoom = useRooms((s) => s.choose);
  // Every visit opens on the room carousel, unless a round is still running or a guide was requested.
  const [picked, setPicked] = useState(() => !!locked || !!forceTutorial);
  const tutorialDone = useLearning((s) => s.isTutorialDone(game));
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
  const startGuide = () => {
    setSheet(null);
    setPicked(true);
    useTutorialRuntime.getState().start(game);
  };
  return (
    <AccentContext.Provider value={vivid}>
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Aurora colors={[vivid[0], vivid[1], vivid[0]]} alpha={0.34} />
      {/* Header: back · game + balance · rules */}
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <IconButton icon="chevronLeft" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label={t('common.back')} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GameGlyph game={game} size={26} />
            <T variant="callout" weight="semibold">{t(`games.names.${game}`)}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <AnimatedNumber value={balance} variant="footnote" weight="semibold" color={mode === 'practice' ? 'text2' : 'win'} />
            <T variant="footnote" color="text3">{mode === 'practice' ? `· ${t('common.practice')}` : t('common.coins')}</T>
          </View>
        </View>
        <HelpButton onPress={() => setSheet('rules')} label={t('tutorial.help')} hint={!tutorialDone && !tutorialActive} />
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
          {history ? <View style={{ marginTop: 10 }}>{history}</View> : null}
          {/* Stage */}
          <Animated.View style={[{ flex: 1, marginTop: 8 }, stageStyle]} entering={enter}>
            {stage}
          </Animated.View>
          {/* Controls: a solid panel docked to the bottom edge */}
          {controls ? (
            <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(motion.slow).delay(70).easing(Easing.bezier(...motion.easeEnter))}>
              <View style={[styles.panel, { backgroundColor: 'rgba(16,14,24,0.92)', paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
                <LinearGradient pointerEvents="none" colors={[alpha(vivid[0], 0.9), alpha(vivid[1], 0.9)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.panelEdge} />
                <LinearGradient pointerEvents="none" colors={[alpha(vivid[0], 0.14), 'rgba(0,0,0,0)']} end={{ x: 0, y: 0.5 }} style={StyleSheet.absoluteFill} />
                {controls}
              </View>
            </Animated.View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, 10) }} />
          )}
        </Animated.View>
      )}
      {/* Branded curtain on entry, then the guided tutorial overlay (coach marks) */}
      <GameIntro game={game} name={t(`games.names.${game}`)} />
      <TutorialCoach game={game} />
      <Sheet visible={sheet === 'rules'} onClose={() => setSheet(null)} title={t('tutorial.help')}>
        {!locked && (
          <PressableScale onPress={startGuide} scaleTo={0.98} accessibilityLabel={t('tutorial.guided')} style={[styles.guide, { backgroundColor: c.surface2 }]}>
            <Text style={{ fontSize: 34 }} accessible={false}>🎓</Text>
            <View style={{ flex: 1 }}>
              <T variant="headline" weight="semibold">{t('tutorial.guided')}</T>
              <T variant="footnote" color="text2" style={{ marginTop: 2 }}>{t('tutorial.guidedBody')}</T>
            </View>
            <Icon name="chevronRight" size={18} color={c.text3} />
          </PressableScale>
        )}
        <T variant="headline" weight="medium" style={{ marginTop: 22, marginBottom: 6 }}>{t('tutorial.rulesTitle')}</T>
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
          <T variant="footnote" weight="semibold">{t('tutorial.fairness')}</T>
        </PressableScale>
        <T variant="footnote" color="text3" style={{ marginTop: 20 }}>{t('common.noMoneyDisclaimer')}</T>
      </Sheet>
      <Sheet visible={sheet === 'fair'} onClose={() => setSheet(null)} title={t('play.fairness')}>
        <FairnessPanel online={mode === 'online'} locked={!!locked} />
      </Sheet>
    </KeyboardAvoidingView>
    </AccentContext.Provider>
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
  panel: { borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 16, paddingTop: 14, overflow: 'hidden' },
  panelEdge: { position: 'absolute', top: 0, left: 30, right: 30, height: 2, borderRadius: 1 },
  oddsRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  linkBtn: { flex: 1, height: 48, borderRadius: 24, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  guide: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22 },
  help: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  helpDot: { position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});

/** "?" in the top-right corner. Until the player has seen the guide once, a small green dot breathes on it. */
function HelpButton({ onPress, label, hint }: { onPress: () => void; label: string; hint: boolean }) {
  const { c, reduceMotion } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(0);
    if (hint && !reduceMotion) p.set(withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1));
  }, [hint, reduceMotion, p]);
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.25 * p.value }], opacity: 1 - 0.3 * p.value }));
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={8} style={[styles.help, { backgroundColor: c.surface2 }]}>
      <T variant="headline" weight="semibold" style={{ fontSize: 21, lineHeight: 26 }}>?</T>
      {hint ? <Animated.View style={[styles.helpDot, { backgroundColor: c.win, borderColor: c.bg }, dot]} /> : null}
    </PressableScale>
  );
}
