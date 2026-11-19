import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { tabOptions } from '@/design/motion/navTransitions';
import { DesktopSidebar, GlassTabBar } from '@/design/components';
import { useDesktop } from '@/design/layout';
import { useT } from '@/i18n';

/** Five destinations: Home (the lobby), Sports betting, Ranking (centre), Shop and Profile. */
export default function TabsLayout() {
  const { t } = useT();
  const desktop = useDesktop();
  const items = [
    { key: 'index', label: t('tabs.home'), icon: 'home' as const },
    { key: 'sports', label: t('tabs.sports'), icon: 'ball' as const },
    { key: 'ranking', label: t('tabs.ranking'), icon: 'ranking' as const },
    { key: 'shop', label: t('tabs.shop'), icon: 'bag' as const },
    { key: 'profile', label: t('tabs.profile'), icon: 'profile' as const },
  ];
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      // the old tab slides out and the new one in, towards the side of the tab you picked (navTransitions)
      screenOptions={{ headerShown: false, tabBarPosition: desktop ? 'left' : 'bottom', ...tabOptions }}
      tabBar={({ state, navigateToTab }) => {
        const onSelect = (key: string) => {
          const route = state.routes.find((r) => r.name === key);
          if (route && route.name !== state.routes[state.index].name) {
            navigateToTab(route.key);
          }
        };
        // computers: a left sidebar; phones and tablets: the floating bottom bar
        return desktop
          ? <DesktopSidebar items={items} active={state.routes[state.index].name} onSelect={onSelect} />
          : <GlassTabBar items={items} active={state.routes[state.index].name} onSelect={onSelect} />;
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="sports" />
      <Tabs.Screen name="ranking" />
      <Tabs.Screen name="shop" />
      <Tabs.Screen name="profile" />
    </Tabs>
    </View>
  );
}
