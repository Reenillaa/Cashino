import type { ExpoConfig } from 'expo/config';

// Product identity. Change NAME / BUNDLE_ID here and in src/config/brand.ts.
const NAME = 'Cashino';
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'app.cashino.game';

const config: ExpoConfig = {
  name: NAME,
  slug: 'cashino',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'cashino',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#000000',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    icon: './assets/app.icon',
    config: { usesNonExemptEncryption: false },
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: BUNDLE_ID.replace(/-/g, '_'),
    adaptiveIcon: { backgroundColor: '#000000', foregroundImage: './assets/images/android-icon-foreground.png', monochromeImage: './assets/images/android-icon-monochrome.png' },
  },
  web: { output: 'single', favicon: './assets/images/favicon.png', bundler: 'metro' },
  plugins: [
    // One web bundle: no per-route chunks, so opening a game never flashes an empty screen while a chunk downloads.
    ['expo-router', { asyncRoutes: false }],
    'expo-font',
    'expo-sqlite',
    ['expo-audio', { microphonePermission: false }],
    ['expo-notifications', { color: '#000000' }],
    ['expo-splash-screen', { backgroundColor: '#000000', image: './assets/images/splash-icon.png', imageWidth: 120, dark: { backgroundColor: '#000000', image: './assets/images/splash-icon.png' } }],
  ],
  // EXPO_BASE_URL=/Cashino when publishing to GitHub Pages (served from https://<user>.github.io/<repo>/).
  experiments: { typedRoutes: false, reactCompiler: true, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID } },
};

export default config;
