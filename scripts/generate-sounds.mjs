// Procedurally synthesises every sound effect and the ambient loop (original, royalty-free).
// Run: node scripts/generate-sounds.mjs → assets/sounds/*.wav (22.05 kHz, 16-bit mono)
import { writeFileSync, mkdirSync } from 'node:fs';
const SR = 22050;
const OUT = new URL('../assets/sounds/', import.meta.url);
mkdirSync(OUT, { recursive: true });

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const env = (t, a, d, sustain = 0, rel = 0, len = 1) => (t < a ? t / a : t < a + d ? 1 - (1 - sustain) * ((t - a) / d) : t < len - rel ? sustain : sustain * Math.max(0, (len - t) / Math.max(rel, 1e-6)));
const expDecay = (t, k) => Math.exp(-t * k);
function add(out, fn, start = 0) {
  const s0 = Math.floor(start * SR);
  for (let i = 0; i + s0 < out.length; i++) out[i + s0] += fn(i / SR);
}
function lowpass(x, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff), dt = 1 / SR, a = dt / (rc + dt);
  let y = 0;
  for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; }
  return x;
}
function highpass(x, cutoff) {
  const rc = 1 / (2 * Math.PI * cutoff), dt = 1 / SR, a = rc / (rc + dt);
  let py = 0, px = 0;
  for (let i = 0; i < x.length; i++) { const y = a * (py + x[i] - px); px = x[i]; py = y; x[i] = y; }
  return x;
}
const sin = (f, t, ph = 0) => Math.sin(2 * Math.PI * f * t + ph);
const bell = (f, t, k = 6) => (sin(f, t + 0.0015 * sin(f * 2.76, t)) + 0.4 * sin(f * 2.76, t) + 0.2 * sin(f * 5.4, t)) * expDecay(t, k);
function write(name, x, gain = 0.8) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? gain / peak : 0;
  const data = Buffer.alloc(44 + x.length * 2);
  data.write('RIFF', 0); data.writeUInt32LE(36 + x.length * 2, 4); data.write('WAVE', 8); data.write('fmt ', 12);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(SR, 24);
  data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * g * 32767))), 44 + i * 2);
  writeFileSync(new URL(`${name}.wav`, OUT), data);
}
const noise = (sec, k) => { const x = buf(sec); add(x, (t) => rnd() * expDecay(t, k)); return x; };

// UI: glassy tap and toggle
{ const x = buf(0.06); add(x, (t) => sin(2400, t) * expDecay(t, 90) * 0.6 + rnd() * expDecay(t, 400) * 0.3); write('tap', highpass(x, 600), 0.45); }
{ const x = buf(0.09); add(x, (t) => bell(1320, t, 45)); add(x, (t) => bell(1760, t, 45) * 0.6, 0.035); write('toggle', x, 0.4); }
// Chip: two ceramic clicks
{ const x = buf(0.14); for (const [s, f] of [[0, 3200], [0.045, 2700]]) add(x, (t) => (rnd() * 0.5 + sin(f, t)) * expDecay(t, 120), s); write('chip', highpass(x, 900), 0.55); }
// Card: paper swish + snap
{ const x = noise(0.16, 22); lowpass(x, 3500); highpass(x, 700); add(x, (t) => rnd() * expDecay(t, 300) * 0.8, 0.11); write('card', x, 0.5); }
{ const x = noise(0.1, 40); highpass(x, 1500); write('flip', x, 0.45); }
// Reveal / gem: crystalline bells
{ const x = buf(0.5); add(x, (t) => bell(1568, t, 9)); add(x, (t) => bell(2349, t, 9) * 0.7, 0.05); write('gem', x, 0.5); }
{ const x = buf(0.25); add(x, (t) => bell(880, t, 16)); write('reveal', x, 0.45); }
// Mine: soft low thump with filtered noise (no harsh explosion)
{ const x = noise(0.6, 7); lowpass(x, 600); add(x, (t) => sin(70 - 40 * t, t) * expDecay(t, 6) * 1.5); write('mine', x, 0.75); }
// Win / big win / lose
{ const x = buf(0.7); [523.25, 659.25, 783.99].forEach((f, i) => add(x, (t) => bell(f, t, 5) * 0.8, i * 0.07)); write('win', x, 0.6); }
{ const x = buf(1.6); [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => add(x, (t) => bell(f, t, 3) * 0.8, i * 0.09)); add(x, (t) => sin(261.6, t) * env(t, 0.05, 1.4, 0, 0, 1.5) * 0.4); write('bigwin', x, 0.65); }
{ const x = buf(0.5); add(x, (t) => sin(330 - 120 * t, t) * expDecay(t, 6) + 0.3 * sin(220 - 80 * t, t) * expDecay(t, 6)); write('lose', lowpass(x, 1800), 0.4); }
// Tick for multipliers and wheel
{ const x = buf(0.03); add(x, (t) => sin(4200, t) * expDecay(t, 260)); write('tick', x, 0.35); }
// Rocket launch whoosh / crash / cashout
{ const x = noise(1.2, 1.2); lowpass(x, 1200); add(x, (t) => sin(90 + 120 * t, t) * env(t, 0.2, 1, 0, 0, 1.2) * 0.6); write('rocket', x, 0.5); }
{ const x = noise(0.9, 5); lowpass(x, 900); add(x, (t) => sin(110 - 70 * t, t) * expDecay(t, 4)); write('crash', x, 0.7); }
{ const x = buf(0.45); add(x, (t) => bell(1046.5, t, 8)); add(x, (t) => bell(1567.98, t, 8), 0.06); write('cashout', x, 0.55); }
// Plinko peg + land
{ const x = buf(0.05); add(x, (t) => sin(2600 + rnd() * 50, t) * expDecay(t, 140)); write('peg', x, 0.3); }
{ const x = buf(0.3); add(x, (t) => bell(740, t, 14)); write('land', x, 0.45); }
// Roulette ball roll (loopable texture) and drop
{ const x = noise(1.0, 0); lowpass(x, 2500); highpass(x, 400); for (let i = 0; i < x.length; i++) x[i] *= 0.6 + 0.4 * Math.sin((2 * Math.PI * i * 11) / SR); write('roll', x, 0.25); }
{ const x = buf(0.4); for (const s of [0, 0.09, 0.16, 0.21]) add(x, (t) => (rnd() * 0.4 + sin(3000, t)) * expDecay(t, 90), s); write('balldrop', highpass(x, 800), 0.4); }
// Dice rattle
{ const x = buf(0.5); for (let k = 0; k < 9; k++) add(x, (t) => rnd() * expDecay(t, 70) * (1 - k / 12), k * 0.045 + Math.abs(rnd()) * 0.02); write('dice', highpass(lowpass(x, 5000), 500), 0.5); }
// Coin spin shimmer
{ const x = buf(0.8); add(x, (t) => bell(2093, t, 4) * (0.6 + 0.4 * sin(18, t))); write('coin', x, 0.4); }
// Keno draw pop
{ const x = buf(0.12); add(x, (t) => sin(900 + 900 * t, t) * expDecay(t, 30)); write('pop', x, 0.4); }
// Crossing step and hit
{ const x = buf(0.1); add(x, (t) => sin(520, t) * expDecay(t, 40) + rnd() * expDecay(t, 200) * 0.2); write('step', x, 0.4); }
{ const x = noise(0.35, 10); lowpass(x, 1500); add(x, (t) => sin(160, t) * expDecay(t, 12)); write('hit', x, 0.6); }
// Notification and level up
{ const x = buf(0.5); add(x, (t) => bell(1174.7, t, 9)); add(x, (t) => bell(1568, t, 9), 0.08); write('notify', x, 0.45); }
{ const x = buf(1.3); [392, 523.25, 659.25, 783.99].forEach((f, i) => add(x, (t) => bell(f * 2, t, 3.5), i * 0.11)); write('levelup', x, 0.55); }

// Ambient pad loop (16 s, seamless): slow minor-9 chords; the overflow of the last chord wraps to the start.
{
  const len = 16, x = buf(len + 1);
  const chords = [[110, 164.81, 196, 246.94], [87.31, 130.81, 174.61, 220], [98, 146.83, 196, 233.08], [82.41, 123.47, 164.81, 207.65]];
  chords.forEach((ch, ci) => {
    ch.forEach((f) => add(x, (t) => {
      if (t > 5) return 0;
      const e = Math.sin(Math.PI * Math.min(1, t / 5));
      return e * (sin(f, t) + 0.5 * sin(f * 1.003, t) + 0.25 * sin(f * 2, t)) * 0.25;
    }, ci * 4));
  });
  lowpass(x, 1400);
  const loop = x.slice(0, len * SR);
  for (let i = len * SR; i < x.length; i++) loop[i - len * SR] += x[i];
  write('ambient', loop, 0.35);
}
console.log('sounds written');
