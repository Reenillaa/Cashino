import React, { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { TabFlash } from '@/features/brand/Splash';
import { GlassTabBar } from '@/design/components';
import { useT } from '@/i18n';
import { useSocialBadge } from '@/features/social/useSocialBadge';

/** Four simple destinations: the home screen is also the game lobby (one place to start playing). */
export default function TabsLayout() {
  const { t } = useT();
  const badge = useSocialBadge();
  // Each tab change replays the chip flourish (keyed remount); nothing on first open.
  const [flash, setFlash] = useState(0);
  const items = [
    { key: 'index', label: t('tabs.home'), icon: 'home' as const },
    { key: 'ranking', label: t('tabs.ranking'), icon: 'ranking' as const },
    { key: 'social', label: t('tabs.social'), icon: 'social' as const, badge },
    { key: 'profile', label: t('tabs.profile'), icon: 'profile' as const },
  ];
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      // Screens animate themselves on focus (Screen → useFocusEntrance), so the navigator just swaps.
      screenOptions={{ headerShown: false, animation: 'none' }}
      tabBar={({ state, navigateToTab }) => (
        <GlassTabBar
          items={items}
          active={state.routes[state.index].name}
          onSelect={(key) => {
            const route = state.routes.find((r) => r.name === key);
            if (route && route.name !== state.routes[state.index].name) {
              setFlash((n) => n + 1);
              navigateToTab(route.key);
            }
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="profile" />
    </Tabs>
    {flash > 0 ? <TabFlash key={flash} /> : null}
    </View>
  );
}
