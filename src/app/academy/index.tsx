import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { GameGlyph, Icon, PressableScale, ProgressBar, ProgressRing, Screen, Section, Surface, T } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { SCREEN_PAD, radius } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { META, VISIBLE_GAMES } from '@/games/catalog';
import { SIMULATORS } from '@/features/academy/content';
import { useAcademyProgress } from '@/features/academy/progress';

export default function AcademyHome() {
  const { t, lang } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const p = useAcademyProgress();
  return (
    <Screen title={t('academy.title')} subtitle={t('academy.subtitle')} back tabBar={false}>
      <Surface brushed style={{ marginHorizontal: SCREEN_PAD, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <ProgressRing value={p.completed / p.total} size={64} stroke={5}>
          <T variant="callout" weight="semibold" tabular>{Math.round((p.completed / p.total) * 100)}%</T>
        </ProgressRing>
        <View style={{ flex: 1 }}>
          <T variant="caption" color="text3">{t('academy.learningLevel')}</T>
          <T variant="title">{p.level}</T>
          <T variant="footnote" color="text2">{t('academy.score', { n: p.completed, total: p.total })} {t('academy.lessons').toLowerCase()}</T>
        </View>
      </Surface>
      <T variant="footnote" color="text3" style={{ marginHorizontal: SCREEN_PAD, marginTop: 12 }}>{t('academy.noGuarantee')}</T>
      <Section title={t('academy.allGames')}>
        <View style={[styles.grid, { paddingHorizontal: SCREEN_PAD }]}>
          {VISIBLE_GAMES.map((g) => {
            const pg = p.perGame(g.id);
            return (
              <PressableScale key={g.id} onPress={() => router.push(`/academy/${g.id}`)} accessibilityLabel={`${t(`games.names.${g.id}`)} ${pg.done}/${pg.total}`} style={[styles.cell, { backgroundColor: c.surface1, borderColor: c.hairline }]}>
                <View style={[styles.glyph, { backgroundColor: alpha(g.tint, 0.14) }]}><GameGlyph game={g.id} size={22} color={g.tint} /></View>
                <T variant="footnote" weight="semibold" numberOfLines={1}>{t(`games.names.${g.id}`)}</T>
                <ProgressBar value={pg.total ? pg.done / pg.total : 0} height={3} tint={g.tint} style={{ alignSelf: 'stretch' }} />
                <T variant="caption" color="text3" style={{ fontSize: 9 }}>{pg.done}/{pg.total}</T>
              </PressableScale>
            );
          })}
        </View>
      </Section>
      <Section title={t('academy.simulators')}>
        <View style={{ paddingHorizontal: SCREEN_PAD, gap: 8 }}>
          {SIMULATORS.map((s) => (
            <PressableScale key={s.id} onPress={() => router.push(`/academy/sim/${s.id}`)} scaleTo={0.99}>
              <Surface padded={false} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <GameGlyph game={s.game} size={22} color={META[s.game].tint} />
                <View style={{ flex: 1 }}>
                  <T variant="callout" weight="semibold">{tr(s.title, lang)}</T>
                  <T variant="footnote" color="text3">{tr(s.body, lang)}</T>
                </View>
                <Icon name="chevronRight" size={16} color={c.text3} />
              </Surface>
            </PressableScale>
          ))}
        </View>
      </Section>
      <Section title={t('academy.badges')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: SCREEN_PAD }}>
          {p.badges.filter((b) => b.earned || !b.id.startsWith('master-')).map((b) => (
            <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: b.earned ? alpha(c.win, 0.16) : c.surface2 }} accessibilityLabel={`${lang === 'en' ? b.en : b.es}${b.earned ? ' ✓' : ''}`}>
              <Icon name={b.earned ? 'medal' : 'lock'} size={14} color={b.earned ? c.win : c.text3} />
              <T variant="footnote" color={b.earned ? 'win' : 'text3'}>{lang === 'en' ? b.en : b.es}</T>
            </View>
          ))}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '31%', flexGrow: 1, borderRadius: radius.lg, padding: 12, gap: 6, alignItems: 'flex-start', borderWidth: StyleSheet.hairlineWidth },
  glyph: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
