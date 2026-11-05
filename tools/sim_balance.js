#!/usr/bin/env node
/* sim_balance.js - simula partidas IA contra IA SIN navegador para medir el balance.
   Carga js/config.js, js/granada_fx.js, js/battlecruiser.js y js/game.js dentro de un contexto de Node con un DOM falso
   (no dibuja nada: solo avanza la logica del juego a 60 fotogramas por segundo simulados).

   Uso:  node tools/sim_balance.js [partidas] [dificultad] [ajustes] [combinaciones]
     partidas       partidas por combinacion (por defecto 100)
     dificultad     easy | normal | hard (por defecto normal)
     ajustes        valores de CONFIG separados por comas, p. ej. "DAMAGE.d=14,HP.m=110"
     combinaciones  mh, dh, md, dd, mm, hh ... (m = Marine, h = Hidralisco, d = Dark Templar, z = Zealot).
                    Por defecto: mh dh md
   Ejemplos:
     node tools/sim_balance.js 200 normal
     node tools/sim_balance.js 100 normal "HFX.on=0"
     node tools/sim_balance.js 200 normal "DAMAGE.d=14" dh
   Semilla fija (resultados repetibles):  SEED=7 node tools/sim_balance.js 100
   Los lados se alternan en cada partida. En combinaciones del mismo luchador (mm, dd...) se cuenta
   la victoria del lado izquierdo o derecho. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

// ---- argumentos ----
const args = process.argv.slice(2);
const N = Math.max(1, parseInt(args[0], 10) || 100);
const DIFF = ['easy', 'normal', 'hard'].includes(args[1]) ? args[1] : 'normal';
const rest = args.slice(2);
const combos = rest.filter(a => /^[mhdz]{2}$/.test(a));
const settings = rest.filter(a => !/^[mhdz]{2}$/.test(a)).join(',').split(',').map(s => s.trim()).filter(Boolean);
if (!combos.length) combos.push('mh', 'dh', 'md');
const NAME = { m: 'Marine', h: 'Hidralisco', d: 'Dark Templar', z: 'Zealot' };

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

// semilla (opcional) para repetir resultados
if (process.env.SEED) {
  let s = (parseInt(process.env.SEED, 10) || 1) >>> 0;
  ctx.__rng = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  run('Math.random=__rng');
}

load('config.js');
run('CONFIG.INTRO.on=false');   // sin presentacion
for (const s of settings) {
  if (!/^[\w.]+\s*=/.test(s)) { console.error('Ajuste no valido: ' + s); process.exit(1); }
  try { run('CONFIG.' + s); } catch (e) { console.error('No se pudo aplicar "' + s + '": ' + e.message); process.exit(1); }
}
load('granada_fx.js');
load('battlecruiser.js');
load('game.js');

// ambos luchadores controlados por la IA, y contador de bombas nucleares
run(`(function(){const nr=newRound;newRound=function(q){nr(q);F.forEach(f=>f.ai=true)};
 const sn=startNuke;startNuke=function(){__nukes++;sn()}})();var __nukes=0;`);

function play(left, right) {
  run(`CH=['${left}','${right}'];mode='2p';diff='${DIFF}';CONFIG.LIVES=2;__nukes=0;reset();last=0;`);
  let steps = 0;
  const MAX = 60 * 60 * 30;   // tope de seguridad: 30 min simulados
  while (steps < MAX && run('state') !== 'victory') {
    run(`(function(){
      let dt=1/60;if(GSTOP>0){GSTOP-=dt;dt*=GFX.stopScale}
      dt*=bcScale();
      if(fightT>0)fightT-=dt;
      if(state=='play')update(dt);else if(state=='intro')intro(dt);else if(state=='ko')koStep(dt);else if(state=='nuke')nukeStep(dt);
    })()`);
    steps++;
  }
  if (steps >= MAX) return { timeout: true };
  return { side: run('winSide'), nukes: run('__nukes'), secs: steps / 60 };
}

const pct = (n, t) => (100 * n / t).toFixed(1).replace('.', ',') + ' %';
console.log('Dificultad ' + DIFF + ' - ' + N + ' partidas por combinacion (lados alternados)' +
  (settings.length ? ' - ajustes: ' + settings.join(', ') : '') + (process.env.SEED ? ' - semilla ' + process.env.SEED : ''));
const t0 = Date.now();
for (const c of combos) {
  const a = c[0], b = c[1], same = a === b;
  let wa = 0, wb = 0, dr = 0, to = 0, secs = 0, nukes = 0;
  for (let i = 0; i < N; i++) {
    const swap = i % 2 === 1, left = swap ? b : a, right = swap ? a : b;
    const r = play(left, right);
    if (r.timeout) { to++; continue; }
    secs += r.secs; nukes += r.nukes;
    if (r.side < 0) dr++;
    else if (same) (r.side === 0 ? wa++ : wb++);                // mismo luchador: izquierdo contra derecho
    else if ((r.side === 0 ? left : right) === a) wa++; else wb++;
  }
  const played = N - to;
  const la = same ? NAME[a] + ' izquierdo' : NAME[a], lb = same ? NAME[b] + ' derecho' : NAME[b];
  console.log('  ' + c + ': ' + la + ' ' + pct(wa, N) + ' | ' + lb + ' ' + pct(wb, N) + ' | empates ' + pct(dr, N) +
    (to ? ' | sin terminar ' + to : '') +
    '   (duracion media ' + (played ? Math.round(secs / played) : 0) + ' s, ' + (played ? (nukes / played).toFixed(1).replace('.', ',') : '0') + ' nucleares por partida)');
}
console.log('Tiempo de calculo: ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
process.exit(0);
