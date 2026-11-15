import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ListGroup, ListRow, Screen, Section, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD, gameArt, radius } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { META } from '@/games/catalog';
import { lessonsFor, SIMULATORS } from '@/features/academy/content';
import { gameModel, type Lang } from '@/features/academy/models';
import { DistBars, HundredChips, ProbBars } from '@/features/academy/charts';
import { MonteCarlo } from '@/features/academy/MonteCarlo';
import { SIM_OPTIONS } from '@/features/academy/montecarlo';
import { useLearning } from '@/state/learning';
import type { GameId } from '@/engine/games/types.ts';

/**
 * One page per game, from simple to detailed: the idea, what can happen (exact odds and payouts),
 * where the house edge comes from, the formula, an example, a real-engine simulator, then lessons.
 */
export default function AcademyGame() {
  const { game } = useLocalSearchParams<{ game: GameId }>();
  const { t, lang } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const done = useLearning((s) => s.lessons);
  const meta = META[game];
  if (!meta) return <Screen back tabBar={false} />;
  const model = gameModel(game, lang as Lang);
  const lessons = lessonsFor(game);
  const sims = SIMULATORS.filter((s) => s.game === game);
  const back = model.rtp !== null ? Math.round(model.rtp * 1000) / 10 : null;
  const num = (v: number) => v.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 });
  return (
    <Screen title={t(`games.names.${game}`)} subtitle={t('academy.title')} back tabBar={false} right={<Text style={{ fontSize: 34 }} accessible={false}>{gameArt[game].emoji}</Text>}>
      {/* The idea */}
      <View style={[styles.card, { backgroundColor: c.surface1, marginHorizontal: SCREEN_PAD }]}>
        <T variant="footnote" color="text3">{t('academy.idea')}</T>
        <T variant="body" style={{ fontSize: 18, lineHeight: 26, marginTop: 4 }}>{model.idea}</T>
      </View>

      {/* What can happen */}
      <Section title={t('academy.outcomes')}>
        <View style={[styles.card, { backgroundColor: c.surface1, marginHorizontal: SCREEN_PAD }]}>
          <T variant="callout" weight="semibold" style={{ marginBottom: 12 }}>{model.rowsTitle}</T>
          <ProbBars rows={model.rows} lang={lang as Lang} tint={meta.tint} chanceLabel={t('academy.chance')} returnsLabel={t('academy.returns')} />
          {model.dist ? (
            <View style={{ marginTop: 22 }}>
              <T variant="callout" weight="semibold" style={{ marginBottom: 8 }}>{model.dist.title}</T>
              <DistBars bins={model.dist.bins} lang={lang as Lang} tint={meta.tint} />
            </View>
          ) : null}
        </View>
      </Section>

      {/* Where the house edge is */}
      <Section title={t('academy.per100')}>
        <View style={[styles.card, styles.row, { backgroundColor: c.surface1, marginHorizontal: SCREEN_PAD }]}>
          {back !== null ? (
            <>
              <HundredChips rtp={model.rtp!} />
              <View style={{ flex: 1, gap: 10 }}>
                <View>
                  <T variant="footnote" color="text3">{t('academy.back')}</T>
                  <T variant="title" weight="semibold" tabular color="win">{num(back)}</T>
                </View>
                <View>
                  <T variant="footnote" color="text3">{t('academy.house')}</T>
                  <T variant="title" weight="medium" tabular color="text2">{num(100 - back)}</T>
                </View>
              </View>
            </>
          ) : (
            <T variant="body" color="text2" style={{ flex: 1 }}>{t('academy.per100Poker')}</T>
          )}
        </View>
        {back !== null ? <T variant="footnote" color="text3" style={{ marginHorizontal: SCREEN_PAD, marginTop: 8 }}>{t('academy.per100Body', { back: num(back), house: num(100 - back) })}</T> : null}
      </Section>

      {/* Formula + example */}
      <Section title={t('academy.formula')}>
        <View style={[styles.card, { backgroundColor: c.surface1, marginHorizontal: SCREEN_PAD }]}>
          <T variant="body" style={{ fontSize: 17, lineHeight: 25 }}>{model.formula}</T>
        </View>
      </Section>
      <Section title={t('academy.example')}>
        <View style={[styles.card, styles.row, { backgroundColor: c.surface1, marginHorizontal: SCREEN_PAD, alignItems: 'flex-start' }]}>
          <Text style={{ fontSize: 28 }} accessible={false}>🪙</Text>
          <T variant="body" color="text2" style={{ flex: 1, fontSize: 17, lineHeight: 25 }}>{model.example}</T>
        </View>
      </Section>

      {/* Real-engine simulator */}
      {SIM_OPTIONS[game] ? (
        <Section title={t('academy.mcTitle')}>
          <View style={{ marginHorizontal: SCREEN_PAD }}>
            <T variant="body" color="text2" style={{ marginBottom: 14 }}>{t('academy.mcBody')}</T>
            <MonteCarlo game={game} />
          </View>
        </Section>
      ) : null}

      <Section title={t('academy.lessons')}>
        <ListGroup>
          {lessons.map((l, i) => (
            <ListRow
              key={l.id}
              icon={done[l.id] ? 'check' : 'book'}
              iconTint={done[l.id] ? c.win : undefined}
              title={`${i + 1}. ${tr(l.title, lang)}`}
              subtitle={`${t(`academy.${l.level}`)} · ${t('academy.minutes', { n: l.minutes })}`}
              onPress={() => router.push(`/academy/lesson/${l.id}`)}
            />
          ))}
        </ListGroup>
      </Section>
      {sims.length > 0 && (
        <Section title={t('academy.simulators')}>
          <ListGroup>
            {sims.map((s) => <ListRow key={s.id} icon="chart" title={tr(s.title, lang)} subtitle={tr(s.body, lang)} onPress={() => router.push(`/academy/sim/${s.id}`)} />)}
          </ListGroup>
        </Section>
      )}
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 24, gap: 10 }}>
        <Button title={t('tutorial.replay')} kind="secondary" onPress={() => router.push(`/game/${game}?tutorial=1`)} />
        <Button title={t('common.play')} onPress={() => router.push(`/game/${game}`)} />
      </View>
      <T variant="footnote" color="text3" style={{ marginHorizontal: SCREEN_PAD, marginTop: 20 }}>{t('academy.noGuarantee')}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
});
