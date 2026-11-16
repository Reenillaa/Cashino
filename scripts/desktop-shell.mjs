// Desktop showcase for the web build. On a computer (wide window, mouse, not the installed app) the page
// shows a casino backdrop, the brand and the app running inside a phone. The app inside the phone is the
// exact mobile app (an iframe of the same page), so phones and tablets are never affected.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Finds a bundled font file by name (file names carry a content hash). */
function findFont(dist, name) {
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) {
        const r = walk(p);
        if (r) return r;
      } else if (f.startsWith(name) && f.endsWith('.ttf')) return p;
    }
    return null;
  };
  return walk(join(dist, 'assets'));
}

const chip = (color, size, x, y, r, d) => `<svg class="chip" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;--r:${r}deg;--d:${d}s" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="53" r="47" fill="rgba(0,0,0,.45)"/><circle cx="50" cy="50" r="47" fill="${color}"/>${[0, 60, 120, 180, 240, 300].map((a) => `<rect x="43" y="3.5" width="14" height="13" rx="2.5" fill="#fff" transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="33" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="5.5 4" opacity=".9"/><circle cx="50" cy="50" r="25" fill="#fff" opacity=".92"/><circle cx="50" cy="50" r="21" fill="none" stroke="${color}" stroke-width="2"/><path d="M18 36 A34 34 0 0 1 40 14" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".35"/></svg>`;
const card = (rank, suit, red, x, y, r, d) => `<div class="pcard" style="left:${x}%;top:${y}%;--r:${r}deg;--d:${d}s"><b style="color:${red ? '#E8304F' : '#1A1430'}">${rank}</b><i style="color:${red ? '#E8304F' : '#1A1430'}">${suit}</i></div>`;

export function desktopShell(dist, base, entrySrc) {
  const font = (n) => {
    const p = findFont(dist, n);
    return p ? `${base}/${relative(dist, p).split('\\').join('/')}` : '';
  };
  const css = `
@font-face{font-family:CxDisplay;src:url(${font('Unbounded_800ExtraBold')}) format('truetype');font-display:swap}
@font-face{font-family:CxSemi;src:url(${font('Unbounded_600SemiBold')}) format('truetype');font-display:swap}
@font-face{font-family:CxText;src:url(${font('Geist_400Regular')}) format('truetype');font-display:swap}
@font-face{font-family:CxText;font-weight:600;src:url(${font('Geist_600SemiBold')}) format('truetype');font-display:swap}
#cx-desk{position:fixed;inset:0;overflow:hidden;background:#07040F;color:#fff;font-family:CxText,system-ui,sans-serif;-webkit-user-select:none;user-select:none}
#cx-desk .bg{position:absolute;inset:-20%;background:radial-gradient(40% 45% at 18% 30%,rgba(123,92,255,.55),transparent 70%),radial-gradient(35% 40% at 80% 75%,rgba(255,79,163,.45),transparent 70%),radial-gradient(30% 35% at 70% 15%,rgba(18,192,138,.30),transparent 70%),radial-gradient(30% 30% at 30% 90%,rgba(255,185,56,.22),transparent 70%);filter:blur(10px);animation:cxdrift 22s ease-in-out infinite alternate}
#cx-desk .grain{position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:3px 3px;opacity:.5;pointer-events:none}
#cx-desk .felt{position:absolute;left:50%;bottom:-62vh;width:150vh;height:90vh;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(18,128,74,.35),rgba(18,128,74,0));pointer-events:none}
@keyframes cxdrift{from{transform:translate3d(-2%,-1%,0) scale(1)}to{transform:translate3d(2%,2%,0) scale(1.08)}}
#cx-desk .chip,#cx-desk .pcard{position:absolute;filter:drop-shadow(0 14px 22px rgba(0,0,0,.55));animation:cxfloat var(--d) ease-in-out infinite alternate;transform:rotate(var(--r));pointer-events:none}
@keyframes cxfloat{from{transform:translateY(-10px) rotate(var(--r))}to{transform:translateY(12px) rotate(calc(var(--r) + 8deg))}}
#cx-desk .pcard{width:74px;height:104px;border-radius:10px;background:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:8px 10px;box-sizing:border-box}
#cx-desk .pcard b{font:800 22px CxDisplay,system-ui}#cx-desk .pcard i{font-style:normal;font-size:34px;align-self:flex-end;line-height:1}
#cx-desk .wrap{position:relative;z-index:2;height:100%;display:flex;align-items:center;justify-content:center;gap:clamp(40px,7vw,120px);padding:0 4vw;box-sizing:border-box}
#cx-desk .side{max-width:460px;flex:1 1 auto}
#cx-desk .brand{display:flex;align-items:center;gap:14px}
#cx-desk .brand img{width:58px;height:58px;border-radius:16px;box-shadow:0 10px 30px rgba(255,79,163,.35)}
#cx-desk .brand span{font:800 30px CxDisplay,system-ui;letter-spacing:-1px}
#cx-desk h1{font:800 clamp(34px,3.6vw,54px)/1.05 CxDisplay,system-ui;margin:28px 0 14px;letter-spacing:-1.5px}
#cx-desk h1 em{font-style:normal;background:linear-gradient(90deg,#FFD06B,#FF4FA3 55%,#A996FF);-webkit-background-clip:text;background-clip:text;color:transparent}
#cx-desk p.lead{font-size:17px;line-height:1.5;color:rgba(255,255,255,.75);margin:0 0 26px}
#cx-desk ul{list-style:none;padding:0;margin:0 0 28px;display:grid;gap:12px}
#cx-desk li{display:flex;align-items:center;gap:14px;font-size:15.5px;color:rgba(255,255,255,.9)}
#cx-desk li i{font-style:normal;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1)}
#cx-desk .mobile{position:relative;display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:rgba(22,16,40,.92);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(12px)}
#cx-desk .mobile .ico{font-size:26px}
#cx-desk .mobile b{display:block;font:600 14px CxSemi,system-ui;margin-bottom:3px}
#cx-desk .mobile small{color:rgba(255,255,255,.65);font-size:13px;line-height:1.4}
#cx-desk .mobile button{margin-left:auto;flex:none;font:600 13px CxText,system-ui;color:#231A3A;background:#FFD06B;border:0;border-radius:999px;padding:10px 14px;cursor:pointer}
#cx-desk .note{margin-top:16px;font-size:12px;color:rgba(255,255,255,.45)}
#cx-desk .holder{flex:none;position:relative}
#cx-desk .phone{--h:860px;position:absolute;left:0;top:0;transform-origin:0 0;height:var(--h);width:calc(var(--h) * .468);border-radius:calc(var(--h) * .07);padding:12px;box-sizing:border-box;background:linear-gradient(145deg,#3a3550,#121019 40%,#2a2638);box-shadow:0 0 0 1.5px rgba(255,255,255,.12) inset,0 40px 90px rgba(0,0,0,.7),0 0 120px rgba(255,79,163,.25),0 0 60px rgba(123,92,255,.25)}
#cx-desk .phone:before,#cx-desk .phone:after{content:'';position:absolute;width:4px;border-radius:2px;background:#2a2638}
#cx-desk .phone:before{left:-4px;top:18%;height:10%;box-shadow:0 calc(var(--h) * .13) 0 #2a2638}
#cx-desk .phone:after{right:-4px;top:24%;height:14%}
#cx-desk .screen{position:relative;width:100%;height:100%;border-radius:calc(var(--h) * .056);overflow:hidden;clip-path:inset(0 round calc(var(--h) * .056));isolation:isolate;background:#000;display:flex;flex-direction:column}
#cx-desk .status{flex:none;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 28px 0 32px;font:600 15px CxText,system-ui;position:relative}
#cx-desk .island{position:absolute;left:50%;top:10px;width:30%;height:28px;transform:translateX(-50%);border-radius:20px;background:#000;box-shadow:0 0 0 1px #111}
#cx-desk .icons{display:flex;gap:6px;align-items:center}
#cx-desk .icons span{display:block;background:#fff;border-radius:2px}
#cx-desk iframe{flex:1 1 0;min-height:0;height:0;width:100%;border:0;display:block;background:#000}
#cx-desk .home{position:absolute;bottom:20px;left:50%;width:34%;height:5px;border-radius:3px;background:rgba(255,255,255,.55);transform:translateX(-50%);pointer-events:none}
@media (max-width:1180px){#cx-desk .side{max-width:360px}#cx-desk h1{font-size:34px}#cx-desk ul{display:none}}
@media (max-width:980px){#cx-desk .side{display:none}}
`;
  const body = `
<div id="cx-desk">
  <div class="bg"></div><div class="felt"></div><div class="grain"></div>
  ${chip('#7B5CFF', 120, 6, 12, -12, 7)}${chip('#FF4FA3', 90, 44, 6, 18, 9)}${chip('#12C08A', 140, 86, 18, 8, 8)}${chip('#FFB938', 80, 10, 72, 24, 10)}${chip('#E8304F', 110, 90, 70, -20, 7.5)}
  ${card('A', '♠', false, 2, 88, -16, 9)}${card('K', '♥', true, 75, 6, 14, 8)}${card('7', '♦', true, 2, 40, 10, 10)}
  <div class="wrap">
    <div class="side">
      <div class="brand"><img src="${base}/icon-192.png" alt=""><span>cashino</span></div>
      <h1>El casino de mentira<br>con emoción <em>de verdad</em>.</h1>
      <p class="lead">22 juegos, mesas en directo con más gente, apuestas deportivas con partidos reales y una academia para entender cada apuesta.</p>
      <ul>
        <li><i>🎰</i>Tragaperras, ruleta, blackjack, póker, cohete, carreras…</li>
        <li><i>🔴</i>Ruleta, carreras y cohete en directo: todos a la vez</li>
        <li><i>⚽</i>Fútbol, NBA, NFL, NHL, tenis, UFC y F1 reales</li>
        <li><i>🛡️</i>Resultados verificables. Fichas sin valor: nunca dinero real</li>
      </ul>
      <div class="mobile"><div class="ico">📱</div><div><b>Mejor aún en tu móvil</b><small>Ábrela en el iPhone y pulsa Compartir → Añadir a pantalla de inicio.</small></div><button type="button" id="cx-copy">Copiar enlace</button></div>
      <div class="note">Juega aquí mismo: el móvil de la derecha es la app de verdad.</div>
    </div>
    <div class="holder" id="cx-holder"><div class="phone" id="cx-phone">
      <div class="screen">
        <div class="status"><span id="cx-time">9:41</span><div class="island"></div><div class="icons"><span style="width:3px;height:6px"></span><span style="width:3px;height:8px"></span><span style="width:3px;height:10px"></span><span style="width:3px;height:12px;margin-right:6px"></span><span style="width:24px;height:11px;border-radius:3px;background:none;border:1.5px solid #fff;position:relative;box-sizing:border-box"></span></div></div>
        <iframe id="cx-app" title="Cashino" allow="clipboard-write"></iframe>
      </div>
      <div class="home"></div>
    </div></div>
  </div>
</div>`;
  // Boot: computers get the showcase (the app runs inside its phone); everything else loads the app as before.
  const boot = `<script id="cashino-boot">(function(){var w=window,d=document,mm=function(q){return w.matchMedia&&w.matchMedia(q).matches};
var framed=false;try{framed=w.self!==w.top}catch(e){framed=true}
var desk=!framed&&mm('(min-width: 900px) and (min-height: 600px)')&&mm('(hover: hover) and (pointer: fine)')&&!mm('(display-mode: standalone)');
if(!desk){var s=d.createElement('script');s.src=${JSON.stringify(entrySrc)};s.defer=true;d.body.appendChild(s);return}
var st=d.createElement('style');st.textContent=${JSON.stringify(css)};d.head.appendChild(st);
var root=d.getElementById('root');if(root)root.style.display='none';
var holder=d.createElement('div');holder.innerHTML=${JSON.stringify(body)};d.body.appendChild(holder.firstElementChild);
// the phone always has a real iPhone width (the app inside never gets squeezed); short windows scale it down
var ph=d.getElementById('cx-phone'),ho=d.getElementById('cx-holder'),fit=function(){var k=Math.min(1,(w.innerHeight-56)/860,(w.innerWidth-48)/402.5);ph.style.transform='scale('+k+')';ho.style.width=(402.5*k)+'px';ho.style.height=(860*k)+'px'};fit();w.addEventListener('resize',fit);
var f=d.getElementById('cx-app');f.src=location.pathname+location.search+location.hash;
var t=function(){var n=new Date();d.getElementById('cx-time').textContent=n.getHours()+':'+String(n.getMinutes()).padStart(2,'0')};t();setInterval(t,15000);
d.getElementById('cx-copy').onclick=function(e){var u=location.origin+${JSON.stringify(base + '/')};(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){e.target.textContent='¡Copiado!'},function(){e.target.textContent=u})};
// keep the address bar and the tab title in step with the app inside the phone (refresh and links keep working)
setInterval(function(){try{var l=f.contentWindow.location,p=l.pathname+l.search+l.hash;if(p&&p!==location.pathname+location.search+location.hash)history.replaceState(null,'',p);if(f.contentDocument&&f.contentDocument.title)d.title=f.contentDocument.title}catch(e){}},400);
})();</script>`;
  return boot;
}
