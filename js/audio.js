/* ==========================================================================
   audio.js - SISTEMA DE SONIDO
   Los archivos estan en assets/audio/sfx/, music/ y voices/ con los nombres
   de abajo (mp3, ogg o wav; cambia la extension aqui si hace falta).
   Para cambiar un sonido, reemplaza el archivo conservando el nombre.
   Si un archivo no existe, el juego simplemente no suena: no da error.
   ========================================================================== */

const AUDIO={
  enabled:true,
  _duck:{},          // motivos activos para bajar la musica (pausa, nuclear...)
  sfxVolume:.7,
  musicVolume:.35,
  files:{
    // --- musica (en bucle) ---
    music_arena    :'assets/audio/music/arena.mp3',
    music_menu     :'assets/audio/music/menu.mp3',        // musica del menu (reemplazala por la tuya con el mismo nombre)
    music_bc       :'assets/audio/music/bc.mp3',          // musica mientras el Battlecruiser esta en pantalla (sintetizada con tools/build_bc_audio.py; reemplazala por la tuya con el mismo nombre)
    // --- efectos ---
    shoot_marine   :'assets/audio/sfx/disparo_marine.mp3',
    shoot_hydralisk:'assets/audio/sfx/disparo_hidralisco.mp3',
    hit            :'assets/audio/sfx/impacto.mp3',
    pickup_shield  :'assets/audio/sfx/recoger_escudo.mp3',
    pickup_stim    :'assets/audio/sfx/recoger_stimpack.mp3',
    pickup_medkit  :'assets/audio/sfx/recoger_medkit.mp3',
    pickup_multi   :'assets/audio/sfx/recoger_multidisparo.mp3',
    special_ready  :'assets/audio/sfx/especial_listo.mp3',
    grenade_throw  :'assets/audio/sfx/granada_lanza.mp3',
    grenade_boom   :'assets/audio/sfx/granada_explota.mp3',
    acid_spit      :'assets/audio/sfx/acido_escupe.mp3',
    acid_land      :'assets/audio/sfx/acido_cae.mp3',
    ling_land      :'assets/audio/sfx/zergling_cae.mp3',
    ling_boom      :'assets/audio/sfx/zergling_explota.mp3',
    round_start    :'assets/audio/sfx/inicio_ronda.mp3',
    countdown      :'assets/audio/sfx/cuenta_atras.mp3',
    fight          :'assets/audio/sfx/fight.mp3',
    ko             :'assets/audio/sfx/ko.mp3',
    nuke_warning   :'assets/audio/sfx/nuclear_detected.mp3',
    nuke_fall      :'assets/audio/sfx/nuclear_cae.mp3',
    nuke_explosion :'assets/audio/sfx/explosion_nuclear_sonido.mp3',
    victory        :'assets/audio/sfx/victoria.mp3',
    dt_attack      :'assets/audio/sfx/dark_templar_ataque.mp3',   // ataque (cuchillada) del Dark Templar
    dt_slash       :'assets/audio/sfx/dt_slash.mp3',      // onda de la llegada del salto sombrio (sintetizado)
    dt_blink       :'assets/audio/sfx/dt_blink.mp3',      // salto sombrio del Dark Templar (sintetizado)
    // --- nuevos (sintetizados con tools/build_missing_sfx.py) ---
    dt_evade       :'assets/audio/sfx/dt_evade.mp3',          // el DT camuflado esquiva un ataque
    dash           :'assets/audio/sfx/dash.mp3',              // dash de todos los luchadores (sintetizado con tools/build_dash_sfx.py)
    crit           :'assets/audio/sfx/critico.mp3',           // golpe critico al DT visible
    dt_cloak       :'assets/audio/sfx/dt_cloak.mp3',          // el DT vuelve a ocultarse
    dt_reveal      :'assets/audio/sfx/dt_reveal.mp3',         // el DT se revela
    ling_beep      :'assets/audio/sfx/ling_beep.mp3',         // pitido de la cuenta atras del zergling
    ling_pop       :'assets/audio/sfx/ling_pop.mp3',          // explosion debil por fin de mecha
    acid_sizzle    :'assets/audio/sfx/acido_chisporroteo.mp3',// chisporroteo del charco de acido
    clock_warn     :'assets/audio/sfx/reloj_alerta.mp3',      // ultimos 10 s de la ronda
    // --- Zealot (sintetizados con tools/build_zealot_sfx.py) ---
    zl_attack      :'assets/audio/sfx/zealot_ataque.mp3',     // dos tajos de cuchillas psi
    zl_charge      :'assets/audio/sfx/zealot_carga.mp3',      // embestida (especial)
    zl_impact      :'assets/audio/sfx/zealot_impacto.mp3',    // choque al terminar la carga
    // --- Battlecruiser (sintetizados con tools/build_bc_audio.py) ---
    bc_entrada     :'assets/audio/sfx/bc_entrada.mp3',         // salto tactico: llega la nave
    bc_bocina      :'assets/audio/sfx/bc_bocina.mp3',          // bocina grave del cartel
    bc_laser       :'assets/audio/sfx/bc_laser.mp3',           // disparo de la bateria laser
    bc_laser_hit   :'assets/audio/sfx/bc_laser_impacto.mp3',   // impacto del laser
    bc_yamato_charge:'assets/audio/sfx/bc_yamato_carga.mp3',   // carga del canon Yamato
    bc_yamato_fire :'assets/audio/sfx/bc_yamato_disparo.mp3',  // disparo del canon Yamato
    bc_leave       :'assets/audio/sfx/bc_salida.mp3',          // la nave se retira
    // --- pasos (sintetizados con tools/build_extra_sfx.py) ---
    step_marine    :'assets/audio/sfx/paso_marine.mp3',
    step_hydra     :'assets/audio/sfx/paso_hidralisco.mp3',
    step_dt        :'assets/audio/sfx/paso_dt.mp3',
    // --- publico del coliseo y tension de fin de ronda ---
    crowd_ko       :'assets/audio/sfx/publico_ko.mp3',
    crowd_crit     :'assets/audio/sfx/publico_critico.mp3',
    crowd_nuke     :'assets/audio/sfx/publico_nuclear.mp3',
    tension        :'assets/audio/sfx/tension.wav',       // latido en bucle (ultimos 10 s)
    // --- voces del Marine (originales de StarCraft) ---
    marine_what    :'assets/audio/voices/marine/tmawht02.mp3',
    marine_stim    :'assets/audio/voices/marine/tmasti01.mp3',
    marine_pissed  :'assets/audio/voices/marine/tmapss05.mp3',
    // --- voces del Hidralisco (originales de StarCraft) ---
    hydra_what     :'assets/audio/voices/hydralisk/zhywht01.mp3',
    hydra_yes      :'assets/audio/voices/hydralisk/zhyyes00.mp3',
    hydra_pissed   :'assets/audio/voices/hydralisk/zhypss01.mp3',
    // --- voces del Dark Templar (originales de StarCraft) ---
    dt_ready       :'assets/audio/voices/dark_templar/PDtRdy00.mp3',   // al empezar la partida
    dt_yes0        :'assets/audio/voices/dark_templar/pdtyes00.mp3',   // al lanzar el salto sombrio
    dt_yes2        :'assets/audio/voices/dark_templar/pdtyes02.mp3',   // al recoger un stimpack
    // --- voz original del Battlecruiser ("Battlecruiser operational"): suena al llegar la nave (reemplazala por la tuya con el mismo nombre) ---
    bcv_ready      :'assets/audio/voices/battlecruiser/operational.mp3',
    // --- voces del Zealot ---
    zealot_what    :'assets/audio/voices/zealot/what-battle-calls.mp3',   // al empezar la partida
    zealot_charge  :'assets/audio/voices/zealot/my-life-for-aiur.mp3',    // al lanzar la carga (especial)
    zealot_stim    :'assets/audio/voices/zealot/thus-i-serve.mp3',        // al recoger un stimpack
    zealot_win     :'assets/audio/voices/zealot/zealot.mp3'               // al ganar la partida
  },
  // Ganancia relativa por sonido (1 = sin cambio; el volumen final nunca pasa de 1). Equilibra el combate: el Marine sonaba mucho mas que la hidra.
  gain:{shoot_marine:.62,shoot_hydralisk:1,grenade_throw:1,grenade_boom:.9,hit:1,crit:.9,ling_beep:.8,clock_warn:.7,acid_sizzle:.7,dt_cloak:.8,dt_reveal:.8,
        marine_what:.8,marine_stim:.8,marine_pissed:.8,hydra_what:1,hydra_yes:1,hydra_pissed:1.2,
        step_marine:.5,step_hydra:.6,step_dt:.45,crowd_ko:.75,crowd_crit:.6,crowd_nuke:.8,tension:.8,bc_entrada:.9,bc_bocina:.8,bc_laser:.5,bc_laser_hit:.7,bc_yamato_charge:.85,bc_yamato_fire:1,bc_leave:.8,bcv_ready:1},
  // Variacion en cada reproduccion: tono +-pitch y volumen +-vol (0 = sonido siempre identico). Solo disparos, golpes y recogidas; no cuenta atras ni fanfarrias.
  vary:{shoot_marine:1,shoot_hydralisk:1,hit:1,crit:.6,dt_attack:1,dt_slash:.6,zl_attack:1,zl_impact:.6,grenade_throw:.8,grenade_boom:.6,acid_spit:1,acid_land:.8,acid_sizzle:1,ling_land:1,ling_pop:.8,dt_evade:1,
        pickup_shield:.5,pickup_stim:.5,pickup_medkit:.5,pickup_multi:.5,step_marine:1,step_hydra:1,step_dt:1,bc_laser:1,bc_laser_hit:.8},
  varPitch:.06,varVol:.12,
  // --- musica: fundido cruzado al repetir el bucle, cambio de pista con fundido y tension en los ultimos 10 s ---
  musicStarts:{music_arena:5,music_menu:0,music_bc:0},   // segundo donde empieza (y donde vuelve a empezar) el bucle de cada pista
  musicXf:2.5,         // segundos de fundido cruzado al volver al inicio del bucle (0,5 s o menos = casi corte)
  voiceVolume:.9,      // volumen propio de las voces (0-1), independiente de los efectos
  _hold:{},            // motivos por los que la musica esta en pausa (pausa del juego)
  _cache:{},_ctx:undefined,_mg:null,_buf:{},_act:[],_last:{},_pl:{},_trk:null,_pos:{},_out:[],_int:0,_tn:null,_tt:0,_iv:null,_ul:false,
  _vol(){return Math.min(1,this.musicVolume*(Object.keys(this._duck).length?.3:1)*(1+.3*this._int))},
  _mv(e){e.volume=Math.max(0,Math.min(1,this._vol()*(e._g==null?1:e._g)))},
  musicVol(){if(this._trk)this._trk.els.forEach(e=>this._mv(e))},
  musicPlaying(){const T=this._trk;return !!(T&&T.els.some(e=>!e.paused))},
  duck(reason,on){if(on)this._duck[reason]=1;else delete this._duck[reason];this.musicVol()},
  toggle(){
    this.enabled=!this.enabled;
    try{localStorage.setItem('coliseo.sonido',this.enabled?'1':'0')}catch(e){}
    if(!this.enabled){this._pauseAll();if(this._tn)this._tn.pause();this._act.slice().forEach(v=>this._kill(v))}   // al reactivar sigue desde el mismo punto
    return this.enabled;
  },
  _pauseAll(){if(this._trk)this._trk.els.forEach(e=>e.pause());this._out.forEach(q=>q.el.pause())},
  _get(name){
    let a=this._cache[name];
    if(a===undefined){
      const url=this.files[name];
      if(!url){a=null}else{a=new Audio(url);a.preload='auto';a.addEventListener('error',()=>{this._cache[name]=null})}
      this._cache[name]=a;
    }
    return a;
  },
  // ---- EFECTOS (Web Audio): cada sonido se decodifica UNA vez y se reproduce sin crear elementos <audio>.
  // Antes cada disparo/golpe/paso clonaba un <audio> sin limite: el navegador se saturaba, algunos sonidos
  // se retrasaban y salian todos de golpe, y la suma de muchos a la vez distorsionaba. Ahora:
  //  - todo pasa por un compresor (limitador) que evita la distorsion al sumarse muchos sonidos;
  //  - hay un maximo de copias simultaneas por sonido (sfxLimit) y en total (maxVoices), y una pausa minima
  //    entre dos iguales (sfxGap): el sonido nuevo reemplaza al mas viejo en vez de apilarse;
  //  - si el audio aun esta bloqueado o la pestana esta oculta, el sonido se DESCARTA (no se encola);
  //  - si Web Audio no puede cargar un archivo (p. ej. abriendo index.html con doble clic, sin servidor)
  //    se usa un grupo reducido de <audio> reutilizables.
  sfxLimit:{def:3,shoot_marine:4,shoot_hydralisk:4,hit:4,step_marine:2,step_hydra:2,step_dt:2,crowd_ko:1,crowd_crit:1,crowd_nuke:1,clock_warn:1,acid_sizzle:2,ling_beep:2,pickup_shield:2,pickup_stim:2,pickup_medkit:2,pickup_multi:2,bc_laser:4,bc_laser_hit:3},
  sfxGap:{def:.04,hit:.03,step_marine:.09,step_hydra:.09,step_dt:.09,crowd_ko:.5,crowd_crit:.5,crowd_nuke:.5,acid_sizzle:.12,ling_beep:.08,bc_laser:.05,bc_laser_hit:.06},   // segundos entre dos sonidos iguales
  maxVoices:18,        // efectos simultaneos en total
  prio:{ko:1,victory:1,countdown:1,fight:1,round_start:1,nuke_warning:1,nuke_fall:1,special_ready:1,grenade_boom:1,ling_boom:1,crit:1,bc_entrada:1,bc_bocina:1,bc_yamato_charge:1,bc_yamato_fire:1,bc_leave:1},   // nunca se descartan ni se reemplazan
  _isVoice:n=>/^(marine|hydra|zealot)_|^dt_(ready|yes)|^bcv_/.test(n),
  _wa(){
    if(this._ctx!==undefined)return this._ctx;
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)throw 0;
      const c=this._ctx=new C({latencyHint:'interactive'}),k=c.createDynamicsCompressor();
      k.threshold.value=-16;k.knee.value=14;k.ratio.value=10;k.attack.value=.003;k.release.value=.22;
      const m=this._mg=c.createGain();m.gain.value=.9;m.connect(k);k.connect(c.destination);
      const wake=()=>{if(c.state!=='running'&&c.resume)c.resume().catch(()=>{})};
      ['pointerdown','keydown','touchstart','touchend','click'].forEach(e=>addEventListener(e,wake,true));
      document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake()});
      return c;
    }catch(e){return this._ctx=null}
  },
  _load(name){
    const c=this._wa(),url=this.files[name];if(!c||!url||this._buf[name]!==undefined)return;
    this._buf[name]=0;   // 0 = cargando o fallo: mientras tanto se usa el respaldo <audio>
    // sin servidor (doble clic en index.html) fetch() no puede leer archivos locales: se usa js/audio_data.js (tools/build_audio_data.py)
    const emb=()=>{const d=window.AUDIO_DATA&&window.AUDIO_DATA[name];if(!d)throw 0;const bin=atob(d),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u.buffer};
    fetch(url).then(r=>{if(!r.ok)throw 0;return r.arrayBuffer()},()=>emb())
      .then(ab=>new Promise((ok,no)=>{const p=c.decodeAudioData(ab,ok,no);if(p&&p.catch)p.catch(no)}))
      .then(b=>{this._buf[name]=b}).catch(()=>{this._buf[name]=0});
  },
  // Carga de antemano todos los efectos y voces (la musica no): sin esto el primer uso de cada sonido llegaba 30-60 ms tarde
  preload(){Object.keys(this.files).forEach(n=>{if(n.indexOf('music')!==0&&n!=='tension'){this._get(n);if(!this._isVoice(n)&&n!=='nuke_explosion')this._load(n)}})},
  _kill(v){   // apaga un efecto con un fundido de 30 ms (sin chasquido)
    const i=this._act.indexOf(v);if(i>=0)this._act.splice(i,1);
    try{const t=this._ctx.currentTime;v.gn.gain.cancelScheduledValues(t);v.gn.gain.setValueAtTime(v.gn.gain.value,t);v.gn.gain.linearRampToValueAtTime(0,t+.03);v.s.stop(t+.04)}catch(e){}
  },
  play(name,vol){
    if(!this.enabled||document.hidden)return;   // pestana oculta: no se acumulan sonidos para soltarlos al volver
    const now=performance.now()/1000,pr=this.prio[name];
    if(!pr&&now-(this._last[name]||0)<(this.sfxGap[name]||this.sfxGap.def))return;
    const g=this.gain[name]||1,k=this.vary[name]||0;
    const v=Math.min(1,this.sfxVolume*g*(vol==null?1:vol)*(1+(Math.random()*2-1)*this.varVol*k)),rate=k?1+(Math.random()*2-1)*this.varPitch*k:1;
    const c=this._ctx,b=this._buf[name];
    if(c&&b){
      if(c.state!=='running'){if(c.resume)c.resume().catch(()=>{});return}   // aun bloqueado: se descarta, NO se encola (saldrian todos de golpe)
      const same=this._act.filter(a=>a.n===name),lim=this.sfxLimit[name]||this.sfxLimit.def;
      if(same.length>=lim)this._kill(same[0]);
      if(this._act.length>=this.maxVoices){const old=this._act.find(a=>!this.prio[a.n]);if(old)this._kill(old);else if(!pr)return}
      const s=c.createBufferSource(),gn=c.createGain(),a={n:name,s,gn};
      s.buffer=b;s.playbackRate.value=rate;gn.gain.value=v;s.connect(gn);gn.connect(this._mg);
      s.onended=()=>{const i=this._act.indexOf(a);if(i>=0)this._act.splice(i,1);try{gn.disconnect()}catch(e){}};
      this._act.push(a);this._last[name]=now;
      try{s.start()}catch(e){this._kill(a)}
      return;
    }
    this._playEl(name,v,rate,now);   // respaldo
  },
  // Respaldo con <audio>: grupo reducido y reutilizable por sonido (no se crean elementos nuevos en cada disparo)
  _playEl(name,v,rate,now){
    const a=this._get(name);if(!a)return;
    const P=this._pl[name]||(this._pl[name]=[]),lim=Math.min(this.sfxLimit[name]||this.sfxLimit.def,3);
    let e=P.find(x=>x.paused||x.ended);
    if(!e){if(P.length<lim){e=a.cloneNode();P.push(e)}else{e=P.shift();P.push(e)}}   // si estan todos ocupados, reutiliza el mas antiguo
    this._last[name]=now;
    try{e.currentTime=0}catch(x){}
    e.volume=v;
    if(rate!==1){e.preservesPitch=false;e.mozPreservesPitch=false;e.webkitPreservesPitch=false}
    e.playbackRate=rate;
    const p=e.play();if(p&&p.catch)p.catch(()=>{});
  },
  // Musica: cada pista usa DOS elementos Audio; al acercarse al final el segundo entra con fundido (potencia constante) mientras el primero se apaga
  // resume = true: si esa pista ya sono antes, vuelve a entrar por donde se quedo (la usa el Battlecruiser para devolver la musica de la arena sin reiniciarla)
  playMusic(name,resume){
    if(!this.enabled)return;
    const url=this.files[name];if(!url)return;
    const T0=this._trk;
    if(T0&&T0.name===name){this._playTrk(T0);return}
    if(T0){const a=T0.els[T0.i];if(a&&a._started&&isFinite(a.currentTime))this._pos[T0.name]=a.currentTime}   // recuerda donde se quedo
    if(T0)T0.els.forEach(e=>{if(!e.paused)this._out.push({el:e,g:e._g==null?1:e._g,t:0})});   // la pista anterior se apaga en 1 s
    const mk=()=>{const e=new Audio(url);e.preload='auto';e._g=0;return e};
    this._trk={name,els:[mk(),mk()],i:0,xf:-1,fi:T0?0:9,start:this.musicStarts[name]||0,first:resume&&this._pos[name]!=null?this._pos[name]:null};   // fi: progreso del fundido de entrada
    if(!this._iv)this._iv=setInterval(()=>this._tick(),60);
    this._tt=performance.now();
    this._playTrk(this._trk);
  },
  _playTrk(T){
    if(!this.enabled||Object.keys(this._hold).length)return;
    T.els.forEach((e,k)=>{if(k===T.i||T.xf>=0)this._go(e,T)});
  },
  _go(e,T){
    if(e.readyState<1){if(!e._w){e._w=1;e.addEventListener('loadedmetadata',()=>{e._w=0;if(this._trk===T)this._playTrk(T)},{once:true})}return}
    if(!e._started){e._started=1;let p=T.start;if(T.first!=null&&e===T.els[0]&&!e._f){e._f=1;p=T.first}try{e.currentTime=p}catch(x){}}
    e.playbackRate=1+.06*this._int;this._mv(e);
    const p=e.play();if(p&&p.catch)p.catch(()=>this._unlock());
  },
  _tick(){
    const now=performance.now(),dt=Math.min(.2,(now-this._tt)/1000);this._tt=now;
    if(!this.enabled||Object.keys(this._hold).length)return;
    const T=this._trk;
    if(T){
      const a=T.els[T.i],o=T.els[1-T.i];
      if(T.fi<1.2)T.fi+=dt;
      const gi=Math.min(1,T.fi/1.2);
      if(T.xf>=0){
        T.xf+=dt;const u=Math.min(1,T.xf/this.musicXf);
        a._g=Math.cos(u*Math.PI/2)*gi;o._g=Math.sin(u*Math.PI/2)*gi;
        if(u>=1){a.pause();a._g=0;T.i=1-T.i;T.xf=-1;o._g=gi}
      }else{
        a._g=gi;const d=a.duration;
        if(d&&isFinite(d)&&d-T.start>this.musicXf*3&&a.currentTime>=d-this.musicXf){T.xf=0;o._started=0;o._g=0;this._go(o,T)}   // empieza el fundido cruzado
        else if(a.ended){a._started=0;this._go(a,T)}                                                                              // pista corta o fundido fallido: reinicia
      }
      T.els.forEach(e=>this._mv(e));
    }
    this._out=this._out.filter(q=>{q.t+=dt;if(q.t>=1){q.el.pause();return false}q.el._g=q.g*(1-q.t);this._mv(q.el);return true});
  },
  // Tension (0 a 1): sube la musica un poco, la acelera un 6 % y mete un latido que se acelera. La llama el juego en los ultimos 10 s de la ronda
  setIntensity(k){
    k=Math.max(0,Math.min(1,k));
    if(Math.abs(k-this._int)<.015&&!(k===0&&this._int!==0))return;
    this._int=k;
    if(this._trk)this._trk.els.forEach(e=>{e.playbackRate=1+.06*k;this._mv(e)});
    const e=this._tn;
    if(!this.enabled||k<=0||Object.keys(this._hold).length){if(e&&!e.paused)e.pause();return}
    if(!this._tn){const u=this.files.tension;if(!u)return;const n=this._tn=new Audio(u);n.loop=true;n.preservesPitch=false;n.mozPreservesPitch=false;n.webkitPreservesPitch=false}
    const t=this._tn;t.playbackRate=1+.45*k;t.volume=Math.min(1,this.sfxVolume*(this.gain.tension||1)*(.25+.75*k));
    if(t.paused){const p=t.play();if(p&&p.catch)p.catch(()=>{})}
  },
  // los navegadores bloquean el audio hasta el primer clic/tecla/toque: se arranca en ese momento
  _unlock(){
    if(this._ul)return;this._ul=true;
    const evs=['pointerdown','keydown','touchstart'];
    const go=()=>{evs.forEach(e=>removeEventListener(e,go,true));this._ul=false;if(this._trk)this._playTrk(this._trk)};
    evs.forEach(e=>addEventListener(e,go,true));
  },
  // Voz de un personaje: no se pisa con otra frase, respeta una pausa minima y baja la musica mientras habla. Volumen propio (voiceVolume)
  _voiceOn:null,_lastV:{},      // pausa minima por personaje (marine_, hydra_)
  voice(name,force){
    if(!this.enabled||!CONFIG.VOICE.enabled)return;
    const a=this._get(name);if(!a)return;
    const now=performance.now()/1000,v=this._voiceOn;
    const who=name.split('_')[0];
    if(!force&&(now-(this._lastV[who]||0)<CONFIG.VOICE.gap||(v&&!v.paused&&!v.ended)))return;
    if(v&&v!==a){try{v.pause()}catch(e){}}
    if(!a._vh){a._vh=1;['ended','pause','error'].forEach(e=>a.addEventListener(e,()=>this.duck('voz',false)))}
    try{a.currentTime=0}catch(e){}
    a.volume=Math.min(1,this.voiceVolume*(this.gain[name]||1));
    this._voiceOn=a;this._lastV[who]=now;this.duck('voz',true);
    const p=a.play();if(p&&p.catch)p.catch(()=>this.duck('voz',false));
  },
  // Efecto largo con fundido final (p. ej. la explosion nuclear de 20 s): suena entero hasta fadeAt y se apaga en fadeDur
  playFade(name,fadeAt,fadeDur){
    if(!this.enabled)return;
    const a=this._get(name);if(!a)return;
    const c=a.cloneNode();c.volume=this.sfxVolume;
    const p=c.play();if(p&&p.catch)p.catch(()=>{});
    const t0=performance.now(),iv=setInterval(()=>{
      const e=(performance.now()-t0)/1000-fadeAt;
      if(e<=0)return;
      if(e>=fadeDur||c.ended){clearInterval(iv);c.pause();return}
      c.volume=Math.max(0,this.sfxVolume*(1-e/fadeDur));
    },40);
  },
  pauseMusic(reason){this._hold[reason]=1;this._pauseAll();if(this._tn)this._tn.pause()},      // conserva la posicion
  resumeMusic(reason){delete this._hold[reason];this._tt=performance.now();this._out.forEach(q=>q.el.pause());this._out=[];if(this._trk)this._playTrk(this._trk);if(this._int>0){const k=this._int;this._int=-1;this.setIntensity(k)}},
  stopMusic(){this._pauseAll();if(this._trk)this._trk.els.forEach(e=>{e._started=0});this._out=[]}
};
try{if(localStorage.getItem('coliseo.sonido')==='0')AUDIO.enabled=false}catch(e){}
addEventListener('load',()=>AUDIO.preload());
