// Turns the exported web build (dist/) into an installable PWA for GitHub Pages:
// manifest + iOS home-screen tags, SPA fallback (404.html) and .nojekyll.
// Usage: node scripts/pwa-postbuild.mjs /Cashino
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

const base = (process.argv[2] ?? '').replace(/\/$/, '');
const dist = new URL('../dist/', import.meta.url).pathname;
const NAME = 'Cashino';
const THEME = '#000000';

for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
  if (!existsSync(dist + f)) copyFileSync(new URL(`../public/${f}`, import.meta.url).pathname, dist + f);
}
writeFileSync(
  dist + 'manifest.json',
  JSON.stringify(
    {
      name: NAME,
      short_name: NAME,
      description: 'Juegos con moneda virtual sin valor monetario · Virtual-currency games, no real money.',
      start_url: `${base}/`,
      scope: `${base}/`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: THEME,
      theme_color: THEME,
      icons: [
        { src: `${base}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${base}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    null,
    2,
  ),
);
let html = readFileSync(dist + 'index.html', 'utf8');
const tags = [
  `<link rel="manifest" href="${base}/manifest.json">`,
  `<link rel="apple-touch-icon" href="${base}/apple-touch-icon.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  `<meta name="apple-mobile-web-app-title" content="${NAME}">`,
  `<meta name="theme-color" content="${THEME}">`,
  // Native feel on iPhone: no grey tap flash, no long-press callouts/selection (inputs still editable).
  // Home-screen apps with a translucent status bar size 100% as (screen − status bar), leaving a black
  // strip at the bottom: in standalone mode fill the real screen instead.
  `<style id="cashino-native">html,body{background:${THEME};overscroll-behavior:none}` +
    'body{-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}' +
    'input,textarea{-webkit-user-select:auto;user-select:auto}' +
    '@media all and (display-mode: standalone){html,body,#root{height:100vh}}' +
    // A phone app, not a web page: the page itself never moves or zooms (lists scroll inside the app).
    'html,body{position:fixed;inset:0;width:100%;height:100%;overflow:hidden;touch-action:pan-x pan-y}' +
    '*{touch-action:manipulation}' +
    '#root{position:fixed;inset:0;overflow:hidden}' +
    '*{-webkit-text-size-adjust:100%;text-size-adjust:100%}</style>',
  // iOS Safari ignores user-scalable=no on purpose, so block pinch zoom ourselves (double-tap zoom is off via
  // touch-action, which keeps fast repeated taps working).
  '<script id="cashino-nozoom">(function(){var d=document,stop=function(e){e.preventDefault()};' +
    "['gesturestart','gesturechange','gestureend'].forEach(function(t){d.addEventListener(t,stop,{passive:false})});" +
    "d.addEventListener('touchmove',function(e){if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false});" +
    "d.addEventListener('dblclick',stop,{passive:false});})();</script>",
].join('');
html = html.replace(/<meta name="viewport"[^>]*>/, '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover, shrink-to-fit=no">');
if (!html.includes('rel="manifest"')) html = html.replace('</head>', `${tags}</head>`);
html = html.replace('<body', `<body style="background:${THEME}"`);
writeFileSync(dist + 'index.html', html);
// GitHub Pages serves 404.html for unknown paths: reuse the app so deep links (/game/dice) work.
writeFileSync(dist + '404.html', html);
writeFileSync(dist + '.nojekyll', '');
console.log(`PWA ready for base "${base || '/'}"`);
