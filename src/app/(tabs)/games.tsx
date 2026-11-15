import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Chip, GameGlyph, Icon, PressableScale, Screen, Segmented, T, Tag } from '@/design/components';
import { useTheme, alpha } from '@/design/theme';
import { SCREEN_PAD, radius } from '@/design/tokens';
import { useT } from '@/i18n';
import { CATALOG, type GameCategory } from '@/games/catalog';
import { useProgress } from '@/state/progress';
import { useLearning, tutorialKey } from '@/state/learning';
import type { GameId } from '@/engine/games/types.ts';

export default function Games() {
  const { t } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const [cat, setCat] = useState<'all' | GameCategory>('all');
  const favorites = useProgress((s) => s.favorites);
  const toggleFav = useProgress((s) => s.toggleFavorite);
  const tutorials = useLearning((s) => s.tutorials);
  const games = CATALOG.filter((g) => cat === 'all' || g.category === cat);
  return (
    <Screen title={t('games.title')} subtitle={`14 ${t('games.title').toLowerCase()} · ${t('common.noMoneyDisclaimer').split('.')[0]}`}>
      <View style={{ paddingHorizontal: SCREEN_PAD }}>
        <Segmented
          value={cat}
          onChange={setCat}
          options={[
            { value: 'all', label: t('games.all') },
            { value: 'cards', label: t('games.cards') },
            { value: 'originals', label: t('games.originals') },
            { value: 'table', label: t('games.table') },
          ]}
        />
      </View>
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 16, gap: 12 }}>
        {games.map((g) => (
          <GameCard
            key={g.id}
            id={g.id}
            tint={g.tint}
            fav={favorites.includes(g.id)}
            tutorialDone={!!tutorials[tutorialKey(g.id)]}
            multiplayer={!!g.multiplayer}
            onPlay={() => router.push(`/game/${g.id}`)}
            onRules={() => router.push(`/rules/${g.id}`)}
            onTutorial={() => router.push(`/game/${g.id}?tutorial=1`)}
            onAcademy={() => router.push(`/academy/${g.id}`)}
            onOnline={g.multiplayer ? () => router.push('/online') : undefined}
            onFav={() => toggleFav(g.id)}
            t={t}
            c={c}
          />
        ))}
      </View>
    </Screen>
  );
}

function GameCard({
  id, tint, fav, tutorialDone, multiplayer, onPlay, onRules, onTutorial, onAcademy, onOnline, onFav, t, c,
}: {
  id: GameId; tint: string; fav: boolean; tutorialDone: boolean; multiplayer: boolean;
  onPlay: () => void; onRules: () => void; onTutorial: () => void; onAcademy: () => void; onOnline?: () => void; onFav: () => void;
  t: (k: string) => string; c: ReturnType<typeof useTheme>['c'];
}) {
  return (
    <View style={[styles.card, { backgroundColor: c.surface1, borderColor: c.hairline }]}>
      <LinearGradient pointerEvents="none" colors={[alpha(tint, 0.14), alpha(tint, 0)]} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 0.8 }} style={StyleSheet.absoluteFill} />
      <PressableScale onPress={onPlay} scaleTo={0.985} accessibilityLabel={`${t(`games.names.${id}`)}. ${t(`games.blurbs.${id}`)}`} style={styles.main}>
        <View style={[styles.glyph, { backgroundColor: alpha(tint, 0.14), borderColor: alpha(tint, 0.35) }]}>
          <GameGlyph game={id} size={30} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T variant="headline">{t(`games.names.${id}`)}</T>
            {multiplayer && <Tag label={t('games.online')} tint={c.win} />}
          </View>
          <T variant="footnote" color="text2" numberOfLines={2} style={{ marginTop: 2 }}>{t(`games.blurbs.${id}`)}</T>
        </View>
        <PressableScale onPress={onFav} hitSlop={10} accessibilityLabel="Favorite" accessibilityState={{ selected: fav }} feedback="select">
          <Icon name="star" size={20} color={fav ? tint : c.text3} fill={fav ? tint : 'none'} />
        </PressableScale>
      </PressableScale>
      <View style={styles.actions}>
        <Chip label={t('games.solo')} icon="play" onPress={onPlay} selected tint={tint} />
        {onOnline && <Chip label={t('games.online')} icon="users" onPress={onOnline} />}
        <View style={{ flex: 1 }} />
        <MiniAction icon="info" label={t('games.openRules')} onPress={onRules} c={c} />
        <MiniAction icon={tutorialDone ? 'check' : 'sparkles'} label={t('games.openTutorial')} onPress={onTutorial} c={c} />
        <MiniAction icon="book" label={t('games.openAcademy')} onPress={onAcademy} c={c} />
      </View>
    </View>
  );
}

function MiniAction({ icon, label, onPress, c }: { icon: 'info' | 'check' | 'sparkles' | 'book'; label: string; onPress: () => void; c: ReturnType<typeof useTheme>['c'] }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} hitSlop={6} feedback="select" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface2 }}>
      <Icon name={icon} size={17} color={c.text2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', padding: 16, gap: 14 },
  main: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  glyph: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
