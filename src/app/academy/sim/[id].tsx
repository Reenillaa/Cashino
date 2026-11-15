import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, T } from '@/design/components';
import { SCREEN_PAD } from '@/design/tokens';
import { tr, useT } from '@/i18n';
import { SIMULATORS } from '@/features/academy/content';
import { SIM_COMPONENTS } from '@/features/academy/simulators';
import { useLearning } from '@/state/learning';

export default function SimulatorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useT();
  const def = SIMULATORS.find((s) => s.id === id);
  const Comp = SIM_COMPONENTS[id];
  useEffect(() => {
    if (def) useLearning.getState().useSimulator(def.id);
  }, [def]);
  if (!def || !Comp) return <Screen back tabBar={false} />;
  return (
    <Screen title={tr(def.title, lang)} subtitle={tr(def.body, lang)} back tabBar={false}>
      <View style={{ paddingHorizontal: SCREEN_PAD }}>
        <Comp />
        <T variant="footnote" color="text3" style={{ marginTop: 20 }}>{t('academy.noGuarantee')}</T>
      </View>
    </Screen>
  );
}
