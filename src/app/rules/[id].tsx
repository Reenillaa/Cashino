import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, GameGlyph, ListGroup, ListRow, Screen, Section, T } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { RULES } from '@/games/rules';
import { META } from '@/games/catalog';
import type { GameId } from '@/engine/games/types.ts';

export default function RulesScreen() {
  const { id } = useLocalSearchParams<{ id: GameId }>();
  const { t, lang } = useT();
  const router = useRouter();
  const r = RULES[id];
  if (!r) return <Screen back tabBar={false} />;
  return (
    <Screen title={`${t('common.rules')} · ${t(`games.names.${id}`)}`} back tabBar={false} right={<GameGlyph game={id} size={28} color={META[id].tint} />}>
      <T variant="body" color="text2" style={{ paddingHorizontal: SCREEN_PAD }}>{tr(r.summary, lang)}</T>
      <Section title={t('common.rules')}>
        <ListGroup>{r.rules.map((x, i) => <ListRow key={i} title={tr(x, lang)} />)}</ListGroup>
      </Section>
      <Section title={t('play.probability')}>
        <ListGroup footer={t('common.noMoneyDisclaimer')}>
          {r.odds.map((o, i) => <ListRow key={i} title={tr(o.label, lang)} value={o.value} />)}
          <ListRow title={`${t('games.rtp')} · ${t('games.houseEdge')}`} value={`${META[id].rtp} · ${META[id].edge}`} />
        </ListGroup>
      </Section>
      <View style={{ paddingHorizontal: SCREEN_PAD, marginTop: 24, gap: 10 }}>
        <Button title={t('tutorial.replay')} kind="secondary" icon="sparkles" onPress={() => router.push(`/game/${id}?tutorial=1`)} />
        <Button title={t('academy.title')} kind="secondary" icon="book" onPress={() => router.push(`/academy/${id}`)} />
      </View>
    </Screen>
  );
}
