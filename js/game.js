/* ==========================================================================
   game.js - LOGICA, DIBUJO Y BUCLE PRINCIPAL DEL JUEGO
   Los ajustes de balance estan en js/config.js y el sonido en js/audio.js.
   Estados: menu, intro (3-2-1), play, paused, ko, nuke, victory.
   Mapa de funciones: ver LEEME.txt, seccion "Estructura del codigo".
   ========================================================================== */

const W=480,H=270,{cx:CX,cy:CY,rx:RX,ry:RY}=CONFIG.ARENA;
const $=s=>document.querySelector(s),cv=$('#c'),g=cv.getContext('2d');
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.random()*a.length|0];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const NAMES={m:'Marine',h:'Hidralisco',d:'Dark Templar'},NAMES_SP={m:'Granada',h:'Ácido',d:'Salto sombrío'};
const HFX=CONFIG.HFX,DT=CONFIG.DT,cloaked=f=>DT.cloak&&f.type=='d'&&!(f.rev>0);   // un DT camuflado que no ha atacado hace poco
const GRR=k=>k=='g'?CONFIG.GRENADE_RADIUS:k=='b'?DT.blinkRadius:CONFIG.ACID_RADIUS;
const bg=mkBg();
if(CONFIG.BG_IMAGE){const im=new Image();im.onload=()=>{const c=bg.getContext('2d');c.setTransform(1,0,0,1,0,0);c.drawImage(im,0,0,bg.width,bg.height)};im.src=CONFIG.BG_IMAGE}
let mode='1m',state='menu',F,B,I,L,P,spawnT,time=0,shake=0,lives=[CONFIG.LIVES,CONFIG.LIVES],roundT=CONFIG.ROUND_TIME,nk=null,introT=0,fightT=0,roundN=1,koT=0,pile=[],winner=null,popups=[],GR=[],AC=[],RG=[],SPL=[],diff='normal',SCORE={m:0,h:0,d:0},CH=['m','h'],winSide=-1,cam={on:false,t:0,x:0,y:0},TOUCH={dx:0,dy:0,fire:false,sp:false},padPrev=false;
var tcEl=null;
const keys={};
const kc=e=>e.code||(e.key&&e.key.length==1?(e.key==' '?'Space':/[a-z]/i.test(e.key)?'Key'+e.key.toUpperCase():''):'');   // respaldo: algunos teclados/IME mandan e.code vacio
const clearKeys=()=>{for(const k in keys)keys[k]=0;if(typeof TOUCH!='undefined'){TOUCH.dx=TOUCH.dy=0;TOUCH.fire=TOUCH.sp=false}};   // al perder el foco no se queda ninguna tecla 'pulsada'
addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys()});
addEventListener('keydown',e=>{
 const kcd=kc(e);keys[kcd]=1;if(/Arrow|Space/.test(kcd)&&!/SELECT|INPUT/.test((e.target&&e.target.tagName)||''))e.preventDefault();
 if(e.code=='Enter'&&(state=='play'||state=='intro'||state=='paused')){e.preventDefault();if(!e.repeat)togglePause()}
});
addEventListener('keyup',e=>{keys[e.code]=0;keys[kc(e)]=0});

function mkBg(){
 const b=document.createElement('canvas');b.width=W*2;b.height=H*2;const c=b.getContext('2d');c.scale(2,2);
 c.fillStyle='#160a0b';c.fillRect(0,0,W,H);
 for(let i=0;i<700;i++){c.fillStyle=pick(['#20100f','#2a1511','#1b0d0e']);c.fillRect(rnd(0,W)|0,rnd(0,H)|0,3,1)}
 [[0,0],[W,0],[0,H],[W,H]].forEach(([x,y])=>{const r=c.createRadialGradient(x,y,0,x,y,120);r.addColorStop(0,'rgba(255,100,20,.55)');r.addColorStop(1,'rgba(255,100,20,0)');c.fillStyle=r;c.fillRect(0,0,W,H)});
 for(let i=4;i>=1;i--){c.fillStyle=i%2?'#54463f':'#6a5a50';c.beginPath();c.ellipse(CX,CY+i*2,RX+11*i,RY+7*i,0,0,7);c.fill();c.strokeStyle='#2a1f1b';c.stroke()}
 c.strokeStyle='#2a1f1b';
 for(let i=0;i<28;i++){const a=i/28*6.283;c.beginPath();c.moveTo(CX+Math.cos(a)*(RX+8),CY+Math.sin(a)*(RY+5));c.lineTo(CX+Math.cos(a)*(RX+43),CY+Math.sin(a)*(RY+27)+8);c.stroke()}
 for(let i=0;i<300;i++){const t=rnd(1,4),a=rnd(0,6.283);c.fillStyle=pick(['#7dd0ff','#c8864a','#9a4fd0','#d9d9d9','#e04a3a']);c.fillRect(CX+Math.cos(a)*(RX+11*t-5)|0,CY+t*2+Math.sin(a)*(RY+7*t-3)|0,2,2)}
 for(let i=0;i<8;i++){const a=i/8*6.283+.4,x=CX+Math.cos(a)*(RX+24),y=CY+4+Math.sin(a)*(RY+15);const r=c.createRadialGradient(x,y-10,0,x,y-10,16);r.addColorStop(0,'rgba(255,170,60,.8)');r.addColorStop(1,'rgba(255,120,20,0)');c.fillStyle=r;c.fillRect(x-16,y-26,32,32);c.fillStyle='#3a2a22';c.fillRect(x-1,y-8,3,8);c.fillStyle='#ffb43a';c.fillRect(x-1,y-11,3,3)}
 c.fillStyle='#0f0708';c.beginPath();c.ellipse(CX,CY+5,RX,RY,0,0,7);c.fill();
 c.save();c.beginPath();c.ellipse(CX,CY,RX,RY,0,0,7);c.clip();
 c.fillStyle='#3a2e2c';c.fillRect(0,0,W,H);
 for(let i=0;i<900;i++){c.fillStyle=pick(['#33282a','#43352f','#2c2224']);c.fillRect(rnd(0,W)|0,rnd(0,H)|0,3,1)}
 for(let x=CX-RX;x<CX-12;x+=16)for(let y=CY-RY;y<CY+RY;y+=16){c.fillStyle=((x+y)/16&1)?'#3d4654':'#353d4a';c.fillRect(x,y,15,15);c.fillStyle='#566175';c.fillRect(x,y,15,1)}
 for(let i=0;i<70;i++){c.fillStyle=pick(['#4b2a55','#5b3366','#3d2146']);c.beginPath();c.arc(rnd(CX+8,CX+RX+20),rnd(CY-RY,CY+RY),rnd(6,16),0,7);c.fill()}
 c.strokeStyle='#7a4a86';
 for(let i=0;i<22;i++){let x=CX+RX,y=rnd(CY-50,CY+50);c.beginPath();c.moveTo(x,y);for(let j=0;j<8;j++){x-=rnd(6,14);y+=rnd(-8,8);c.lineTo(x,y)}c.stroke()}
 c.strokeStyle='#8a7766';c.beginPath();c.ellipse(CX,CY,28,14,0,0,7);c.stroke();
 c.restore();
 c.strokeStyle='#8a7766';c.lineWidth=2;c.beginPath();c.ellipse(CX,CY,RX,RY,0,0,7);c.stroke();
 return b;
}

function mk(type,x,y,hp){return{type,x,y,hp,max:hp,sh:0,stim:0,cd:0,cdm:.16,spT:0,flash:0,face:0,step:0,trail:[],seed:rnd(0,6),r:type=='m'?6:type=='d'?7:8,mv:0,side:0,rev:0,ghost:0,atkT:null,hitDone:false,dT:null,mf:0,mfa:0,hf:0,hfa:0,multi:0,aimT:0,shT:0}}
function reset(){lives=[CONFIG.LIVES,CONFIG.LIVES];roundN=1;newRound()}
function newRound(q){
 F=[mk(CH[0],CX-95,CY+4,CONFIG.HP[CH[0]]),mk(CH[1],CX+95,CY+4,CONFIG.HP[CH[1]])];F[0].side=0;F[1].side=1;F.forEach(f=>f.dtc=(CH[0]=='d'&&CH[1]=='d'&&f.side==1)?'red':'orig');
 F[0].ai=mode=='1h';F[1].ai=mode=='1m';
 F[0].face=0;F[1].face=Math.PI;
 B=[];I=[];L=[];P=[];popups=[];GR=[];AC=[];RG=[];SPL=[];BX=[];GSTOP=0;GFLASH=0;cam.on=false;AUDIO.duck('ko',false);spawnT=1.5;shake=0;introT=CONFIG.COUNTDOWN;fightT=0;koT=0;roundT=CONFIG.ROUND_TIME;nk=null;AUDIO.duck('nuclear',false);state='intro';if(!q)AUDIO.play('round_start');
 $('#nm').textContent=NAMES[CH[0]]+(F[0].ai?' (IA)':'');$('#nh').textContent=NAMES[CH[1]]+(F[1].ai?' (IA)':'');setPortraits();
 hud();
}
const inArena=(x,y,m)=>{const a=(x-CX)/(RX-m),b=(y-CY)/(RY-m);return a*a+b*b<=1};
function part(x,y,vx,vy,life,c,s=2){P.push({x,y,vx,vy,life,max:life,c,s})}
function burst(x,y,n,cols,sp){for(let i=0;i<n;i++){const a=rnd(0,6.283),v=rnd(10,sp);part(x,y,Math.cos(a)*v,Math.sin(a)*v*.7-10,rnd(.3,.8),pick(cols),rnd(1,3)|0||1)}}

function move(f,dx,dy,dt){
 const l=Math.hypot(dx,dy);if(!l)return;
 const sp=CONFIG.SPEED[f.type]*(f.stim>0?1.5:1)*(f.atkT!=null?.45:1);
 const nx=f.x+dx/l*sp*dt,ny=f.y+dy/l*sp*dt;
 if(inArena(nx,ny,f.r)){f.x=nx;f.y=ny}
 else{   // choca con el borde curvo: lo desliza a lo largo de la elipse (antes probaba solo ejes X/Y y se trababa arriba, abajo y en los costados)
  const rx=RX-f.r,ry=RY-f.r;let mx=nx-f.x,my=ny-f.y;
  const gx=(f.x-CX)/(rx*rx),gy=(f.y-CY)/(ry*ry),gl=Math.hypot(gx,gy)||1,dn=(mx*gx+my*gy)/gl;   // normal de la pared en este punto
  if(dn>0){mx-=dn*gx/gl;my-=dn*gy/gl}   // quita solo la parte del movimiento que empuja contra la pared; el resto desliza por la tangente
  let qx=f.x+mx,qy=f.y+my;const u=(qx-CX)/rx,v=(qy-CY)/ry,h=Math.hypot(u,v);
  if(h>1){qx=CX+u/h*.9999*rx;qy=CY+v/h*.9999*ry}   // la pared es curva: corrige la pequena salida de la tangente
  f.x=qx;f.y=qy;
 }
 f.step+=dt*sp*.12;f.mv=.12;f.mdx=dx/l;f.mdy=dy/l;
 const t=f.trail[0];if(!t||Math.hypot(t.x-f.x,t.y-f.y)>2.5){f.trail.unshift({x:f.x,y:f.y});if(f.trail.length>10)f.trail.pop()}
}
function fire(f,o){
 if(f.cd>0)return;
 if(f.type=='d'){meleeStart(f,o);return}
 const mar=f.type=='m',a=Math.atan2(o.y-f.y,o.x-f.x)+(f.ai?rnd(-D().aim,D().aim):0)+(cloaked(o)?rnd(-DT.aim,DT.aim):0),v=mar?260:190;
 f.cdm=CONFIG.COOLDOWN[f.type]/(f.stim>0?1.7:1);f.cd=f.cdm;AUDIO.play(mar?'shoot_marine':'shoot_hydralisk');
 B.push({x:f.x+Math.cos(a)*8,y:f.y+Math.sin(a)*8,vx:Math.cos(a)*v,vy:Math.sin(a)*v,own:f,dmg:CONFIG.DAMAGE[f.type],mar,life:1.4});
 if(mar){f.aimT=MART.aim;f.shT=MART.shootT}   // al disparar se gira hacia el rival y muestra la pose de disparo
 else{f.aimT=HART.aim;f.shT=HART.attackT}        // el Hidralisco tambien: se gira al rival y lanza la cabeza (ciclo de ataque)
 if(!mar&&HFX.on)acidSpit(f,a);
 if(f.multi>0){const M=CONFIG.MULTI;for(let i=1;i<=M.pairs;i++)for(const sg of[-1,1]){const a2=a+sg*M.spread*i;B.push({x:f.x+Math.cos(a2)*8,y:f.y+Math.sin(a2)*8,vx:Math.cos(a2)*v,vy:Math.sin(a2)*v,own:f,dmg:CONFIG.DAMAGE[f.type]*M.dmgMul,mar,life:1.4,sc:M.scale})}}   // multidisparo: proyectiles extra a los costados
 if(mar&&CONFIG.MFX.on){f.mf=CONFIG.MFX.flashT;f.mfa=a;if(CONFIG.MFX.casing){const e=a+1.9,q=P.length;part(f.x+Math.cos(a)*3,f.y-13,Math.cos(e)*rnd(22,45),Math.sin(e)*rnd(12,25)-rnd(25,45),.55,'#ffd24a',1);P[q].g=240}}
}
function hurt(f,d,quiet,col){
 let ab=0;
 if(f.sh>0){const a=Math.min(f.sh,d);f.sh-=a;d-=a;ab=a}
 f.hp-=d;f.flash=.08;f.fk=col=='#b8ff6a'||col=='#9dff4a';if(!quiet)AUDIO.play('hit');
 dmgPop(f,d+ab,d<=.01?'#6fd3ff':col||'#ffffff');
 react(f,d+ab);
}
const SETS={A:['KeyA','KeyD','KeyW','KeyS','KeyF'],B:['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftRight']};
const ks=a=>({dx:(keys[a[1]]?1:0)-(keys[a[0]]?1:0),dy:(keys[a[3]]?1:0)-(keys[a[2]]?1:0),fire:!!keys[a[4]]});
function mergeIn(r,s){r.dx+=s.dx;r.dy+=s.dy;r.fire=r.fire||s.fire;r.sp=r.sp||s.sp;return r}
function human(f){
 const K=CONFIG.KEYS,m=f.side==0,pads=getPads().map(padRead);let r;
 if(mode=='2p'){
  r=ks(SETS[m?'A':'B']);r.sp=!!keys[m?K.marine:K.hydra];
  const p=pads[m?0:1];if(p)mergeIn(r,p);
  if(m)mergeIn(r,TOUCH);                 // en 2 jugadores el tactil controla al Marine
 }else{
  const a=ks(SETS.A),b=ks(SETS.B);
  r={dx:a.dx+b.dx,dy:a.dy+b.dy,fire:a.fire||b.fire||!!keys.Space,sp:!!(keys[K.marine]||keys[K.hydra])};
  if(pads[0])mergeIn(r,pads[0]);
  mergeIn(r,TOUCH);
 }
 return r;
}
function ai(f,o){
 const dm=f.type=='d',d=dist(f,o),a=Math.atan2(o.y-f.y,o.x-f.x),pref=f.type=='h'?105:85,rch=f.r+o.r+DT.reach;
 const dir=dm?(d>rch-3?1:0):(d>pref+15?1:d<pref-25?-1:0),s=Math.sin(time*.9+f.seed)>0?1:-1,sw=dm?(d<110&&d>rch+10?.35:0):.8;
 let dx=Math.cos(a)*dir-Math.sin(a)*s*sw,dy=Math.sin(a)*dir+Math.cos(a)*s*sw;
 L.forEach(l=>{const q=dist(l,f);if(q<60){dx+=(f.x-l.x)/q*2.5;dy+=(f.y-l.y)/q*2.5}});
 let best=null,bd=130;I.forEach(it=>{if(it.z==0&&(it.t!='medkit'||f.hp<f.max*.85)&&(it.t!='multi'||f.type!='d')){const q=dist(it,f);if(q<bd){bd=q;best=it}}});
 if(best&&d>50){dx+=(best.x-f.x)/bd*1.5;dy+=(best.y-f.y)/bd*1.5}
 if(!inArena(f.x,f.y,24)){dx+=(CX-f.x)/RX*2;dy+=(CY-f.y)/RY*2}
 AC.forEach(p=>{if(p.own!==f){const q=Math.hypot(f.x-p.x,(f.y-p.y)/.6);if(q<p.R+12){dx+=(f.x-p.x)/(q||1)*D().dodge;dy+=(f.y-p.y)/(q||1)*D().dodge}}});
 GR.forEach(r=>{if(r.own!==f){const q=Math.hypot(f.x-r.x1,(f.y-r.y1)/.6),R=GRR(r.kind)+14;if(q<R){dx+=(f.x-r.x1)/(q||1)*D().dodge;dy+=(f.y-r.y1)/(q||1)*D().dodge}}});
 return{dx,dy,fire:dm?d<=rch+1.5:d<230,sp:(dm?d>70&&d<200:d>45&&d<240)&&Math.random()<D().spRate};
}
function boom(l,weak){   // weak = true: se le acabo el tiempo sin alcanzar a nadie -> explota con LING_FUSE_DMG del dano y radio LING_FUSE_RADIUS
 l.dead=true;shake=weak?.15:.3;AUDIO.play(weak?'ling_pop':'ling_boom');
 const R=weak?CONFIG.LING_FUSE_RADIUS:38,dmg=CONFIG.LING_DAMAGE*(weak?CONFIG.LING_FUSE_DMG:1);
 burst(l.x,l.y-4,weak?24:45,['#9dff4a','#ffb43a','#fff2a0','#6fcf2a'],weak?80:110);
 if(weak)RG.push({x:l.x,y:l.y,R,life:.35,max:.35,c:'157,255,74'});
 F.forEach(f=>{if(f.hp>0&&!f.ghost&&dist(f,l)<R){hurt(f,dmg);burst(f.x,f.y-6,10,['#e0503a','#ffb43a'],70)}});
}
function update(dt){
 time+=dt;
 F.forEach((f,i)=>{
  const o=F[1-i];f.cd-=dt;f.mf-=dt;f.hf-=dt;f.aimT-=dt;f.shT-=dt;f.flash-=dt;f.stim-=dt;f.multi-=dt;f.mv-=dt;f.rev-=dt;
  if(f.type=='d'&&DT.cloak){const cl=f.rev<=0&&!f.ghost;if(f._cl===undefined)f._cl=cl;else if(f._cl!==cl&&!f.ghost){f._cl=cl;AUDIO.play(cl?'dt_cloak':'dt_reveal')}}   // destello sonoro al ocultarse y al revelarse
  if(f.ghost)return;
  f.face=Math.atan2(o.y-f.y,o.x-f.x);
  const c=f.ai?ai(f,o):human(f);
  if(f.type=='d'&&!f.ai&&mode!='2p'&&o.hp>0&&!o.ghost)c.fire=true;   // 1 jugador: el DT corta solo cuando el rival esta a su alcance
  move(f,c.dx,c.dy,dt);stepSound(f);if(c.fire)fire(f,o);
  if(f.atkT!=null)swingStep(f,o,dt);
  if(f.spT<CONFIG.SPECIAL_COOLDOWN){f.spT+=dt;if(f.spT>=CONFIG.SPECIAL_COOLDOWN){f.spT=CONFIG.SPECIAL_COOLDOWN;AUDIO.play('special_ready');popups.push({x:f.x,y:f.y-30,txt:'¡Especial listo!',c:'#ffd98a',life:1.3})}}
  else if(c.sp)special(f,o);
  if(f.multi>0&&Math.random()<.25)part(f.x+rnd(-6,6),f.y-rnd(0,26),rnd(-6,6),-18,.45,f.type=='h'?'#9dff4a':'#ffd24a',1);
  if(f.stim>0&&Math.random()<.4)part(f.x+rnd(-5,5),f.y-rnd(0,26),0,-20,.4,'#ff5a4a');
 });
 GR=GR.filter(q=>{q.t+=dt;
  if(poolFx()&&q.kind=='a'&&Math.random()<dt*40){const u=q.t/q.T,k=P.length;part(q.x0+(q.x1-q.x0)*u,q.y0+(q.y1-q.y0)*u-(22*Math.sin(Math.PI*u)+10),rnd(-8,8),rnd(-4,10),rnd(.25,.5),pick(HFX.cols),1);P[k].g=200}   // goteo en vuelo
  if(q.t<q.T)return true;land(q);return false});
 AC.forEach(p=>{p.life-=dt;p.age=(p.age||0)+dt;p.tick-=dt;
  if(poolFx()){
   if(Math.random()<dt*16){const a=rnd(0,6.283),r=Math.sqrt(Math.random())*p.R*.9,k=P.length;part(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.6,rnd(-4,4),rnd(-26,-12),rnd(.4,.9),pick(HFX.cols),1);P[k].g=-10}   // chispas que suben
   if((p.sp=(p.sp||0)-dt)<=0){p.sp=rnd(.3,.7);const a=rnd(0,6.283),r=Math.sqrt(Math.random())*p.R*.8;SPL.push({kind:'hit',x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.6-2,t:0,T:.3,k:.45})}   // burbujas que revientan
   F.forEach(f=>{if(f!==p.own&&f.hp>0&&!f.ghost&&inEll(f,p.x,p.y,p.R)&&Math.random()<dt*10){const k=P.length;part(f.x+rnd(-4,4),f.y-rnd(0,12),rnd(-5,5),rnd(-30,-14),.45,pick(HFX.cols),1);P[k].g=-10}})   // chisporroteo sobre quien esta dentro
  }if(p.tick<=0){p.tick+=.5;F.forEach(f=>{if(f!==p.own&&f.hp>0&&!f.ghost&&inEll(f,p.x,p.y,p.R)){hurt(f,CONFIG.ACID_DPS*.5,true,'#9dff4a');burst(f.x,f.y-8,3,['#9dff4a','#d6ff6a'],40)}})}});
 AC=AC.filter(p=>p.life>0);
 spawnT-=dt;
 if(spawnT<=0){
  spawnT=rnd(2.2,4);
  if(I.filter(i=>i.z==0).length<3){const a=rnd(0,6.283),k=Math.sqrt(Math.random())*.85;
   I.push({t:pick(['shield','stim','ling','ling','stim','shield','ling','medkit','medkit','multi','multi']),x:CX+Math.cos(a)*RX*k,y:CY+Math.sin(a)*RY*k,z:130,life:10})}
 }
 I.forEach(it=>{
  if(it.z>0){it.z-=110*dt;if(it.z<=0){it.z=0;if(it.t=='ling'){AUDIO.play('ling_land');L.push({x:it.x,y:it.y,hp:12,t:0,dir:1,ax:0,ay:1,dead:false});it.gone=true;burst(it.x,it.y,14,['#4b2a55','#7a4a86','#9dff4a'],60)}}}
  else{
   it.life-=dt;if(it.life<=0)it.gone=true;
   F.forEach(f=>{if(!it.gone&&f.hp>0&&!f.ghost&&dist(f,it)<f.r+7&&(it.t!='medkit'||f.hp<f.max)){
    it.gone=true;
    if(it.t=='shield'){AUDIO.play('pickup_shield');f.sh=40;burst(f.x,f.y-8,16,['#4fc3ff','#c8f0ff'],70)}
    else if(it.t=='multi'&&f.type=='d'){popups.push({x:f.x,y:f.y-26,txt:'Anulado',c:'#b9aca4',life:1.2});burst(f.x,f.y-8,12,['#8a8a8a','#c9c9c9','#ffd24a'],55)}   // cuerpo a cuerpo: lo recoge y se pierde
    else if(it.t=='multi'){AUDIO.play('pickup_multi');f.multi=CONFIG.MULTI.time;popups.push({x:f.x,y:f.y-26,txt:'¡Multidisparo!',c:'#ffd24a',life:1.2});burst(f.x,f.y-8,18,['#ffd24a','#ffffff','#ff9a3a'],70)}
    else if(it.t=='medkit'){const h=Math.round(rnd(CONFIG.MEDKIT_HEAL-5,CONFIG.MEDKIT_HEAL+5)),gain=Math.min(h,f.max-f.hp);f.hp+=gain;AUDIO.play('pickup_medkit');popups.push({x:f.x,y:f.y-26,txt:'+'+Math.round(gain),c:'#7fe38a',life:1.2});burst(f.x,f.y-8,18,['#7fe38a','#ffffff','#c6ffd0'],70)}
    else{AUDIO.play('pickup_stim');{const vz=f.type=='m'?'marine_stim':f.type=='h'?'hydra_yes':f.type=='d'?'dt_yes2':0;if(vz)AUDIO.voice(vz)}f.stim=6;if(f.hp>10)f.hp-=10;burst(f.x,f.y-8,16,['#ff5a4a','#ffe27a'],70)}
   }});
  }
 });
 I=I.filter(i=>!i.gone);
 L.forEach(l=>{
  if(l.dead)return;
  l.t+=dt;
  {const rem=CONFIG.LING_FUSE-l.t;if(rem<2&&rem>0&&(l.nb==null||l.t>=l.nb)){AUDIO.play('ling_beep');l.nb=l.t+.08+rem*.17}}   // pitidos que se aceleran en los ultimos 2 s
  const alive=F.filter(f=>f.hp>0),tg=alive.sort((a,b)=>dist(a,l)-dist(b,l))[0];
  if(!tg)return;
  const a=Math.atan2(tg.y-l.y,tg.x-l.x);l.x+=Math.cos(a)*85*dt;l.y+=Math.sin(a)*85*dt;l.dir=Math.cos(a)>=0?1:-1;l.ax=Math.cos(a);l.ay=Math.sin(a);
  if(dist(tg,l)<tg.r+6)boom(l);else if(l.t>=CONFIG.LING_FUSE)boom(l,true);   // sin alcanzar a nadie: explosion debil
 });
 B=B.filter(b=>{
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(b.mar&&CONFIG.MFX.on&&Math.random()<.6)part(b.x,b.y-12,rnd(-8,8),rnd(-8,8)-5,rnd(.12,.25),pick(['#ffe27a','#ffb43a','#fff6c0']),1);
  if(!b.mar&&HFX.on&&Math.random()<.7){const q=P.length;part(b.x,b.y-HFX.z,rnd(-6,6),rnd(-4,4),rnd(.2,.4),pick(HFX.cols),1);P[q].g=220}   // goteo de acido
  if(b.life<=0||!inArena(b.x,b.y,-30)){if(b.mar&&CONFIG.MFX.on&&b.life>0)sparkHit(b.x,b.y-12,.5);else if(!b.mar&&HFX.on&&b.life>0)acidSplash(b.x,b.y-4,b.vx,b.vy,.6);return false}
  for(const f of F)if(f!==b.own&&f.hp>0&&!f.ghost&&Math.hypot(b.x-f.x,b.y-f.y)<f.r+2){if(cloaked(f)){if(b.ev)continue;b.ev=1;if(Math.random()<DT.evasion){evade(f);continue}}hurt(f,dtDmg(f,b.dmg),false,!b.mar&&HFX.on?'#b8ff6a':undefined);if(b.mar&&CONFIG.MFX.on)sparkHit(b.x,f.y-8,b.sc||1);else if(!b.mar&&HFX.on)acidSplash(b.x,f.y-8,b.vx,b.vy,b.sc||1);else burst(f.x,f.y-7,4,b.mar?['#ffe27a']:['#d6ff6a','#b8452a'],50);return false}
  for(const l of L)if(!l.dead&&Math.hypot(b.x-l.x,b.y-l.y)<6){l.hp-=b.dmg;if(b.mar&&CONFIG.MFX.on)sparkHit(b.x,b.y-8,.6);else if(!b.mar&&HFX.on)acidSplash(b.x,b.y-8,b.vx,b.vy,.7);if(l.hp<=0)boom(l);return false}
  return true;
 });
 L=L.filter(l=>!l.dead);
 const dead=F.filter(f=>f.hp<=0);
 if(dead.length){
  dead.forEach(f=>{burst(f.x,f.y-6,50,f.type=='m'?['#3b66ad','#6c9be0','#ffb43a']:f.type=='d'?['#b44aff','#7fd0ff','#ffffff']:['#7a5236','#b8452a','#d9a441'],120);lives[F.indexOf(f)]--;if(f.type=='d')f.dT=0});F.forEach(f=>f.ghost=0);
  state='ko';koT=KOT();shake=.35;AUDIO.play('ko');AUDIO.play('crowd_ko');startKoCam(dead);
 }else{const r0=Math.ceil(roundT);roundT-=dt;if(roundT>0&&roundT<10&&Math.ceil(roundT)!==r0)AUDIO.play('clock_warn');if(roundT<=0){roundT=0;startNuke()}}
}
function intro(dt){
 time+=dt;const n0=Math.ceil(introT);introT-=dt;if(introT>0&&Math.ceil(introT)!==n0)AUDIO.play('countdown');
 F.forEach((f,i)=>{const o=F[1-i];f.face=Math.atan2(o.y-f.y,o.x-f.x)});
 if(introT<=0){state='play';fightT=1.1;AUDIO.play('fight')}
}
function koStep(dt){
 time+=dt;koT-=dt;F.forEach(f=>{if(f.dT!=null)f.dT+=dt});if(cam.on){cam.t+=dt;if(cam.t>1.8){cam.on=false;AUDIO.duck('ko',false)}}
 if(koT<=0){if(lives.some(l=>l<=0))endGame();else{roundN++;newRound()}}
}
function endGame(){
 const a=lives[0]>0,b=lives[1]>0;
 winSide=a&&!b?0:b&&!a?1:-1;winner=winSide<0?null:F[winSide].type;
 if(winner){SCORE[winner]++;saveScore()}
 pile=[];
 [7,6,5,4,3,2].forEach((n,r)=>{for(let i=0;i<n;i++){
  const t=winner?F[1-winSide].type:F[i%2].type;
  pile.push({t,x:CX+(i-(n-1)/2)*(t=='h'?27:t=='d'?24:22)+rnd(-3,3),y:238-r*12+rnd(-2,2),rot:(Math.random()<.5?-1:1)*rnd(1.1,1.9),fl:Math.random()<.5});
 }});
 state='victory';time=0;P=[];AUDIO.play('victory');
 {const W=winner,Lc=winSide<0?null:F[1-winSide].type,VE=CONFIG.VOICE_END;   // el perdedor se queja y, tras la fanfarria, el ganador habla (frases en CONFIG.VOICE_END)
  setTimeout(()=>{if(state=='victory'&&Lc&&VE.lose[Lc])AUDIO.voice(VE.lose[Lc],true)},500);
  setTimeout(()=>{if(state=='victory'&&W&&VE.win[W])AUDIO.voice(VE.win[W],true)},2300)}
 $('#ov').classList.add('end');
 setTimeout(()=>{if(state=='victory')$('#ov').classList.remove('hide')},1600);
}
const EXP=EXPLOSION_SHEET;   // datos de la hoja de explosion (ver js/config.js)
const NUKE=new Image(),EXPS=new Image();NUKE.src=ASSETS.fx.missile;EXPS.src=ASSETS.fx.explosion;
const T_FALL=CONFIG.NUKE_FALL,T_HIT=CONFIG.NUKE_HIT;
function startNuke(){
 // objetivo: quien tenga MENOS VIDA (hp) en el momento exacto en que el reloj llega a 0; las vidas (corazones) no cuentan
 const pts=CONFIG.NUKE_TARGET=='points',a=pts?F[0].hp:F[0].hp/F[0].max,b=pts?F[1].hp:F[1].hp/F[1].max,eq=Math.abs(a-b)<1e-6;
 nk={t:0,tg:eq?[0,1]:a<b?[0]:[1],hit:false,flash:0,et:0,
     info:F.map((f,i)=>NAMES[f.type]+' '+(pts?Math.round(f.hp)+' HP':Math.round(f.hp/f.max*100)+' %'))};
 F.forEach(f=>f.ghost=0);state='nuke';AUDIO.duck('nuclear',true);AUDIO.play('nuke_warning');setTimeout(()=>{if(state=='nuke')AUDIO.play('crowd_nuke')},1400);   // el publico se asusta tras el aviso
}
function nukeStep(dt){
 time+=dt;nk.t+=dt;
 if(!nk.fall&&nk.t>=T_FALL){nk.fall=1;AUDIO.play('nuke_fall')}
 if(!nk.boom&&nk.t>=T_HIT-CONFIG.NUKE_SFX.lead){nk.boom=1;AUDIO.playFade('nuke_explosion',CONFIG.NUKE_SFX.fadeAt,CONFIG.NUKE_SFX.fadeDur)}
 if(!nk.hit&&nk.t>=T_FALL){
  const u=Math.min(1,(nk.t-T_FALL)/(T_HIT-T_FALL));
  nk.tg.forEach(i=>{const f=F[i],ty=-50+(f.y+50)*u*u,k=.6+.4*u;part(f.x+rnd(-3,3),ty-40*k,rnd(-8,8),rnd(-30,-10),.5,pick(['#ffb43a','#ff7a1a','#888']),3)});
 }
 if(!nk.hit&&nk.t>=T_HIT){
  nk.hit=true;nk.flash=1;shake=1;nk.et=0;
  nk.tg.forEach(i=>{const f=F[i];f.hp=0;burst(f.x,f.y-8,60,['#ffd98a','#ff7a1a','#ffffff'],200)});
 }
 if(nk.hit){
  nk.et+=dt;nk.flash=Math.max(0,nk.flash-dt*1.1);
  if(nk.et>=EXP.dur){nk.tg.forEach(i=>lives[i]--);nk=null;state='ko';koT=1.6}
 }
}
function drawNuke(){
 const t=nk.t;
 g.fillStyle='rgba(0,0,0,'+.5*Math.min(1,t/.8)+')';g.fillRect(0,0,W,H);
 if(!nk.hit)nk.tg.forEach(i=>{
  const f=F[i],u=Math.max(0,Math.min(1,(t-T_FALL)/(T_HIT-T_FALL)));
  if(t>.6){
   const r=16-6*Math.min(1,(t-.6)),pul=.6+.4*Math.sin(t*14),c='rgba(255,60,45,'+pul+')';
   g.strokeStyle=c;g.fillStyle=c;g.lineWidth=1.5;
   g.beginPath();g.ellipse(f.x,f.y,r,r/2,0,0,7);g.stroke();
   g.fillRect(f.x-1,f.y-1,3,3);
   g.beginPath();g.moveTo(f.x-r-5,f.y);g.lineTo(f.x-r+3,f.y);g.moveTo(f.x+r-3,f.y);g.lineTo(f.x+r+5,f.y);g.stroke();
  }
  if(t>=T_FALL){
   const k=.6+.4*u,ty=-50+(f.y+50)*u*u;
   g.fillStyle='rgba(0,0,0,'+(.2+.3*u)+')';g.beginPath();g.ellipse(f.x,f.y,4+8*u,2+4*u,0,0,7);g.fill();
   if(NUKE.naturalWidth){const w=NUKE.width/2*k,h=NUKE.height/2*k;g.drawImage(NUKE,f.x-w/2,ty-h,w,h)}
  }
 });
 if(nk.hit&&EXPS.naturalWidth){
  const fi=Math.min(EXP.n-1,(nk.et/EXP.dur*EXP.n)|0),sx=(fi%EXP.cols)*EXP.fw,sy=((fi/EXP.cols)|0)*EXP.fh,K=.85;
  g.globalCompositeOperation='lighter';
  nk.tg.forEach(i=>{const f=F[i];g.drawImage(EXPS,sx,sy,EXP.fw,EXP.fh,f.x-EXP.ax/2*K,f.y-EXP.ay/2*K,EXP.fw/2*K,EXP.fh/2*K)});
  g.globalCompositeOperation='source-over';
  g.fillStyle='rgba(255,246,220,'+nk.flash+')';g.fillRect(0,0,W,H);
 }
 if(t<1.5){g.globalAlpha=Math.min(1,(1.5-t)/.4);banner('¡Tiempo!',50,t,['#fff2a0','#ffb43a','#b8260c'],CY-20);g.globalAlpha=1}
 if(t>=.2&&!nk.hit){
  g.textAlign='center';
  g.font="700 15px Rajdhani,sans-serif";g.fillStyle=Math.sin(t*12)>0?'#ff5a4a':'#ffb0a0';g.fillText('Lanzamiento nuclear detectado',CX,30);
  g.font="600 12px Rajdhani,sans-serif";g.fillStyle='#e6d8d0';
  g.fillText(nk.tg.length>1?'Empate en vida: caen dos bombas':'Menos vida: '+NAMES[F[nk.tg[0]].type],CX,46);
  g.font="600 11px Rajdhani,sans-serif";g.fillStyle='#b9aca4';g.fillText(nk.info.join('   |   '),CX,60);
 }
}
/* ---- Ataques especiales: se recargan cada CONFIG.SPECIAL_COOLDOWN s ---- */
const inEll=(p,x,y,R)=>{const a=(p.x-x)/R,b=(p.y-y)/(R*.6);return a*a+b*b<=1};
function special(f,o){
 f.spT=0;
 const j=(f.ai?D().jit:0)+(cloaked(o)?DT.jit:0),tx=o.x+rnd(-j,j),ty=o.y+rnd(-j,j),d=Math.hypot(tx-f.x,ty-f.y);
 if(f.type=='m'){const q={kind:'g',own:f,x0:f.x,y0:f.y,x1:tx,y1:ty,t:0,T:Math.max(.5,Math.min(1.6,d/150))};GR.push(q);if(GFX.on)gThrowFx(f,q);AUDIO.play('grenade_throw')}
 else if(f.type=='d')blinkStart(f,tx,ty);
 else{GR.push({kind:'a',own:f,x0:f.x,y0:f.y,x1:tx,y1:ty,t:0,T:Math.max(.5,Math.min(1.4,d/170))});AUDIO.play('acid_spit');AUDIO.voice('hydra_yes')}
}
function land(q){
 if(q.kind=='g')grenadeBoom(q);
 else if(q.kind=='b')blinkLand(q);
 else{AUDIO.play('acid_land');AUDIO.play('acid_sizzle');AC.push({x:q.x1,y:q.y1,R:CONFIG.ACID_RADIUS,life:CONFIG.ACID_TIME,tick:.05,own:q.own,age:0,sd:rnd(0,6.283)});if(poolFx())acidLand(q.x1,q.y1);burst(q.x1,q.y1-2,16,['#9dff4a','#6fcf2a','#d6ff6a'],60);if(HFX.on)acidSplash(q.x1,q.y1-6,0,1,1.8);AUDIO.play('acid_land')}
}
function grenadeBoom(q){
 const x=q.x1,y=q.y1,R=CONFIG.GRENADE_RADIUS;
 AUDIO.play('grenade_boom');
 if(GFX.on)gBoomFx(x,y,R);
 else{shake=.25;burst(x,y-4,40,['#ffd98a','#ff7a1a','#fff2a0','#6a5a50'],120);
 RG.push({x,y,R,life:.45,max:.45,c:'255,170,60'})}
 F.forEach(f=>{if(f!==q.own&&f.hp>0&&!f.ghost&&inEll(f,x,y,R)){hurt(f,CONFIG.GRENADE_DAMAGE);burst(f.x,f.y-6,10,['#e0503a','#ffb43a'],70)}});
 L.forEach(l=>{if(!l.dead&&inEll(l,x,y,R))boom(l)});
}
function drawFloorFx(){
 gDrawFloor();
 SPL.forEach(q=>{if(q.kind!='stain')return;const a=(1-q.t/q.T)*.55;g.fillStyle='rgba(60,170,30,'+a+')';g.beginPath();g.ellipse(q.x,q.y,q.R,q.R*.5,0,0,7);g.fill();g.fillStyle='rgba(170,255,80,'+a*.5+')';g.beginPath();g.ellipse(q.x-q.R*.2,q.y-q.R*.1,q.R*.45,q.R*.2,0,0,7);g.fill()});
 AC.forEach(p=>{
  if(poolFx()){drawPool(p);return}
  const a=Math.min(1,p.life/.8)*(.8+.2*Math.sin(time*6));
  g.fillStyle='rgba(70,200,40,'+.5*a+')';g.beginPath();g.ellipse(p.x,p.y,p.R,p.R*.6,0,0,7);g.fill();
  g.strokeStyle='rgba(190,255,90,'+a+')';g.lineWidth=1.5;g.beginPath();g.ellipse(p.x,p.y,p.R,p.R*.6,0,0,7);g.stroke();
  for(let i=0;i<5;i++){const ph=(time*1.6+i*.37)%1,bx=p.x+Math.cos(i*2.4)*p.R*.6,by=p.y+Math.sin(i*2.4)*p.R*.35;
   g.fillStyle='rgba(220,255,140,'+(1-ph)*a+')';g.beginPath();g.arc(bx,by-ph*6,1+ph*2,0,7);g.fill()}
 });
 GR.forEach(q=>{
  if(q.kind=='a'&&poolFx()){   // marca de caida: anillo que se cierra + anillo interior que crece
   const u=q.t/q.T,R0=CONFIG.ACID_RADIUS;
   g.fillStyle='rgba(120,255,60,'+(.05+.12*u)+')';g.beginPath();g.ellipse(q.x1,q.y1,R0,R0*.6,0,0,7);g.fill();
   g.strokeStyle='rgba(170,255,80,.85)';g.lineWidth=1;g.setLineDash([3,3]);g.beginPath();g.ellipse(q.x1,q.y1,R0*(1.5-.5*u),R0*.6*(1.5-.5*u),0,0,7);g.stroke();g.setLineDash([]);
   g.strokeStyle='rgba(210,255,120,'+(.25+.4*u)+')';g.beginPath();g.ellipse(q.x1,q.y1,R0*u*.95,R0*.6*u*.95,0,0,7);g.stroke();return}
  if(q.kind=='g'&&GFX.on){gDrawMark(q);return}
  const R=GRR(q.kind);
  g.strokeStyle=q.kind=='g'?'rgba(255,160,50,.85)':q.kind=='b'?'rgba(190,120,255,.9)':'rgba(150,255,70,.85)';g.lineWidth=1;g.setLineDash([3,3]);
  g.beginPath();g.ellipse(q.x1,q.y1,R*(.85+.15*Math.sin(time*14)),R*.6*(.85+.15*Math.sin(time*14)),0,0,7);g.stroke();g.setLineDash([]);
 });
}
function drawProj(q){
 if(q.kind=='b'){drawBlink(q);return}
 if(q.kind=='a'&&poolFx()){drawAcidBall(q);return}
 if(q.kind=='g'&&GFX.on){gDrawGrenade(q);return}
 const u=q.t/q.T,gr=q.kind=='g';
 for(let k=3;k>=0;k--){
  const v=Math.max(0,u-k*.04),x=q.x0+(q.x1-q.x0)*v,y=q.y0+(q.y1-q.y0)*v,z=22*Math.sin(Math.PI*v)+10;
  if(k==0){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,y,3,1.5,0,0,7);g.fill()}
  g.globalAlpha=k==0?1:.28-k*.05;
  g.fillStyle=gr?(k==0?'#586b3a':'#ffb43a'):(k==0?'#9dff4a':'#6fcf2a');
  g.beginPath();g.arc(x,y-z,k==0?3:2.2,0,7);g.fill();
  if(k==0){g.fillStyle=gr?'#ffd98a':'#eaffb0';g.fillRect(x-1,y-z-2,2,2)}
 }
 g.globalAlpha=1;
}
function drawRing(r){
 const u=1-r.life/r.max,s=.3+.9*u;
 g.fillStyle='rgba('+r.c+','+.35*(1-u)+')';g.strokeStyle='rgba('+r.c+','+(1-u)+')';g.lineWidth=2;
 g.beginPath();g.ellipse(r.x,r.y,r.R*s,r.R*.6*s,0,0,7);g.fill();g.stroke();
}
/* ---- Voces: cada personaje se queja con golpes fuertes y cuando le queda poca vida ---- */
function react(f,amt){
 if(f.hp<=0||f.type=='d')return;const V=CONFIG.VOICE,who=f.type=='m'?'marine':'hydra';
 if(!f.lowSaid&&f.hp/f.max<=V.lowHp){f.lowSaid=true;AUDIO.voice(who+'_pissed',true)}
 else if(amt>=V.hitMin&&Math.random()<V.chance)AUDIO.voice(who+'_pissed');
}
/* ---- Cifras de dano flotantes ---- */
function dmgPop(f,amt,col){
 if(!CONFIG.DAMAGE_NUMBERS)return;
 let q=popups.find(p=>p.f===f&&p.dmg&&p.age<.35);        // junta golpes seguidos en una sola cifra
 if(q){q.amt+=amt;q.life=1}
 else{q={f,dmg:1,amt,x:f.x+rnd(-6,6),y:f.y-34,life:1,age:0};popups.push(q)}
 q.txt=''+Math.max(1,Math.round(q.amt));q.sz=q.amt>=20?15:q.amt>=8?12:10;q.c=q.amt>=20?'#ffcf5a':col;
}
/* ---- Camara del K.O.: zoom al ultimo golpe y camara lenta de las particulas ---- */
function startKoCam(dead){
 if(!CONFIG.KO_CAM)return;
 const x=dead.reduce((a,f)=>a+f.x,0)/dead.length,y=dead.reduce((a,f)=>a+f.y,0)/dead.length;
 cam={on:true,t:0,x,y:y-8};AUDIO.duck('ko',true);
}
function camZ(t){
 const e=v=>v*v*(3-2*v),zin=Math.min(1,t/.3),zout=Math.min(1,Math.max(0,(t-1.2)/.6));
 return 1+.7*e(zin)*(1-e(zout));
}
function pscale(){return state=='ko'&&cam.on?(cam.t<.08?0:cam.t<1?.3:1):1}
/* ---- Mando (Gamepad API) ---- */
function getPads(){
 try{return typeof navigator!='undefined'&&navigator.getGamepads?Array.from(navigator.getGamepads()).filter(p=>p&&p.connected):[]}catch(e){return[]}
}
function padRead(p){
 const b=i=>!!(p.buttons[i]&&p.buttons[i].pressed);
 let dx=p.axes[0]||0,dy=p.axes[1]||0;
 if(Math.hypot(dx,dy)<.3)dx=dy=0;
 dx+=(b(15)?1:0)-(b(14)?1:0);dy+=(b(13)?1:0)-(b(12)?1:0);
 return{dx,dy,fire:b(0)||b(5)||b(7),sp:b(1)||b(2)||b(3)||b(4)||b(6),start:b(9)};
}
function padPoll(){
 const pads=getPads();
 if(!pads.length){padPrev=false;return}
 const st=pads.some(p=>padRead(p).start);
 if(st&&!padPrev){
  if(state=='play'||state=='intro'||state=='paused')togglePause();
  else if((state=='menu'||state=='victory')&&!$('#ov').classList.contains('hide'))start(mode);
 }
 padPrev=st;
}
/* ---- Ambiente: llamas de los braseros y brasas que suben (CONFIG.AMBIENT / CONFIG.TORCHES) ---- */
const EM=[];let ambT=0;
function drawAmbient(){
 if(!CONFIG.AMBIENT)return;
 const t=performance.now()/1000,dt=Math.min(.05,t-ambT||0);ambT=t;
 g.globalCompositeOperation='lighter';
 CONFIG.TORCHES.forEach((p,i)=>{
  const fl=.78+.2*Math.sin(t*9+i*1.7)+.08*Math.sin(t*23+i*3),x=p[0],y=p[1];
  const gr=g.createRadialGradient(x,y,0,x,y,28*fl);gr.addColorStop(0,'rgba(255,170,60,'+CONFIG.TORCH_GLOW+')');gr.addColorStop(1,'rgba(255,90,10,0)');
  g.fillStyle=gr;g.fillRect(x-32,y-32,64,64);
  if(CONFIG.TORCH_FLAME>0){g.fillStyle='rgba(255,205,100,'+CONFIG.TORCH_FLAME*fl+')';g.beginPath();g.moveTo(x-3,y+2);
  g.quadraticCurveTo(x-3,y-5*fl,x+Math.sin(t*7+i)*1.6,y-11*fl);g.quadraticCurveTo(x+3,y-5*fl,x+3,y+2);g.fill()}
  if(Math.random()<dt*3&&EM.length<60)EM.push({x:x+rnd(-3,3),y:y-6,vx:rnd(-4,4),life:rnd(1,2.2),max:2.2});
 });
 for(let i=EM.length-1;i>=0;i--){
  const e=EM[i];e.life-=dt;e.y-=14*dt;e.x+=(e.vx+Math.sin(t*3+i)*6)*dt;
  if(e.life<=0){EM.splice(i,1);continue}
  g.fillStyle='rgba(255,'+((120+e.life*40)|0)+',40,'+Math.min(1,e.life/e.max*1.4)+')';g.fillRect(e.x|0,e.y|0,1,1);
 }
 g.globalCompositeOperation='source-over';
}
function updP(dt){gUpd(dt);P.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.g)p.vy+=p.g*dt;p.life-=dt});P=P.filter(p=>p.life>0);popups.forEach(q=>{q.y-=18*dt;q.life-=dt;q.age=(q.age||0)+dt});popups=popups.filter(q=>q.life>0);SPL.forEach(q=>q.t+=dt);SPL=SPL.filter(q=>q.t<q.T);RG.forEach(r=>r.life-=dt);RG=RG.filter(r=>r.life>0)}

const MULTI_IM=new Image();MULTI_IM.src=ASSETS.fx.multiIcon;
function drawItem(it){
 const x=it.x|0,y=it.y|0;
 if(it.z>0){
  const r=3+(1-it.z/130)*8;g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x,y,r,r/2,0,0,7);g.fill();
  g.strokeStyle=it.t=='ling'?'#9dff4a':'#fff';g.globalAlpha=.5+.4*Math.sin(time*20);g.beginPath();g.ellipse(x,y,12,6,0,0,7);g.stroke();g.globalAlpha=1;
 }else{
  g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(x,y,5,2.5,0,0,7);g.fill();
  if(it.life<3&&((time*8|0)&1))return;
 }
 const yy=y-it.z-(it.z>0?0:3+Math.sin(time*4)*1.5)|0;
 if(it.t=='shield'){g.fillStyle='#4fc3ff';g.beginPath();g.arc(x,yy-5,5,0,7);g.fill();g.strokeStyle='#c8f0ff';g.stroke();g.fillStyle='#e8fbff';g.fillRect(x-2,yy-8,2,2)}
 else if(it.t=='stim'){g.fillStyle='#c43a3a';g.fillRect(x-4,yy-8,8,8);g.fillStyle='#fff';g.fillRect(x-1,yy-7,2,6);g.fillRect(x-3,yy-5,6,2);g.fillStyle='#ffe27a';g.fillRect(x-4,yy-9,8,1)}
 else if(it.t=='multi'&&MULTI_IM.naturalWidth){const S=CONFIG.MULTI.iconSize,cy=yy-S/2-1;   // icono del multidisparo (emblema de tres proyectiles) con resplandor azul-dorado
  g.save();g.globalCompositeOperation='lighter';const hg=g.createRadialGradient(x,cy,0,x,cy,S*.8);hg.addColorStop(0,'rgba(90,160,255,'+(.28+.12*Math.sin(time*6))+')');hg.addColorStop(1,'rgba(255,210,90,0)');g.fillStyle=hg;g.fillRect(x-S,cy-S,2*S,2*S);g.restore();
  g.drawImage(MULTI_IM,x-S/2,cy-S/2,S,S)}
 else if(it.t=='multi'){g.fillStyle='#3a2a10';g.fillRect(x-5,yy-10,10,10);g.strokeStyle='#ffd24a';g.lineWidth=1;g.strokeRect(x-4.5,yy-9.5,9,9);g.fillStyle='#ffd24a';[[-3,-8],[0,-9],[3,-8]].forEach(([dx,dy])=>g.fillRect(x+dx-.5,yy+dy,1,4));g.fillRect(x-1,yy-3,2,2)}
 else if(it.t=='medkit'){g.fillStyle='#e9eef0';g.fillRect(x-5,yy-9,10,9);g.fillStyle='#c62f2f';g.fillRect(x-1,yy-8,2,7);g.fillRect(x-4,yy-5,8,2);g.fillStyle='#7fe38a';g.fillRect(x-5,yy-10,10,1)}
 else{g.fillStyle='#7a3d8f';g.beginPath();g.ellipse(x,yy-5,4,6,0,0,7);g.fill();g.fillStyle='#9dff4a';g.fillRect(x-1,yy-7,3,3)}
}
/* ---- Zergling explosivo: sprite de ACE_Spark (9 direcciones x 7 fotogramas, ver ART.LING en config.js) con un paquete de TNT en el lomo ---- */
const LING={im:null,hot:null},LA=CONFIG.LING_ART;
{const im=new Image();im.onload=()=>{LING.im=im;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,40,20,.55)';x.fillRect(0,0,c.width,c.height);LING.hot=c};im.src=ASSETS.ling}
function drawTNT(X,Y,hot,t){   // X,Y = base del paquete (px logicos); se dibuja a escala CONFIG.LING_ART.tntScale
 const K=LA.tntScale,x=0,y=0;g.save();g.translate(X,Y);g.scale(K,K);
 const sh=hot?'#ff9a7a':'#d23a22',dk=hot?'#e0583a':'#8f2412',hi=hot?'#ffd0c0':'#ff7a5a';
 for(let i=0;i<3;i++){const xx=x-6+i*4;g.fillStyle=dk;g.fillRect(xx,y-8,4,8);g.fillStyle=sh;g.fillRect(xx,y-8,3,8);g.fillStyle=hi;g.fillRect(xx,y-8,1,8);g.fillStyle='#3a1a14';g.fillRect(xx,y-8,4,1)}
 g.fillStyle='#e8d49a';g.fillRect(x-6,y-5,12,3);g.fillStyle='#5a3a1a';g.fillRect(x-6,y-5,12,1);g.fillRect(x-6,y-3,12,1);
 g.fillStyle='#2a1a10';g.font="900 3.5px Rajdhani,sans-serif";g.textAlign='center';g.fillText('TNT',x,y-3.5);
 const fx=x+Math.sin(t*20)*.6;g.strokeStyle='#6a4a2a';g.lineWidth=1;g.beginPath();g.moveTo(x,y-8);g.quadraticCurveTo(x-2,y-11,fx+2,y-12);g.stroke();
 g.fillStyle=((t*30|0)&1)?'#fff2a0':'#ffb43a';g.beginPath();g.arc(fx+2,y-12.5,1.4,0,7);g.fill();
 g.restore();
 if(Math.random()<.5)part(X+(fx+2)*K,Y-13*K,rnd(-14,14),rnd(-30,-12),rnd(.15,.35),pick(['#ffd98a','#ff7a1a','#ffffff']),1);
}
function drawFuseTimer(l,x,y){   // cuenta atras sobre el zergling: segundos que le quedan antes de explotar solo
 const rem=Math.max(0,CONFIG.LING_FUSE-l.t),low=rem<2,txt=low?rem.toFixed(1):''+Math.ceil(rem);
 g.save();g.font="700 "+(low?9:8)+"px Rajdhani,sans-serif";g.textAlign='center';g.lineWidth=2.5;g.lineJoin='round';
 g.strokeStyle='#120404';g.strokeText(txt,x,y);g.fillStyle=low?(((l.t*10|0)&1)?'#ff4a3a':'#ffd0c0'):'#ffe9a8';g.fillText(txt,x,y);g.restore();
}
function drawLing(l){
 const x=l.x|0,y=l.y|0,d=l.dir,w=Math.sin(l.t*25)>0?1:0,hot=CONFIG.LING_FUSE-l.t<2&&((l.t*10|0)&1);
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x,y,LING.im?7:6,LING.im?2.8:2.5,0,0,7);g.fill();
 if(LING.im){
  const mir=l.ax>0,c=Math.min(LA.dirs-1,Math.round(Math.atan2(Math.abs(l.ax),l.ay)/(Math.PI/(LA.dirs-1)))),r=((l.t*LA.fps)|0)%LA.walkN,bob=Math.abs(Math.sin(l.t*LA.fps*.9))*.8,k=LA.scale;
  g.save();g.translate(x,y-bob);if(mir)g.scale(-1,1);const sm=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;
  g.drawImage(hot?LING.hot:LING.im,c*LA.cell,r*LA.cell,LA.cell,LA.cell,-LA.ax*k,-LA.ay*k,LA.cell*k,LA.cell*k);g.imageSmoothingEnabled=sm;g.restore();
  if(CONFIG.LING_TNT)drawTNT(x,y-bob-LA.tntY,hot,l.t);
  if(CONFIG.LING_TIMER)drawFuseTimer(l,x,y-bob-LA.tntY-17);
  return;
 }
 g.fillStyle='#8a4a22';g.fillRect(x-1-d*4,y-3+w,2,3-w);g.fillRect(x+d*3,y-3+(1-w),2,3-(1-w));
 g.fillStyle='#b0642c';g.fillRect(x-5,y-7,10,4);
 g.fillStyle='#c97a3a';g.fillRect(x+d*4-(d<0?2:0),y-8,3,4);
 g.fillStyle='#e6d8b0';g.fillRect(x+d*6-(d<0?2:0),y-8,2,1);g.fillRect(x+d*6-(d<0?2:0),y-5,2,1);
 g.fillStyle=hot?'#ff4a3a':'#9dff4a';g.globalAlpha=.7+.3*Math.sin(time*14);
 g.beginPath();g.ellipse(x-d*2,y-9,4,3,0,0,7);g.fill();g.globalAlpha=1;
}
/* ---- Dark Templar: cuerpo a cuerpo, camuflaje y salto sombrio (config: CONFIG.DT y ATLAS_DT) ---- */
const AT=ATLAS_DT,DTI={orig:null,red:null},DTFL={c:null},GLOW={m:'#4fa8ff',h:'#ff5a3c'};
function dtDir(a){const v=Math.atan2(Math.cos(a),-Math.sin(a));return Math.round(((v+6.283185307)%6.283185307)/(Math.PI/8))%16}
function meleeStart(f,o){
 if(dist(f,o)>f.r+o.r+DT.reach+2)return;            // fuera de alcance: no golpea
 f.cd=CONFIG.COOLDOWN.d/(f.stim>0?1.7:1);f.cdm=f.cd;f.atkT=0;f.hitDone=false;f.rev=Math.max(f.rev,DT.reveal);AUDIO.play('dt_attack');
}
function swingStep(f,o,dt){
 f.atkT+=dt;
 if(!f.hitDone&&f.atkT>=AT.hitFrame/AT.attackFps){f.hitDone=true;meleeHit(f)}   // el golpe cae en el fotograma 4
 if(f.atkT>=AT.attackN/AT.attackFps)f.atkT=null;
}
function meleeHit(f){
 const R=DT.reach+4;
 F.forEach(t=>{if(t!==f&&t.hp>0&&!t.ghost&&dist(f,t)<=f.r+t.r+R){if(cloaked(t)&&Math.random()<DT.evasion){evade(t);return}hurt(t,dtDmg(t,CONFIG.DAMAGE.d));burst(t.x,t.y-10,12,['#e8f4ff','#8fc8ff','#c97bff'],80);shake=Math.max(shake,.12)}});
 L.forEach(l=>{if(!l.dead&&dist(f,l)<=f.r+6+R){l.hp=0;boom(l)}});   // la cuchilla detona los zerglings cercanos
}
/* Evasion (estilo Butterfly de Dota): un DT camuflado esquiva ataques normales (disparos y cuchilladas) con probabilidad DT.evasion; el area (granada, acido, zergling) no se esquiva */
function evade(f){AUDIO.play('dt_evade');popups.push({x:f.x+rnd(-4,4),y:f.y-34,txt:'¡Falla!',c:'#c9a8ff',sz:12,life:.9});burst(f.x,f.y-10,8,['#c97bff','#7a3dd0','#ffffff'],60)}
/* Critico: si el DT esta VISIBLE (acaba de atacar o saltar), los disparos y cuchilladas enemigas tienen CONFIG.DT.critChance de probabilidad de hacer dano = base x critMult + critBonus */
let lastCrowd=-9e3;
function crowdCrit(){const n=performance.now();if(n-lastCrowd>2500){lastCrowd=n;AUDIO.play('crowd_crit')}}   // el publico reacciona al critico (como mucho una vez cada 2,5 s)
function dtDmg(t,d){
 if(DT.cloak&&t.type=='d'&&t.rev>0&&Math.random()<DT.critChance){AUDIO.play('crit');crowdCrit();popups.push({x:t.x+rnd(-4,4),y:t.y-44,txt:'¡Crítico!',c:'#ff6a4a',sz:13,life:1});burst(t.x,t.y-12,10,['#ff6a4a','#ffd98a','#ffffff'],70);return d*DT.critMult+DT.critBonus}
 return d;
}
function blinkStart(f,tx,ty){
 const a=Math.atan2(ty-f.y,tx-f.x);let px=tx+Math.cos(a)*DT.behind,py=ty+Math.sin(a)*DT.behind;   // detras del rival
 if(!inArena(px,py,f.r)){px=tx-Math.cos(a)*DT.behind;py=ty-Math.sin(a)*DT.behind}
 for(let k=0;k<12&&!inArena(px,py,f.r);k++){px+=(CX-px)*.12;py+=(CY-py)*.12}
 GR.push({kind:'b',own:f,x0:f.x,y0:f.y,x1:px,y1:py,t:0,T:DT.blinkT});
 f.ghost=1;f.atkT=null;AUDIO.play('dt_blink');AUDIO.voice('dt_yes0');
 burst(f.x,f.y-10,26,['#c97bff','#7a3dd0','#ffffff'],90);RG.push({x:f.x,y:f.y,R:20,life:.35,max:.35,c:'190,120,255'});
}
function blinkLand(q){
 const f=q.own,x=q.x1,y=q.y1,R=DT.blinkRadius,o=F[1-F.indexOf(f)];
 f.x=x;f.y=y;f.ghost=0;f.rev=DT.reveal+.5;f.atkT=0;f.hitDone=true;f.cd=Math.max(f.cd,.25);f.trail=[];
 if(o)f.face=Math.atan2(o.y-y,o.x-x);
 AUDIO.play('dt_slash');shake=Math.max(shake,.2);
 burst(x,y-10,34,['#c97bff','#e8f4ff','#ffffff'],110);RG.push({x,y,R,life:.4,max:.4,c:'190,120,255'});
 F.forEach(t=>{if(t!==f&&t.hp>0&&!t.ghost&&inEll(t,x,y,R)){hurt(t,DT.blinkDamage);burst(t.x,t.y-8,14,['#e8f4ff','#c97bff'],80)}});
 L.forEach(l=>{if(!l.dead&&inEll(l,x,y,R))boom(l)});
}
function drawBlink(q){
 const u=q.t/q.T;g.save();
 g.globalAlpha=Math.max(0,.7*(1-u));g.fillStyle='#b070ff';g.beginPath();g.ellipse(q.x0,q.y0-8,6*(1-u)+1,12*(1-u)+2,0,0,7);g.fill();   // estela donde desaparece
 g.globalAlpha=.55*u;g.fillStyle='#e8d0ff';g.beginPath();g.ellipse(q.x1,q.y1-8,5*u,10*u,0,0,7);g.fill();                              // se forma donde reaparecera
 g.restore();
}
function drawDT(f){
 const im=DTI[f.dtc||'orig'];if(!im)return;
 const x=f.x|0,y=f.y|0,dead=f.hp<=0,dir=dtDir(f.face),sc=1;
 let idx,al=1;
 if(dead){const k=Math.floor(f.dT*AT.deathFps);if(k>=AT.deathN)return;idx=AT.death+k;al=1-Math.max(0,f.dT*AT.deathFps-5)*.5}
 else if(f.atkT!=null)idx=AT.attack+dir*AT.attackN+Math.min(AT.attackN-1,(f.atkT*AT.attackFps)|0);
 else if(f.mv>0)idx=dir*AT.walkN+((time*AT.walkFps)|0)%AT.walkN;
 else idx=AT.idle+dir;
 const sx=(idx%AT.cols)*AT.fw,sy=((idx/AT.cols)|0)*AT.fh,rv=Math.max(0,f.rev),hid=!dead&&DT.cloak&&!(rv>0);
 if(!dead&&DT.cloak)al=rv>0?DT.alpha+(1-DT.alpha)*Math.min(1,rv/.35):DT.alpha;
 g.fillStyle='rgba(0,0,0,'+(hid?.18:.4)+')';g.beginPath();g.ellipse(x,y,11,4,0,0,7);g.fill();
 const w=AT.fw*sc,h=AT.fh*sc,ox=x-AT.ax*sc+(hid?Math.sin(time*9+f.seed*5)*.7:0),oy=y-AT.ay*sc,sm=g.imageSmoothingEnabled;
 g.imageSmoothingEnabled=false;g.globalAlpha=al;
 if(hid){g.globalAlpha=al*.45;g.drawImage(im,sx,sy,AT.fw,AT.fh,ox+1.2,oy,w,h);g.globalAlpha=al}   // espejismo del camuflaje
 g.drawImage(im,sx,sy,AT.fw,AT.fh,ox,oy,w,h);
 if(f.flash>0&&!f.fk&&DTFL.c){g.globalAlpha=.9;g.drawImage(DTFL.c,sx,sy,AT.fw,AT.fh,ox,oy,w,h)}
 g.imageSmoothingEnabled=sm;g.globalAlpha=1;
 if(!dead&&f.sh>0){g.fillStyle='rgba(90,200,255,.15)';g.strokeStyle='rgba(120,220,255,.85)';g.beginPath();g.ellipse(x,y-15,15,21,0,0,7);g.fill();g.stroke()}
}
function setPortraits(){
 F.forEach((f,i)=>{const p=i?'#ph':'#pm',pt=$(p+' .pt'),im=$(p+' .pt img'),src=ASSETS.portraits[f.type];
  if(im.getAttribute('src')!==src){im.src=src;im.alt=NAMES[f.type]}
  pt.style.setProperty('--glow',f.type=='d'?(i?'#ff5aa0':'#c06bff'):CH[0]==CH[1]?(i?'#ff5a3c':'#4fa8ff'):GLOW[f.type])});
}
const SPR={};
/* ---- Marine animado por fotogramas (CONFIG.MARINE_ART y ATLAS_MARINE) ---- */
/* ---- Pasos: suenan en los fotogramas del ciclo de caminar donde el pie toca el suelo. n = fotogramas del ciclo, at = fotogramas con pisada (ajustalos a tu gusto) ---- */
const STEPS={m:{snd:'step_marine',at:[0,4]},h:{snd:'step_hydra',at:[0,3]},d:{snd:'step_dt',at:[0,5]}};
function stepSound(f){
 const S=STEPS[f.type];if(!S||f.mv<=0){f._sk=null;return}
 let k,n;
 if(f.type=='m'){n=ATLAS_MARINE.walkN;k=Math.floor(f.step/(.12*CONFIG.MARINE_ART.stride))}
 else if(f.type=='h'){n=ATLAS_HYDRA.walkN;k=Math.floor(f.step/(.12*CONFIG.HYDRA_ART.stride))}
 else{n=ATLAS_DT.walkN;k=Math.floor(time*ATLAS_DT.walkFps)}
 if(k===f._sk)return;f._sk=k;
 if(S.at.includes(((k%n)+n)%n))AUDIO.play(S.snd,f.type=='d'&&cloaked(f)?.5:1);   // el DT camuflado pisa mas bajo
}
const MA=ATLAS_MARINE,MART=CONFIG.MARINE_ART,MAR={im:null,fl:null,acid:null};
{const im=new Image();im.onload=()=>{MAR.im=im;
 const mk2=(fill)=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=fill;x.fillRect(0,0,c.width,c.height);return c};
 MAR.fl=mk2('#fff');MAR.acid=mk2('rgba(130,255,60,.5)')};   // copias para el destello de golpe (blanco) y de acido (verde)
 im.src=ASSETS.marineAtlas}
function drawMarineAnim(f,x,y){
 const mv=f.mv>0;let ax,ay;
 if(MART.faceMove&&mv&&!(f.aimT>0)){ax=f.mdx;ay=f.mdy}else{ax=Math.cos(f.face);ay=Math.sin(f.face)}   // caminando mira hacia donde va; quieto o disparando, al rival
 const col=Math.min(8,Math.round(Math.atan2(Math.abs(ax),-ay)/(Math.PI/8))),mir=ax<0;
 const row=f.shT>0?MA.shootRow:mv?MA.walkRow+((f.step/(.12*MART.stride))|0)%MA.walkN:MA.idleRow;   // el fotograma depende de la distancia recorrida: los pies no patinan
 const bob=mv?Math.abs(Math.sin(f.step*3))*MART.bob:0,k=MART.scale,C=MA.cell;
 const rx=CONFIG.MFX.on&&f.mf>0?-Math.cos(f.mfa)*CONFIG.MFX.recoil*f.mf/CONFIG.MFX.flashT:0;
 const src=f.flash>0?(f.fk&&MAR.acid?MAR.acid:MAR.fl||MAR.im):MAR.im,sm=g.imageSmoothingEnabled;
 g.save();g.translate(x+rx,y-bob);if(mir)g.scale(-1,1);g.imageSmoothingEnabled=false;
 g.drawImage(src,col*C,row*C,C,C,-MA.ax*k,-MA.ay*k+2,C*k,C*k);
 g.imageSmoothingEnabled=sm;g.restore();
}
/* ---- Hidralisco animado por fotogramas (CONFIG.HYDRA_ART y ATLAS_HYDRA): caminar en 9 direcciones y ciclo de ataque ---- */
const HA=ATLAS_HYDRA,HART=CONFIG.HYDRA_ART,HYR={im:null,fl:null,acid:null};
{const im=new Image();im.onload=()=>{HYR.im=im;
 const mk2=(fill)=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=fill;x.fillRect(0,0,c.width,c.height);return c};
 HYR.fl=mk2('#fff');HYR.acid=mk2('rgba(130,255,60,.5)')};   // copias para el destello de golpe (blanco) y de acido (verde)
 im.src=ASSETS.hydraAtlas}
function drawHydraAnim(f,x,y){
 const mv=f.mv>0;let ax,ay;
 if(HART.faceMove&&mv&&!(f.aimT>0)){ax=f.mdx;ay=f.mdy}else{ax=Math.cos(f.face);ay=Math.sin(f.face)}   // caminando mira hacia donde va; quieto o escupiendo, al rival
 const col=Math.min(8,Math.round(Math.atan2(Math.abs(ax),-ay)/(Math.PI/8))),mir=ax<0;
 let row;
 if(f.shT>0)row=HA.atkRow+Math.min(HA.atkN-1,((HART.attackT-f.shT)/HART.attackT*HA.atkN)|0);          // ciclo de ataque: la cabeza se lanza
 else row=HA.walkRow+(mv?((f.step/(.12*HART.stride))|0)%HA.walkN:0);                                  // el fotograma depende de la distancia recorrida: no patina
 const bob=mv&&!(f.shT>0)?Math.abs(Math.sin(f.step*3))*HART.bob:0,k=HART.scale;
 const rx=!(f.type=='m')&&HFX.on&&f.hf>0?-Math.cos(f.hfa)*HFX.recoil*f.hf/HFX.flashT:0;
 const src=f.flash>0?(f.fk&&HYR.acid?HYR.acid:HYR.fl||HYR.im):HYR.im,sm=g.imageSmoothingEnabled;
 g.save();g.translate(x+rx,y-bob);if(mir)g.scale(-1,1);g.imageSmoothingEnabled=false;
 g.drawImage(src,col*HA.w,row*HA.h,HA.w,HA.h,-HA.ax*k,-HA.ay*k+2,HA.w*k,HA.h*k);
 g.imageSmoothingEnabled=sm;g.restore();
}
function loadSpr(k,src,right){
 const im=new Image(),o={im,right,flash:null};SPR[k]=o;
 im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);o.flash=c;const d=document.createElement('canvas');d.width=im.width;d.height=im.height;const y=d.getContext('2d');y.drawImage(im,0,0);y.globalCompositeOperation='source-atop';y.fillStyle='rgba(35,0,0,.55)';y.fillRect(0,0,d.width,d.height);o.dead=d;const t=document.createElement('canvas');t.width=im.width;t.height=im.height;const z=t.getContext('2d');z.drawImage(im,0,0);z.globalCompositeOperation='source-atop';z.fillStyle='rgba(130,255,60,.5)';z.fillRect(0,0,t.width,t.height);o.acid=t};
 im.src=src;
}
loadSpr('m',ASSETS.sprites.m,true);
loadSpr('mf',ASSETS.sprites.mf,null);loadSpr('mb',ASSETS.sprites.mb,null);loadSpr('hf',ASSETS.sprites.hf,null);loadSpr('hb',ASSETS.sprites.hb,null);
loadSpr('h',ASSETS.sprites.h,false);
['orig','red'].forEach(k=>{const im=new Image();im.onload=()=>{DTI[k]=im;if(k=='orig')dtPrep(im)};im.src=ASSETS.dt[k]});
function dtPrep(im){   // copia blanca (golpe) y sprite de victoria/pila (reposo mirando al sur, ampliado x2)
 const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);DTFL.c=c;
 const b=AT.pose,v=document.createElement('canvas');v.width=b.w*2;v.height=b.h*2;const vx=v.getContext('2d');vx.imageSmoothingEnabled=false;vx.drawImage(im,b.x,b.y,b.w,b.h,0,0,v.width,v.height);
 const d=document.createElement('canvas');d.width=v.width;d.height=v.height;const dx=d.getContext('2d');dx.drawImage(v,0,0);dx.globalCompositeOperation='source-atop';dx.fillStyle='rgba(35,0,0,.55)';dx.fillRect(0,0,d.width,d.height);
 SPR.d={im:v,right:true,flash:null,dead:d};
}
function vw(f){
 const ax=Math.abs(f.mdx||0),ay=Math.abs(f.mdy||0);
 if(f.mv<=0)f.vw='';else if(ay>ax*1.3)f.vw=f.mdy>0?'f':'b';else if(ax>ay*.8)f.vw='';
 return f.vw||'';
}
function drawF(f){
 if(f.hp<=0){if(f.type=='d'&&f.dT!=null)drawDT(f);return}
 if(f.ghost)return;
 if(f.type=='d'){drawDT(f);return}
 const x=f.x|0,y=f.y|0,m=f.type=='m',s=SPR[f.type+vw(f)],d=Math.cos(f.face)>=0?1:-1;
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x,y,m?9:12,m?3.5:4,0,0,7);g.fill();
 if(CH[0]==CH[1]){g.strokeStyle=f.side?'rgba(255,90,60,.9)':'rgba(79,168,255,.9)';g.lineWidth=1.5;g.beginPath();g.ellipse(x,y,m?11:14,m?4.5:5.5,0,0,7);g.stroke();g.lineWidth=1}
 if(m&&MAR.im&&MART.on)drawMarineAnim(f,x,y);
 else if(f.type=='h'&&HYR.im&&HART.on)drawHydraAnim(f,x,y);
 else if(s.im.naturalWidth){
  const w=s.im.width/2,h=s.im.height/2,bob=f.mv>0?Math.abs(Math.sin(f.step*3)):0;
  const rx=m&&CONFIG.MFX.on&&f.mf>0?-Math.cos(f.mfa)*CONFIG.MFX.recoil*f.mf/CONFIG.MFX.flashT:(!m&&HFX.on&&f.hf>0?-Math.cos(f.hfa)*HFX.recoil*f.hf/HFX.flashT:0);   // retroceso
  g.save();g.translate(x+rx,y-bob);if(s.right!==null&&d>0!==s.right)g.scale(-1,1);
  g.drawImage(f.flash>0&&f.fk&&s.acid?s.acid:f.flash>0&&s.flash?s.flash:s.im,-w/2,-h+2,w,h);g.restore();
 }
 if(m&&CONFIG.MFX.on){if(f.mf>0)drawMuzzle(f)}
 else if(!m&&HFX.on){if(f.hf>0)drawSpit(f)}
 else if(f.cd>f.cdm-(m?.04:.08)){g.fillStyle=m?'#ffe27a':'#d6ff6a';g.fillRect(m?x+d*15-1:x+d*13-1,m?y-13:y-23,3,3)}
 if(f.sh>0){g.fillStyle='rgba(90,200,255,.15)';g.strokeStyle='rgba(120,220,255,.85)';g.beginPath();g.ellipse(x,y-14,m?14:17,m?19:21,0,0,7);g.fill();g.stroke()}
}
/* ---- Efectos del disparo del Marine (CONFIG.MFX en config.js): fogonazo, trazador, casquillo, chispas de impacto y retroceso ---- */
function sparkHit(x,y,k=1){
 burst(x,y,Math.round(CONFIG.MFX.sparks*k),['#ffe27a','#fff6c0','#ffffff','#ff9a3a'],95);
 RG.push({x,y:y+8,R:7*k+2,life:.16,max:.16,c:'255,226,122'});
}
function drawMuzzle(f){
 const M=CONFIG.MFX,u=Math.max(0,f.mf/M.flashT),a=f.mfa,mx=f.x+Math.cos(a)*11,my=f.y+Math.sin(a)*11-13,s=M.flashSize*(.6+.4*u);
 g.save();g.globalCompositeOperation='lighter';
 const gr=g.createRadialGradient(mx,my,0,mx,my,s);gr.addColorStop(0,'rgba(255,250,210,'+u+')');gr.addColorStop(.4,'rgba(255,190,60,'+.6*u+')');gr.addColorStop(1,'rgba(255,120,20,0)');
 g.fillStyle=gr;g.fillRect(mx-s,my-s,2*s,2*s);
 g.translate(mx,my);g.rotate(a);
 g.fillStyle='rgba(255,240,170,'+u+')';g.beginPath();g.moveTo(0,-1.6);g.lineTo(s*1.4,0);g.lineTo(0,1.6);g.closePath();g.fill();
 g.fillStyle='rgba(255,200,80,'+.8*u+')';g.beginPath();g.moveTo(1,0);g.lineTo(s*.7,-s*.55);g.lineTo(s*.25,0);g.lineTo(s*.7,s*.55);g.closePath();g.fill();
 g.restore();
}
/* ---- Escupida de acido del Hidralisco (CONFIG.HFX en config.js): salpicadura en la boca, globo de acido con estela y goteo,
   salpicadura animada al impactar (acido_impacto.png, de la hoja de ACE_Spark) y mancha en el suelo. Solo visual. ---- */
const HIT={im:new Image()};HIT.im.src=ASSETS.fx.acidHit;
/* ---- Charco del ataque especial (CONFIG.HFX.poolFx): aparicion con rebote, borde que ondula, degradado, burbujas,
   vapor, ondas, brillo pulsante y desvanecido final. Solo visual: el dano del charco no cambia. ---- */
const poolFx=()=>HFX.on&&HFX.poolFx;
function acidLand(x,y){
 const R=CONFIG.ACID_RADIUS;shake=Math.max(shake,.1);
 RG.push({x,y,R:R*1.3,life:.5,max:.5,c:'140,255,60'});RG.push({x,y,R:R*.75,life:.3,max:.3,c:'210,255,120'});
 SPL.push({kind:'glow',x,y,R:R*1.1,t:0,T:.4});
 for(let i=0;i<30;i++){const a=rnd(0,6.283),v=rnd(40,120),k=P.length;part(x,y-3,Math.cos(a)*v,Math.sin(a)*v*.5-rnd(40,90),rnd(.5,1),pick(HFX.cols),rnd(1,4)|0||1);P[k].g=260}
 for(let i=0;i<5;i++){const a=i*1.2566+rnd(-.3,.3),r=R*.6;SPL.push({kind:'hit',x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*.6-2,t:-rnd(0,.2),T:.38,k:.8})}
}
function poolPath(p,sc){
 const N=18,pts=[];
 for(let i=0;i<N;i++){const a=i/N*6.283,w=1+.09*Math.sin(a*3+time*2+p.sd)+.05*Math.sin(a*5-time*3+p.sd*2);pts.push([Math.cos(a)*p.R*sc*w,Math.sin(a)*p.R*sc*w])}
 g.beginPath();g.moveTo((pts[0][0]+pts[N-1][0])/2,(pts[0][1]+pts[N-1][1])/2);
 for(let i=0;i<N;i++){const a=pts[i],b=pts[(i+1)%N];g.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}
 g.closePath();
}
function drawPool(p){
 const age=p.age||0,gt=Math.min(1,age/.28),grow=(1-Math.pow(1-gt,3))*(1+.12*Math.sin(gt*Math.PI)),fade=Math.min(1,p.life/1.2),sc=grow*(.82+.18*fade),al=fade,pulse=.75+.25*Math.sin(time*7+p.sd);
 g.save();g.translate(p.x,p.y);g.scale(1,.6);
 poolPath(p,sc*1.07);g.fillStyle='rgba(18,55,10,'+.6*al+')';g.fill();   // mancha oscura exterior
 poolPath(p,sc);
 const gr=g.createRadialGradient(0,0,0,0,0,p.R*sc);gr.addColorStop(0,'rgba(35,115,18,'+.78*al+')');gr.addColorStop(.65,'rgba(80,205,38,'+.62*al+')');gr.addColorStop(1,'rgba(175,255,85,'+.7*al+')');
 g.fillStyle=gr;g.fill();
 g.save();g.globalCompositeOperation='lighter';
 const hg=g.createRadialGradient(0,0,0,0,0,p.R*sc*.8);hg.addColorStop(0,'rgba(170,255,70,'+.3*pulse*al+')');hg.addColorStop(1,'rgba(90,220,40,0)');g.fillStyle=hg;g.beginPath();g.arc(0,0,p.R*sc*.8,0,7);g.fill();   // brillo pulsante
 poolPath(p,sc);g.strokeStyle='rgba(150,255,60,'+.25*al+')';g.lineWidth=5;g.stroke();   // halo del borde
 const ru=(time*.8+p.sd)%1;g.strokeStyle='rgba(200,255,120,'+.28*(1-ru)*al+')';g.lineWidth=1.2;g.beginPath();g.arc(0,0,p.R*sc*ru,0,7);g.stroke();   // onda que sale del centro
 g.restore();
 poolPath(p,sc);g.strokeStyle='rgba(205,255,110,'+al*(.65+.35*pulse)+')';g.lineWidth=1.5;g.stroke();   // borde brillante
 g.restore();
 for(let i=0;i<8;i++){   // burbujas que suben y revientan
  const ph=(time*.9+i*.43+p.sd)%1,an=i*2.4+p.sd,rr=(.2+.65*((i*.37)%1))*p.R*sc,bx=p.x+Math.cos(an)*rr,by=p.y+Math.sin(an)*rr*.6-ph*3,r=1+ph*2.2;
  if(ph<.86){g.strokeStyle='rgba(225,255,160,'+(.9-ph*.4)*al+')';g.lineWidth=.8;g.beginPath();g.arc(bx,by,r,0,7);g.stroke();g.fillStyle='rgba(255,255,255,'+.5*al+')';g.fillRect(bx-r*.4,by-r*.5,1,1)}
  else{const k=(ph-.86)/.14;g.strokeStyle='rgba(225,255,160,'+(1-k)*al+')';g.lineWidth=.8;for(let j=0;j<4;j++){const aa=j*1.57+.4;g.beginPath();g.moveTo(bx+Math.cos(aa)*r,by+Math.sin(aa)*r);g.lineTo(bx+Math.cos(aa)*(r+2+k*3),by+Math.sin(aa)*(r+2+k*3));g.stroke()}}
 }
 g.save();g.globalCompositeOperation='lighter';   // vapor toxico
 for(let i=0;i<6;i++){const ph=(time*.5+i*.29+p.sd)%1,an=i*1.9+p.sd,rr=(.15+.6*((i*.53)%1))*p.R*sc,vx=p.x+Math.cos(an)*rr+Math.sin(time*2+i)*2,vy=p.y+Math.sin(an)*rr*.6-ph*18,r=2+ph*6;
  const vg=g.createRadialGradient(vx,vy,0,vx,vy,r);vg.addColorStop(0,'rgba(150,255,80,'+.2*(1-ph)*al+')');vg.addColorStop(1,'rgba(90,220,40,0)');g.fillStyle=vg;g.fillRect(vx-r,vy-r,2*r,2*r)}
 g.restore();g.lineWidth=1;
}
function drawAcidBall(q){
 const u=q.t/q.T,z=v=>22*Math.sin(Math.PI*v)+10,x=q.x0+(q.x1-q.x0)*u,y=q.y0+(q.y1-q.y0)*u,hy=y-z(u),w=1+.15*Math.sin(q.t*40);
 const ang=Math.atan2((q.y1-q.y0)-22*Math.PI*Math.cos(Math.PI*u),q.x1-q.x0);
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(x,y,4*(1-.3*Math.sin(Math.PI*u)),1.8,0,0,7);g.fill();
 g.save();g.globalCompositeOperation='lighter';
 for(let k=6;k>=1;k--){const v=Math.max(0,u-k*.035),tx=q.x0+(q.x1-q.x0)*v,ty=q.y0+(q.y1-q.y0)*v-z(v);g.fillStyle='rgba(120,235,50,'+(.32-k*.04)+')';g.beginPath();g.arc(tx,ty,4.2-k*.45,0,7);g.fill()}   // estela
 const hg=g.createRadialGradient(x,hy,0,x,hy,11);hg.addColorStop(0,'rgba(175,255,70,.6)');hg.addColorStop(1,'rgba(60,200,30,0)');g.fillStyle=hg;g.fillRect(x-11,hy-11,22,22);
 g.restore();
 g.save();g.translate(x,hy);g.rotate(ang);
 g.fillStyle='#2c7d1a';g.beginPath();g.ellipse(0,0,6*w,3.8/w,0,0,7);g.fill();
 g.fillStyle='#7be03a';g.beginPath();g.ellipse(.5,-.1,4.6*w,2.8/w,0,0,7);g.fill();
 g.fillStyle='#e2ff9a';g.beginPath();g.ellipse(1.6,-1,2,1.1,0,0,7);g.fill();
 g.restore();
 for(let i=0;i<3;i++){const a=q.t*14+i*2.09;g.fillStyle=i?'#b8ff6a':'#e2ff9a';g.beginPath();g.arc(x+Math.cos(a)*7,hy+Math.sin(a)*4.5,1.3,0,7);g.fill()}   // gotas en orbita
}
function acidSpit(f,a){
 const H=HFX,d=Math.cos(a)>=0?1:-1,mx=f.x+d*13,my=f.y-H.z;f.hf=H.flashT;f.hfa=a;
 for(let i=0;i<H.drops;i++){const s=a+rnd(-.55,.55),v=rnd(30,85),q=P.length;part(mx,my,Math.cos(s)*v,Math.sin(s)*v*.7-rnd(5,25),rnd(.2,.5),pick(H.cols),rnd(1,3)|0||1);P[q].g=160}
}
function acidSplash(x,y,vx,vy,k=1){
 const H=HFX,sp=Math.hypot(vx,vy)||1,back=Math.atan2(-vy/sp,-vx/sp),n=Math.round(H.splashDrops*k);
 for(let i=0;i<n;i++){const a=back+rnd(-1.5,1.5),v=rnd(20,90)*k,q=P.length;part(x,y,Math.cos(a)*v,Math.sin(a)*v*.7-rnd(15,45),rnd(.3,.7),pick(H.cols),rnd(1,3)|0||1);P[q].g=190}
 SPL.push({kind:'hit',x,y,t:0,T:H.splashT,k});
 RG.push({x,y:y+8,R:8*k+3,life:.2,max:.2,c:'157,255,74'});
 if(H.stainT>0)SPL.push({kind:'stain',x:x+rnd(-2,2),y:y+8,t:0,T:H.stainT,R:rnd(3,5.5)*k});
}
function drawSplash(q){
 if(q.t<0)return;
 if(q.kind=='glow'){const u=q.t/q.T,r=q.R*(.5+.7*u);g.save();g.translate(q.x,q.y);g.scale(1,.6);g.globalCompositeOperation='lighter';
  const gr=g.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,'rgba(210,255,130,'+.75*(1-u)+')');gr.addColorStop(.5,'rgba(110,225,50,'+.4*(1-u)+')');gr.addColorStop(1,'rgba(60,200,30,0)');
  g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore();return}
 if(q.kind!='hit')return;const im=HIT.im,n=HFX.hitN;if(!im.naturalWidth)return;
 const u=q.t/q.T,fr=Math.min(n-1,(u*n)|0),fw=im.width/n,sc=HFX.splashScale*q.k;
 g.save();g.imageSmoothingEnabled=false;g.globalAlpha=1-u*u*u*.6;
 g.drawImage(im,fr*fw,0,fw,im.height,q.x-fw*sc/2,q.y-im.height*sc/2,fw*sc,im.height*sc);g.restore();
}
function drawSpit(f){
 const H=HFX,u=Math.max(0,f.hf/H.flashT),a=f.hfa,d=Math.cos(a)>=0?1:-1,mx=f.x+d*13,my=f.y-H.z,s=H.flashSize*(.5+.5*u);
 g.save();g.globalCompositeOperation='lighter';
 const gr=g.createRadialGradient(mx,my,0,mx,my,s);gr.addColorStop(0,'rgba(215,255,130,'+u+')');gr.addColorStop(.45,'rgba(110,225,50,'+.6*u+')');gr.addColorStop(1,'rgba(60,180,30,0)');
 g.fillStyle=gr;g.fillRect(mx-s,my-s,2*s,2*s);
 g.translate(mx,my);g.rotate(a);g.fillStyle='rgba(175,255,75,'+.85*u+')';
 g.beginPath();g.moveTo(0,-1.5);g.quadraticCurveTo(s*.9,-s*.55,s*1.5,0);g.quadraticCurveTo(s*.9,s*.55,0,1.5);g.closePath();g.fill();
 g.restore();
}
function drawAcid(b){
 const H=HFX,sp=Math.hypot(b.vx,b.vy)||1,ux=b.vx/sp,uy=b.vy/sp,age=1.4-b.life,hx=b.x,hy=b.y-H.z+Math.sin(age*34)*.5,ang=Math.atan2(b.vy,b.vx),w=1+.14*Math.sin(age*46);
 g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(b.x,b.y,2.8,1.2,0,0,7);g.fill();
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
 const tx=hx-ux*H.trailLen,ty=hy-uy*H.trailLen,tr=g.createLinearGradient(hx,hy,tx,ty);tr.addColorStop(0,'rgba(190,255,90,.75)');tr.addColorStop(1,'rgba(60,200,30,0)');
 g.strokeStyle=tr;g.lineWidth=3.2;g.beginPath();g.moveTo(hx,hy);g.lineTo(tx,ty);g.stroke();
 const hg=g.createRadialGradient(hx,hy,0,hx,hy,7);hg.addColorStop(0,'rgba(170,255,70,.55)');hg.addColorStop(1,'rgba(60,200,30,0)');g.fillStyle=hg;g.fillRect(hx-7,hy-7,14,14);
 g.restore();
 g.save();g.translate(hx,hy);g.rotate(ang);
 g.fillStyle='#2c7d1a';g.beginPath();g.ellipse(0,0,4.4*w,2.7/w,0,0,7);g.fill();
 g.fillStyle='#7be03a';g.beginPath();g.ellipse(.4,-.1,3.3*w,1.9/w,0,0,7);g.fill();
 g.fillStyle='#e2ff9a';g.beginPath();g.ellipse(1.3,-.8,1.4,.8,0,0,7);g.fill();
 g.restore();g.lineWidth=1;
}
function drawB(b){   // los proyectiles extra del multidisparo (b.sc) se dibujan mas pequenos
 if(b.sc&&b.sc!=1){const cy=b.y-(b.mar?12:HFX.on?HFX.z:18);g.save();g.translate(b.x,cy);g.scale(b.sc,b.sc);g.translate(-b.x,-cy);drawB1(b);g.restore();return}
 drawB1(b);
}
function drawB1(b){
 if(!b.mar&&HFX.on){drawAcid(b);return}
 if(b.mar&&CONFIG.MFX.on){   // trazador brillante: nucleo blanco, halo ambar y cabeza luminosa
  const sp=Math.hypot(b.vx,b.vy)||1,L=CONFIG.MFX.tracerLen,hx=b.x,hy=b.y-12,tx=hx-b.vx/sp*L,ty=hy-b.vy/sp*L;
  g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
  const gr=g.createLinearGradient(hx,hy,tx,ty);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,226,122,.75)');gr.addColorStop(1,'rgba(255,150,40,0)');
  g.strokeStyle='rgba(255,170,50,.28)';g.lineWidth=4;g.beginPath();g.moveTo(hx,hy);g.lineTo(tx,ty);g.stroke();
  g.strokeStyle=gr;g.lineWidth=1.6;g.beginPath();g.moveTo(hx,hy);g.lineTo(tx,ty);g.stroke();
  const hg=g.createRadialGradient(hx,hy,0,hx,hy,4.5);hg.addColorStop(0,'rgba(255,255,230,.9)');hg.addColorStop(1,'rgba(255,170,50,0)');g.fillStyle=hg;g.fillRect(hx-5,hy-5,10,10);
  g.restore();g.lineWidth=1;return;
 }
 const k=b.mar?.016:.02;g.strokeStyle=b.mar?'#ffe27a':'#d6ff6a';g.lineWidth=b.mar?1:2;
 g.beginPath();const o=b.mar?12:18;g.moveTo(b.x,b.y-o);g.lineTo(b.x-b.vx*k,b.y-o-b.vy*k);g.stroke();g.lineWidth=1;
}
function draw(){
 g.save();g.scale(2,2);
 if(shake>0){const am=1+shake*2;g.translate(rnd(-am,am)|0,rnd(-am,am)|0)}
 g.drawImage(bg,0,0,W,H);
 if(state=='victory'){drawVictory();g.restore();return}
 g.save();if(cam.on){const z=camZ(cam.t);g.translate(cam.x,cam.y);g.scale(z,z);g.translate(-cam.x,-cam.y)}
 drawAmbient();drawFloorFx();I.forEach(drawItem);L.forEach(drawLing);
 [...F].sort((a,b)=>a.y-b.y).forEach(drawF);
 B.forEach(drawB);GR.forEach(drawProj);RG.forEach(drawRing);SPL.forEach(drawSplash);gDrawFx();
 if(state=='nuke'&&nk)drawNuke();
 P.forEach(p=>{g.globalAlpha=Math.max(0,p.life/p.max);g.fillStyle=p.c;g.fillRect(p.x|0,p.y|0,p.s,p.s)});
 popups.forEach(q=>{g.globalAlpha=Math.min(1,q.life/.4);g.font="700 "+(q.sz||11)+"px Rajdhani,sans-serif";g.textAlign='center';g.lineWidth=3;g.strokeStyle='#0b1a0d';g.strokeText(q.txt,q.x,q.y);g.fillStyle=q.c;g.fillText(q.txt,q.x,q.y)});
 g.globalAlpha=1;g.restore();gFlashScreen();
 if(state=='intro'){
  const n=Math.ceil(introT);
  g.font="700 14px Rajdhani,sans-serif";g.textAlign='center';g.fillStyle='#ffd98a';g.fillText('Ronda '+roundN,CX,CY-52);
  banner(String(n),70,n-introT,['#fff2a0','#ffb43a','#b8260c']);
 }else if(state=='play'&&fightT>0){
  g.globalAlpha=Math.min(1,fightT/.3);banner('FIGHT!',56,1.1-fightT,['#fff2a0','#ff9a1f','#c4180c']);g.globalAlpha=1;
 }else if(state=='ko')banner('K.O.',64,KOT()-koT,['#ffd0c0','#ff4a30','#7a0a06']);
 g.restore();
}
function banner(txt,sz,p,col,y){
 const sc=1+Math.max(0,1-p*4)*1.2;
 g.save();g.translate(CX,y===undefined?CY-6:y);g.scale(sc,sc);
 g.font="900 "+sz+"px Impact,'Arial Black',Rajdhani,sans-serif";g.textAlign='center';g.textBaseline='middle';
 g.lineJoin='round';g.lineWidth=sz/7;g.strokeStyle='#120404';g.strokeText(txt,0,0);
 const gr=g.createLinearGradient(0,-sz/2,0,sz/2);gr.addColorStop(0,col[0]);gr.addColorStop(.5,col[1]);gr.addColorStop(1,col[2]);
 g.fillStyle=gr;g.fillText(txt,0,0);g.restore();
}
function drawVictory(){
 g.fillStyle='rgba(8,3,3,.65)';g.fillRect(0,0,W,H);
 const gl=g.createRadialGradient(CX,170,5,CX,170,160);gl.addColorStop(0,'rgba(255,200,80,.45)');gl.addColorStop(1,'rgba(255,120,20,0)');g.fillStyle=gl;g.fillRect(0,0,W,H);
 pile.forEach(p=>{const s=SPR[p.t];if(!s.dead)return;const w=s.im.width/2,h=s.im.height/2;
  g.save();g.translate(p.x,p.y-h/3);g.rotate(p.rot);if(p.fl)g.scale(-1,1);g.drawImage(s.dead,-w/2,-h/2,w,h);g.restore()});
 if(winner&&SPR[winner]&&SPR[winner].im.naturalWidth){
  const s=SPR[winner],k=1.7,w=s.im.width/2*k,h=s.im.height/2*k,bob=Math.sin(time*4)*1.5;
  g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.ellipse(CX,178,w/2.2,5,0,0,7);g.fill();
  g.save();g.translate(CX,178+bob);if(!s.right)g.scale(-1,1);g.drawImage(s.im,-w/2,-h+3,w,h);g.restore();
 }
 const t=winner?'¡Gana el '+NAMES[winner]+(CH[0]==CH[1]?(winSide?' derecho':' izquierdo'):'')+'!':'Empate';
 banner(t,30,Math.min(1,time/.5),['#fff2a0','#ffb43a','#b8260c'],38);
 if(winner&&lives[winSide]==CONFIG.LIVES){g.font="700 13px Rajdhani,sans-serif";g.textAlign='center';g.fillStyle='#ffd98a';g.fillText('Victoria perfecta',CX,64)}
}
const hpP=[0,0];
const KL=c=>c.replace('Key','').replace('Period','.');
const D=()=>CONFIG.DIFF[diff]||CONFIG.DIFF.normal;
const KOT=()=>CONFIG.KO_CAM?2.4:2;      // duracion del cartel K.O. (mas larga solo con la camara activa)
function hud(){
 $('#tm').textContent=Math.ceil(roundT);$('#tm').className=roundT<=10?'low':'';
 if(tcEl){const live=state=='play'||state=='intro'||state=='ko'||state=='nuke';tcEl.style.visibility=live?'visible':'hidden';if(!live){TOUCH.dx=TOUCH.dy=0;TOUCH.fire=TOUCH.sp=false}}
 F.forEach((f,i)=>{
  const p=i?'#ph':'#pm',r=Math.max(0,f.hp/f.max),h=$(p+' .hp i');
  h.style.width=r*100+'%';h.style.background=r>.5?'var(--ok)':r>.25?'var(--warn)':'var(--bad)';
  $(p+' .sh i').style.width=f.sh/40*100+'%';
  const pt=$(p+' .pt');
  if(f.hp<hpP[i]-.5&&f.hp>0){pt.classList.remove('hit');void pt.offsetWidth;pt.classList.add('hit');setTimeout(()=>pt.classList.remove('hit'),360)}
  if(state=='play'&&f.hp>hpP[i]+.5&&hpP[i]>0){pt.classList.remove('heal');void pt.offsetWidth;pt.classList.add('heal');setTimeout(()=>pt.classList.remove('heal'),700)}
  hpP[i]=f.hp;
  pt.classList.toggle('low',r>0&&r<=.25);pt.classList.toggle('dead',f.hp<=0);pt.classList.toggle('stim',f.stim>0);pt.classList.toggle('shield',f.sh>0);
  const lv=$(p+' .lv'),hs=Array.from({length:CONFIG.LIVES},(_,k)=>k).map(k=>'<span'+(k<lives[i]?'':' class="off"')+'>♥</span>').join('');if(lv.dataset.v!==hs){lv.dataset.v=hs;lv.innerHTML=hs}
  const rdy=f.spT>=CONFIG.SPECIAL_COOLDOWN;$(p+' .spc i').style.width=Math.min(1,f.spT/CONFIG.SPECIAL_COOLDOWN)*100+'%';$(p+' .spc').classList.toggle('ready',rdy);
  $(p+' .buff').textContent=(rdy&&f.hp>0?(NAMES_SP[f.type]+' ['+KL(f.side?CONFIG.KEYS.hydra:CONFIG.KEYS.marine)+']  '):'')+(f.stim>0?'Stim '+Math.ceil(f.stim)+' s  ':'')+(f.multi>0?'Multi '+Math.ceil(f.multi)+' s  ':'')+(f.sh>0?'Escudo':'');
 });
}
let prevState='play';
function togglePause(){
 if(state=='play'||state=='intro'){prevState=state;state='paused';$('#pz').classList.remove('hide');AUDIO.pauseMusic('pausa')}
 else if(state=='paused'){state=prevState;$('#pz').classList.add('hide');AUDIO.resumeMusic('pausa')}
 document.activeElement&&document.activeElement.blur();
}
$('#pb').onclick=()=>{if(state=='play'||state=='intro'||state=='paused')togglePause();else $('#pb').blur()};
$('#rs').onclick=togglePause;
$('#mn').onclick=()=>{AUDIO.resumeMusic('pausa');state='menu';AUDIO.playMusic('music_menu');$('#pz').classList.add('hide');$('#ov').classList.remove('end','hide');$('#t').textContent='Coliseo'};
function start(m){document.activeElement&&document.activeElement.blur();mode=m;applyOpts();AUDIO.playMusic('music_arena');if(CH[0]=='m')AUDIO.voice('marine_what',true);else if(CH[0]=='d')AUDIO.voice('dt_ready',true);setTimeout(()=>{if(state=='menu')return;if(CH[1]=='h')AUDIO.voice('hydra_what');else if(CH[1]=='d')AUDIO.voice('dt_ready',CH[0]=='d')},CH[0]=='d'?2400:1800);reset();$('#ov').classList.remove('end');$('#ov').classList.add('hide')}
document.querySelectorAll('button[data-m]').forEach(b=>b.onclick=()=>start(b.dataset.m));
reset();state='menu';
let last=0;
function loop(ts){
 try{loopBody(ts)}catch(err){if(!window.__loopErr){window.__loopErr=1;console.error('Coliseo: error en el bucle (el juego sigue)',err)}}   // un fallo en un fotograma ya no congela todo
 requestAnimationFrame(loop);
}
function loopBody(ts){
 let dt=Math.min(.05,(ts-last)/1000||0);last=ts;padPoll();if(GSTOP>0){GSTOP-=dt;dt*=GFX.stopScale}
 if(fightT>0&&state!='paused')fightT-=dt;
 if(state=='play')update(dt);else if(state=='intro')intro(dt);else if(state=='ko')koStep(dt);else if(state=='nuke')nukeStep(dt);else if(state=='victory')time+=dt;
 if(state!='menu'&&state!='paused')updP(dt*pscale());
 if(shake>0)shake-=dt;
 AUDIO.setIntensity(state=='play'&&roundT<10?(10-roundT)/10:0);   // musica mas rapida y latido en los ultimos 10 s
 draw();hud();
}
requestAnimationFrame(loop);

/* ---- Sonido: tecla M o boton de nota musical ---- */
function toggleSound(){
 const on=AUDIO.toggle();
 $('#mt').classList.toggle('off',!on);$('#mt').blur();if(typeof syncSnd=='function')syncSnd();
 if(on)AUDIO.playMusic(state=='menu'?'music_menu':'music_arena');
}
$('#mt').onclick=toggleSound;
$('#mt').classList.toggle('off',!AUDIO.enabled);
addEventListener('keydown',e=>{if(e.code=='KeyM'&&!e.repeat)toggleSound()});

/* ---- Opciones: dificultad, vidas, marcador, volumen y pantalla completa (se recuerdan en el navegador) ---- */
const store={get(k,d){try{const v=localStorage.getItem('coliseo.'+k);return v===null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem('coliseo.'+k,v)}catch(e){}}};
function applyOpts(){diff=$('#dif').value||'normal';CONFIG.LIVES=+$('#liv').value||2;store.set('dif',diff);store.set('liv',CONFIG.LIVES);CH=[$('#cl').value||'m',$('#cr').value||'h'];store.set('cl',CH[0]);store.set('cr',CH[1])}
function showScore(){$('#sc').textContent='Victorias en este navegador: Marine '+SCORE.m+' \u00b7 Hidralisco '+SCORE.h+' \u00b7 Dark Templar '+SCORE.d}
function saveScore(){store.set('score',JSON.stringify(SCORE));showScore()}
try{const s0=JSON.parse(store.get('score','{}'));SCORE.m=+s0.m||0;SCORE.h=+s0.h||0;SCORE.d=+s0.d||0}catch(e){}
$('#dif').value=store.get('dif','normal');$('#liv').value=store.get('liv','2');$('#cl').value=store.get('cl','m');$('#cr').value=store.get('cr','h');
diff=$('#dif').value||'normal';CONFIG.LIVES=+$('#liv').value||2;
/* Luchadores: izquierda Marine o Dark Templar, derecha Hidralisco o Dark Templar */
function syncRoster(){CH=[$('#cl').value||'m',$('#cr').value||'h'];$('button[data-m="1m"]').textContent='Jugar de '+NAMES[CH[0]];$('button[data-m="1h"]').textContent='Jugar de '+NAMES[CH[1]];if(state=='menu'){newRound(1);state='menu'}}
$('#cl').onchange=$('#cr').onchange=()=>{syncRoster();applyOpts();document.activeElement&&document.activeElement.blur()};
syncRoster();
showScore();
$('#rsc').onclick=()=>{SCORE.m=0;SCORE.h=0;SCORE.d=0;saveScore();$('#rsc').blur()};
$('#opt').onclick=()=>{$('#ov').classList.remove('end');$('#t').textContent='Coliseo';$('#opt').blur()};
const vmus=$('#vm'),vsfx=$('#vs');
AUDIO.musicVolume=(+store.get('vmus',35))/100;AUDIO.sfxVolume=(+store.get('vsfx',70))/100;
vmus.value=Math.round(AUDIO.musicVolume*100);vsfx.value=Math.round(AUDIO.sfxVolume*100);
const vvoz=$('#vv'),vvoz2=$('#vv2');AUDIO.voiceVolume=(+store.get('vvoz',90))/100;vvoz.value=vvoz2.value=Math.round(AUDIO.voiceVolume*100);
function setVozVol(v){AUDIO.voiceVolume=v/100;store.set('vvoz',v);vvoz.value=vvoz2.value=v}
vvoz.oninput=()=>setVozVol(vvoz.value);vvoz2.oninput=()=>setVozVol(vvoz2.value);
vvoz2.onchange=()=>{AUDIO.voice('marine_what',true);vvoz2.blur()};vvoz.onchange=()=>vvoz.blur();   // al soltar el control suena una frase de muestra
const vmus2=$('#vm2'),vsfx2=$('#vs2');   // los mismos controles dentro de la pantalla de seleccion (menu); ambos pares se mantienen sincronizados
function setMusVol(v){AUDIO.musicVolume=v/100;AUDIO.musicVol();store.set('vmus',v);vmus.value=vmus2.value=v}
function setSfxVol(v){AUDIO.sfxVolume=v/100;store.set('vsfx',v);vsfx.value=vsfx2.value=v}
setMusVol(vmus.value);setSfxVol(vsfx.value);
vmus.oninput=()=>setMusVol(vmus.value);vsfx.oninput=()=>setSfxVol(vsfx.value);
vmus2.oninput=()=>{setMusVol(vmus2.value);if(state=='menu'&&!AUDIO.musicPlaying())AUDIO.playMusic('music_menu')};   // en el menu, al mover la musica empieza a sonar para poder oirla
vsfx2.oninput=()=>setSfxVol(vsfx2.value);
function syncSnd(){$('#snd').classList.toggle('off',!AUDIO.enabled)}
$('#sm').onclick=()=>{toggleSound();$('#sm').blur()};syncSnd();
vsfx2.onchange=()=>{AUDIO.play('shoot_marine');vsfx2.blur()};vmus2.onchange=()=>vmus2.blur();   // suena un disparo de muestra y se suelta el foco (las flechas vuelven a ser del juego)
const fsb=$('#fs');if(!document.fullscreenEnabled)fsb.style.display='none';
fsb.onclick=()=>{try{if(document.fullscreenElement)document.exitFullscreen();else $('.stage').requestFullscreen().catch(()=>{})}catch(e){}fsb.blur()};

/* ---- Controles tactiles (joystick + botones) ---- */
tcEl=$('#tc');
const isTouch=(typeof matchMedia=='function'&&matchMedia('(pointer: coarse)').matches)||(typeof navigator!='undefined'&&navigator.maxTouchPoints>0);
tcEl.hidden=!(CONFIG.TOUCH_CONTROLS===true||(CONFIG.TOUCH_CONTROLS==='auto'&&isTouch));
addEventListener('touchstart',()=>{if(CONFIG.TOUCH_CONTROLS==='auto')tcEl.hidden=false},{once:true,passive:true});
tcEl.addEventListener('contextmenu',e=>e.preventDefault());
const jb=$('#jb'),jk=$('#jk');let jid=null;
function jmove(e){
 const r=jb.getBoundingClientRect();
 let dx=(e.clientX-(r.left+r.width/2))/(r.width/2),dy=(e.clientY-(r.top+r.height/2))/(r.height/2);
 const m=Math.hypot(dx,dy);if(m>1){dx/=m;dy/=m}
 TOUCH.dx=Math.abs(dx)<.2?0:dx;TOUCH.dy=Math.abs(dy)<.2?0:dy;
 jk.style.transform='translate(calc(-50% + '+dx*36+'px),calc(-50% + '+dy*36+'px))';
}
const jend=e=>{if(e.pointerId===jid){jid=null;TOUCH.dx=TOUCH.dy=0;jk.style.transform='translate(-50%,-50%)'}};
jb.addEventListener('pointerdown',e=>{e.preventDefault();jid=e.pointerId;try{jb.setPointerCapture(jid)}catch(x){}jmove(e)});
jb.addEventListener('pointermove',e=>{if(e.pointerId===jid)jmove(e)});
jb.addEventListener('pointerup',jend);jb.addEventListener('pointercancel',jend);
function holdBtn(el,key){
 el.addEventListener('pointerdown',e=>{e.preventDefault();TOUCH[key]=true});
 ['pointerup','pointercancel','pointerleave'].forEach(t=>el.addEventListener(t,()=>{TOUCH[key]=false}));
}
holdBtn($('#bf'),'fire');holdBtn($('#bs'),'sp');

/* La musica arranca al abrir el juego (o en el primer clic/tecla si el navegador la bloquea) */
AUDIO.playMusic('music_menu');


/* ---- Presentacion de entrada: imagenes con zoom lento + titulo animado. Se cierra con cualquier tecla, clic o toque. Ajustes en CONFIG.INTRO ---- */
(function(){
 const C=CONFIG.INTRO,el=$('#intro');
 if(!el)return;
 try{if(!C||!C.on||(C.once&&sessionStorage.getItem('coliseo.intro')))return}catch(e){if(!C||!C.on)return}
 try{sessionStorage.setItem('coliseo.intro','1')}catch(e){}
 el.hidden=false;
 el.style.setProperty('--idim',C.dim==null?.35:C.dim);
 $('#intro .t1').textContent=C.title||'';$('#intro .t2').textContent=C.subtitle||'';$('#intro .t4').textContent=C.credit||'';$('#intro .go').textContent=C.prompt||'';
 $('#intro .t3').innerHTML=(C.lines||[]).map((t,i)=>'<span style="animation-delay:'+(2.3+i*.7)+'s"></span>').join('');
 (C.lines||[]).forEach((t,i)=>{el.querySelectorAll('.t3 span')[i].textContent=t});
 let done=false,tm=0,shown=0,layers=[...el.querySelectorAll('.ib')],imgs=[];
 const t0=performance.now();
 function show(k){   // pone la imagen k en la capa libre y desvanece la anterior
  const L=layers[shown++%2],O=layers[shown%2];
  L.style.backgroundImage='url("'+imgs[k].src+'")';L.classList.remove('on');void L.offsetWidth;
  L.style.setProperty('--kbt',(C.slideTime||6)+3+'s');L.classList.add('on');O.classList.remove('on');
 }
 function next(){let k=imgs.k0=((imgs.k0==null?-1:imgs.k0)+1)%imgs.length;show(k)}
 function close(){
  if(done)return;done=true;clearInterval(tm);
  removeEventListener('keydown',onKey,true);el.removeEventListener('pointerdown',onPtr);
  el.classList.add('out');setTimeout(()=>{el.hidden=true},750);
 }
 const ready=()=>performance.now()-t0>350;   // evita cerrarla sin querer en el primer instante
 function onKey(e){if(!ready()||e.metaKey||e.ctrlKey||e.altKey||/^(Shift|Control|Alt|Meta)/.test(e.code))return;e.preventDefault();e.stopPropagation();close()}
 function onPtr(e){e.preventDefault();if(ready())close()}   // preventDefault: evita que el doble clic seleccione texto
 addEventListener('keydown',onKey,true);el.addEventListener('pointerdown',onPtr);el.addEventListener('mousedown',e=>e.preventDefault());el.addEventListener('selectstart',e=>e.preventDefault());
 // mando: cualquier boton
 (function pad(){if(done)return;try{if(ready()&&getPads().some(g=>g&&g.buttons&&Array.from(g.buttons).some(b=>b.pressed)))return close()}catch(e){}requestAnimationFrame(pad)})();
 // carga las imagenes de la lista y salta las que no existan
 let list=(C.images||[]).filter(Boolean);if(C.shuffle)list=list.sort(()=>Math.random()-.5);
 Promise.all(list.map(u=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=u}))).then(r=>{
  imgs=r.filter(Boolean);if(done||!imgs.length)return;   // sin imagenes validas: queda el fondo oscuro con el titulo
  next();if(imgs.length>1)tm=setInterval(next,(C.slideTime||6)*1000);
 });
})();
