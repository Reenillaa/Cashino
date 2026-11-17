import React, { useState } from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { TabFlash } from '@/features/brand/Splash';
import { DesktopSidebar, GlassTabBar } from '@/design/components';
import { useDesktop } from '@/design/layout';
import { useT } from '@/i18n';

/** Five destinations: Home (the lobby), Sports betting, Ranking (centre), Shop and Profile. */
export default function TabsLayout() {
  const { t } = useT();
  // Each tab change replays the chip flourish (keyed remount); nothing on first open.
  const [flash, setFlash] = useState(0);
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
      // Screens animate themselves on focus (Screen → useFocusEntrance), so the navigator just swaps.
      screenOptions={{ headerShown: false, animation: 'none', tabBarPosition: desktop ? 'left' : 'bottom' }}
      tabBar={({ state, navigateToTab }) => {
        const onSelect = (key: string) => {
          const route = state.routes.find((r) => r.name === key);
          if (route && route.name !== state.routes[state.index].name) {
            if (!desktop) setFlash((n) => n + 1);
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
    {flash > 0 ? <TabFlash key={flash} /> : null}
    </View>
  );
}
