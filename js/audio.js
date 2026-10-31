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
    // --- efectos ---
    shoot_marine   :'assets/audio/sfx/disparo_marine.wav',
    shoot_hydralisk:'assets/audio/sfx/disparo_hidralisco.mp3',
    hit            :'assets/audio/sfx/impacto.wav',
    pickup_shield  :'assets/audio/sfx/recoger_escudo.wav',
    pickup_stim    :'assets/audio/sfx/recoger_stimpack.wav',
    pickup_medkit  :'assets/audio/sfx/recoger_medkit.wav',
    pickup_multi   :'assets/audio/sfx/recoger_multidisparo.wav',
    special_ready  :'assets/audio/sfx/especial_listo.wav',
    grenade_throw  :'assets/audio/sfx/granada_lanza.wav',
    grenade_boom   :'assets/audio/sfx/granada_explota.wav',
    acid_spit      :'assets/audio/sfx/acido_escupe.wav',
    acid_land      :'assets/audio/sfx/acido_cae.wav',
    ling_land      :'assets/audio/sfx/zergling_cae.wav',
    ling_boom      :'assets/audio/sfx/zergling_explota.wav',
    round_start    :'assets/audio/sfx/inicio_ronda.wav',
    countdown      :'assets/audio/sfx/cuenta_atras.wav',
    fight          :'assets/audio/sfx/fight.wav',
    ko             :'assets/audio/sfx/ko.wav',
    nuke_warning   :'assets/audio/sfx/nuclear_detected.mp3',
    nuke_fall      :'assets/audio/sfx/nuclear_cae.wav',
    nuke_explosion :'assets/audio/sfx/explosion_nuclear_sonido.mp3',
    victory        :'assets/audio/sfx/victoria.wav',
    dt_attack      :'assets/audio/sfx/dark_templar_ataque.mp3',   // ataque (cuchillada) del Dark Templar
    dt_slash       :'assets/audio/sfx/dt_slash.wav',      // onda de la llegada del salto sombrio (sintetizado)
    dt_blink       :'assets/audio/sfx/dt_blink.wav',      // salto sombrio del Dark Templar (sintetizado)
    // --- nuevos (sintetizados con tools/build_missing_sfx.py) ---
    dt_evade       :'assets/audio/sfx/dt_evade.wav',          // el DT camuflado esquiva un ataque
    crit           :'assets/audio/sfx/critico.wav',           // golpe critico al DT visible
    dt_cloak       :'assets/audio/sfx/dt_cloak.wav',          // el DT vuelve a ocultarse
    dt_reveal      :'assets/audio/sfx/dt_reveal.wav',         // el DT se revela
    ling_beep      :'assets/audio/sfx/ling_beep.wav',         // pitido de la cuenta atras del zergling
    ling_pop       :'assets/audio/sfx/ling_pop.wav',          // explosion debil por fin de mecha
    acid_sizzle    :'assets/audio/sfx/acido_chisporroteo.wav',// chisporroteo del charco de acido
    clock_warn     :'assets/audio/sfx/reloj_alerta.wav',      // ultimos 10 s de la ronda
    // --- pasos (sintetizados con tools/build_extra_sfx.py) ---
    step_marine    :'assets/audio/sfx/paso_marine.wav',
    step_hydra     :'assets/audio/sfx/paso_hidralisco.wav',
    step_dt        :'assets/audio/sfx/paso_dt.wav',
    // --- publico del coliseo y tension de fin de ronda ---
    crowd_ko       :'assets/audio/sfx/publico_ko.wav',
    crowd_crit     :'assets/audio/sfx/publico_critico.wav',
    crowd_nuke     :'assets/audio/sfx/publico_nuclear.wav',
    tension        :'assets/audio/sfx/tension.wav',       // latido en bucle (ultimos 10 s)
    // --- voces del Marine (originales de StarCraft) ---
    marine_what    :'assets/audio/voices/marine/tmawht02.wav',
    marine_stim    :'assets/audio/voices/marine/tmasti01.wav',
    marine_pissed  :'assets/audio/voices/marine/tmapss05.wav',
    // --- voces del Hidralisco (originales de StarCraft) ---
    hydra_what     :'assets/audio/voices/hydralisk/zhywht01.wav',
    hydra_yes      :'assets/audio/voices/hydralisk/zhyyes00.wav',
    hydra_pissed   :'assets/audio/voices/hydralisk/zhypss01.wav',
    // --- voces del Dark Templar (originales de StarCraft) ---
    dt_ready       :'assets/audio/voices/dark_templar/PDtRdy00.wav',   // al empezar la partida
    dt_yes0        :'assets/audio/voices/dark_templar/pdtyes00.wav',   // al lanzar el salto sombrio
    dt_yes2        :'assets/audio/voices/dark_templar/pdtyes02.wav'    // al recoger un stimpack
  },
  // Ganancia relativa por sonido (1 = sin cambio; el volumen final nunca pasa de 1). Equilibra el combate: el Marine sonaba mucho mas que la hidra.
  gain:{shoot_marine:.62,shoot_hydralisk:1,grenade_throw:1,grenade_boom:.9,hit:1,crit:.9,ling_beep:.8,clock_warn:.7,acid_sizzle:.7,dt_cloak:.8,dt_reveal:.8,
        marine_what:.8,marine_stim:.8,marine_pissed:.8,hydra_what:1,hydra_yes:1,hydra_pissed:1.2,
        step_marine:.5,step_hydra:.6,step_dt:.45,crowd_ko:.75,crowd_crit:.6,crowd_nuke:.8,tension:.8},
  // Variacion en cada reproduccion: tono +-pitch y volumen +-vol (0 = sonido siempre identico). Solo disparos, golpes y recogidas; no cuenta atras ni fanfarrias.
  vary:{shoot_marine:1,shoot_hydralisk:1,hit:1,crit:.6,dt_attack:1,dt_slash:.6,grenade_throw:.8,grenade_boom:.6,acid_spit:1,acid_land:.8,acid_sizzle:1,ling_land:1,ling_pop:.8,dt_evade:1,
        pickup_shield:.5,pickup_stim:.5,pickup_medkit:.5,pickup_multi:.5,step_marine:1,step_hydra:1,step_dt:1},
  varPitch:.06,varVol:.12,
  // --- musica: fundido cruzado al repetir el bucle, cambio de pista con fundido y tension en los ultimos 10 s ---
  musicStarts:{music_arena:5,music_menu:0},   // segundo donde empieza (y donde vuelve a empezar) el bucle de cada pista
  musicXf:2.5,         // segundos de fundido cruzado al volver al inicio del bucle (0,5 s o menos = casi corte)
  voiceVolume:.9,      // volumen propio de las voces (0-1), independiente de los efectos
  _hold:{},            // motivos por los que la musica esta en pausa (pausa del juego)
  _cache:{},_trk:null,_out:[],_int:0,_tn:null,_tt:0,_iv:null,_ul:false,
  _vol(){return Math.min(1,this.musicVolume*(Object.keys(this._duck).length?.3:1)*(1+.3*this._int))},
  _mv(e){e.volume=Math.max(0,Math.min(1,this._vol()*(e._g==null?1:e._g)))},
  musicVol(){if(this._trk)this._trk.els.forEach(e=>this._mv(e))},
  musicPlaying(){const T=this._trk;return !!(T&&T.els.some(e=>!e.paused))},
  duck(reason,on){if(on)this._duck[reason]=1;else delete this._duck[reason];this.musicVol()},
  toggle(){
    this.enabled=!this.enabled;
    try{localStorage.setItem('coliseo.sonido',this.enabled?'1':'0')}catch(e){}
    if(!this.enabled){this._pauseAll();if(this._tn)this._tn.pause()}   // al reactivar sigue desde el mismo punto
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
  // Carga de antemano todos los efectos y voces (la musica no): sin esto el primer uso de cada sonido llegaba 30-60 ms tarde
  preload(){Object.keys(this.files).forEach(n=>{if(n.indexOf('music')!==0&&n!=='tension')this._get(n)})},
  play(name,vol){
    if(!this.enabled)return;
    const a=this._get(name);if(!a)return;
    const c=a.cloneNode(),g=this.gain[name]||1,k=this.vary[name]||0;
    c.volume=Math.min(1,this.sfxVolume*g*(vol==null?1:vol)*(1+(Math.random()*2-1)*this.varVol*k));
    if(k){c.preservesPitch=false;c.mozPreservesPitch=false;c.webkitPreservesPitch=false;c.playbackRate=1+(Math.random()*2-1)*this.varPitch*k}
    const p=c.play();if(p&&p.catch)p.catch(()=>{});
  },
  // Musica: cada pista usa DOS elementos Audio; al acercarse al final el segundo entra con fundido (potencia constante) mientras el primero se apaga
  playMusic(name){
    if(!this.enabled)return;
    const url=this.files[name];if(!url)return;
    const T0=this._trk;
    if(T0&&T0.name===name){this._playTrk(T0);return}
    if(T0)T0.els.forEach(e=>{if(!e.paused)this._out.push({el:e,g:e._g==null?1:e._g,t:0})});   // la pista anterior se apaga en 1 s
    const mk=()=>{const e=new Audio(url);e.preload='auto';e._g=0;return e};
    this._trk={name,els:[mk(),mk()],i:0,xf:-1,fi:T0?0:9,start:this.musicStarts[name]||0};   // fi: progreso del fundido de entrada
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
    if(!e._started){e._started=1;try{e.currentTime=T.start}catch(x){}}
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
