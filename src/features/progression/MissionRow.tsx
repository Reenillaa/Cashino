import React from 'react';
import { View } from 'react-native';
import { Button, Icon, ProgressBar, Surface, T } from '@/design/components';
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
    <Surface padded={false} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.surface3, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={claimed ? 'check' : 'target'} size={18} color={claimed ? c.win : c.text} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <T variant="footnote" weight="medium">{label}</T>
        <ProgressBar value={Math.min(1, progress / mission.target)} height={4} tint={done ? c.win : undefined} />
        <T variant="caption" color="text3" style={{ letterSpacing: 0.2, textTransform: 'none' }}>{t('missions.reward', { coins: mission.coins, xp: mission.xp })}</T>
      </View>
      {done && !claimed ? <Button title={t('missions.claim')} size="sm" onPress={claim} /> : <T variant="footnote" color="text3" tabular>{Math.min(progress, mission.target)}/{mission.target}</T>}
    </Surface>
  );
}
