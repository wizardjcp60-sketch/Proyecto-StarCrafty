/* test_ai_flip.js - prueba automatica de que la IA ya no TIEMBLA al moverse (antes el sprite se volteaba hasta 30 veces por segundo, sobre todo junto al borde) sin navegador.  Uso: node tools/test_ai_flip.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

// ---- DOM falso: lo justo para que game.js se cargue y avance sin pantalla ----
const noop = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
const mkEl = () => ({
  value: '', textContent: '', innerHTML: '', hidden: false, className: '', offsetWidth: 0, style: { setProperty() {} }, dataset: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  getAttribute() { return null; }, setAttribute() {}, addEventListener() {}, removeEventListener() {}, blur() {}, focus() {},
  querySelectorAll() { return []; }, querySelector() { return mkEl(); }, getContext() { return noop; },
  getBoundingClientRect() { return { left: 0, top: 0, width: 1, height: 1 }; }, appendChild() {},
  parentNode: { insertBefore() {} }   // el HUD inserta una barra de 'dano reciente' junto a la de vida
});
const els = {};
const store = {};
const ctx = vm.createContext({
  console, setTimeout, clearTimeout, setInterval, clearInterval, performance,
  AUDIO: noop, Image: class { constructor() { this.width = 0; this.height = 0; this.naturalWidth = 0; this.complete = false; } addEventListener() {} },
  document: {
    querySelector: s => els[s] || (els[s] = mkEl()), querySelectorAll: () => [], addEventListener() {},
    createElement: () => Object.assign(mkEl(), { width: 0, height: 0 }), documentElement: { style: { setProperty() {} } },
    activeElement: null, fullscreenEnabled: false, hidden: false, baseURI: 'file:///'
  },
  navigator: { getGamepads: () => [], maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }),
  localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
  sessionStorage: { getItem: () => null, setItem() {} },
  addEventListener() {}, removeEventListener() {}, requestAnimationFrame() { return 0; }
});
ctx.window = ctx;
const run = (code, name) => vm.runInContext(code, ctx, { filename: name || 'sim' });
const load = f => run(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), f);

// semilla: por defecto fija, para que la prueba sea repetible (SEED=n node tools/test_pet.js prueba otra)
if (!process.env.SEED) process.env.SEED = '7';
if (process.env.SEED) {
  let s = (parseInt(process.env.SEED, 10) || 1) >>> 0;
  ctx.__rng = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  run('Math.random=__rng');
}


load('config.js');
run('CONFIG.INTRO.on=false');
load('granada_fx.js');
load('battlecruiser.js');
load('mascota.js');
load('game.js');

const step=(n=1)=>{for(let i=0;i<n;i++)run(`(function(){const dt=1/60;if(state=='play')update(dt)})()`)};
let ok=0,bad=0;
const vis=(st,mdx)=>Math.abs(mdx)>.2?(mdx<0?1:0):st;   // el lado del sprite como lo decide el dibujo (js/game.js): casi vertical = conserva el anterior
const chk=(c,m)=>{if(c)ok++;else{bad++;console.log('FALLA:',m)}};
const base=(a,b,fx,fy)=>run(`CH=['${a}','${b}'];mode='1m';reset();state='play';roundT=45;spawnT=1e9;I=[];F[0].ai=false;F[0].cd=99;F[1].cd=99;F[1].ai=true;F[1].x=${fx};F[1].y=${fy};F[0].x=CX-150;F[0].y=CY;`);
// 1) en partidas normales (30 s, 3 semillas) el sentido horizontal del movimiento no oscila
for(const ty of ['m','h','d','z']){
  let flips=0,rapid=0,secs=0;
  for(let k=0;k<3;k++){
    base(ty==='m'?'h':'m',ty,'CX+40','CY');let pm=0,last=-99;
    for(let i=0;i<60*30;i++){step(1);const m=vis(pm,run('F[1].mdx'));if(m!==pm){flips++;if(i-last<=8)rapid++;last=i}pm=m}
    secs+=30;
  }
  chk(flips/secs<=4,ty+': el sprite de la IA cambia de lado '+(flips/secs).toFixed(1)+' veces por segundo (maximo 4)');
  chk(rapid/secs<=.5,ty+': '+(rapid/secs).toFixed(2)+' cambios de lado rapidos por segundo (maximo 0,5)');
}
// 2) el caso medido: Hidralisco IA pegado al borde inferior, a unos 105-119 px del rival (antes alternaba arriba/abajo en cada fotograma)
base('m','h',196,186.4);let rev=0,pdy=null,dirCh=0,pc=0,rapidB=0,lastB=-99;const fr=[];
for(let i=0;i<60*6;i++){step(1);const dy=Math.sign(run('F[1].mdy')),c=vis(pc,run('F[1].mdx'));if(pdy!==null&&dy!==pdy)rev++;if(c!==pc){dirCh++;fr.push(i);if(i-lastB<=8)rapidB++;lastB=i}pdy=dy;pc=c}
chk(rev<=12,'borde: el Hidralisco invierte su movimiento vertical '+rev+' veces en 6 s (maximo 12; antes unas 170)');
chk(rapidB<=3,'borde: '+rapidB+' cambios de lado seguidos en menos de 8 fotogramas (maximo 3: a veces coincide una salida de la zona muerta con la inversion normal del rodeo; antes unos 165). Fotogramas: '+fr.join(','));
chk(dirCh<=12,'borde: el sprite cambia de lado '+dirCh+' veces en 6 s (maximo 12; antes unas 170)');
chk(run('inArena(F[1].x,F[1].y,0)'),'borde: se sale de la arena');
// 3) histeresis de la distancia: con la misma distancia, si ya se acercaba sigue acercandose y si estaba parado sigue parado
base('m','h','CX+60','CY');
run('F[1].x=F[0].x+(CONFIG.HYDRA_ART?105:105)+20;F[1].y=F[0].y;F[1].seed=0;time=0');   // d = pref + 20: entre los dos umbrales (pref+15 y pref+25)
run('F[1].aiDir=1');const ca=run('ai(F[1],F[0])');
run('F[1].aiDir=0');const cb=run('ai(F[1],F[0])');
chk(ca.dx<-.5&&Math.abs(cb.dx)<.2,'histeresis: acercandose dx='+ca.dx.toFixed(2)+' (debe ser < -0,5), parado dx='+cb.dx.toFixed(2)+' (debe ser ~0)');
// 4) la zona muerta del espejo: el codigo de dibujo mantiene el lado anterior si el movimiento es casi vertical
chk(run("/Math\\.abs\\(ax\\)>\\.2\\?\\(f\\.mir=ax<0\\)/.test(drawMarineAnim.toString()+drawHydraAnim.toString()+drawZealot.toString())"),'espejo: falta la zona muerta en el dibujo de Marine/Hidralisco/Zealot');
console.log(bad?('RESULTADO: '+bad+' fallos, '+ok+' correctos'):('RESULTADO: todo correcto ('+ok+' comprobaciones)'));process.exit(bad?1:0);
