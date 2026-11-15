import React from 'react';
import { Tabs } from 'expo-router';
import { GlassTabBar } from '@/design/components';
import { useT } from '@/i18n';
import { useSocialBadge } from '@/features/social/useSocialBadge';

export default function TabsLayout() {
  const { t } = useT();
  const badge = useSocialBadge();
  const items = [
    { key: 'index', label: t('tabs.home'), icon: 'home' as const },
    { key: 'games', label: t('tabs.games'), icon: 'games' as const },
    { key: 'ranking', label: t('tabs.ranking'), icon: 'ranking' as const },
    { key: 'social', label: t('tabs.social'), icon: 'social' as const, badge },
    { key: 'profile', label: t('tabs.profile'), icon: 'profile' as const },
  ];
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'fade' }}
      tabBar={({ state, navigateToTab }) => (
        <GlassTabBar
          items={items}
          active={state.routes[state.index].name}
          onSelect={(key) => {
            const route = state.routes.find((r) => r.name === key);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="games" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="social" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
