/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'engine',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/engine/**/*.test.ts'],
      transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
    },
    {
      displayName: 'app',
      preset: 'jest-expo',
      testMatch: ['<rootDir>/src/**/*.test.tsx', '<rootDir>/src/{features,state,services,i18n,design}/**/*.test.ts'],
      setupFiles: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: { '^expo-sqlite/localStorage/install$': '<rootDir>/jest.empty.js', '^@/(.*)$': '<rootDir>/src/$1' },
      transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|@supabase/.*|zustand|i18next|react-i18next)',
      ],
    },
  ],
};
