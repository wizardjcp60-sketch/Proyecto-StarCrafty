/* test_bc.js - prueba automatica del super ataque del BATTLECRUISER (caida rara, recogida, entrada, musica, laser, Yamato, salida, reinicios) sin navegador.
   Uso: node tools/test_bc.js     (sale con codigo 1 si algo falla) */
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



// ---- utilidades de prueba ----
const calls=[];ctx.AUDIO=new Proxy({},{get:(t,k)=>(...a)=>{calls.push([k,...a]);return 0}});   // registra cada llamada al audio
const step=(n=1)=>{for(let i=0;i<n;i++)run(`(function(){let dt=1/60;dt*=bcScale();if(state=='play')update(dt)})()`)};
let ok=0,bad=0;const chk=(c,m)=>{if(c)ok++;else{bad++;console.log('FALLA:',m)}};
const heard=n=>calls.some(c=>c[0]===n[0]&&(n.length<2||c[1]===n[1]));
const newMatch=(a='m',b='h',m='1m')=>{run(`CH=['${a}','${b}'];mode='${m}';reset();state='play';roundT=45;F[1].ai=false;F[1].cd=99;F[0].cd=99;F[0].ai=false;I=[];`);calls.length=0};
const give=()=>run(`I=[{t:'bc',x:F[0].x,y:F[0].y,z:0,life:12}]`);

// ---- 1) la baliza cae poco y con reglas ----
newMatch();run(`CONFIG.BC.chance=1;CONFIG.BC.perRound=1`);
run(`roundT=40`);chk(run('bcRoll()')==='bc','con chance=1 deberia caer');
chk(run('bcRoll()')===null,'solo una baliza por ronda (perRound=1)');
run(`reset();state='play'`);run(`roundT=10`);chk(run('bcRoll()')===null,'no debe caer cuando quedan pocos segundos (minRoundTime)');
run(`roundT=44`);chk(run('bcRoll()')===null,'no debe caer en los primeros segundos (skipFirst)');
run(`roundT=40;CONFIG.BC.on=false`);chk(run('bcRoll()')===null,'BC.on=false no debe soltar nada');run(`CONFIG.BC.on=true;CONFIG.BC.chance=0`);chk(run('bcRoll()')===null,'chance=0 nunca cae');
// frecuencia real con los valores por defecto: debe ser rara (<= ~45% de las rondas) pero no imposible
run(`CONFIG.BC.chance=.08`);let drops=0,NR=400;for(let n=0;n<NR;n++){run(`reset();state='play';roundT=45;I=[];bcCount=0`);let got=false;for(let s=0;s<60*24&&!got;s++){step(1);if(run(`I.some(i=>i.t=='bc')`))got=true;run(`if(I.length>=3&&!I.some(i=>i.t=='bc'))I=[]`)}if(got)drops++}
chk(drops/NR>.1&&drops/NR<.6,'frecuencia por ronda fuera de lo esperado: '+(100*drops/NR).toFixed(0)+' %');console.log('  (frecuencia por defecto: la baliza cae en el '+(100*drops/NR).toFixed(0)+' % de las rondas)');
run(`CONFIG.BC.chance=1`);newMatch();step(60*14);chk(run(`I.some(i=>i.t=='bc')`)||run('bcCount')===1,'la baliza no llego a soltarse por el camino normal');
run(`CONFIG.BC.chance=.08`);

// ---- 2) recogerla llama al Battlecruiser ----
newMatch();run('spawnT=1e9');give();step(2);
chk(run('BCR')!==null,'recoger la baliza no llama al Battlecruiser');
chk(run('BCR.own===F[0]'),'el Battlecruiser debe ser de quien recogio la baliza');
chk(run(`!I.some(i=>i.t=='bc')`),'la baliza no desaparece al recogerla');
chk(heard(['play','bc_entrada'])&&heard(['play','bc_bocina']),'faltan los sonidos de entrada');
chk(heard(['playMusic','music_bc']),'no cambia la musica');
chk(run('bcScale()')<1,'no hay camara lenta al entrar');
chk(run('BCR.ph')==='enter','debe empezar en fase de entrada');
// no se puede recoger otra mientras hay una
run(`I=[{t:'bc',x:F[1].x,y:F[1].y,z:0,life:12}]`);step(2);chk(run('BCR.own===F[0]')&&run(`I.some(i=>i.t=='bc')`),'otra baliza se recogio con el Battlecruiser activo');run('I=[]');

// ---- 3) fases, laser y dano ----
run('spawnT=1e9');run('F[1].max=F[1].hp=3000');const hpE=run('F[1].hp+F[1].sh'),hpO=run('F[0].hp+F[0].sh');
run(`CONFIG.BC.yamato.on=false`);let sawL=0,phases=new Set();
for(let s=0;s<60*14&&run('BCR')!==null;s++){step(1);phases.add(run('BCR?BCR.ph:"fin"'));if(run(`GR.some(q=>q.kind=='l')`))sawL++}
chk(phases.has('enter')&&phases.has('fight')&&phases.has('leave'),'faltan fases: '+[...phases]);
chk(sawL>10,'no lanza lasers (fotogramas con laser: '+sawL+')');
chk(run('BCR')===null,'el Battlecruiser no se retira');
chk(heard(['playMusic','music_arena',true]),'al irse no devuelve la musica de la arena (con reanudacion)');
chk(heard(['play','bc_laser'])&&heard(['play','bc_laser_hit'])&&heard(['play','bc_leave']),'faltan sonidos de laser/salida');
const hpE2=run('F[1].hp+F[1].sh');chk(hpE-hpE2>=run('CONFIG.BC.laser.dmg')*3,'el rival quieto deberia recibir bastante dano de los lasers (recibio '+(hpE-hpE2)+')');
chk(run('F[0].hp+F[0].sh')===hpO,'el dueño del Battlecruiser no debe recibir dano');
run(`CONFIG.BC.yamato.on=true`);

// ---- 4) Yamato: dano alto y fijo, marca que se fija ----
newMatch();run('spawnT=1e9');run(`CONFIG.BC.laser.dmg=0`);give();step(2);run('F[1].sh=0;F[1].hp=F[1].max');
let sawY=false,lockOk=false,y0=null;
for(let s=0;s<60*14&&run('BCR')!==null;s++){step(1);const q=run(`(GR.find(q=>q.kind=='y')||null)&&{t:GR.find(q=>q.kind=='y').t,x:GR.find(q=>q.kind=='y').x1}`);if(q){sawY=true;if(q.t>run('CONFIG.BC.yamato.charge-CONFIG.BC.yamato.lock')+.05){if(y0===null)y0=q.x;else if(Math.abs(q.x-y0)<.01)lockOk=true}}}
chk(sawY,'no carga el Yamato');chk(lockOk,'la marca del Yamato no se fija al final');
chk(heard(['play','bc_yamato_charge'])&&heard(['play','bc_yamato_fire']),'faltan sonidos del Yamato');
const lost=run('F[1].max')-run('F[1].hp');chk(lost>=run('CONFIG.BC.yamato.dmg')*.9&&lost<=run('CONFIG.BC.yamato.dmg')*1.1,'el Yamato deberia quitar ~'+run('CONFIG.BC.yamato.dmg')+' a un rival quieto y quito '+lost);
run(`CONFIG.BC.laser.dmg=8`);

// ---- 5) el rival puede esquivar: si se aparta de la marca no recibe dano ----
newMatch();run('spawnT=1e9');run(`CONFIG.BC.yamato.on=false`);give();step(2);run('F[1].sh=0;F[1].hp=F[1].max');
// el rival se aparta cada fotograma al punto mas cercano que quede fuera de TODAS las marcas (como haria un jugador atento)
const safe=`(function(){const o=F[1],ms=GR.filter(q=>q.kind=='l'),bad=(x,y)=>ms.some(q=>Math.hypot(x-q.x1,(y-q.y1)/.6)<CONFIG.BC.laser.radius+9);
 if(!bad(o.x,o.y))return;let best=null,bd=1e9;for(let a=0;a<6.28;a+=.35)for(let r=14;r<=70;r+=8){const x=o.x+Math.cos(a)*r,y=o.y+Math.sin(a)*r*.6;if(inArena(x,y,4)&&!bad(x,y)&&r<bd){bd=r;best=[x,y]}}
 if(best){o.x=best[0];o.y=best[1]}})()`;
for(let s=0;s<60*12&&run('BCR')!==null;s++){step(1);run(safe)}
chk(run('F[1].max-F[1].hp')===0,'apartandose de las marcas no deberia recibir dano (recibio '+(run('F[1].max-F[1].hp'))+')');run(`CONFIG.BC.yamato.on=true`);

// ---- 6) el lado derecho tambien lo usa (equipo rojo) y la IA lo busca ----
newMatch('m','h','2p');run(`I=[{t:'bc',x:F[1].x,y:F[1].y,z:0,life:12}]`);step(2);chk(run('BCR&&BCR.own===F[1]&&BCR.side')===1,'el luchador derecho no pudo llamarlo');
newMatch('m','h','1m');run(`F[1].ai=true;F[1].cd=99;F[1].x=CX+40;F[1].y=CY;I=[{t:'bc',x:CX+75,y:CY,z:0,life:12}]`);let aiGot=false;for(let s=0;s<60*5&&!aiGot;s++){step(1);if(run('BCR!==null&&BCR.own===F[1]'))aiGot=true}chk(aiGot,'la IA no va a por la baliza cercana');

// ---- 7) reinicios: K.O., nuclear, nueva ronda ----
newMatch();give();step(2);chk(run('BCR')!==null,'(preparacion)');calls.length=0;run('F[1].hp=0');step(3);chk(run('BCR')===null,'el Battlecruiser debe irse al hacer K.O.');chk(heard(['playMusic','music_arena',true]),'al hacer K.O. debe volver la musica de la arena');
newMatch();give();step(2);run('startNuke()');chk(run('BCR')===null,'la bomba nuclear debe retirarlo');
newMatch();give();step(2);run(`newRound()`);chk(run('BCR')===null&&run('bcCount')===0,'nueva ronda debe limpiarlo');
newMatch();give();step(2);calls.length=0;run('bcReset(true)');chk(run('BCR')===null&&!heard(['playMusic','music_arena']),'bcReset(true) (salir al menu) no debe tocar la musica');

// ---- 7b) orientacion: la PROA debe mirar hacia donde apunta la nave (los motores quedan atras) ----
{const f=h=>JSON.stringify(run(`bcFrame(${h})`)),PI=Math.PI;
 chk(f(PI)===JSON.stringify({fr:0,mir:false}),'mirando al sur debe usar el fotograma 0 (proa abajo): '+f(PI));
 chk(f(0)===JSON.stringify({fr:16,mir:false}),'mirando al norte debe usar el fotograma 16 (proa arriba): '+f(0));
 chk(f(3*PI/2)===JSON.stringify({fr:8,mir:false}),'mirando al oeste debe usar el fotograma 8 sin espejar: '+f(3*PI/2));
 chk(f(PI/2)===JSON.stringify({fr:8,mir:true}),'mirando al este debe usar el fotograma 8 espejado: '+f(PI/2));
 let okc=true;for(let i=0;i<64;i++){const r=run(`bcFrame(${i*6.283185307/64-3})`);if(r.fr<0||r.fr>16)okc=false}chk(okc,'fotograma fuera de 0..16');}

// ---- 8) dibujo y HUD sin errores en cada fase, de ambos colores y en cada orientacion ----
for(const side of ['1m','2p']){for(const t of [0,.5,1.2,2.4,3,4,5,6,8,10.5,11]){
  try{newMatch('m','h',side);run(`I=[{t:'bc',x:F[${side=='2p'?1:0}].x,y:F[0].y,z:0,life:12},{t:'bc',x:CX,y:CY,z:60,life:12}]`);step(2);
   for(let s=0;s<Math.round(t*60);s++){step(1)}
   for(let d=0;d<32;d+=5){if(run('BCR')){run(`BCR.hd=${d}/32*6.283`)}run('draw();hud()')}ok++}catch(e){bad++;console.log('FALLA dibujo/HUD',side,t,e.message)}
}}
console.log(bad?('RESULTADO: '+bad+' fallos, '+ok+' correctos'):('RESULTADO: todo correcto ('+ok+' comprobaciones)'));process.exit(bad?1:0);
