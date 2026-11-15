// Designs Plinko and Keno pay tables targeting RTP ≈ 99 % and prints them as TS constants.
// Run: node scripts/design-paytables.mjs  (output pasted into src/engine/games/*.ts, verified by tests)
const choose = (n, k) => { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
const round = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x) : x >= 1 ? Math.round(x * 10) / 10 : Math.round(x * 10) / 10);

function plinko(n, min, max) {
  const probs = Array.from({ length: n + 1 }, (_, i) => choose(n, i) / 2 ** n);
  let best = null;
  const centre = n % 2 === 0 ? [n / 2] : [(n - 1) / 2, (n + 1) / 2];
  for (let p = 0.3; p <= 6; p += 0.005) {
    const table = probs.map((_, i) => { const x = Math.abs(i - n / 2) / (n / 2); return round(min * (max / min) ** (x ** p)); });
    // Fine-tune the central bin(s) to land RTP in [0.985, 0.992].
    const rest = table.reduce((s, m, i) => s + (centre.includes(i) ? 0 : m * probs[i]), 0);
    const pc = centre.reduce((s, i) => s + probs[i], 0);
    const v = Math.floor(((0.99 - rest) / pc) * 100) / 100;
    if (v < 0.1 || v > 1) continue;
    centre.forEach((i) => (table[i] = v));
    const ev = table.reduce((s, m, i) => s + m * probs[i], 0);
    const smooth = Math.abs(v - min) / min;
    if (ev <= 0.992 && ev >= 0.985 && (!best || smooth < best.smooth)) best = { table, ev, p, smooth };
  }
  return best;
}
const out = { low: {}, medium: {}, high: {} };
for (let n = 8; n <= 16; n++) {
  const t = (n - 8) / 8;
  const cfg = { low: [0.5, 5.6 * (16 / 5.6) ** t], medium: [0.4, 13 * (110 / 13) ** t], high: [0.2, 29 * (1000 / 29) ** t] };
  for (const risk of Object.keys(cfg)) {
    const [min, max] = cfg[risk];
    const r = plinko(n, min, round(max));
    if (!r) throw new Error(`no table ${risk} ${n}`);
    out[risk][n] = r.table;
    console.error(risk, n, r.ev.toFixed(4), JSON.stringify(r.table));
  }
}
console.log('PLINKO', JSON.stringify(out));

const roundK = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100);
// Keno: 40 numbers, 10 drawn, picks 1..10. P(hits = h | picks = s) hypergeometric.
const hyper = (s, h) => (choose(s, h) * choose(40 - s, 10 - h)) / choose(40, 10);
const START = { low: [1, 1, 1, 2, 2, 2, 3, 3, 3, 4], medium: [1, 1, 2, 2, 3, 3, 3, 4, 4, 5], high: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6] };
const TOP = { low: [0, 9, 26, 50, 100, 200, 400, 700, 1000, 2000], medium: [0, 16, 50, 120, 300, 600, 1000, 2500, 5000, 10000], high: [0, 0, 80, 250, 800, 1500, 3000, 6000, 10000, 20000] };
function keno(s, risk) {
  const probs = Array.from({ length: s + 1 }, (_, h) => hyper(s, h));
  const st = START[risk][s - 1];
  const build = (g) => {
    const w = probs.map((_, h) => (h < st ? 0 : g ** (h - st)));
    const ew = w.reduce((a, x, h) => a + x * probs[h], 0);
    const c = 0.99 / ew;
    return w.map((x) => x * c);
  };
  let table;
  if (st === s) table = build(1);
  else {
    let lo = 1, hi = 1000;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; build(mid)[s] < TOP[risk][s - 1] ? (lo = mid) : (hi = mid); }
    table = build(lo);
  }
  table = table.map((x) => Math.floor(roundK(x) * 100) / 100);
  // Floor-rounding keeps RTP ≤ 99 %; nudge the first paying tier up if RTP fell below 98.5 %.
  let ev = table.reduce((a, m, h) => a + m * probs[h], 0);
  while (ev < 0.985) { table[st] = Math.round((table[st] + 0.01) * 100) / 100; ev = table.reduce((a, m, h) => a + m * probs[h], 0); }
  return { table, ev };
}
const k = { low: {}, medium: {}, high: {} };
for (const risk of ['low', 'medium', 'high']) for (let s = 1; s <= 10; s++) {
  const r = keno(s, risk); if (!r) throw new Error(`no keno ${risk} ${s}`);
  k[risk][s] = r.table; console.error('keno', risk, s, r.ev.toFixed(4), JSON.stringify(r.table));
}
console.log('KENO', JSON.stringify(k));
