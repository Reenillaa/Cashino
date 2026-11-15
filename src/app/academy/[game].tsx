import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, GameGlyph, ListGroup, ListRow, Screen, Section, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { SCREEN_PAD } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { META } from '@/games/catalog';
import { RULES } from '@/games/rules';
import { lessonsFor, SIMULATORS } from '@/features/academy/content';
import { useLearning } from '@/state/learning';
import type { GameId } from '@/engine/games/types.ts';

export default function AcademyGame() {
  const { game } = useLocalSearchParams<{ game: GameId }>();
  const { t, lang } = useT();
  const { c } = useTheme();
  const router = useRouter();
  const done = useLearning((s) => s.lessons);
  const meta = META[game];
  if (!meta) return <Screen back tabBar={false} />;
  const lessons = lessonsFor(game);
  const sims = SIMULATORS.filter((s) => s.game === game);
  return (
    <Screen title={t(`games.names.${game}`)} subtitle={`${t('academy.title')} · ${meta.rtp} RTP`} back tabBar={false} right={<GameGlyph game={game} size={30} color={meta.tint} />}>
      <T variant="body" color="text2" style={{ paddingHorizontal: SCREEN_PAD }}>{tr(RULES[game].summary, lang)}</T>
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
        <Button title={t('tutorial.replay')} kind="secondary" icon="sparkles" onPress={() => router.push(`/game/${game}?tutorial=1`)} />
        <Button title={t('common.play')} icon="play" onPress={() => router.push(`/game/${game}`)} />
      </View>
    </Screen>
  );
}
