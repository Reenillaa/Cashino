import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
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

// ---------- Web: Web Audio API (decoded buffers, cheap overlapping playback, real volume on iOS) ----------
type WebCtx = { ctx: AudioContext; buffers: Map<SoundId, AudioBuffer | 'loading'> };
let web: WebCtx | null = null;
const lastPlayed = new Map<SoundId, number>();
function webAudio(): WebCtx | null {
  if (Platform.OS !== 'web') return null;
  if (web) return web;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  web = { ctx: new Ctor(), buffers: new Map() };
  return web;
}
function webPlay(id: SoundId, volume: number) {
  const w = webAudio();
  if (!w) return false;
  if (w.ctx.state === 'suspended') void w.ctx.resume(); // iOS unlocks audio inside a tap
  const buf = w.buffers.get(id);
  if (buf === 'loading') return true;
  if (!buf) {
    w.buffers.set(id, 'loading');
    const uri = Asset.fromModule(SOURCES[id]).uri;
    void fetch(uri)
      .then((r) => r.arrayBuffer())
      .then((ab) => w.ctx.decodeAudioData(ab))
      .then((b) => {
        w.buffers.set(id, b);
        webPlay(id, volume);
      })
      .catch(() => w.buffers.delete(id));
    return true;
  }
  const src = w.ctx.createBufferSource();
  const gain = w.ctx.createGain();
  gain.gain.value = volume;
  src.buffer = buf;
  src.connect(gain).connect(w.ctx.destination);
  src.start();
  return true;
}

/** Plays a sound effect if effects are enabled. Never throws. Rapid repeats of one sound are thinned out. */
export function sfx(id: SoundId, volume = 1) {
  const s = useSettings.getState();
  if (!s.sound) return;
  if (id === 'bigwin' || id === 'levelup') duckMusic();
  const now = Date.now();
  const minGap = id === 'peg' || id === 'tick' ? 90 : id === 'chip' ? 50 : 0;
  if (minGap && now - (lastPlayed.get(id) ?? 0) < minGap) return;
  lastPlayed.set(id, now);
  try {
    if (webPlay(id, Math.max(0, Math.min(1, volume * s.soundVolume)))) return;
  } catch {
    // fall back to expo-audio
  }
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
  if (Platform.OS === 'web') return;
  ids.forEach((id) => player(id));
}

/* ---------- music: one loop per kind of table, crossfaded; quieter under big moments ---------- */

export type MusicScene = 'lobby' | 'lounge' | 'rumba' | 'tropical' | 'electro';
const TRACKS: Record<MusicScene, number> = {
  lobby: require('../../assets/sounds/ambient.wav'),
  lounge: require('../../assets/music/lounge.m4a'),
  rumba: require('../../assets/music/rumba.m4a'),
  tropical: require('../../assets/music/tropical.m4a'),
  electro: require('../../assets/music/electro.m4a'),
};
/** Each game's music: card tables swing, the wheel and the horses go flamenco, the sea games go tropical. */
const SCENE_OF: Record<string, MusicScene> = {
  blackjack: 'lounge', poker: 'lounge', videopoker: 'lounge', baccarat: 'lounge', dragontiger: 'lounge', hilo: 'lounge',
  roulette: 'rumba', horses: 'rumba', wheel: 'rumba',
  angler: 'tropical', fishing: 'tropical', pirate: 'tropical', penguin: 'tropical',
};
export const sceneForGame = (game: string): MusicScene => SCENE_OF[game] ?? 'electro';

const players = new Map<MusicScene, AudioPlayer>();
let scene: MusicScene = 'lobby';
let duck = 1;
const fades = new Map<MusicScene, ReturnType<typeof setInterval>>();
/** Moves a track's volume to `to` over `ms` (expo-audio has no ramps, so a short timer does it). */
function fadeTo(sc: MusicScene, to: number, ms = 700, then?: () => void) {
  const p = players.get(sc);
  if (!p) return;
  clearInterval(fades.get(sc));
  const from = p.volume, steps = Math.max(1, Math.round(ms / 50));
  let k = 0;
  fades.set(sc, setInterval(() => {
    k++;
    try { p.volume = from + ((to - from) * k) / steps; } catch { /* ignore */ }
    if (k >= steps) {
      clearInterval(fades.get(sc));
      then?.();
    }
  }, 50));
}
function track(sc: MusicScene): AudioPlayer | null {
  try {
    let p = players.get(sc);
    if (!p) {
      p = createAudioPlayer(TRACKS[sc]);
      p.loop = true;
      p.volume = 0;
      players.set(sc, p);
    }
    return p;
  } catch {
    return null;
  }
}

/** Starts/stops the music according to settings, on the current scene. */
export function syncMusic() {
  const s = useSettings.getState();
  try {
    if (s.music) {
      void init();
      const p = track(scene);
      if (!p) return;
      p.play();
      fadeTo(scene, s.musicVolume * duck, 500);
      music = p;
    } else {
      for (const [sc, p] of players) fadeTo(sc, 0, 300, () => p.pause());
    }
  } catch {
    // ignore
  }
}

/** Switch the music to a game's style (or back to the lobby): the old track fades out as the new one fades in. */
export function setMusicScene(next: MusicScene) {
  if (next === scene) return;
  const prev = scene;
  scene = next;
  if (!useSettings.getState().music) return;
  const old = players.get(prev);
  if (old) fadeTo(prev, 0, 900, () => { try { old.pause(); } catch { /* ignore */ } });
  syncMusic();
}

/** Big moments (a big win, a jackpot) duck the music for a few seconds so the effect is heard clearly. */
export function duckMusic(ms = 2200) {
  const s = useSettings.getState();
  if (!s.music || !music) return;
  duck = 0.35;
  fadeTo(scene, s.musicVolume * duck, 200);
  setTimeout(() => {
    duck = 1;
    fadeTo(scene, useSettings.getState().musicVolume, 900);
  }, ms);
}
