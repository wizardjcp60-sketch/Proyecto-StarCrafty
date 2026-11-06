/* online.js - MODO ONLINE 1 contra 1, lo mas sencillo posible.
   - Sin servidor propio: conexion directa entre los dos navegadores (WebRTC) con la libreria PeerJS (se carga desde internet en index.html).
   - El anfitrion crea una sala y recibe un CODIGO de 4 letras; el invitado lo escribe y se une.
   - Sincronizacion "lockstep": los dos navegadores ejecutan EL MISMO juego a 60 pasos por segundo, con la misma semilla aleatoria,
     y solo se intercambian los controles (no el estado). Cada paso espera los controles del otro jugador; los controles se envian
     con DELAY pasos de adelanto para absorber la latencia (4 pasos = 67 ms).
   - Se carga DESPUES de game.js. El anfitrion juega a la izquierda (luchador izquierdo) y el invitado a la derecha. */
var ONLINE=(function(){
 const STEP=1/60,DELAY=4,PREFIX='starcrafty-',ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZ';
 const nat=Math.random.bind(Math);          // aleatorio normal (dibujo, sonido, particulas del menu...)
 let simRng=null,useSim=false;              // aleatorio compartido: solo dentro de la simulacion
 Math.random=function(){return useSim&&simRng?simRng():nat()};
 const mulberry=seed=>{let s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
 // el audio usa Math.random para variar el tono: que no gaste numeros del aleatorio compartido (si uno esta silenciado y el otro no, se descuadrarian)
 try{for(const k in AUDIO){const f=AUDIO[k];if(typeof f=='function')AUDIO[k]=function(){const u=useSim;useSim=false;try{return f.apply(this,arguments)}finally{useSim=u}}}}catch(e){}

 const O={active:false,side:0,cur:[null,null],tk:0,nicks:null};
 let guestCh=null,guestNick='',hostCh=null,hostNick='',guestReady=false,peer=null,conn=null,host=false,local={},remote={},capT=0,acc=0,lastRx=0,epoch=0;   // epoch: numero de partida; descarta controles viejos que llegan tras una revancha
 const NEUTRAL=[0,0,0,0,0];
 const $$=s=>document.querySelector(s);
 const say=t=>{const e=$$('#ons');if(e)e.textContent=t||''};
 const toObj=v=>({dx:v[0],dy:v[1],fire:!!v[2],sp:!!v[3],dash:!!v[4]});

 /* controles locales: los mismos que en 1 jugador (WASD o flechas, F o Espacio, G o ., V o /, mando y tactil) */
 const _human=human;
 function localIn(){
  const m=mode;mode='1m';let r;try{r=_human({side:0})}finally{mode=m}
  const q=v=>Math.round(Math.max(-1.5,Math.min(1.5,+v||0))*100)/100;   // redondeado: los dos navegadores usan exactamente el mismo numero
  return[q(r.dx),q(r.dy),r.fire?1:0,r.sp?1:0,r.dash?1:0];
 }
 human=function(f){return O.active&&O.cur[f.side]?O.cur[f.side]:_human(f)};
 const _tp=togglePause;togglePause=function(){if(!O.active)return _tp.apply(this,arguments)};   // sin pausa online (pararia al otro jugador)
 const _start=start;
 start=function(m){   // con un rival conectado, cualquier boton de jugar = (re)empezar la partida online
  if(conn&&conn.open){if(!host){say('Espera: el anfitri\u00f3n empieza la partida.');return}
   if(!guestReady){say('Todav\u00eda no puedes empezar: tu rival debe elegir su personaje y pulsar \u00abEstoy listo\u00bb.');return}
   startMatch();return}
  return _start(m)};

 function showPg(fps){const e=$$('#pg');if(!e)return;e.hidden=false;e.textContent=(pingMs==null?'-- ms':pingMs+' ms')+' \u00b7 '+fps+' FPS';e.className=pingMs>150?'mal':pingMs>80?'med':''}
 function send(m){try{if(conn&&conn.open)conn.send(m)}catch(e){}}

 /* ---- un paso de simulacion con los controles de los dos ---- */
 function tick(){
  O.cur[O.side]=toObj(local[O.tk]);O.cur[1-O.side]=toObj(remote[O.tk]);
  delete local[O.tk];delete remote[O.tk];
  useSim=true;try{simStep(STEP)}finally{useSim=false}
  O.tk++;
 }
 let pingT=0,fr=0,frT=0,pingMs=null;
 O.frame=function(dt){
  const now=performance.now();
  fr++;if(now-frT>=1000){const fps=Math.round(fr*1000/(now-frT));fr=0;frT=now;showPg(fps)}   // fotogramas por segundo reales
  if(now-pingT>=1000){pingT=now;send({k:'p',t:now})}   // cada segundo mide la latencia con el rival
  acc=Math.min(acc+dt,STEP*6);
  while(acc>=STEP){
   while(capT<=O.tk+DELAY){const v=localIn();local[capT]=v;send({k:'in',e:epoch,t:capT,i:v});capT++}   // controles con DELAY pasos de adelanto
   if(!remote[O.tk]){   // aun no llegan los controles del otro: se espera
    if(performance.now()-lastRx>10000){leave('Se perdio la conexion con el rival.');return}
    break}
   tick();acc-=STEP;
  }
 };

 /* ---- empezar partida (los dos navegadores ejecutan esto con los mismos datos) ---- */
 function begin(o){
  mode='2p';CH=o.ch.slice();O.nicks=Array.isArray(o.nk)?[cleanNick(o.nk[0])||'J1',cleanNick(o.nk[1])||'J2']:null;CONFIG.LIVES=o.lives;applyArena(o.arena);
  epoch=o.e;local={};remote={};for(let i=0;i<DELAY;i++){local[i]=NEUTRAL;remote[i]=NEUTRAL}   // los primeros pasos van sin controles en los dos lados
  O.side=host?0:1;capT=DELAY;acc=0;O.tk=0;O.cur=[null,null];   // el anfitrion lleva al luchador izquierdo y el invitado al derecho
  lastRx=performance.now();
  simRng=mulberry(o.seed);time=0;
  AUDIO.playMusic('music_arena');
  useSim=true;try{reset()}finally{useSim=false}
  const ov=$$('#ov');ov.classList.remove('end','leaving');ov.classList.add('hide');
  const pb=$$('#pb');if(pb)pb.style.display='none';const ol=$$('#ol');if(ol)ol.style.display='';
  O.active=true;
  popups.push({x:F[O.side].x,y:F[O.side].y-42,txt:'\u00a1Eres t\u00fa!',c:'#ffd98a',life:2.5});
 }
 function startMatch(){   // solo el anfitrion: elige luchadores, vidas y arena con los controles del menu, y manda la semilla
  const o={e:epoch+1,seed:(nat()*4294967296)>>>0,ch:[$$('#cl').value||'m',guestCh||'h'],lives:+$$('#liv').value||2,arena:$$('#ar').value,nk:[myNick()||'Anfitri\u00f3n',guestNick||'Invitado']};
  send({k:'start',o});begin(o);
 }

 /* ---- conexion ---- */
 function attach(c){
  conn=c;
  c.on('open',()=>{
   lastRx=performance.now();
   if(host){guestReady=false;send({k:'hc',c:$$('#cl').value||'m',n:myNick()});say('\u00a1Alguien se uni\u00f3 a tu sala! Espera a que elija su personaje y est\u00e9 listo\u2026')}
   else{setMode('guest');showReady(true);say('Conectado. Elige tu personaje en \u00abLuchador derecho\u00bb y pulsa \u00abEstoy listo\u00bb.');send({k:'join',n:myNick()})}
  });
  c.on('data',m=>{
   lastRx=performance.now();
   if(!m)return;
   if(m.k=='in'){if(m.e===epoch)remote[m.t]=m.i}
   else if(m.k=='p')send({k:'q',t:m.t})
   else if(m.k=='q'){const v=Math.round(performance.now()-m.t);pingMs=pingMs==null?v:Math.round(pingMs*.6+v*.4)}   // latencia de ida y vuelta, suavizada
   else if(m.k=='start'&&!host){begin(m.o)}
   else if(host&&m.k=='ready'&&/^[mhdz]$/.test(m.c)){   // el invitado eligio y esta listo
    guestCh=m.c;guestReady=true;if(m.n)guestNick=cleanNick(m.n);rival(guestNick,m.c)
    if(!O.active)say('\u00a1'+(guestNick||'Tu rival')+' est\u00e1 listo con '+NAMES[m.c]+'! Pulsa \u00ab2 jugadores\u00bb para empezar.')}
   else if(host&&m.k=='join'){guestNick=cleanNick(m.n);say('\u00a1'+(guestNick||'Alguien')+' se uni\u00f3 a tu sala! Espera a que elija su personaje y est\u00e9 listo\u2026')}
   else if(!host&&m.k=='hc'&&/^[mhdz]$/.test(m.c)){hostCh=m.c;hostNick=cleanNick(m.n);rival(hostNick,hostCh)}
   else if(host&&m.k=='unready'){guestReady=false;{const v=$$('#onv');if(v)v.textContent=''};if(!O.active)say('Tu rival est\u00e1 cambiando de personaje\u2026 espera a que vuelva a estar listo.')}
  });
  c.on('close',()=>{if(conn===c)leave('El rival se desconect\u00f3.')});
  c.on('error',()=>{if(conn===c)leave('Error de conexi\u00f3n.')});
 }
 function leave(msg,full){
  const was=O.active;O.active=false;
  try{conn&&conn.close()}catch(e){}try{peer&&peer.destroy()}catch(e){}
  conn=null;peer=null;host=false;guestCh=null;guestNick='';hostCh=null;hostNick='';O.nicks=null;guestReady=false;showReady(false);pingMs=null;{const e=$$('#pg');if(e)e.hidden=true}local={};remote={};
  const pb=$$('#pb');if(pb)pb.style.display='';const ol=$$('#ol');if(ol)ol.style.display='none';
  if(was){bcReset(true);state='menu';mode='1m';AUDIO.playMusic('music_menu');$$('#pz').classList.add('hide');
   $$('#ov').classList.remove('end','hide');$$('#t').textContent='Coliseo';syncRoster()}
  btns(true);say(msg||'');setMode(full?'':'menu');{const v=$$('#onv');if(v)v.textContent=''}
 }
 const setMode=m=>{const ov=$$('#ov');if(!ov)return;if(m){ov.setAttribute('data-on',m);const p=$$('#onp');if(p)p.hidden=false}else ov.removeAttribute('data-on');const st=$$('#onst');if(st)st.hidden=m!='host'};
 const myNick=()=>($$('#onn').value||'').replace(/[<>]/g,'').trim().slice(0,12);
 const cleanNick=n=>typeof n=='string'?n.replace(/[<>]/g,'').trim().slice(0,12):'';
 const rival=(nk,c)=>{const v=$$('#onv');if(v)v.textContent=(host?'Tu rival: ':'Tu rival ser\u00e1: ')+(nk||'Rival')+(c?' ('+NAMES[c]+')':'')};
 const needNick=()=>{if(myNick())return false;say('Escribe tu nickname antes de continuar.');try{$$('#onn').focus()}catch(e){}return true};
 const showReady=on=>{const b=$$('#onr');if(b){b.hidden=!on;b.disabled=false;b.textContent='Estoy listo'}};
 const btns=on=>{['#onh','#onj','#onc'].forEach(s=>{const e=$$(s);if(e)e.disabled=!on})};
 function lib(){if(typeof Peer=='undefined'){say('No se pudo cargar PeerJS (\u00bfsin internet?).');return false}return true}

 function create(tries){
  if(!lib())return;if(needNick())return;try{localStorage.setItem('coliseo.nick',myNick())}catch(e){}btns(false);
  const code=Array.from({length:4},()=>ALPHA[nat()*ALPHA.length|0]).join('');
  host=true;setMode('host');peer=new Peer(PREFIX+code);
  peer.on('open',()=>say('Tu c\u00f3digo: '+code+'  \u2014  p\u00edsaselo a tu rival y espera.'));
  peer.on('connection',c=>{if(conn){c.close();return}attach(c)});
  peer.on('error',e=>{
   if(e&&e.type=='unavailable-id'&&(tries||0)<5){try{peer.destroy()}catch(x){}peer=null;create((tries||0)+1);return}
   leave('Error: '+(e&&e.type||e));
  });
 }
 function join(){
  if(!lib())return;if(needNick())return;try{localStorage.setItem('coliseo.nick',myNick())}catch(e){}
  const code=($$('#onc').value||'').trim().toUpperCase();
  if(code.length!=4){say('Escribe el c\u00f3digo de 4 letras.');return}
  btns(false);host=false;say('Conectando\u2026');
  peer=new Peer();
  peer.on('open',()=>attach(peer.connect(PREFIX+code,{reliable:true,serialization:'json'})));
  peer.on('error',e=>leave(e&&e.type=='peer-unavailable'?'No existe esa sala. Revisa el c\u00f3digo.':'Error: '+(e&&e.type||e)));
  setTimeout(()=>{if(peer&&!conn)leave('No se pudo conectar (tiempo agotado).')},15000);
 }

 /* ---- menu ---- */
 function ui(){
  const b=$$('#onb');if(!b)return;
  try{const n=localStorage.getItem('coliseo.nick');if(n&&!$$('#onn').value)$$('#onn').value=n}catch(e){}
  $$('#onn').onkeydown=e=>{e.stopPropagation();if(e.key=='Enter'){e.preventDefault();$$('#onn').blur()}};$$('#onn').onkeyup=e=>e.stopPropagation();   // escribir el nick no mueve a nadie
  b.onclick=()=>{setMode('menu');b.blur()};
  $$('#onx').onclick=()=>{leave('',true);const p=$$('#onp');if(p)p.hidden=true;$$('#onx').blur()};
  $$('#onst').onclick=()=>{start('2p');$$('#onst').blur()};
  $$('#cl').addEventListener('change',()=>{if(conn&&conn.open&&host)send({k:'hc',c:$$('#cl').value||'m',n:myNick()})});
  $$('#onh').onclick=()=>{create(0);$$('#onh').blur()};
  $$('#onj').onclick=()=>{join();$$('#onj').blur()};
  $$('#onc').onkeydown=e=>{e.stopPropagation();if(e.key=='Enter')join()};   // escribir el codigo no mueve a nadie
  $$('#onc').onkeyup=e=>e.stopPropagation();
  $$('#ol').onclick=()=>leave('');
  $$('#onr').onclick=()=>{if(!(conn&&conn.open&&!host))return;send({k:'ready',c:$$('#cr').value||'h',n:myNick()});$$('#onr').textContent='\u2713 Listo (esperando al anfitri\u00f3n)';say('Listo con '+NAMES[$$('#cr').value||'h']+'. Esperando a que el anfitri\u00f3n empiece\u2026')};
  $$('#cr').addEventListener('change',()=>{if(conn&&conn.open&&!host){send({k:'unready'});showReady(true);say('Pulsa \u00abEstoy listo\u00bb para confirmar tu personaje.')}});   // si cambia de luchador, debe confirmar otra vez
 }
 ui();
 return O;
})();
