import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettings } from '@/state/settings';

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  toggle: require('../../assets/sounds/toggle.wav'),
  chip: require('../../assets/sounds/chip.wav'),
  card: require('../../assets/sounds/card.wav'),
  flip: require('../../assets/sounds/flip.wav'),
  gem: require('../../assets/sounds/gem.wav'),
  reveal: require('../../assets/sounds/reveal.wav'),
  mine: require('../../assets/sounds/mine.wav'),
  win: require('../../assets/sounds/win.wav'),
  bigwin: require('../../assets/sounds/bigwin.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  tick: require('../../assets/sounds/tick.wav'),
  rocket: require('../../assets/sounds/rocket.wav'),
  crash: require('../../assets/sounds/crash.wav'),
  cashout: require('../../assets/sounds/cashout.wav'),
  peg: require('../../assets/sounds/peg.wav'),
  land: require('../../assets/sounds/land.wav'),
  roll: require('../../assets/sounds/roll.wav'),
  balldrop: require('../../assets/sounds/balldrop.wav'),
  dice: require('../../assets/sounds/dice.wav'),
  coin: require('../../assets/sounds/coin.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  step: require('../../assets/sounds/step.wav'),
  hit: require('../../assets/sounds/hit.wav'),
  notify: require('../../assets/sounds/notify.wav'),
  levelup: require('../../assets/sounds/levelup.wav'),
} as const;
export type SoundId = keyof typeof SOURCES;

const pools = new Map<SoundId, AudioPlayer[]>();
const cursor = new Map<SoundId, number>();
let music: AudioPlayer | null = null;
let ready = false;

async function init() {
  if (ready) return;
  ready = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' } as never);
  } catch {
    // web / unsupported → ignore
  }
}

function player(id: SoundId): AudioPlayer | null {
  try {
    let pool = pools.get(id);
    if (!pool) {
      // Small round-robin pool so rapid repeats (pegs, ticks) can overlap.
      const size = id === 'peg' || id === 'tick' || id === 'chip' ? 4 : 1;
      pool = Array.from({ length: size }, () => createAudioPlayer(SOURCES[id]));
      pools.set(id, pool);
    }
    const i = ((cursor.get(id) ?? -1) + 1) % pool.length;
    cursor.set(id, i);
    return pool[i];
  } catch {
    return null;
  }
}

/** Plays a sound effect if effects are enabled. Never throws. */
export function sfx(id: SoundId, volume = 1) {
  const s = useSettings.getState();
  if (!s.sound) return;
  void init();
  const p = player(id);
  if (!p) return;
  try {
    p.volume = Math.max(0, Math.min(1, volume * s.soundVolume));
    void p.seekTo(0);
    p.play();
  } catch {
    // ignore playback errors
  }
}

export function preloadSounds(ids: SoundId[]) {
  ids.forEach((id) => player(id));
}

/** Starts/stops the ambient music according to settings. */
export function syncMusic() {
  const s = useSettings.getState();
  try {
    if (s.music) {
      void init();
      if (!music) {
        music = createAudioPlayer(require('../../assets/sounds/ambient.wav'));
        music.loop = true;
      }
      music.volume = s.musicVolume;
      music.play();
    } else if (music) {
      music.pause();
    }
  } catch {
    // ignore
  }
}
