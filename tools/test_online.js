/* test_online.js - prueba automatica del MODO ONLINE sin navegador ni internet.
   Carga el juego DOS veces (anfitrion e invitado), los conecta con una red falsa (latencia y jitter al azar) y los hace jugar
   con controles al azar y a distinta velocidad de fotogramas (60 y 144 Hz). Comprueba que en cada paso los dos estados son IDENTICOS.
   Uso: node tools/test_online.js   (SEED=n para otra semilla; SECS=n segundos simulados, 400 por defecto) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const SECS = +process.env.SECS || 400;
let rs = (+process.env.SEED || 5) >>> 0;
const rr = () => { rs = (rs + 0x6D2B79F5) >>> 0; let t = rs; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

// ---- red falsa: reloj simulado, cola de mensajes con retraso, orden garantizado por canal ----
const LAT0 = +process.env.LAT0 || 30, LAT1 = +process.env.LAT1 || 140;
const net = { now: 0, q: [], peers: {}, lat: [LAT0, LAT1] };
net.later = (ms, fn) => { net.q.push({ t: net.now + ms, fn, n: net.q.length }); };
const delay = () => net.lat[0] + rr() * (net.lat[1] - net.lat[0]);
class FakeConn {
  constructor() { this.h = {}; this.open = false; this.lastAt = 0; }
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
  emit(e, a) { (this.h[e] || []).forEach(f => f(a)); }
  send(m) { const o = this.other, at = Math.max(this.lastAt, net.now + delay()); this.lastAt = at; const s = JSON.parse(JSON.stringify(m)); net.later(at - net.now, () => { if (o.open) o.emit('data', s); }); }
  close() { if (!this.open) return; this.open = false; const o = this.other; net.later(20, () => { if (o.open) { o.open = false; o.emit('close'); } }); }
}
class FakePeer {
  constructor(id) { this.h = {}; this.id = id || 'anon-' + Object.keys(net.peers).length; net.peers[this.id] = this; net.later(5, () => this.emit('open', this.id)); }
  on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
  emit(e, a) { (this.h[e] || []).forEach(f => f(a)); }
  connect(id) {
    const a = new FakeConn(), b = new FakeConn(); a.other = b; b.other = a;
    const host = net.peers[id];
    if (!host) { net.later(5, () => this.emit('error', { type: 'peer-unavailable' })); return a; }
    net.later(20, () => { host.emit('connection', b); a.open = b.open = true; a.emit('open'); b.emit('open'); });
    return a;
  }
  destroy() { delete net.peers[this.id]; }
}

// ---- un cliente = un contexto con el juego cargado ----
function client(name, hz) {
  const noop = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : noop, apply: () => noop, set: () => true });
  const mkEl = () => ({ value: '', textContent: '', innerHTML: '', hidden: false, className: '', offsetWidth: 0, style: { setProperty() {} }, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, getAttribute() { return null; }, setAttribute() {}, addEventListener() {}, removeEventListener() {}, blur() {}, focus() {},
    querySelectorAll() { return []; }, querySelector() { return mkEl(); }, getContext() { return noop; }, getBoundingClientRect() { return { left: 0, top: 0, width: 1, height: 1 }; }, appendChild() {}, parentNode: { insertBefore() {} } });
  const els = {}, store = {};
  const ctx = vm.createContext({
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, performance: { now: () => net.now },
    AUDIO: noop, Peer: FakePeer, Image: class { constructor() { this.width = 0; this.height = 0; this.naturalWidth = 0; this.complete = false; } addEventListener() {} },
    document: { querySelector: s => els[s] || (els[s] = mkEl()), querySelectorAll: () => [], addEventListener() {}, createElement: () => Object.assign(mkEl(), { width: 0, height: 0 }), documentElement: { style: { setProperty() {} } }, activeElement: null, fullscreenEnabled: false, hidden: false, baseURI: 'file:///' },
    navigator: { getGamepads: () => [], maxTouchPoints: 0 }, matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, sessionStorage: { getItem: () => null, setItem() {} },
    addEventListener() {}, removeEventListener() {}, requestAnimationFrame() { return 0; }
  });
  ctx.window = ctx;
  const run = (c, n) => vm.runInContext(c, ctx, { filename: n || name });
  const load = f => run(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), f);
  ['config.js'].forEach(load); run('CONFIG.INTRO.on=false');
  ['granada_fx.js', 'battlecruiser.js', 'mascota.js', 'game.js', 'online.js'].forEach(load);
  // registra el estado tras CADA paso de simulacion (la clave es el numero de paso)
  run(`window.__recs=[];(function(){const o=simStep;simStep=function(dt){if(!ONLINE.active){o(dt);return}const k=ONLINE.tk;if(k===0)__recs.push({});o(dt);
    __recs[__recs.length-1][k]=JSON.stringify([state,time.toFixed(6),roundT.toFixed(6),lives,F.map(f=>[f.type,+f.x.toFixed(4),+f.y.toFixed(4),+f.hp.toFixed(3),+f.sh.toFixed(3),f.stun,f.cd,f.spT,f.dashT,f.chT]),B.length,I.map(i=>[i.t,+i.x.toFixed(3),+i.y.toFixed(3)]),GR.length,AC.length,L.length,MN.length])}})()`);
  return { name, ctx, run, els, hz, next: 0, ts: 0, keyT: 0 };
}
const A = client('anfitrion', 60), Bc = client('invitado', 144);

// controles al azar: cada cliente cambia de tecla cada pocos fotogramas
const KEYS = ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyF', 'Space', 'KeyG', 'KeyV'];
function press(c) {
  if (c.keyT-- > 0) return;
  c.keyT = 3 + (rr() * 25 | 0);
  c.run(`for(const k in keys)keys[k]=0;keys[CONFIG.KEYS.marine]=0`);
  KEYS.forEach(k => { if (rr() < .35) c.run(`keys['${k}']=1`); });
  if (rr() < .15) c.run(`keys[CONFIG.DASH.KEYS.left]=1`);
  if (rr() < .25) c.run(`keys[CONFIG.KEYS.marine]=1`);
}

// ---- arranque: el anfitrion crea la sala, el invitado se une con el codigo ----
A.run('ONLINE'); A.els['#onh'] = A.els['#onh'] || {};
A.run(`document.querySelector('#onh').onclick()`);
net.q.sort((a, b) => a.t - b.t);
const code = () => Object.keys(net.peers).find(k => k.startsWith('starcrafty-')).slice(11);
function pump(until) {
  for (;;) {
    net.q.sort((a, b) => a.t - b.t || a.n - b.n);
    if (!net.q.length || net.q[0].t > until) break;
    const e = net.q.shift(); net.now = Math.max(net.now, e.t); e.fn();
  }
  net.now = until;
}
pump(100);
Bc.els['#onc'] = { value: code(), disabled: false }; Bc.run(`document.querySelector('#onc').value='${code()}'`);
Bc.run(`document.querySelector('#onj').onclick()`);

// ---- bucle de tiempo simulado ----
let rematches = 0, lastSt = '';
let readySent = false, hostTried = false;
let firstStart = false;   // el anfitrion empieza la primera partida cuando quiere (ya no es automatico)
for (let ms = 100; ms < SECS * 1000; ms += 0.5) {
  pump(ms);
  for (const c of [A, Bc]) {
    if (ms >= c.next) {
      c.next = ms + 1000 / c.hz + (c === Bc ? rr() * 2 : 0);   // el invitado va a 144 Hz con algo de jitter
      press(c);
      c.run(`loopBody(${ms})`);
    }
  }
  // el anfitrion intenta empezar ANTES de que el invitado este listo: no debe arrancar
  if (!hostTried && ms >= 1000) { hostTried = true; A.run(`start('2p')`); if (A.run('ONLINE.active')) { console.log('FALLA: empezo sin estar listo el invitado'); process.exit(1); } }
  if (!readySent && ms >= 1500) { readySent = true; Bc.els['#cr'].value = 'z'; Bc.run(`document.querySelector('#onr').onclick()`); }
  if (!firstStart && ms >= 2500) { firstStart = true; A.run(`start('2p')`); if (!A.run('ONLINE.active') || A.run('CH[1]') !== 'z') { console.log('FALLA: no empezo con el personaje elegido', A.run('CH')); process.exit(1); } }
  // al acabar la partida el anfitrion pide revancha (cambia la semilla y reinicia los dos)
  if (A.run('state') === 'victory' && A.run('ONLINE.active') && ms % 3000 < 1) {
    rematches++; A.run(`document.querySelector('#ov').classList.contains('x')||start('2p')`);
  }
}

// ---- desconexion: si el anfitrion pulsa Salir, el invitado debe volver al menu (y no quedarse esperando) ----
{
  A.run(`document.querySelector('#ol').onclick()`);
  const t0 = net.now; for (let ms = t0; ms < t0 + 2000; ms += 1) { pump(ms); for (const c of [A, Bc]) if (ms >= c.next) { c.next = ms + 1000 / c.hz; c.run(`loopBody(${ms})`); } }
  const okA = A.run('state') === 'menu' && !A.run('ONLINE.active'), okB = Bc.run('state') === 'menu' && !Bc.run('ONLINE.active');
  console.log('desconexion: anfitrion en menu:', okA, '| invitado en menu:', okB, '| aviso al invitado:', JSON.stringify(Bc.els['#ons'].textContent));
  if (!okA || !okB) { console.log('FALLA: la desconexion no devuelve al menu'); process.exit(1); }
}
// ---- comparacion (partida a partida) ----
const RA = JSON.parse(A.run('JSON.stringify(__recs)')), RB = JSON.parse(Bc.run('JSON.stringify(__recs)'));
console.log('partidas (anfitrion/invitado):', RA.length, RB.length, ' revanchas pedidas:', rematches);
console.log('estado final:', A.run('state'), '/', Bc.run('state'), ' texto:', JSON.stringify(A.els['#ons'] && A.els['#ons'].textContent), JSON.stringify(Bc.els['#ons'] && Bc.els['#ons'].textContent));
let common = 0, bad = 0, first = null;
for (let m = 0; m < Math.min(RA.length, RB.length); m++) {
  const a = RA[m], b = RB[m];
  for (const k of Object.keys(a)) if (k in b) { common++; if (a[k] !== b[k]) { bad++; if (!first) first = { m, k }; } }
  console.log(` partida ${m}: pasos ${Object.keys(a).length}/${Object.keys(b).length}`);
}
if (bad || !common) { console.log('FALLA: los estados difieren en', bad, 'pasos', first ? '; primero: partida ' + first.m + ' paso ' + first.k : ''); if (first) {
    const pa = JSON.parse(RA[first.m][first.k]), pb = JSON.parse(RB[first.m][first.k]), q = first.k - 1;
    console.log(' paso anterior A:', RA[first.m][q]); console.log(' paso anterior B:', RB[first.m][q]);
    pa.forEach((v, i) => { if (JSON.stringify(v) !== JSON.stringify(pb[i])) console.log(' campo', i, 'A:', JSON.stringify(v), 'B:', JSON.stringify(pb[i])); });
  } process.exit(1); }
console.log('OK: los dos clientes son identicos en los', common, 'pasos comparados');
