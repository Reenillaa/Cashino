import React from 'react';
import { Text, View } from 'react-native';
import { Button, Icon, ProgressBar, T } from '@/design/components';
import { useTheme } from '@/design/theme';
import { useT } from '@/i18n';
import type { MissionDef } from '@/engine/meta/progression.ts';
import { claimMissionReward } from '@/features/economy/rewards';
import { sfx } from '@/services/audio';

export function MissionRow({ mission, progress, claimed }: { mission: MissionDef; progress: number; claimed: boolean }) {
  const { t } = useT();
  const { c } = useTheme();
  const done = progress >= mission.target;
  const label = t(`missions.${mission.kind}`, { n: mission.target, game: mission.game ? t(`games.names.${mission.game}`) : '' });
  const claim = () => {
    void claimMissionReward(mission).then(() => sfx('cashout')).catch(() => undefined);
  };
  return (
    <View style={{ paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: claimed ? c.surface2 : c.surface3, alignItems: 'center', justifyContent: 'center' }}>
        {claimed ? <Icon name="check" size={18} color={c.win} /> : <Text style={{ fontSize: 18 }} accessible={false}>🎯</Text>}
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <T variant="callout" weight="medium">{label}</T>
        <ProgressBar value={Math.min(1, progress / mission.target)} height={4} tint={done ? c.win : undefined} />
        <T variant="footnote" color="text3">{t('missions.reward', { coins: mission.coins, xp: mission.xp })}</T>
      </View>
      {done && !claimed ? <Button title={t('missions.claim')} size="sm" onPress={claim} /> : <T variant="footnote" color="text3" tabular>{Math.min(progress, mission.target)}/{mission.target}</T>}
    </View>
  );
}
