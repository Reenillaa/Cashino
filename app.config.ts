import type { ExpoConfig } from 'expo/config';

// Provisional identity — the product name is not final. Change NAME / BUNDLE_ID here and in src/config/brand.ts.
const NAME = 'Titanium';
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'app.titanium.provisional';

const config: ExpoConfig = {
  name: NAME,
  slug: 'titanium-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'titanium',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#08090B',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    icon: './assets/app.icon',
    config: { usesNonExemptEncryption: false },
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: BUNDLE_ID.replace(/-/g, '_'),
    adaptiveIcon: { backgroundColor: '#08090B', foregroundImage: './assets/images/android-icon-foreground.png', monochromeImage: './assets/images/android-icon-monochrome.png' },
  },
  web: { output: 'single', favicon: './assets/images/favicon.png', bundler: 'metro' },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-sqlite',
    ['expo-audio', { microphonePermission: false }],
    ['expo-notifications', { color: '#08090B' }],
    ['expo-splash-screen', { backgroundColor: '#08090B', image: './assets/images/splash-icon.png', imageWidth: 120, dark: { backgroundColor: '#08090B', image: './assets/images/splash-icon.png' } }],
  ],
  experiments: { typedRoutes: false, reactCompiler: true },
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID } },
};

export default config;
