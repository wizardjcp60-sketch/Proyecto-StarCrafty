/* test_dash.js - prueba automatica del dash (teclado, recarga, invulnerabilidad, balas, IA) sin navegador.  Uso: node tools/test_dash.js */
/* sim_balance.js - simula partidas IA contra IA SIN navegador para medir el balance.
   Carga js/config.js, js/granada_fx.js, js/battlecruiser.js, js/mascota.js y js/game.js dentro de un contexto de Node con un DOM falso
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
load('mascota.js');
load('game.js');


const step=(n=1)=>{for(let i=0;i<n;i++)run(`(function(){const dt=1/60;if(state=='play')update(dt)})()`)};
let ok=0,bad=0;const chk=(c,m)=>{if(c)ok++;else{bad++;console.log('FALLA:',m)}};
for(const t of ['m','h','d','z']){
  run(`CH=['${t}','h'];mode='1m';reset();state='play';roundT=45;F[1].ai=false;F[1].x=F[0].x+150;`);   // rival quieto (sin IA ni teclas)
  run(`CONFIG.DASH.on=true;F[1].cd=99;`);
  const x0=run('F[0].x'),y0=run('F[0].y');
  run(`keys[CONFIG.DASH.KEYS.left]=1;keys.KeyD=1`);step(1);
  chk(run('F[0].dashT')>0,t+': el dash no arranca');
  chk(run('F[0].dashCd')>1.5,t+': no empieza la recarga');
  run('F[0].hp0=F[0].hp+F[0].sh');run('hurt(F[0],10)');chk(run('F[0].hp+F[0].sh')===run('F[0].hp0'),t+': no es invulnerable al inicio');
  step(12);
  const dx=run('F[0].x')-x0;
  chk(dx>40&&dx<56,t+': recorrido inesperado '+dx.toFixed(1));
  chk(run('F[0].dashT')<=0,t+': el dash no termina');
  // mantener la tecla no repite; la recarga bloquea un segundo dash
  step(30);chk(run('F[0].dashT')<=0&&run('F[0].dashCd')<1.3,t+': repitio el dash al mantener');
  run(`keys[CONFIG.DASH.KEYS.left]=0`);step(2);run(`keys[CONFIG.DASH.KEYS.left]=1`);step(1);
  chk(run('F[0].dashT')<=0,t+': dash durante la recarga');
  // tras la recarga vuelve a funcionar; sin direccion va hacia el rival
  run(`keys[CONFIG.DASH.KEYS.left]=0;keys.KeyD=0`);step(100);
  const xb=run('F[0].x');run(`keys[CONFIG.DASH.KEYS.left]=1`);step(1);
  chk(run('F[0].dashT')>0,t+': no vuelve tras la recarga');
  step(12);chk(run('F[0].x')-xb>35,t+': sin direccion no va hacia el rival');
  run(`keys[CONFIG.DASH.KEYS.left]=0`);
  // fin de la invulnerabilidad
  step(20);run('F[0].hp0=F[0].hp+F[0].sh');run('hurt(F[0],10)');chk(run('F[0].hp+F[0].sh')<run('F[0].hp0'),t+': sigue invulnerable');
}
// las balas atraviesan durante el dash; despues impactan
run(`CH=['m','h'];mode='1m';reset();state='play';F[1].ai=false;F[1].cd=99;F[0].hp=F[0].max;B=[{x:F[0].x-4,y:F[0].y,vx:200,vy:0,own:F[1],dmg:5,mar:true,life:1}];F[0].dashI=.1;`);
step(2);chk(run('F[0].hp')===run('F[0].max'),'bala golpeo durante el dash');
run(`F[0].dashI=0;B=[{x:F[0].x-3,y:F[0].y,vx:200,vy:0,own:F[1],dmg:5,mar:true,life:1}];`);step(3);chk(run('F[0].hp')<run('F[0].max'),'bala no golpea tras el dash');
// aturdido: no hace dash
run(`reset();state='play';F[1].cd=99;F[0].stun=.5;keys[CONFIG.DASH.KEYS.left]=1`);step(1);chk(run('F[0].dashT')<=0,'dash estando aturdido');run(`keys[CONFIG.DASH.KEYS.left]=0`);
// lado derecho (2 jugadores): / mueve al derecho y V al izquierdo
run(`mode='2p';reset();state='play';F[0].cd=99;F[1].cd=99;keys[CONFIG.DASH.KEYS.right]=1`);step(1);chk(run('F[1].dashT')>0&&run('F[0].dashT')<=0,'2p: / no activa solo al derecho');
run(`keys[CONFIG.DASH.KEYS.right]=0`);
// IA: esquiva una bala que va hacia ella
run(`CONFIG.DIFF.hard.dash=1;diff='hard';mode='1m';reset();state='play';F[1].ai=true;F[1].dashCd=0;F[0].cd=99;F[1].cd=99;B=[{x:F[1].x-40,y:F[1].y,vx:260,vy:0,own:F[0],dmg:5,mar:true,life:1}];`);
const hp1=run('F[1].hp');step(30);chk(run('F[1].hp')===hp1,'la IA no esquivo la bala (hp '+run('F[1].hp')+')');
for(const t of ['m','h','d','z']){try{run(`CH=['${t}','h'];mode='1m';reset();state='play';F[0].dashT=.1;F[0].dashA=.5;F[0].dashI=.1;draw();hud()`)}catch(e){bad++;console.log('FALLA dibujo',t,e.message)}ok++}
console.log(bad?('RESULTADO: '+bad+' fallos, '+ok+' correctos'):('RESULTADO: todo correcto ('+ok+' comprobaciones)'));process.exit(0);
