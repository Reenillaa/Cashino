// Renders the brand SVGs into every PNG the app config needs (+ an Icon Composer .icon bundle).
// Run: node scripts/generate-icons.mjs   (requires Playwright's Chromium)
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(`${execSync('npm root -g').toString().trim()}/playwright`);
}
const { chromium } = playwright;
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';

const svg = (f) => readFileSync(new URL(`../brand/${f}`, import.meta.url), 'utf8');
const out = (f) => new URL(`../assets/${f}`, import.meta.url).pathname;
const jobs = [
  ['logo-app-icon.svg', 'images/icon.png', 1024, null],
  ['logo-app-icon.svg', 'images/favicon.png', 96, null],
  ['logo-symbol.svg', 'images/splash-icon.png', 512, 'transparent'],
  ['logo-symbol.svg', 'images/android-icon-foreground.png', 1024, 'transparent', 0.62],
  ['logo-monochrome.svg', 'images/android-icon-monochrome.png', 1024, 'transparent', 0.62],
];
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [src, dst, size, bg, scale = 1] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  const s = svg(src).replace('<svg ', `<svg width="${size * scale}" height="${size * scale}" `);
  await page.setContent(`<html><body style="margin:0;background:${bg ?? '#000'};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${s}</body></html>`);
  await page.screenshot({ path: out(dst), omitBackground: bg === 'transparent', clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', dst);
}
await browser.close();
// Icon Composer bundle (iOS 26 Liquid Glass icon). Background fill + symbol layer.
rmSync(out('expo.icon'), { recursive: true, force: true });
mkdirSync(out('app.icon/Assets'), { recursive: true });
copyFileSync(new URL('../brand/logo-symbol.svg', import.meta.url), out('app.icon/Assets/symbol.svg'));
writeFileSync(out('app.icon/icon.json'), JSON.stringify({
  fill: { 'automatic-gradient': 'extended-srgb:0.10000,0.10900,0.12500,1.00000' },
  groups: [{ layers: [{ 'image-name': 'symbol.svg', name: 'symbol', position: { scale: 1, 'translation-in-points': [0, 0] } }], shadow: { kind: 'neutral', opacity: 0.5 }, translucency: { enabled: true, value: 0.35 } }],
  'supported-platforms': { circles: ['watchOS'], squares: 'shared' },
}, null, 2));
console.log('wrote app.icon');
