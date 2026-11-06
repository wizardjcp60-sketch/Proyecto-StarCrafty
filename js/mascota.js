/* ==========================================================================
   mascota.js - HUEVO ZERG y MASCOTA ZERGLING (ver LEEME.txt, seccion 6K)
   De vez en cuando sale un huevo en un punto al azar de la arena. A los 3 s (CONFIG.EGG.hatch) nace un zergling con
   vida propia que deambula sin dueno. El primer luchador que lo toca lo adopta: pasa a su bando, persigue y muerde
   al rival y es del color del luchador (azul = izquierdo, rojo = derecho). Se puede matar a disparos, golpes y areas.
   Ajustes: CONFIG.EGG y CONFIG.PET (js/config.js). Sprites: tools/build_pet_assets.py.
   Se carga ANTES de game.js. Usa variables y funciones de game.js (F, B, popups, hurt, burst, inArena...) solo al
   ejecutarse, nunca al cargarse. Enganches en game.js: newRound -> petReset | update -> petAim, petUpdate |
   bucle de balas -> petBulletHit | ai -> petLure | meleeHit, chargeStep, grenadeBoom, boom, acido ->
   petsMelee / petsArea | draw -> petDrawBack, petDrawList. Battlecruiser: petsArea en laser y Yamato.
   ========================================================================== */
const EGC=CONFIG.EGG,PTC=CONFIG.PET;
const EGA={cw:64,ch:48,ax:32,ay:37,low:4};   // huevo_atlas.png: celda 64x48, (ax,ay) = punto del suelo bajo el huevo; filas 0 aparicion | 1 quieto | 2 pre-nacimiento | 3 nacimiento | 4 capa inferior
const PTA={dirs:9,cell:40,walkN:7,atkRow:7,atkN:5,deathY:480,dw:65,dh:53,dn:7,ax:20,ay:29,dax:32,day:36};   // zergling_mascota_*.png (ver tools/build_pet_assets.py)
let EG=[],PT=[],eggT=1e9;   // EG = huevos, PT = mascotas, eggT = cuenta atras hasta el proximo huevo
const EGI={im:null},PTI={neutral:null,azul:null,roja:null},PTF={neutral:null,azul:null,roja:null};   // PTF = copia blanca para el destello al recibir un golpe
const PTCOL={neutral:'157,255,74',azul:'90,170,255',roja:'255,80,70'},PTKEY=o=>o<0?'neutral':o?'roja':'azul';
{const im=new Image();im.onload=()=>{EGI.im=im};im.src=ASSETS.egg}
['neutral','azul','roja'].forEach(k=>{const im=new Image();im.onload=()=>{PTI[k]=im;const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='rgba(255,255,255,.75)';x.fillRect(0,0,c.width,c.height);PTF[k]=c};im.src=ASSETS.pet[k]});

function petReset(){EG=[];PT=[];eggT=EGC.on?rnd(EGC.first[0],EGC.first[1]):1e9}
const petsOf=s=>PT.filter(p=>!p.dead&&p.own===s).length;   // mascotas vivas de un lado (0 izquierdo, 1 derecho)

/* ---- huevo: aparece, espera, se agita, eclosiona ---- */
function eggSpawn(){
 let x=CX,y=CY;
 for(let n=0;n<14;n++){const a=rnd(0,6.283),k=Math.sqrt(Math.random())*.8;x=CX+Math.cos(a)*RX*k;y=CY+Math.sin(a)*RY*k;if(F.every(f=>Math.hypot(f.x-x,f.y-y)>EGC.minDist))break}
 EG.push({x,y,t:0,b:false});
 AUDIO.play('ling_land');burst(x,y,10,['#4b2a55','#7a4a86','#9dff4a'],50);
}
function petBorn(e){
 PT.push({x:e.x,y:e.y,r:5,hp:PTC.hp,max:PTC.hp,own:-1,t:0,step:0,mv:0,ax:0,ay:1,cd:.4,at:null,hit:false,flash:0,hits:0,gap:0,dead:false,dT:0,tx:e.x,ty:e.y,wT:0,idle:true,seed:rnd(0,6.283)});
 AUDIO.play('ling_pop');burst(e.x,e.y-6,18,['#9dff4a','#d6ff6a','#7a4a86','#d9a441'],85);
}
function petAdopt(p,f){
 p.own=f.side;p.at=null;p.cd=.4;
 AUDIO.play('pickup_multi');
 popups.push({x:f.x,y:f.y-34,txt:'¡Mascota!',c:f.side?'#ff8a7a':'#7fc4ff',sz:12,life:1.1});
 burst(p.x,p.y-8,16,f.side?['#ff5a4a','#ffb0a0','#ffffff']:['#4fa8ff','#b0d8ff','#ffffff'],80);
}

/* ---- movimiento (respeta el borde curvo de la arena) ---- */
function petMove(p,dx,dy,sp,dt){
 const l=Math.hypot(dx,dy);if(!l)return 0;
 const ux=dx/l,uy=dy/l,st=sp*dt;p.ax=ux;p.ay=uy;
 let nx=p.x+ux*st,ny=p.y+uy*st;
 if(!inArena(nx,ny,p.r)){if(inArena(nx,p.y,p.r))ny=p.y;else if(inArena(p.x,ny,p.r))nx=p.x;else return 0}   // desliza por el borde
 p.x=nx;p.y=ny;p.step+=st;p.mv=.12;return st;
}

/* ---- dano a las mascotas. Sin dueno son intocables (hay que tocarlas, no dispararlas); las del propio lado tampoco se danan ---- */
function petDie(p){p.dead=true;p.dT=0;p.at=null;AUDIO.play('ling_pop');burst(p.x,p.y-6,16,['#c0261a','#7a1810','#ff5a3c','#6fcf2a'],90)}
function petHurt(p,d,side){
 if(p.dead||p.own<0||p.own===side)return false;
 if(p.gap>0)return false;   // acaba de recibir un golpe: el mismo impacto no cuenta dos veces
 p.hits=(p.hits||0)+1;p.gap=PTC.hitGap;p.flash=.08;
 p.hp=Math.max(0,p.max*(1-p.hits/PTC.hitsToDie));   // la barra baja en tercios
 popups.push({x:p.x,y:p.y-20,txt:p.hits+'/'+PTC.hitsToDie,c:'#ffffff',sz:9,life:.5});
 if(p.hits>=PTC.hitsToDie)petDie(p);   // 3 golpes y muere
 return true;
}
function petBulletHit(b){   // true = la bala se consume (llamado desde el bucle de balas de update)
 const s=b.own?b.own.side:-2;
 for(const p of PT){
  if(p.dead||p.own<0||p.own===s||Math.hypot(b.x-p.x,b.y-p.y)>=7)continue;
  petHurt(p,b.dmg,s);
  if(b.mar&&CONFIG.MFX.on)sparkHit(b.x,b.y-8,.6);else if(!b.mar&&HFX.on)acidSplash(b.x,b.y-8,b.vx,b.vy,.7);
  if(b.mine)mineBoom(b.x,b.y,.7);
  return true;
 }
 return false;
}
function petsArea(x,y,R,dmg,side){PT.forEach(p=>{if(!p.dead&&inEll(p,x,y,R))petHurt(p,dmg,side)})}   // explosiones, granada, laser, acido (side -2 = no es de nadie: danan a todas)
function petsMelee(f,R,dmg){PT.forEach(p=>{if(!p.dead&&Math.hypot(f.x-p.x,f.y-p.y)<=f.r+p.r+R)petHurt(p,dmg,f.side)})}   // cuchilla del DT / Zealot y embestida

/* ---- punteria: una mascota enemiga pegada al luchador pasa a ser su objetivo (si no, el rival) ---- */
function petAim(f,o){
 let b=null,bd=PTC.aimR;
 for(const p of PT){if(p.dead||p.own<0||p.own===f.side)continue;const d=Math.hypot(p.x-f.x,p.y-f.y);if(d<bd){bd=d;b=p}}
 return b||o;
}
function petLure(f){   // la IA busca la mascota sin dueno mas cercana (si aun puede adoptar)
 if(petsOf(f.side)>=PTC.max)return null;
 let b=null,bd=PTC.aiRange;
 for(const p of PT){if(p.dead||p.own>=0)continue;const d=Math.hypot(p.x-f.x,p.y-f.y);if(d<bd){bd=d;b=p}}
 return b;
}

/* ---- mordisco ---- */
function petBite(p,t){
 if(t.hp<=0||t.ghost||Math.hypot(p.x-t.x,p.y-t.y)>t.r+PTC.reach+PTC.lunge)return;
 if(cloaked(t)&&Math.random()<DT.evasion){evade(t);return}   // un DT camuflado esquiva ataques normales
 hurt(t,dtDmg(t,PTC.damage));burst(t.x,t.y-8,4,['#e0503a','#ffb43a'],55);
}

/* ---- actualizacion (se llama desde update() solo mientras se pelea) ---- */
function petUpdate(dt){
 // huevos
 eggT-=dt;
 if(eggT<=0){
  if(EG.length||PT.some(p=>!p.dead&&p.own<0))eggT=2;   // hasta que no haya huevo ni mascota sin dueno no sale otro
  else{eggSpawn();eggT=rnd(EGC.gap[0],EGC.gap[1])}
 }
 const birthAt=EGC.hatch-EGC.birthT;
 EG=EG.filter(e=>{
  e.t+=dt;
  if(!e.b&&e.t>=birthAt){e.b=true;burst(e.x,e.y-8,12,['#d9a441','#7a4a86','#9dff4a'],60)}   // se abre el cascaron
  if(e.t>=EGC.hatch){petBorn(e);return false}
  return true;
 });
 // mascotas
 PT.forEach(p=>{
  if(p.dead){p.dT+=dt;return}
  p.t+=dt;p.cd-=dt;p.flash-=dt;p.gap-=dt;p.mv-=dt;
  if(p.own<0){   // sin dueno: deambula (anda un rato, descansa otro) y espera a que alguien la toque
   if((p.wT-=dt)<=0){const a=rnd(0,6.283),k=Math.sqrt(Math.random())*.75;p.tx=CX+Math.cos(a)*RX*k;p.ty=CY+Math.sin(a)*RY*k;p.wT=rnd(1.2,2.6);p.idle=Math.random()<.3}
   if(!p.idle){const d=Math.hypot(p.tx-p.x,p.ty-p.y);if(d>3){if(!petMove(p,p.tx-p.x,p.ty-p.y,PTC.wander,dt))p.wT=0}else p.idle=true}
   for(const f of F){if(f.hp>0&&!f.ghost&&Math.hypot(f.x-p.x,f.y-p.y)<f.r+PTC.touch&&petsOf(f.side)<PTC.max){petAdopt(p,f);break}}
   return;
  }
  const t=F[1-p.own],ow=F[p.own];
  if(p.at!=null){   // mordiendo: se queda quieta mirando al rival
   p.at+=dt;p.ax=(t.x-p.x)/(Math.hypot(t.x-p.x,t.y-p.y)||1);p.ay=(t.y-p.y)/(Math.hypot(t.x-p.x,t.y-p.y)||1);
   if(!p.hit&&p.at>=PTC.hitAt){p.hit=true;petBite(p,t)}
   if(p.at>=PTA.atkN/PTC.fps){p.at=null;p.cd=PTC.cooldown}
  }else if(t.hp>0&&!t.ghost){   // persigue al rival y lo muerde al llegar
   const d=Math.hypot(t.x-p.x,t.y-p.y);
   if(d>t.r+PTC.reach)petMove(p,t.x-p.x,t.y-p.y,PTC.speed,dt);
   else{p.ax=(t.x-p.x)/(d||1);p.ay=(t.y-p.y)/(d||1);if(p.cd<=0){p.at=0;p.hit=false}}
  }else if(ow&&Math.hypot(ow.x-p.x,ow.y-p.y)>26)petMove(p,ow.x-p.x,ow.y-p.y,PTC.speed*.7,dt);   // sin rival al que atacar: acompana a su dueno
  PT.forEach(q=>{   // las mascotas no se montan unas sobre otras
   if(q===p||q.dead)return;const d=Math.hypot(p.x-q.x,p.y-q.y);
   if(d<8){const u=d?(p.x-q.x)/d:Math.cos(p.seed),v=d?(p.y-q.y)/d:Math.sin(p.seed),nx=p.x+u*30*dt,ny=p.y+v*30*dt;if(inArena(nx,ny,p.r)){p.x=nx;p.y=ny}}
  });
 });
 PT=PT.filter(p=>!(p.dead&&p.dT>PTA.dn/PTC.deathFps+.8));
}

/* ---- dibujo ---- */
function drawEgg(e){
 const x=e.x|0,y=e.y|0,k=EGC.scale,t=e.t,idleEnd=EGC.hatch-EGC.birthT-EGC.preT,sm=g.imageSmoothingEnabled;
 let row,col;
 if(t<EGC.transT){row=0;col=Math.min(3,(t/EGC.transT*4)|0)}
 else if(t<idleEnd){row=1;col=(((t-EGC.transT)*EGC.fps)|0)%12}
 else if(t<idleEnd+EGC.preT){row=2;col=Math.min(7,((t-idleEnd)/EGC.preT*8)|0)}
 else{row=3;col=Math.min(6,((t-idleEnd-EGC.preT)/EGC.birthT*7)|0)}
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x,y,8,3.2,0,0,7);g.fill();
 if(EGC.ring){const pu=.5+.5*Math.sin(t*6);g.strokeStyle='rgba(157,255,74,'+(.25+.3*pu)+')';g.lineWidth=1;g.beginPath();g.ellipse(x,y,10+pu*2,4+pu*.8,0,0,7);g.stroke()}
 if(!EGI.im)return;
 g.imageSmoothingEnabled=false;
 const dx=x-EGA.ax*k,dy=y-EGA.ay*k;
 if(row==3)g.drawImage(EGI.im,Math.min(4,(col*5/7)|0)*EGA.cw,EGA.low*EGA.ch,EGA.cw,EGA.ch,dx,dy,EGA.cw*k,EGA.ch*k);   // la capa inferior va DEBAJO de los fotogramas de nacimiento
 g.drawImage(EGI.im,col*EGA.cw,row*EGA.ch,EGA.cw,EGA.ch,dx,dy,EGA.cw*k,EGA.ch*k);
 g.imageSmoothingEnabled=sm;
}
function drawPet(p){
 const x=p.x|0,y=p.y|0,k=PTC.scale,key=PTKEY(p.own),im=PTI[key],col=PTCOL[key],sm=g.imageSmoothingEnabled;
 g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x,y,7,2.8,0,0,7);g.fill();
 if(PTC.ring&&!p.dead){const pu=p.own<0?.5+.5*Math.sin(time*5+p.seed):0;g.strokeStyle='rgba('+col+','+(p.own<0?.3+.35*pu:.55)+')';g.lineWidth=1;g.beginPath();g.ellipse(x,y,9+pu*2,3.6+pu*.8,0,0,7);g.stroke()}
 if(!im){g.fillStyle='rgb('+col+')';g.fillRect(x-3,y-6,6,6);return}
 g.imageSmoothingEnabled=false;
 if(p.dead){   // muerte: 7 fotogramas y luego se desvanece
  const i=Math.min(PTA.dn-1,(p.dT*PTC.deathFps)|0),fade=Math.max(0,1-Math.max(0,p.dT-PTA.dn/PTC.deathFps)/.8);
  g.globalAlpha=fade;g.drawImage(im,i*PTA.dw,PTA.deathY,PTA.dw,PTA.dh,x-PTA.dax*k,y-PTA.day*k,PTA.dw*k,PTA.dh*k);g.globalAlpha=1;g.imageSmoothingEnabled=sm;return;
 }
 const c=Math.min(PTA.dirs-1,Math.round(Math.atan2(Math.abs(p.ax),p.ay)/(Math.PI/(PTA.dirs-1)))),mir=p.ax>0;   // 0 sur, 4 oeste, 8 norte; el este se espeja
 const row=p.at!=null?PTA.atkRow+Math.min(PTA.atkN-1,(p.at*PTC.fps)|0):(p.mv>0?((p.step/PTC.stride)|0)%PTA.walkN:0);
 const bob=p.mv>0&&p.at==null?Math.abs(Math.sin(p.step*.55))*.8:0;
 g.save();g.translate(x,y-bob);if(mir)g.scale(-1,1);
 g.drawImage(p.flash>0&&PTF[key]?PTF[key]:im,c*PTA.cell,row*PTA.cell,PTA.cell,PTA.cell,-PTA.ax*k,-PTA.ay*k,PTA.cell*k,PTA.cell*k);
 g.restore();g.imageSmoothingEnabled=sm;
 if(PTC.bar){const w=14,bx=x-w/2,by=y-21;g.fillStyle='rgba(0,0,0,.65)';g.fillRect(bx-1,by-1,w+2,4);g.fillStyle='rgb('+col+')';g.fillRect(bx,by,Math.max(0,w*p.hp/p.max),2)}   // vida propia
}
function petDrawBack(){EG.forEach(drawEgg)}   // los huevos van en el suelo, debajo de todo
function petDrawList(){return PT.map(p=>({y:p.dead?-999:p.y,d:()=>drawPet(p)}))}   // las mascotas se ordenan por altura junto con los luchadores (los cadaveres, al fondo)
