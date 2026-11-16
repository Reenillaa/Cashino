import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState, Screen } from '@/design/components';
import { useT } from '@/i18n';
import { onlineConfigured } from '@/services/supabase';
import { useSession } from '@/state/session';
import LiveHorses from '@/features/live/LiveHorses';
import LiveRoulette from '@/features/live/LiveRoulette';
import LiveCrash from '@/features/live/LiveCrash';

/** Live, shared multiplayer rounds: /live/horses, /live/roulette and /live/crash. Needs an account. */
export default function LiveGameRoute() {
  const { game } = useLocalSearchParams<{ game: string }>();
  const { t } = useT();
  const router = useRouter();
  const signedIn = useSession((s) => !!s.userId);
  if (!onlineConfigured || !signedIn) {
    return (
      <Screen title={t('live.title')} back tabBar={false}>
        <EmptyState icon="users" title={t('live.signIn')} body={t('live.signInBody')} action={onlineConfigured ? t('common.signIn') : undefined} onAction={() => router.push('/auth')} />
      </Screen>
    );
  }
  return game === 'roulette' ? <LiveRoulette /> : game === 'crash' ? <LiveCrash /> : <LiveHorses />;
}
