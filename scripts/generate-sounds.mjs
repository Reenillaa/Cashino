// Procedurally synthesises every sound effect and the ambient loop (original, royalty-free).
// Run: node scripts/generate-sounds.mjs → assets/sounds/*.wav (16-bit mono)
//
// Design goals (v2): sound like real objects, not UI beeps. Physical/modal synthesis for chips,
// dice, coins and wood; filtered noise for cards; marimba/kalimba tones for rewards; a small
// Freeverb room on everything so nothing sounds dry or "digital". Soft, short, never shrill:
// energy is kept below ~5 kHz except for coin shimmer.
import { writeFileSync, mkdirSync } from 'node:fs';

const SR = 44100;
const OUT = new URL('../assets/sounds/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// ---------- primitives ----------
let seed = 20261115;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; // [0,1)
const noise = () => rand() * 2 - 1;
const jitter = (v, pct) => v * (1 + (rand() * 2 - 1) * pct);
const TAU = Math.PI * 2;
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));

/** Adds `fn(t)` (t in seconds from `start`) into `out`. */
function add(out, fn, start = 0, gain = 1) {
  const s0 = Math.floor(start * SR);
  for (let i = 0; i + s0 < out.length; i++) out[i + s0] += gain * fn(i / SR);
}
/** Mixes buffer `x` into `out` at `start`. */
function mix(out, x, start = 0, gain = 1) {
  const s0 = Math.floor(start * SR);
  for (let i = 0; i < x.length && i + s0 < out.length; i++) out[i + s0] += x[i] * gain;
}

/** RBJ biquad, processed in place. `f` may be a function of time for sweeps. */
function biquad(x, type, f, q = 0.707) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  const coefs = (f0) => {
    const w = (TAU * Math.min(f0, SR * 0.45)) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q);
    let B0, B1, B2;
    if (type === 'lp') { B0 = (1 - cs) / 2; B1 = 1 - cs; B2 = (1 - cs) / 2; }
    else if (type === 'hp') { B0 = (1 + cs) / 2; B1 = -(1 + cs); B2 = (1 + cs) / 2; }
    else { B0 = al; B1 = 0; B2 = -al; } // band-pass, 0 dB peak
    const A0 = 1 + al;
    b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = (-2 * cs) / A0; a2 = (1 - al) / A0;
  };
  const dynamic = typeof f === 'function';
  if (!dynamic) coefs(f);
  for (let i = 0; i < x.length; i++) {
    if (dynamic && i % 32 === 0) coefs(f(i / SR));
    const y = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}

/** Mono Freeverb (8 combs + 4 all-passes). Returns a longer buffer with the tail. */
function reverb(x, { room = 0.45, damp = 0.55, wet = 0.18, tail = 0.7 } = {}) {
  const out = new Float32Array(x.length + Math.floor(tail * SR));
  const k = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ b: new Float32Array(Math.floor(d * k)), i: 0, s: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ b: new Float32Array(Math.floor(d * k)), i: 0 }));
  const fb = room * 0.28 + 0.7, d1 = damp * 0.4, d2 = 1 - d1;
  for (let n = 0; n < out.length; n++) {
    const input = n < x.length ? x[n] : 0;
    let acc = 0;
    for (const c of combs) {
      const y = c.b[c.i];
      c.s = y * d2 + c.s * d1;
      c.b[c.i] = input * 0.015 + c.s * fb;
      c.i = (c.i + 1) % c.b.length;
      acc += y;
    }
    for (const a of aps) {
      const b = a.b[a.i];
      const o = b - acc;
      a.b[a.i] = acc + b * 0.5;
      a.i = (a.i + 1) % a.b.length;
      acc = o;
    }
    out[n] = input + acc * wet * 3;
  }
  return out;
}

/** Decaying sinusoids (modal synthesis). modes: [freq, amp, decayPerSecond]. */
const modal = (modes, attack = 0.0008) => (t) => {
  const a = t < attack ? t / attack : 1;
  let v = 0;
  for (const [f, amp, k] of modes) v += amp * Math.sin(TAU * f * t) * Math.exp(-k * t);
  return v * a;
};

/** Short noise exciter ("contact click"), low-passed so it is a tap, not a hiss. */
function click(sec = 0.004, cutoff = 4000, decay = 900) {
  const x = buf(sec);
  add(x, (t) => noise() * Math.exp(-decay * t));
  return biquad(x, 'lp', cutoff);
}

/** Soft marimba bar: fundamental + 4th-ish partial + a brief mallet knock. */
function marimba(f, { decay = 4.5, bright = 0.45, sec = 1.2 } = {}) {
  const x = buf(sec);
  add(x, modal([[f, 1, decay], [f * 3.93, 0.32 * bright, decay * 3.2], [f * 9.2, 0.08 * bright, decay * 8]], 0.0025));
  mix(x, click(0.006, 2500, 600), 0, 0.12 * bright);
  return x;
}

/** Kalimba / glass tine: clean tone with a quick inharmonic shimmer. */
function tine(f, { decay = 3.2, sec = 1.2 } = {}) {
  const x = buf(sec);
  add(x, modal([[f, 1, decay], [f * 2.01, 0.12, decay * 2.2], [f * 5.4, 0.18, decay * 7]], 0.003));
  return x;
}

/** One coin "ting": inharmonic metal modes with slight beating. */
function coinTing(base = 3900, { decay = 9, sec = 0.6 } = {}) {
  const b = jitter(base, 0.04);
  const x = buf(sec);
  add(x, modal([[b, 0.7, decay], [b * 1.003, 0.5, decay], [b * 1.47, 0.45, decay * 1.4], [b * 2.13, 0.25, decay * 2.2], [b * 2.79, 0.12, decay * 3]], 0.0006));
  mix(x, click(0.003, 7000, 1500), 0, 0.3);
  return biquad(x, 'hp', 900);
}

/** Clay poker chip hitting another chip. */
function chipHit(scale = 1) {
  const x = buf(0.12);
  const m = [[2350, 1, 48], [3720, 0.7, 62], [5150, 0.42, 85], [6900, 0.2, 120]].map(([f, a, k]) => [jitter(f * scale, 0.035), a, k]);
  add(x, modal(m, 0.0004));
  mix(x, click(0.004, 6000, 1100), 0, 0.9);
  // the felt/table body underneath
  const body = buf(0.05);
  add(body, (t) => noise() * Math.exp(-t * 90));
  biquad(body, 'lp', 700);
  mix(x, body, 0, 0.6);
  return x;
}

/** Wooden die / ball knock. */
function woodKnock(f = 1900, amp = 1) {
  const x = buf(0.09);
  add(x, modal([[jitter(f, 0.06), 1, 70], [jitter(f * 1.58, 0.06), 0.55, 95], [jitter(f * 2.31, 0.06), 0.25, 130]], 0.0005));
  mix(x, click(0.003, 5000, 1300), 0, 0.5);
  for (let i = 0; i < x.length; i++) x[i] *= amp;
  return x;
}

function fadeOut(x, sec = 0.02) {
  const n = Math.min(x.length, Math.floor(sec * SR));
  for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n;
  return x;
}

/** Trims trailing silence, removes DC, normalises to `peak` and writes a 16-bit WAV. */
function write(name, x, peak = 0.5, { sr = SR, trim = true } = {}) {
  biquad(x, 'hp', 30);
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  let end = x.length;
  if (trim && max > 0) {
    const floor = max * 0.0015;
    while (end > 1 && Math.abs(x[end - 1]) < floor) end--;
    end = Math.min(x.length, end + Math.floor(0.01 * sr));
  }
  const y = fadeOut(x.slice(0, end), 0.012);
  const g = max > 0 ? peak / max : 0;
  const data = Buffer.alloc(44 + y.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + y.length * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(sr, 24);
  data.writeUInt32LE(sr * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(y.length * 2, 40);
  for (let i = 0; i < y.length; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(y[i] * g * 32767))), 44 + i * 2);
  writeFileSync(new URL(`${name}.wav`, OUT), data);
  return { name, ms: Math.round((y.length / sr) * 1000), kb: Math.round(data.length / 1024) };
}

const NOTE = { A3: 220, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, B6: 1975.53 };
const report = [];
const w = (...a) => report.push(write(...a));

// ---------- UI ----------
// tap: a soft knuckle knock on a wooden table (used for "check" and "stand").
{
  const x = buf(0.25);
  add(x, modal([[180, 1, 32], [415, 0.5, 45], [1150, 0.18, 90]], 0.0012));
  mix(x, click(0.005, 2200, 700), 0, 0.35);
  w('tap', reverb(x, { wet: 0.1, tail: 0.25 }), 0.32);
}
// toggle: tiny, muted tick.
{
  const x = buf(0.06);
  add(x, modal([[1650, 1, 140], [2900, 0.35, 200]]));
  mix(x, click(0.002, 3000), 0, 0.3);
  w('toggle', reverb(x, { wet: 0.08, tail: 0.15 }), 0.2);
}

// ---------- chips & cards ----------
// chip: one chip dropped on a small stack — a main clack and two settling clicks.
{
  const x = buf(0.3);
  mix(x, chipHit(1), 0, 1);
  mix(x, chipHit(1.06), 0.034, 0.55);
  mix(x, chipHit(0.97), 0.061, 0.22);
  biquad(x, 'lp', 9000);
  w('chip', reverb(x, { room: 0.3, wet: 0.1, tail: 0.25 }), 0.42);
}
// card: a card sliding off the deck across felt, ending in a soft snap.
{
  const x = buf(0.22);
  add(x, (t) => noise() * (t < 0.03 ? t / 0.03 : Math.exp(-(t - 0.03) * 18)));
  biquad(x, 'bp', (t) => 1400 + 2600 * Math.min(1, t / 0.12), 0.8);
  biquad(x, 'lp', 4200);
  const snap = buf(0.03);
  add(snap, (t) => noise() * Math.exp(-t * 260));
  biquad(snap, 'bp', 2100, 1.1);
  mix(x, snap, 0.105, 0.7);
  w('card', reverb(x, { room: 0.25, wet: 0.08, tail: 0.2 }), 0.4);
}
// flip: a card turned face up / folded — short airy flick.
{
  const x = buf(0.12);
  add(x, (t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.09)) ** 2);
  biquad(x, 'bp', (t) => 3200 - 1600 * (t / 0.12), 0.9);
  biquad(x, 'lp', 4200);
  w('flip', reverb(x, { wet: 0.06, tail: 0.15 }), 0.28);
}

// ---------- reveals ----------
// gem: two soft glass tines (mines safe tile, keno hit).
{
  const x = buf(1);
  mix(x, tine(NOTE.E6, { decay: 4.5 }), 0, 0.8);
  mix(x, tine(NOTE.B6, { decay: 5 }), 0.055, 0.5);
  biquad(x, 'lp', 7000);
  w('gem', reverb(x, { room: 0.55, wet: 0.22, tail: 0.6 }), 0.36);
}
// reveal: a single warm marimba note.
{
  const x = marimba(NOTE.C6, { decay: 7, bright: 0.35, sec: 0.6 });
  w('reveal', reverb(x, { wet: 0.14, tail: 0.4 }), 0.34);
}
// mine: muffled low "thoom" — dramatic but never harsh.
{
  const x = buf(1.1);
  add(x, (t) => noise() * Math.exp(-t * 5.5) * (t < 0.01 ? t / 0.01 : 1));
  biquad(x, 'lp', (t) => 900 - 650 * Math.min(1, t / 0.5), 0.9);
  add(x, (t) => Math.sin(TAU * (62 * t - 18 * t * t)) * Math.exp(-t * 5) * 1.2);
  w('mine', reverb(x, { room: 0.6, wet: 0.2, tail: 0.6 }), 0.55);
}

// ---------- results ----------
// win: rising marimba triad.
{
  const x = buf(1.4);
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => mix(x, marimba(f, { decay: 4.2, bright: 0.5 }), i * 0.065, 0.75 - i * 0.06));
  w('win', reverb(x, { room: 0.5, wet: 0.2, tail: 0.6 }), 0.46);
}
// bigwin: longer arpeggio, warm pad and a few coin sparkles.
{
  const x = buf(2.6);
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6].forEach((f, i) => mix(x, marimba(f, { decay: 3.2, bright: 0.5, sec: 1.6 }), i * 0.075, 0.7));
  for (const f of [NOTE.C5 / 2, NOTE.G4, NOTE.E5]) {
    add(x, (t) => (Math.sin(TAU * f * t) + Math.sin(TAU * f * 1.004 * t)) * 0.5 * Math.min(1, t / 0.25) * Math.exp(-t * 1.6), 0.38, 0.22);
  }
  for (let i = 0; i < 6; i++) mix(x, coinTing(3400 + rand() * 1600, { decay: 10 }), 0.45 + i * 0.13 + rand() * 0.05, 0.16);
  biquad(x, 'lp', 8000);
  w('bigwin', reverb(x, { room: 0.65, wet: 0.26, tail: 1 }), 0.5);
}
// lose: two muted, low notes stepping down — a shrug, not a buzzer.
{
  const x = buf(0.9);
  mix(x, marimba(NOTE.D4, { decay: 8, bright: 0.2, sec: 0.6 }), 0, 0.8);
  mix(x, marimba(NOTE.A3, { decay: 7, bright: 0.15, sec: 0.7 }), 0.12, 0.7);
  biquad(x, 'lp', 1800);
  w('lose', reverb(x, { wet: 0.12, tail: 0.4 }), 0.28);
}

// ---------- game textures ----------
// tick: soft wooden tick for rising multipliers and wheel pockets (plays often → very quiet).
{
  const x = buf(0.05);
  add(x, modal([[1450, 1, 160], [2600, 0.3, 220]], 0.0005));
  mix(x, click(0.002, 3500), 0, 0.25);
  w('tick', x, 0.16);
}
// rocket: a soft rising "whoosh" with a low hum.
{
  const x = buf(1.3);
  add(x, (t) => noise() * Math.min(1, t / 0.35) * (t > 1.0 ? Math.max(0, 1 - (t - 1.0) / 0.3) : 1));
  biquad(x, 'bp', (t) => 260 + 900 * Math.min(1, t / 1.2), 0.9);
  biquad(x, 'lp', 1800);
  add(x, (t) => Math.sin(TAU * (55 + 25 * t) * t) * Math.min(1, t / 0.4) * Math.exp(-t * 0.8) * 0.5);
  w('rocket', reverb(x, { wet: 0.12, tail: 0.4 }), 0.3);
}
// crash: soft "poof" fading away.
{
  const x = buf(1);
  add(x, (t) => noise() * Math.exp(-t * 6) * (t < 0.006 ? t / 0.006 : 1));
  biquad(x, 'lp', (t) => 1400 - 1000 * Math.min(1, t / 0.4), 0.8);
  add(x, (t) => Math.sin(TAU * (95 - 40 * t) * t) * Math.exp(-t * 5) * 0.8);
  w('crash', reverb(x, { room: 0.55, wet: 0.2, tail: 0.6 }), 0.45);
}
// cashout: a small cascade of coins over a gentle chime.
{
  const x = buf(1.2);
  [0, 0.05, 0.1, 0.17, 0.22].forEach((s, i) => mix(x, coinTing(3600 + rand() * 900), s + rand() * 0.012, 0.5 - i * 0.06));
  mix(x, marimba(NOTE.G5, { decay: 5, bright: 0.3 }), 0, 0.4);
  mix(x, marimba(NOTE.C6, { decay: 5, bright: 0.3 }), 0.08, 0.35);
  biquad(x, 'lp', 9000);
  w('cashout', reverb(x, { room: 0.45, wet: 0.16, tail: 0.5 }), 0.42);
}
// peg: Plinko ball tapping a peg — tiny wood/plastic tock.
{
  const x = buf(0.07);
  add(x, modal([[1250, 1, 90], [3150, 0.3, 160]], 0.0005));
  mix(x, click(0.002, 4500), 0, 0.3);
  w('peg', x, 0.2);
}
// land: ball settles in a slot — soft thud + one marimba note.
{
  const x = buf(0.6);
  const thud = buf(0.08);
  add(thud, (t) => noise() * Math.exp(-t * 70));
  biquad(thud, 'lp', 500);
  mix(x, thud, 0, 0.8);
  mix(x, marimba(NOTE.G5, { decay: 6, bright: 0.35, sec: 0.5 }), 0.01, 0.6);
  w('land', reverb(x, { wet: 0.14, tail: 0.4 }), 0.36);
}
// roll: roulette ball circling the wheel, slowing down (≈1.6 s).
{
  const x = buf(1.6);
  add(x, (t) => {
    const rate = 22 - 12 * (t / 1.6);
    const am = 0.65 + 0.35 * Math.sin(TAU * rate * t + 2 * Math.sin(TAU * 3 * t));
    return noise() * am * Math.min(1, t / 0.15) * (t > 1.3 ? Math.max(0, 1 - (t - 1.3) / 0.3) : 1);
  });
  biquad(x, 'bp', 1700, 0.7);
  biquad(x, 'lp', 3500);
  w('roll', x, 0.18);
}
// balldrop: ball bouncing between frets into a pocket.
{
  const x = buf(0.7);
  [[0, 1], [0.13, 0.7], [0.23, 0.5], [0.3, 0.32], [0.35, 0.2], [0.385, 0.12]].forEach(([s, a]) => mix(x, woodKnock(2300, a), s));
  w('balldrop', reverb(x, { wet: 0.12, tail: 0.3 }), 0.32);
}
// dice: two dice shaken and tumbling onto felt.
{
  const x = buf(0.8);
  let t0 = 0;
  for (let k = 0; k < 9; k++) {
    t0 += 0.02 + rand() * 0.035;
    mix(x, woodKnock(1700 + rand() * 900, 0.35 + rand() * 0.5), t0);
  }
  for (const [s, a] of [[0.42, 0.9], [0.5, 0.6], [0.56, 0.35], [0.6, 0.2]]) {
    mix(x, woodKnock(1500 + rand() * 500, a), s);
    const th = buf(0.06);
    add(th, (t) => noise() * Math.exp(-t * 80));
    biquad(th, 'lp', 400);
    mix(x, th, s, a * 0.5);
  }
  biquad(x, 'lp', 7000);
  w('dice', reverb(x, { room: 0.35, wet: 0.1, tail: 0.3 }), 0.4);
}
// coin: a coin spinning on the table, speeding up as it settles.
{
  const x = buf(1.1);
  const ring = coinTing(4200, { decay: 2.2, sec: 1.1 });
  for (let i = 0; i < ring.length; i++) {
    const t = i / SR;
    const rate = 7 + 22 * (t / 1.1) ** 1.5;
    ring[i] *= 0.55 + 0.45 * Math.sin(TAU * rate * t);
  }
  mix(x, ring, 0, 0.6);
  mix(x, woodKnock(2200, 0.5), 0.96);
  w('coin', reverb(x, { wet: 0.12, tail: 0.4 }), 0.3);
}
// pop: Keno number drawn — a round, soft bubble.
{
  const x = buf(0.14);
  add(x, (t) => Math.sin(TAU * (420 * t + 4200 * t * t)) * Math.exp(-t * 38) * Math.min(1, t / 0.002));
  w('pop', reverb(x, { wet: 0.1, tail: 0.2 }), 0.28);
}
// step: chicken hop — light woody bloop.
{
  const x = buf(0.16);
  add(x, (t) => Math.sin(TAU * (330 * t + 1500 * t * t)) * Math.exp(-t * 30) * Math.min(1, t / 0.003));
  mix(x, click(0.002, 2500), 0, 0.15);
  w('step', reverb(x, { wet: 0.08, tail: 0.2 }), 0.28);
}
// hit: soft cartoon "bonk".
{
  const x = buf(0.5);
  add(x, modal([[210, 1, 14], [530, 0.4, 22], [1210, 0.12, 40]], 0.002));
  add(x, (t) => Math.sin(TAU * (300 * t - 260 * t * t)) * Math.exp(-t * 10) * 0.5);
  w('hit', reverb(x, { wet: 0.14, tail: 0.4 }), 0.4);
}
// notify: two gentle marimba notes.
{
  const x = buf(1);
  mix(x, marimba(NOTE.G5, { decay: 5, bright: 0.4 }), 0, 0.7);
  mix(x, marimba(NOTE.C6, { decay: 5, bright: 0.4 }), 0.11, 0.6);
  w('notify', reverb(x, { wet: 0.18, tail: 0.5 }), 0.32);
}
// levelup: bright arpeggio with a sparkle on top.
{
  const x = buf(1.8);
  [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => mix(x, marimba(f, { decay: 3.5, bright: 0.5, sec: 1.4 }), i * 0.07, 0.7));
  for (let i = 0; i < 3; i++) mix(x, tine(NOTE.G6 * (1 + i * 0.25), { decay: 5 }), 0.36 + i * 0.07, 0.18);
  w('levelup', reverb(x, { room: 0.6, wet: 0.24, tail: 0.8 }), 0.46);
}

// ---------- ambient loop (22.05 kHz, 16 s, very quiet warm pad) ----------
{
  const SR2 = 22050;
  const len = 16;
  const x = new Float32Array(len * SR2);
  const chords = [[130.81, 196, 246.94, 329.63], [110, 164.81, 261.63, 329.63], [87.31, 174.61, 220, 329.63], [98, 146.83, 246.94, 293.66]];
  // Frequencies are snapped to multiples of 1/len Hz so every partial completes whole cycles → seamless loop.
  const q = (f) => Math.round(f * len) / len;
  chords.forEach((ch, ci) => {
    const s0 = ci * 4;
    for (const f0 of ch) {
      const [f1, f2, f3] = [q(f0), q(f0 * 1.003), q(f0 * 2)];
      for (let i = 0; i < x.length; i++) {
        const t = i / SR2;
        let d = (((t - s0) % len) + len) % len;
        if (d > len - 1.5) d -= len; // fade-in region just before the chord starts (wraps around the loop)
        const e = d < 0 ? (d + 1.5) / 1.5 : d < 4 ? 1 : d < 5.5 ? 1 - (d - 4) / 1.5 : 0;
        if (e <= 0) continue;
        x[i] += e * (Math.sin(TAU * f1 * t) + 0.5 * Math.sin(TAU * f2 * t) + 0.12 * Math.sin(TAU * f3 * t)) * 0.12;
      }
    }
  });
  // gentle low-pass for warmth
  let y = 0;
  const a = 1 - Math.exp((-TAU * 1200) / SR2);
  for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; }
  let max = 0;
  for (const v of x) max = Math.max(max, Math.abs(v));
  const data = Buffer.alloc(44 + x.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + x.length * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(SR2, 24);
  data.writeUInt32LE(SR2 * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.round((x[i] / max) * 0.3 * 32767), 44 + i * 2);
  writeFileSync(new URL('ambient.wav', OUT), data);
  report.push({ name: 'ambient', ms: len * 1000, kb: Math.round(data.length / 1024) });
}

console.table(report);
