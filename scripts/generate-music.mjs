// Procedurally composes the background music of each kind of table (original, royalty-free), as seamless
// loops: lounge jazz for the card tables, a flamenco rumba for roulette and horses, a tropical groove for the
// sea games and a soft electro groove for slots and originals. Writes WAV, then AAC (.m4a) with ffmpeg.
// Run: node scripts/generate-music.mjs  → assets/music/*.m4a
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SR = 22050;
const TAU = Math.PI * 2;
const OUT = new URL('../assets/music/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

let seed = 77;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const noise = () => rand() * 2 - 1;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/** Adds a sound into a looping buffer: anything past the end wraps to the start, so the loop is seamless. */
function put(buf, start, x, gain = 1) {
  const s0 = Math.round(start * SR);
  for (let i = 0; i < x.length; i++) buf[(s0 + i) % buf.length] += x[i] * gain;
}
function lowpass(x, f) {
  const a = 1 - Math.exp((-TAU * f) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; }
  return x;
}
function highpass(x, f) {
  const a = Math.exp((-TAU * f) / SR);
  let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { const y = a * (py + x[i] - px); px = x[i]; py = y; x[i] = y; }
  return x;
}
/** A tiny circular room (comb filters), applied to the whole loop so the tail wraps too. */
function room(x, wet = 0.22) {
  const out = Float32Array.from(x);
  for (const [ms, g] of [[29.7, 0.6], [37.1, 0.55], [41.1, 0.5], [43.7, 0.45]]) {
    const d = Math.round((ms / 1000) * SR);
    const c = new Float32Array(x.length);
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < x.length; i++) c[i] = x[i] + g * c[(i - d + x.length) % x.length];
    lowpass(c, 3500);
    for (let i = 0; i < x.length; i++) out[i] += (c[i] * wet) / 4;
  }
  return out;
}
const env = (n, a, d) => Float32Array.from({ length: n }, (_, i) => { const t = i / SR; return t < a ? t / a : Math.exp(-(t - a) * d); });

/* ------------------------------------------------------------------ instruments */
function epiano(f, dur, vel = 1) {
  const n = Math.round(dur * SR), x = new Float32Array(n), e = env(n, 0.004, 2.2);
  for (let i = 0; i < n; i++) {
    const t = i / SR, trem = 1 + 0.06 * Math.sin(TAU * 5 * t);
    x[i] = e[i] * trem * (Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 6) + 0.12 * Math.sin(TAU * 3 * f * t) * Math.exp(-t * 9)) * vel;
  }
  return x;
}
function bass(f, dur, vel = 1) {
  const n = Math.round(dur * SR), x = new Float32Array(n), e = env(n, 0.006, 5);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = e[i] * (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t)) * vel; }
  return lowpass(x, 900);
}
/** Karplus–Strong plucked string (nylon guitar). */
function pluck(f, dur, vel = 1, bright = 0.5) {
  const n = Math.round(dur * SR), x = new Float32Array(n);
  const p = Math.max(2, Math.round(SR / f)), line = Float32Array.from({ length: p }, () => noise());
  lowpass(line, 1500 + bright * 4000);
  for (let i = 0; i < n; i++) {
    const j = i % p;
    const v = line[j];
    line[j] = 0.996 * 0.5 * (v + line[(j + 1) % p]);
    x[i] = v * vel * Math.min(1, (n - i) / (0.02 * SR));
  }
  return x;
}
function steel(f, dur, vel = 1) {
  const n = Math.round(dur * SR), x = new Float32Array(n), e = env(n, 0.003, 3.2);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = e[i] * (Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * 2.01 * f * t) * Math.exp(-t * 4) + 0.25 * Math.sin(TAU * 3.97 * f * t) * Math.exp(-t * 7)) * vel; }
  return x;
}
function synth(f, dur, vel = 1, cut = 2200) {
  const n = Math.round(dur * SR), x = new Float32Array(n), e = env(n, 0.005, 7);
  for (let i = 0; i < n; i++) { const t = i / SR; let s = 0; for (let h = 1; h <= 7; h++) s += Math.sin(TAU * f * h * t) / h; x[i] = e[i] * s * 0.5 * vel; }
  return lowpass(x, cut);
}
function pad(freqs, dur, vel = 1) {
  const n = Math.round(dur * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR, a = Math.min(1, t / 0.6, (dur - t) / 0.6);
    let s = 0;
    for (const f of freqs) s += Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * f * 1.004 * t);
    x[i] = a * s * vel / freqs.length;
  }
  return lowpass(x, 1400);
}
function kick(vel = 1) {
  const n = Math.round(0.35 * SR), x = new Float32Array(n);
  let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / SR, f = 48 + 90 * Math.exp(-t * 30); ph += (TAU * f) / SR; x[i] = Math.sin(ph) * Math.exp(-t * 9) * vel; }
  return x;
}
function noiseHit(dur, lo, hi, decay, vel = 1) {
  const n = Math.round(dur * SR), x = Float32Array.from({ length: n }, (_, i) => noise() * Math.exp(-(i / SR) * decay) * vel);
  return lowpass(highpass(x, lo), hi);
}
const hat = (vel = 1) => noiseHit(0.08, 6000, 10000, 60, vel);
const shaker = (vel = 1) => noiseHit(0.09, 3500, 9000, 35, vel);
const brush = (vel = 1) => noiseHit(0.3, 1200, 6000, 9, vel);
const clap = (vel = 1) => { const x = new Float32Array(Math.round(0.2 * SR)); for (const o of [0, 0.011, 0.023]) put(x, o, noiseHit(0.12, 900, 2600, 30, vel)); return x; };
function ride(vel = 1) {
  const n = Math.round(0.6 * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (Math.sin(TAU * 3170 * t) + Math.sin(TAU * 4630 * t) * 0.7 + Math.sin(TAU * 6020 * t) * 0.5 + noise() * 0.4) * Math.exp(-t * 7) * vel; }
  return highpass(x, 2500);
}
function cajon(low, vel = 1) {
  const n = Math.round(0.3 * SR), x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (low ? Math.sin(TAU * (80 + 40 * Math.exp(-t * 40)) * t) * Math.exp(-t * 14) : 0) + noise() * Math.exp(-t * (low ? 40 : 22)) * (low ? 0.3 : 0.8); }
  return lowpass(x, low ? 1200 : 3500).map((v) => v * vel);
}

/* ------------------------------------------------------------------ pieces */
function render(name, bpm, bars, build) {
  const beat = 60 / bpm, len = bars * 4 * beat;
  const buf = new Float32Array(Math.round(len * SR));
  build(buf, beat);
  const mixd = room(highpass(buf, 35), 0.25);
  let max = 0;
  for (const v of mixd) max = Math.max(max, Math.abs(v));
  const data = Buffer.alloc(44 + mixd.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + mixd.length * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(mixd.length * 2, 40);
  for (let i = 0; i < mixd.length; i++) data.writeInt16LE(Math.round((mixd[i] / max) * 0.55 * 32767), 44 + i * 2);
  const wav = `${OUT}${name}.wav`;
  writeFileSync(wav, data);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '56k', `${OUT}${name}.m4a`]);
  rmSync(wav);
  console.log(`${name}: ${len.toFixed(1)} s`);
}

// Lounge jazz (card tables): ii–V–I–vi in F with a walking bass, brushes and a swung ride.
render('lounge', 92, 8, (b, beat) => {
  const prog = [[55, 58, 62, 65], [48, 52, 55, 58], [53, 57, 60, 64], [50, 53, 57, 60], [55, 58, 62, 65], [48, 52, 55, 58], [53, 57, 60, 64], [52, 55, 58, 62]];
  const walk = [[43, 45, 46, 47], [36, 38, 40, 41], [41, 43, 45, 46], [38, 40, 41, 42], [43, 45, 46, 47], [36, 38, 40, 41], [41, 43, 45, 48], [40, 41, 42, 43]];
  const sw = beat * 0.66;
  prog.forEach((ch, bar) => {
    const t0 = bar * 4 * beat;
    for (const [k, at] of [[0, 0], [1, 1.5], [2, 2.66]]) {
      if (bar % 2 && k === 2) continue;
      for (const n of ch) put(b, t0 + at * beat, epiano(midi(n + 12), 1.4, 0.16 - k * 0.03));
    }
    walk[bar].forEach((n, q) => put(b, t0 + q * beat, bass(midi(n), beat * 0.95, 0.5)));
    for (let q = 0; q < 4; q++) {
      put(b, t0 + q * beat, ride(0.06));
      if (q % 2) put(b, t0 + q * beat + sw, ride(0.04));
      if (q === 1 || q === 3) put(b, t0 + q * beat, brush(0.09));
    }
    if (bar % 4 === 3) [72, 70, 69, 67].forEach((n, i) => put(b, t0 + (2 + i * 0.5) * beat, epiano(midi(n + 12), 0.7, 0.1)));
  });
});

// Flamenco rumba (roulette, horses): Am–G–F–E guitar strums, cajón and palmas.
render('rumba', 108, 8, (b, beat) => {
  const chords = [[57, 60, 64, 69], [55, 59, 62, 67], [53, 57, 60, 65], [52, 56, 59, 64]];
  const melody = [76, 74, 72, 71, 72, 74, 76, 77, 76, 74, 72, 71, 69, 71, 72, 68];
  for (let bar = 0; bar < 8; bar++) {
    const t0 = bar * 4 * beat, ch = chords[bar % 4];
    // rumba strum: down on 1, the "and" of 2, 3, the "and" of 4
    for (const [at, v] of [[0, 0.32], [1.5, 0.24], [2, 0.3], [3.5, 0.22]]) ch.forEach((n, i) => put(b, t0 + at * beat + i * 0.012, pluck(midi(n - 12), 1.2, v, 0.45)));
    put(b, t0, bass(midi(ch[0] - 24), beat * 1.8, 0.45));
    put(b, t0 + 2 * beat, bass(midi(ch[0] - 24 + 7), beat * 1.8, 0.35));
    for (let q = 0; q < 8; q++) put(b, t0 + q * beat * 0.5, cajon(q % 4 === 0, q % 4 === 0 ? 0.5 : 0.2));
    for (const q of [1, 3]) put(b, t0 + q * beat, clap(0.18));
    if (bar >= 4) for (let i = 0; i < 2; i++) put(b, t0 + i * 2 * beat, pluck(midi(melody[((bar - 4) * 2 + i) % melody.length]), 1.6, 0.28, 0.7));
  }
});

// Tropical (sea games): steel drum melody over a soft pad, marimba-like bass and a shaker.
render('tropical', 100, 8, (b, beat) => {
  const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]];
  const tune = [72, 76, 79, 76, 77, 76, 74, 72, 74, 77, 81, 79, 77, 76, 74, 71];
  for (let bar = 0; bar < 8; bar++) {
    const t0 = bar * 4 * beat, ch = chords[(bar >> 1) % 4];
    if (bar % 2 === 0) put(b, t0, pad(ch.map((n) => midi(n - 12)), 8 * beat, 0.16));
    for (const q of [0, 1.5, 3]) put(b, t0 + q * beat, steel(midi(ch[0] - 24), 0.8, 0.4));
    for (let e = 0; e < 8; e++) put(b, t0 + e * beat * 0.5, shaker(e % 2 ? 0.05 : 0.09));
    for (let i = 0; i < 4; i++) {
      if ((bar + i) % 3 === 2) continue;
      put(b, t0 + i * beat + (i % 2 ? beat * 0.5 : 0), steel(midi(tune[(bar * 2 + i) % tune.length]), 1, 0.22));
    }
  }
});

// Electro (slots and originals): arpeggios, sidechain-ish pad, soft kick and hats.
render('electro', 112, 8, (b, beat) => {
  const roots = [57, 53, 60, 55];
  for (let bar = 0; bar < 8; bar++) {
    const t0 = bar * 4 * beat, r = roots[bar % 4];
    const minor = bar % 4 !== 2 && bar % 4 !== 3;
    const arp = [r, r + (minor ? 3 : 4), r + 7, r + 12, r + 7, r + (minor ? 3 : 4), r + 7, r + 12 + (minor ? 3 : 4)];
    arp.forEach((n, i) => {
      put(b, t0 + i * beat * 0.5, synth(midi(n + 12), 0.4, 0.2, 2600));
      put(b, t0 + i * beat * 0.5 + beat * 0.25, synth(midi(n + 24), 0.25, 0.06, 3200));
    });
    put(b, t0, pad([midi(r - 12), midi(r - 12 + (minor ? 3 : 4)), midi(r - 5)], 4 * beat, 0.14));
    for (let q = 0; q < 4; q++) {
      put(b, t0 + q * beat, kick(0.45));
      put(b, t0 + q * beat + beat * 0.5, hat(0.12));
      put(b, t0 + q * beat, bass(midi(r - 24), beat * 0.6, 0.3));
    }
    if (bar % 2) put(b, t0 + 3.75 * beat, clap(0.12));
  }
});
