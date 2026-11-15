// Minimal in-memory localStorage for app tests.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

// Reanimated/Worklets: lightweight mock (animations resolve instantly; the result is computed before any animation anyway).
jest.mock('react-native-worklets', () => ({}));
jest.mock('react-native-reanimated', () => require('./jest/reanimated-mock'));
jest.mock('expo-audio', () => ({
  createAudioPlayer: () => ({ play() {}, pause() {}, seekTo: async () => undefined, remove() {}, volume: 1, loop: false }),
  setAudioModeAsync: async () => undefined,
}));
jest.mock('expo-blur', () => ({ BlurView: require('react-native').View }));
jest.mock('expo-haptics', () => ({
  selectionAsync: async () => undefined, impactAsync: async () => undefined, notificationAsync: async () => undefined,
  ImpactFeedbackStyle: {}, NotificationFeedbackType: {},
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (fn) => require('react').useEffect(() => fn(), [fn]),
  Link: ({ children }) => children,
}));
