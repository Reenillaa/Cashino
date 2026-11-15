import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { TutorialCoach } from '../TutorialCoach';
import { tutorialEvent, useTutorialRuntime } from '../tutorial';
import { useLearning } from '@/state/learning';
import { usePlayModes } from '@/features/play/session';
import i18n from '@/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('expo-crypto', () => ({ getRandomValues: (b: Uint8Array) => require('node:crypto').randomFillSync(b) }));

describe('TutorialCoach (interactive first-game tutorial)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
    useLearning.getState().resetAll();
    usePlayModes.setState({ practice: {} });
  });

  it('teaches with real game events, forces practice and remembers completion', async () => {
    await render(<TutorialCoach game="dice" />);
    await act(async () => useTutorialRuntime.getState().start('dice'));
    expect(screen.getByText('Tú eliges el riesgo')).toBeTruthy();
    expect(usePlayModes.getState().practice.dice).toBe(true); // free practice while learning
    await act(async () => fireEvent.press(screen.getByText('Entendido')));
    expect(screen.getByText('Mueve el objetivo')).toBeTruthy();
    // "do" step: completes only when the real game emits the action
    await act(async () => tutorialEvent('dice', 'dice:roll'));
    expect(screen.getByText('Mueve el objetivo')).toBeTruthy();
    await act(async () => tutorialEvent('dice', 'dice:adjust'));
    await act(async () => tutorialEvent('dice', 'dice:roll'));
    // quiz step
    await act(async () => fireEvent.press(screen.getByText('1,98×')));
    expect(screen.getByText(/0,99 \/ 0,50/)).toBeTruthy();
    await act(async () => fireEvent.press(screen.getByText('¡A jugar!')));
    expect(useLearning.getState().tutorials.dice_tutorial_completed).toBe(true);
    expect(usePlayModes.getState().practice.dice).toBe(false); // mode restored
  });

  it('can be skipped and then does not reappear automatically', async () => {
    await render(<TutorialCoach game="crash" />);
    await act(async () => useTutorialRuntime.getState().start('crash'));
    await act(async () => fireEvent.press(screen.getByText('Saltar tutorial')));
    expect(useLearning.getState().isTutorialDone('crash')).toBe(true);
    expect(useTutorialRuntime.getState().game).toBeNull();
  });
});
