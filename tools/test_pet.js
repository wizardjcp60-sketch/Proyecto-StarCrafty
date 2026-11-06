/* test_pet.js - prueba automatica del HUEVO ZERG y la MASCOTA ZERGLING (aparicion, 3 s, adopcion, ataque, dano, IA, dibujo) sin navegador.  Uso: node tools/test_pet.js */
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
let ok=0,bad=0;const chk=(c,m)=>{if(c)ok++;else{bad++;console.log('FALLA:',m)}};
const newGame=(a='m',b='h')=>run(`CH=['${a}','${b}'];mode='1m';reset();state='play';roundT=45;F[0].ai=false;F[1].ai=false;F[0].cd=99;F[1].cd=99;F[0].x=CX-150;F[0].y=CY;F[1].x=CX+150;F[1].y=CY;I=[];spawnT=1e9;EGC.on=true;eggT=1e9;`);   // sin objetos al azar (el zergling explosivo y el resto falsearian las mediciones)

// 1) el huevo tarda 3 s en eclosionar
newGame();run('eggSpawn()');
chk(run('EG.length')===1&&run('PT.length')===0,'1: no hay huevo al crearlo');
step(170);chk(run('EG.length')===1&&run('PT.length')===0,'1: nace antes de los 3 s (a los 2,83 s)');
step(12);chk(run('EG.length')===0&&run('PT.length')===1,'1: no nace a los 3 s');
chk(run('PT[0].own')===-1,'1: nace con dueno');
chk(run('PT[0].hp')===run('CONFIG.PET.hp'),'1: vida inicial');

// 2) aparicion al azar con la cuenta atras, y no sale otro mientras haya mascota sin dueno
newGame();run('eggT=.01');step(2);chk(run('EG.length')===1,'2: el huevo no aparece al acabarse la cuenta');
chk(run('inArena(EG[0].x,EG[0].y,0)'),'2: el huevo sale fuera de la arena');
run('eggT=.01');step(2);chk(run('EG.length')===1,'2: sale un segundo huevo con uno en marcha');
step(200);run('eggT=.01');step(2);chk(run('EG.length')===0&&run('PT.length')===1,'2: sale otro huevo con una mascota sin dueno');
// el primer huevo no aparece encima de un luchador
let near=0;for(let i=0;i<40;i++){newGame();run('eggSpawn()');if(run('F.some(f=>Math.hypot(f.x-EG[0].x,f.y-EG[0].y)<EGC.minDist)'))near++}chk(near===0,'2: huevo pegado a un luchador ('+near+' de 40)');
// EGG.on=false: nunca sale
newGame();run('EGC.on=false;petReset()');step(60*20);chk(run('EG.length')===0&&run('PT.length')===0,'2: EGG.on=false no lo apaga');run('EGC.on=true');

// 3) deambula sin dueno dentro de la arena
newGame();run('eggSpawn()');step(185);
let moved=0,out=0;for(let i=0;i<60*20;i++){const x=run('PT[0].x'),y=run('PT[0].y');step(1);moved+=Math.hypot(run('PT[0].x')-x,run('PT[0].y')-y);if(!run('inArena(PT[0].x,PT[0].y,0)'))out++}
chk(moved>30,'3: no deambula (recorrio '+moved.toFixed(1)+')');chk(out===0,'3: sale de la arena '+out+' veces');chk(run('PT[0].own')===-1,'3: la adopta alguien lejano');

// 4) adopcion: el primero que la toca; el otro no se la quita
newGame();run('eggSpawn()');step(185);
run('PT[0].idle=true;PT[0].wT=9;F[0].x=PT[0].x;F[0].y=PT[0].y');step(1);
chk(run('PT[0].own')===0,'4: no la adopta el luchador izquierdo');
run('F[1].x=PT[0].x;F[1].y=PT[0].y');step(1);chk(run('PT[0].own')===0,'4: el rival se la quito al tocarla');
// limite de mascotas por luchador
newGame();run('for(let i=0;i<2;i++){eggSpawn();EG[EG.length-1].t=2.99}');step(2);
run('PT.forEach(p=>{p.idle=true;p.wT=9;p.x=F[0].x;p.y=F[0].y})');step(1);chk(run('PT.filter(p=>p.own===0).length')===2,'4: no adopta 2');
run('eggSpawn();EG[EG.length-1].t=2.99');step(2);run('PT[2].idle=true;PT[2].wT=9;PT[2].x=F[0].x;PT[2].y=F[0].y');step(2);chk(run('PT[2].own')===-1,'4: adopta mas del maximo');

// 5) la mascota persigue y muerde al rival
newGame('m','h');run('eggSpawn()');step(185);
run('PT[0].idle=true;PT[0].wT=9;F[0].x=PT[0].x;F[0].y=PT[0].y');step(1);
run('F[0].x=CX-150;F[0].y=CY;F[1].sh=0;F[1].hp=F[1].max');const hp0=run('F[1].hp');
step(60*6);const lost=hp0-run('F[1].hp');
chk(lost>=6,'5: el rival no pierde vida (perdio '+lost.toFixed(1)+')');chk(lost<=40,'5: la mascota hace demasiado dano ('+lost.toFixed(1)+' en 6 s)');
chk(Math.hypot(run('PT[0].x-F[1].x'),run('PT[0].y-F[1].y'))<20,'5: no llego hasta el rival');
// con escudo el mordisco lo absorbe el escudo
run('F[1].sh=30;F[1].hp=F[1].max');step(60*3);chk(run('F[1].sh')<30&&run('F[1].hp')===run('F[1].max'),'5: el escudo no absorbe el mordisco');
// un DT camuflado puede esquivar (con evasion 1 siempre)
run('CONFIG.DT.evasion=1');
newGame('m','d');run('eggSpawn()');step(185);run('PT[0].idle=true;PT[0].wT=9;F[0].x=PT[0].x;F[0].y=PT[0].y');step(1);run('F[0].x=CX-150;F[1].rev=-5');
const hd=run('F[1].hp');step(60*4);chk(run('F[1].hp')===hd,'5: el DT camuflado no esquiva los mordiscos');
run('CONFIG.DT.evasion=.3');
// mascotas del lado derecho muerden al izquierdo
newGame('m','h');run('eggSpawn()');step(185);run('PT[0].idle=true;PT[0].wT=9;F[1].x=PT[0].x;F[1].y=PT[0].y');step(1);
chk(run('PT[0].own')===1,'5: la adopta el derecho');run('F[1].x=CX+150;F[0].sh=0;F[0].hp=F[0].max');step(60*5);chk(run('F[0].hp')<run('F[0].max'),'5: la mascota derecha no muerde al izquierdo');

// 6) las mascotas reciben dano: balas, granada, cuchilla, acido
const adopt=(side)=>{run('eggSpawn()');step(185);run(`PT[PT.length-1].idle=true;PT[PT.length-1].wT=9;F[${side}].x=PT[PT.length-1].x;F[${side}].y=PT[PT.length-1].y`);step(1);run(`F[${side}].x=CX${side?'+':'-'}150;F[${side}].y=CY`)};
newGame('m','h');adopt(0);run('PT[0].x=CX;PT[0].y=CY;PT[0].mv=0');
run('PT[0].cd=99;F[0].x=CX-150;');   // la mascota se queda quieta en el centro
// bala del rival (lado 1) que le da
run('B=[{x:PT[0].x-4,y:PT[0].y,vx:200,vy:0,own:F[1],dmg:5,mar:true,life:1}]');step(3);
chk(run('PT[0].hits')===1,'6: la bala enemiga no le hace dano (golpes '+run('PT[0].hits')+')');chk(run('B.length')===0,'6: la bala no se consume');
// bala de su propio dueno la atraviesa
run('B=[{x:PT[0].x-4,y:PT[0].y,vx:200,vy:0,own:F[0],dmg:5,mar:true,life:1}]');step(3);chk(run('PT[0].hits')===1,'6: la bala propia la daña');
// bala contra una mascota sin dueno: la atraviesa
newGame('m','h');run('eggSpawn()');step(185);run('PT[0].x=CX;PT[0].y=CY;PT[0].idle=true;PT[0].wT=9;B=[{x:PT[0].x-4,y:PT[0].y,vx:200,vy:0,own:F[1],dmg:5,mar:true,life:1}]');step(3);
chk(run('PT[0].hits')===0,'6: una bala daña a la mascota sin dueno');
// granada
newGame('m','h');adopt(1);run('PT[0].x=CX;PT[0].y=CY;PT[0].cd=99');
run('grenadeBoom({x1:CX,y1:CY,own:F[0]})');chk(run('PT[0].hits')===1||run('PT[0].dead'),'6: la granada del rival no la daña');
newGame('m','h');adopt(0);run('PT[0].x=CX;PT[0].y=CY;PT[0].cd=99');run('grenadeBoom({x1:CX,y1:CY,own:F[0]})');chk(run('PT[0].hits')===0,'6: la granada propia la daña');
// cuchilla del Dark Templar
newGame('d','h');adopt(1);run('PT[0].x=F[0].x+10;PT[0].y=F[0].y;PT[0].cd=99');run('meleeHit(F[0])');chk(run('PT[0].hits')>0,'6: la cuchilla del DT no la daña');
// muerte, cadaver y limpieza
chk(run('(PT[0].hits=2,PT[0].gap=0,petHurt(PT[0],1,0),PT[0].dead)'),'6: no muere al 3.er golpe');
step(60*3);chk(run('PT.length')===0,'6: el cadaver no desaparece');
// acido del Hidralisco
newGame('h','m');adopt(1);run('PT[0].x=CX;PT[0].y=CY;PT[0].cd=99;AC.push({x:CX,y:CY,R:38,life:6,tick:.05,own:F[0],age:0,sd:0})');step(60);chk(run('PT[0].hits')>0,'6: el acido no daña a la mascota enemiga');

// 6b) la mascota muere a los 3 golpes, sea cual sea el dano, y un mismo impacto no cuenta dos veces
newGame('m','h');adopt(1);run('PT[0].x=CX;PT[0].y=CY;PT[0].cd=99');
chk(run('petHurt(PT[0],1,0)&&PT[0].hits===1&&!PT[0].dead'),'6b: 1.er golpe');
chk(run('petHurt(PT[0],99,0)')===false&&run('PT[0].hits')===1,'6b: dos impactos seguidos contaron como uno solo');
run('PT[0].gap=0;petHurt(PT[0],1,0)');chk(run('PT[0].hits===2&&!PT[0].dead'),'6b: 2.o golpe no mata');
run('PT[0].gap=0;petHurt(PT[0],1,0)');chk(run('PT[0].hits===3&&PT[0].dead'),'6b: el 3.er golpe no la mata');
newGame('m','h');adopt(1);run('PT[0].gap=0;petHurt(PT[0],999,0)');chk(run('!PT[0].dead&&PT[0].hits===1'),'6b: un golpe fuerte la mata de una (deben ser 3 golpes)');

// 7) punteria: una mascota enemiga pegada es el objetivo; lejos, el rival
newGame('m','h');adopt(0);run('PT[0].x=F[1].x-20;PT[0].y=F[1].y-20;PT[0].cd=99;PT[0].at=null');step(1);
const ang=Math.atan2(run('PT[0].y-F[1].y'),run('PT[0].x-F[1].x'));chk(Math.abs(Math.atan2(Math.sin(run('F[1].face')-ang),Math.cos(run('F[1].face')-ang)))<.05,'7: el luchador no apunta a la mascota pegada');
run('PT[0].x=F[1].x-200;PT[0].y=F[1].y');step(1);chk(Math.abs(run('F[1].face')-Math.atan2(run('F[0].y-F[1].y'),run('F[0].x-F[1].x')))<.05,'7: apunta a la mascota lejana en vez de al rival');

// 8) la IA va a tocar la mascota sin dueno
newGame('m','h');run('F[1].ai=true;F[1].x=CX+60;F[1].y=CY;F[0].x=CX-200;eggSpawn();EG[0].x=CX-60;EG[0].y=CY-100');step(185);
run('PT[0].idle=true;PT[0].wT=9;PT[0].x=CX+60;PT[0].y=CY-100;F[1].x=CX+60;F[1].y=CY;F[1].dashT=0');const c0=run('ai(F[1],F[0])');chk(c0.dy<-.5,'8: la IA no se dirige a la mascota (dy='+c0.dy.toFixed(2)+')');
run('PT[0].x=CX+60;PT[0].y=CY+400');const c1=run('petLure(F[1])');chk(c1===null,'8: la IA persigue una mascota fuera de rango');

// 9) cada ronda empieza limpia
newGame();run('eggSpawn();eggSpawn()');step(185);run('newRound(1)');chk(run('EG.length')===0&&run('PT.length')===0,'9: la ronda nueva conserva huevos o mascotas');

// 10) el dibujo funciona en todas las fases (huevo, mascota sin dueno, con dueno, mordiendo, muriendo)
newGame();run('eggSpawn()');
for(const t of [0,.2,1,1.9,2.2,2.7,2.95]){run(`EG[0].t=${t}`);try{run('draw();hud()');ok++}catch(e){bad++;console.log('FALLA dibujo huevo t='+t,e.message)}}
step(190);try{run('draw()');ok++}catch(e){bad++;console.log('FALLA dibujo mascota sin dueno',e.message)}
run('PT[0].idle=true;PT[0].wT=9;F[1].x=PT[0].x;F[1].y=PT[0].y');step(1);run('F[1].x=CX+150');
for(let i=0;i<120;i++){step(1);if(i%6==0){try{run('draw()');ok++}catch(e){bad++;console.log('FALLA dibujo mascota con dueno',e.message);break}}}
run('petDie(PT[0])');for(let i=0;i<60;i++){step(1);if(i%5==0){try{run('draw()');ok++}catch(e){bad++;console.log('FALLA dibujo muerte',e.message);break}}}

// 11) la partida entera sigue funcionando con huevos frecuentes (IA contra IA, sin errores)
for(const [a,b] of [['m','h'],['d','h'],['z','m'],['h','d']]){
  newGame(a,b);run('F[0].ai=true;F[1].ai=true;F[0].cd=0;F[1].cd=0;CONFIG.EGG.first=[1,2];CONFIG.EGG.gap=[3,5];petReset()');
  try{let n=0;for(let i=0;i<60*40&&run("state=='play'");i++){step(1);if(i%30==0)run('draw()');n++}ok++}catch(e){bad++;console.log('FALLA partida '+a+b,e.message)}
}
console.log(bad?('RESULTADO: '+bad+' fallos, '+ok+' correctos'):('RESULTADO: todo correcto ('+ok+' comprobaciones)'));process.exit(bad?1:0);
