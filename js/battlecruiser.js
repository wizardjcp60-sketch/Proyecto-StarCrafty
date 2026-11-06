/* ==========================================================================
   battlecruiser.js - SUPER ATAQUE: BATTLECRUISER (ver LEEME.txt, seccion 6J)
   Un objeto raro (la baliza) cae al azar. Quien lo recoge llama a un Battlecruiser que:
     1. entra con un salto tactico (destello, camara lenta, franjas de cine y cartel),
     2. cambia la musica (assets/audio/music/bc.mp3),
     3. bombardea al rival: rafagas de laser (marca en el suelo, se esquivan) y un disparo enorme del canon Yamato,
     4. se retira y vuelve la musica de la arena donde se habia quedado.
   Los ajustes (dano, frecuencia, duracion...) estan en js/config.js, bloque CONFIG.BC.
   Se apoya en game.js: los proyectiles son entradas de la lista GR (kind 'l' = laser, 'y' = Yamato), asi que la IA ya esquiva sus marcas
   y game.js los resuelve con land(). Se carga ANTES de game.js (igual que granada_fx.js) y usa sus variables globales al ejecutarse.
   ========================================================================== */
const BCC=CONFIG.BC,BCL=BCC.laser,BCY=BCC.yamato,BCA=ATLAS_BC;
const BCIM={azul:new Image(),roja:new Image()};BCIM.azul.src=ASSETS.bc.azul;BCIM.roja.src=ASSETS.bc.roja;
let BCR=null,bcCount=0;   // BCR = Battlecruiser en pantalla (null = ninguno); bcCount = balizas que han caido en esta ronda
const bcWrap=a=>{a%=6.283185307;return a>3.141593?a-6.283185307:a<-3.141593?a+6.283185307:a};

/* ---- la baliza que cae: game.js la pide al soltar un objeto; devuelve 'bc' (rara) o null ---- */
function bcRoll(){
 if(!BCC.on||BCR||bcCount>=BCC.perRound||I.some(i=>i.t=='bc'))return null;
 if(CONFIG.ROUND_TIME-roundT<BCC.skipFirst||roundT<BCC.minRoundTime||Math.random()>=BCC.chance)return null;
 bcCount++;return 'bc';
}
function bcReset(silent){   // nueva ronda, K.O., nuclear o salir al menu: se retira al instante y la musica de la arena vuelve por donde iba
 const had=BCR;BCR=null;bcCount=silent?bcCount:0;
 if(had&&had.music&&!silent)AUDIO.playMusic('music_arena',true);
}
const bcScale=()=>BCR&&BCR.ph=='enter'&&BCR.t<BCC.slowT?BCC.slowmo:1;   // camara lenta del primer instante de la entrada (la usa loopBody)
const bcLeft=()=>BCR?Math.ceil(Math.max(0,BCC.enterT+BCC.stayT+BCC.leaveT-BCR.t)):0;
const bcSy=b=>b.y-b.alt+Math.sin(time*2.2)*1.5;   // posicion en pantalla (y) del centro de la nave: suelo menos altura, con un leve balanceo
// Fotograma de la hoja para un rumbo hd (0 = norte, sentido horario). En la hoja la PROA (el semicirculo ancho) apunta al SUR en el fotograma 0, al OESTE en el 8 y al NORTE en el 16
// (los motores, los 3 cilindros, quedan atras); el lado este se obtiene espejando. Por eso se suma media vuelta (PI) al rumbo.
const bcFrame=hd=>{let fi=Math.round((hd+3.141592654)/6.283185307*32)%32;if(fi<0)fi+=32;return{fr:fi>16?32-fi:fi,mir:fi>16}};
const bcDir=(b,k)=>{const a=b.hd;return{fx:Math.sin(a),fy:-Math.cos(a),lx:Math.cos(a),ly:Math.sin(a),k}};   // frente y costado de la nave en pantalla (hd: 0 = norte, sentido horario)

/* ---- quien recoge la baliza llama al Battlecruiser ---- */
function bcCall(f){
 const o=F[1-F.indexOf(f)],hx=CX+Math.max(-RX*.5,Math.min(RX*.5,(o.x-CX)*.6)),y=CY+BCC.hoverY;
 BCR={own:f,side:f.side,t:0,ph:'enter',x:hx,y,alt:BCC.alt+190,k:BCC.scale*2.1,al:0,occ:1,ease:0,hd:Math.PI,ft:0,lt:0,nx:.6,vol:0,gi:0,yq:null,ydone:false,beam:null,flash:1,mz:0,mzx:0,mzy:0,music:false};
 BCR.hd=Math.atan2(o.x-hx,-(o.y-(y-BCR.alt)));
 popups.push({x:f.x,y:f.y-30,txt:'¡Battlecruiser!',c:'#9fd8ff',sz:13,life:1.6});
 burst(f.x,f.y-8,20,['#9fd8ff','#ffffff','#4f9bff'],85);RG.push({x:hx,y,R:46,life:.5,max:.5,c:'140,210,255'});
 AUDIO.play('bc_entrada');AUDIO.play('bc_bocina');AUDIO.voice('bcv_ready',true);
 if(BCC.music){AUDIO.playMusic('music_bc');BCR.music=true}
}

/* ---- actualizacion (se llama al inicio de update) ---- */
function bcUpdate(dt){
 const b=BCR;if(!b)return;
 b.t+=dt;b.flash=Math.max(0,b.flash-dt*2.2);b.mz-=dt;
 const o=F[1-F.indexOf(b.own)];
 // sigue al rival con lentitud (por el fondo de la arena) y gira hacia el para mirarlo
 const hx=CX+Math.max(-RX*.5,Math.min(RX*.5,(o.x-CX)*.6)),dx=hx-b.x;b.x+=Math.sign(dx)*Math.min(Math.abs(dx),55*dt);
 const sy=bcSy(b),des=Math.atan2(o.x-b.x,-(o.y-sy)),da=bcWrap(des-b.hd);b.hd+=Math.max(-1.5*dt,Math.min(1.5*dt,da));
 // con CONFIG.BC.fade=true, si algun luchador queda debajo de la nave, esta se vuelve semitransparente para no taparlo
 {const w=BCA.w/2*b.k*.75,h=BCA.h/2*b.k*.75,und=F.some(f=>f.hp>0&&Math.abs(f.x-b.x)<w&&f.y-26<sy+h&&f.y>sy-h);b.occ+=(((BCC.fade&&und)?.55:1)-b.occ)*Math.min(1,dt*6)}   // BCC.fade (false por defecto): la nave NO se vuelve transparente al sobrevolar a alguien
 // estela de los motores (parte trasera)
 if(b.al>.2&&Math.random()<dt*55){const d=bcDir(b,b.k),rx=b.x-d.fx*28*b.k+rnd(-5,5),ry=sy-d.fy*28*b.k*.9+rnd(-3,3);part(rx,ry,-d.fx*rnd(6,24),-d.fy*rnd(6,24)+rnd(-4,4),rnd(.25,.55),pick(['#9fd8ff','#ffffff','#5aa8ff']),rnd(1,3)|0||1)}
 if(b.ph=='enter'){
  const u=Math.min(1,b.t/BCC.enterT);b.ease=1-Math.pow(1-u,3);
  b.alt=BCC.alt+(1-b.ease)*190;b.k=BCC.scale*(1+(1-b.ease)*1.1);b.al=Math.min(1,b.t/.45);
  if(u>=1){b.ph='fight';b.ft=0;b.al=1;b.flash=Math.max(b.flash,.4);shake=Math.max(shake,.45);   // llegada: onda de choque en el suelo
   RG.push({x:b.x,y:b.y,R:70,life:.55,max:.55,c:'150,215,255'});burst(b.x,b.y,24,['#c8dcff','#9fd8ff','#ffffff'],130)}
 }else if(b.ph=='fight'){
  b.ft+=dt;
  if(b.yq&&b.yq.t<b.yq.T-BCY.lock&&o.hp>0){const q=b.yq,k=Math.min(1,dt*4);q.x1+=(o.x+q.jx-q.x1)*k;q.y1+=(o.y+q.jy-q.y1)*k}   // la marca del Yamato sigue al rival hasta los ultimos instantes
  GR.forEach(q=>{if(q.kind=='l'&&q.own===b.own&&q.jx!==undefined&&o.hp>0&&q.t<q.T-BCL.lock){const k=Math.min(1,dt*(o.ai?BCL.follow:BCL.followHuman));q.x1+=(o.x+q.jx-q.x1)*k;q.y1+=(o.y+q.jy-q.y1)*k}})   // la marca de cada laser persigue al rival hasta los ultimos instantes (como la del Yamato)
  b.nx-=dt;
  if(b.nx<=0&&!b.yq&&o.hp>0){if(b.vol<BCL.burst){bcLaser(b,o,b.vol);b.vol++;b.nx=BCL.gap}else{b.vol=0;b.nx=BCL.rest}}   // rafagas de laser (no mientras carga el Yamato)
  if(BCY.on&&!b.ydone&&!b.yq&&b.ft>=BCY.at&&o.hp>0&&b.ft+BCY.charge<BCC.stayT+.3)bcYamato(b,o);
  if(b.ft>=BCC.stayT&&!b.yq){b.ph='leave';b.lt=0;b.flash=Math.max(b.flash,.5);AUDIO.play('bc_leave')}
 }else{   // salida: sube, se agranda y se desvanece con otro destello
  b.lt+=dt;const u=Math.min(1,b.lt/BCC.leaveT);
  b.alt=BCC.alt+u*u*220;b.k=BCC.scale*(1+u*.9);b.al=1-u*u;
  if(u>=1){const m=b.music;BCR=null;if(m)AUDIO.playMusic('music_arena',true)}
 }
 if(b.beam){b.beam.t+=dt;if(b.beam.t>=b.beam.T)b.beam=null}
}

/* ---- bateria laser: un proyectil cae sobre el rival (marca en el suelo; el dano es de CONFIG.BC.laser.dmg) ---- */
function bcLaser(b,o,k){
 const sp=o.mv>0?CONFIG.SPEED[o.type]*(o.stim>0?1.5:1):0,j=cloaked(o)?DT.jit:0,sp2=k?BCL.spread:BCL.spread*.2,a=rnd(0,6.283),r=Math.sqrt(Math.random())*sp2;
 let tx=o.x+(o.mdx||0)*sp*BCL.flight*BCL.lead+Math.cos(a)*r+rnd(-j,j),ty=o.y+(o.mdy||0)*sp*BCL.flight*BCL.lead+Math.sin(a)*r*.6+rnd(-j,j);
 for(let i=0;i<8&&!inArena(tx,ty,2);i++){tx+=(CX-tx)*.15;ty+=(CY-ty)*.15}   // el impacto siempre cae dentro de la arena
 const d=bcDir(b,b.k),sd=(b.gi++&1)?1:-1,sy=bcSy(b),gx=b.x+d.fx*8*b.k+d.lx*sd*13*b.k,gy=sy+d.fy*8*b.k+d.ly*sd*13*b.k;
 GR.push({kind:'l',own:b.own,x0:b.x,y0:b.y,x1:tx,y1:ty,t:0,T:BCL.flight,sx:gx,sy:gy,jx:tx-o.x,jy:ty-o.y});
 b.mz=.09;b.mzx=gx;b.mzy=gy;AUDIO.play('bc_laser');burst(gx,gy,4,['#fff2a0','#ffb43a'],45);
}
function bcLaserLand(q){
 const x=q.x1,y=q.y1,R=BCL.radius;
 AUDIO.play('bc_laser_hit');gMini(x,y,0);burst(x,y-3,8,['#fff2a0','#ffb43a','#ff7a1a'],95);RG.push({x,y,R,life:.28,max:.28,c:'255,190,90'});shake=Math.max(shake,.12);
 F.forEach(f=>{if(f!==q.own&&f.hp>0&&!f.ghost&&inEll(f,x,y,R)){hurt(f,BCL.dmg,false,'#ffd98a');burst(f.x,f.y-6,6,['#e0503a','#ffb43a'],70)}});
 petsArea(x,y,R,BCL.dmg,q.own.side);
 L.forEach(l=>{if(!l.dead&&inEll(l,x,y,R))boom(l)});   // detona los zerglings que pille
}

/* ---- canon Yamato: carga con marca que sigue al rival, se fija y cae un disparo enorme (CONFIG.BC.yamato.dmg) ---- */
function bcYamato(b,o){
 const j=cloaked(o)?DT.jit:0,q={kind:'y',own:b.own,x0:b.x,y0:b.y,x1:o.x,y1:o.y,t:0,T:BCY.charge,jx:rnd(-j,j),jy:rnd(-j,j)};
 GR.push(q);b.yq=q;AUDIO.play('bc_yamato_charge');
 popups.push({x:b.x,y:bcSy(b)+28,txt:'YAMATO',c:'#ffcf5a',sz:12,life:1.2});
}
function bcYamatoLand(q){
 const x=q.x1,y=q.y1,R=BCY.radius,b=BCR;
 AUDIO.play('bc_yamato_fire');gBoomFx(x,y,R*1.25);shake=Math.max(shake,.8);
 RG.push({x,y,R:R*1.4,life:.5,max:.5,c:'255,210,120'},{x,y,R:R*2.2,life:.8,max:.8,c:'255,150,70'});
 burst(x,y-6,50,['#ffffff','#ffd98a','#ff7a1a'],220);
 if(b){b.yq=null;b.ydone=true;const d=bcDir(b,b.k);b.beam={t:0,T:.4,x:x,y:y,sx:b.x+d.fx*30*b.k,sy:bcSy(b)+d.fy*30*b.k}}
 F.forEach(f=>{if(f!==q.own&&f.hp>0&&!f.ghost&&inEll(f,x,y,R)){hurt(f,BCY.dmg,false,'#ffcf5a');burst(f.x,f.y-6,16,['#e0503a','#ffb43a','#ffffff'],110)}});
 petsArea(x,y,R,BCY.dmg,q.own.side);
 L.forEach(l=>{if(!l.dead&&inEll(l,x,y,R))boom(l)});
}

/* ---- dibujo ---- */
function bcDrawShadow(){   // sombra de la nave en el suelo: pequena y clara mientras esta lejos, grande al acercarse
 const b=BCR;if(!b||b.al<=0)return;
 const s=Math.max(.25,1-(b.alt-BCC.alt)/260);
 g.fillStyle='rgba(0,0,0,'+.36*b.al*s+')';g.beginPath();g.ellipse(b.x,b.y,36*BCC.scale*s,13*BCC.scale*s,0,0,7);g.fill();
}
function bcDraw(){
 const b=BCR;if(!b)return;
 const sx=Math.round(b.x),sy=Math.round(bcSy(b)),k=b.k,d=bcDir(b,k),im=BCIM[b.side?'roja':'azul'];
 g.save();g.globalCompositeOperation='lighter';
 if(b.ph=='enter'){const a=(1-b.ease)*.8*b.al,gr=g.createRadialGradient(sx,sy,0,sx,sy,70*k);gr.addColorStop(0,'rgba(170,225,255,'+a+')');gr.addColorStop(1,'rgba(90,160,255,0)');g.fillStyle=gr;g.fillRect(sx-70*k,sy-70*k,140*k,140*k)}   // resplandor del salto
 {const rx=sx-d.fx*30*k,ry=sy-d.fy*30*k*.9,r=(9+2*Math.sin(time*30))*k,gr=g.createRadialGradient(rx,ry,0,rx,ry,r);gr.addColorStop(0,'rgba(190,235,255,'+.55*b.al+')');gr.addColorStop(1,'rgba(90,160,255,0)');g.fillStyle=gr;g.fillRect(rx-r,ry-r,2*r,2*r)}   // brillo de los motores
 g.restore();
 // nave
 if(im.naturalWidth){
  const {fr,mir}=bcFrame(b.hd),sm=g.imageSmoothingEnabled;
  g.save();g.globalAlpha=Math.max(0,Math.min(1,b.al*b.occ));g.translate(sx,sy);if(mir)g.scale(-1,1);g.imageSmoothingEnabled=false;
  g.shadowColor=b.side?'rgba(255,120,90,.8)':'rgba(120,195,255,.8)';g.shadowBlur=12;   // borde luminoso del color del equipo: separa la nave del muro oscuro
  g.drawImage(im,fr*BCA.w,0,BCA.w,BCA.h,-BCA.w/2*k,-BCA.h/2*k,BCA.w*k,BCA.h*k);g.imageSmoothingEnabled=sm;g.restore();
 }
 g.save();g.globalCompositeOperation='lighter';
 // fogonazo de los canones al disparar el laser
 if(b.mz>0){const r=9,gr=g.createRadialGradient(b.mzx,b.mzy,0,b.mzx,b.mzy,r);gr.addColorStop(0,'rgba(255,245,190,.95)');gr.addColorStop(1,'rgba(255,150,40,0)');g.fillStyle=gr;g.fillRect(b.mzx-r,b.mzy-r,2*r,2*r)}
 // carga del Yamato: esfera de energia en la boca del canon, con chispas que se pliegan hacia ella
 if(b.yq){
  const u=Math.min(1,b.yq.t/b.yq.T),mx=sx+d.fx*30*k,my=sy+d.fy*30*k,r=(3+16*u*u)*(1+.12*Math.sin(time*40)),gr=g.createRadialGradient(mx,my,0,mx,my,r*2.2);
  gr.addColorStop(0,'rgba(255,255,235,'+(.6+.4*u)+')');gr.addColorStop(.35,'rgba(255,200,90,'+(.55+.3*u)+')');gr.addColorStop(1,'rgba(255,90,20,0)');g.fillStyle=gr;g.fillRect(mx-r*2.2,my-r*2.2,r*4.4,r*4.4);
  g.strokeStyle='rgba(255,225,150,'+(.4+.5*u)+')';g.lineWidth=1;g.beginPath();
  for(let i=0;i<7;i++){const a=i/7*6.283+time*3,r0=(1-u)*30+8;g.moveTo(mx+Math.cos(a)*r0,my+Math.sin(a)*r0*.75);g.lineTo(mx+Math.cos(a)*(r0-7),my+Math.sin(a)*(r0-7)*.75)}g.stroke();
 }
 // rayo del Yamato (un instante, de la boca del canon al impacto)
 if(b.beam){
  const q=b.beam,u=q.t/q.T,a=1-u,w=(1-u*.5);g.lineCap='round';
  [[22,'rgba(255,110,30,'+.35*a+')'],[11,'rgba(255,200,90,'+.7*a+')'],[4*w,'rgba(255,255,240,'+a+')']].forEach(([lw,c])=>{g.strokeStyle=c;g.lineWidth=lw*w;g.beginPath();g.moveTo(q.sx,q.sy);g.lineTo(q.x,q.y);g.stroke()});
 }
 g.restore();
}
function bcDrawProj(q){   // proyectil de laser en vuelo: de los canones de la nave al punto de impacto (el Yamato no se dibuja en vuelo: es la esfera de la nave y la marca del suelo)
 if(q.kind!='l')return;
 const u=q.t/q.T,hd=Math.min(1,u*1.05),tl=Math.max(0,u-.3),sx=q.sx,sy=q.sy,ex=q.x1,ey=q.y1;
 const hx=sx+(ex-sx)*hd,hy=sy+(ey-sy)*hd,tx=sx+(ex-sx)*tl,ty=sy+(ey-sy)*tl;
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
 [[5,'rgba(255,130,40,.38)'],[2.8,'rgba(255,215,110,.85)'],[1.2,'rgba(255,255,235,1)']].forEach(([lw,c])=>{g.strokeStyle=c;g.lineWidth=lw;g.beginPath();g.moveTo(tx,ty);g.lineTo(hx,hy);g.stroke()});
 g.restore();
}
function bcDrawMark(q){   // marca de impacto en el suelo: el laser parpadea y se cierra; el Yamato es grande, sigue al rival y se pone blanca al fijarse
 const u=q.t/q.T;
 if(q.kind=='l'){
  const R=BCL.radius,c=(Math.sin(q.t*34)>0)?'255,170,60':'255,235,170';
  g.strokeStyle='rgba('+c+',.9)';g.fillStyle='rgba(255,120,30,'+(.08+.14*u)+')';g.lineWidth=1;
  g.beginPath();g.ellipse(q.x1,q.y1,R,R*.6,0,0,7);g.fill();g.stroke();
  g.beginPath();g.ellipse(q.x1,q.y1,R*(1.7-.7*u),R*.6*(1.7-.7*u),0,0,7);g.stroke();return;
 }
 const R=BCY.radius,lk=q.t>q.T-BCY.lock,pu=lk?1:.5+.5*Math.sin(q.t*14),c=lk?'255,250,235':'255,70,40';
 g.fillStyle='rgba(255,60,30,'+(.06+.2*u)*(lk?1.3:1)+')';g.beginPath();g.ellipse(q.x1,q.y1,R,R*.6,0,0,7);g.fill();
 g.strokeStyle='rgba('+c+','+(.55+.4*pu)+')';g.lineWidth=lk?2:1.4;g.beginPath();g.ellipse(q.x1,q.y1,R,R*.6,0,0,7);g.stroke();
 g.beginPath();g.ellipse(q.x1,q.y1,R*(2.1-1.1*u),R*.6*(2.1-1.1*u),0,0,7);g.stroke();
 g.lineWidth=1.2;g.beginPath();g.moveTo(q.x1-R-6,q.y1);g.lineTo(q.x1-R*.4,q.y1);g.moveTo(q.x1+R*.4,q.y1);g.lineTo(q.x1+R+6,q.y1);g.moveTo(q.x1,q.y1-R*.6-4);g.lineTo(q.x1,q.y1-R*.25);g.moveTo(q.x1,q.y1+R*.25);g.lineTo(q.x1,q.y1+R*.6+4);g.stroke();
 g.fillStyle='rgba('+c+',.95)';g.fillRect(q.x1-1,q.y1-1,3,3);
}
const BCI=new Image();BCI.src=ASSETS.fx.bcIcon;   // icono de la baliza (capsula con el Battlecruiser)
const bcRnd=n=>{n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return((n^(n>>>14))>>>0)/4294967296};   // aleatorio estable a partir de una semilla: los rayos titilan a CONFIG.BC.elec.rate, no vibran en cada fotograma
function bcDrawElec(x,cy,S,it){   // rayos electricos: arcos que rodean la capsula y alguna descarga larga hacia fuera
 const E=BCC.elec;if(!E||!E.on)return;
 const k=Math.floor(time*E.rate),sd=it._s||(it._s=(Math.random()*1e9)|0);
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';g.lineJoin='round';
 const fl=bcRnd(sd+k*17);const hg=g.createRadialGradient(x,cy,0,x,cy,S*.95);hg.addColorStop(0,'rgba(170,230,255,'+(.10+.22*fl)+')');hg.addColorStop(1,'rgba(90,170,255,0)');g.fillStyle=hg;g.fillRect(x-S,cy-S,2*S,2*S);   // destello que acompana a las descargas
 for(let i=0;i<E.bolts;i++){
  const r=n=>bcRnd(sd+k*131+i*977+n*7919);
  if(r(0)>E.vis)continue;
  const a0=r(1)*6.283,lg=r(2)<.35,a1=lg?a0+(r(3)-.5)*.5:a0+(.5+r(3)*.9)*(r(4)<.5?-1:1),r0=S*.5,r1=lg?S*(.95+r(5)*.35):S*(.58+r(5)*.18),N=7,pts=[];
  for(let n=0;n<=N;n++){
   const u=n/N,a=a0+(a1-a0)*u,rr=r0+(r1-r0)*u+(lg?0:S*.09*Math.sin(Math.PI*u)),e=n==0||n==N?0:E.jit*(r(10+n)*2-1);   // los extremos no se tuercen
   pts.push([Math.round(x+Math.cos(a)*rr*.9+Math.cos(a+1.5708)*e),Math.round(cy+Math.sin(a)*rr+Math.sin(a+1.5708)*e)]);
  }
  for(const[w,c]of[[3,'rgba(80,190,255,.22)'],[1.1,'rgba(225,246,255,.95)']]){g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let n=1;n<=N;n++)g.lineTo(pts[n][0],pts[n][1]);g.stroke()}
  const q=pts[N];g.fillStyle='rgba(235,250,255,.9)';g.fillRect(q[0]-1,q[1]-1,2,2);   // chispa en la punta
 }
 g.restore();
}
function bcDrawItem(x,y,yy,it){   // la baliza: columna de luz, anillo en el suelo y la capsula con el Battlecruiser flotando, rodeada de rayos
 const t=time,S=BCC.iconSize||32,cy=yy-S/2-3+Math.sin(t*4)*.6;
 g.save();g.globalCompositeOperation='lighter';
 const gr=g.createLinearGradient(0,y-80,0,y);gr.addColorStop(0,'rgba(120,200,255,0)');gr.addColorStop(1,'rgba(160,228,255,'+(.3+.1*Math.sin(t*6))+')');g.fillStyle=gr;g.fillRect(x-4,y-80,8,80);
 const rr=9+3*Math.sin(t*5);g.strokeStyle='rgba(140,215,255,.9)';g.lineWidth=1;g.beginPath();g.ellipse(x,y,rr,rr*.5,0,0,7);g.stroke();g.beginPath();g.ellipse(x,y,rr*1.5,rr*.75,0,0,7);g.globalAlpha=.4;g.stroke();g.globalAlpha=1;
 const hg=g.createRadialGradient(x,cy,0,x,cy,S*.8);hg.addColorStop(0,'rgba(150,215,255,'+(.4+.15*Math.sin(t*7))+')');hg.addColorStop(1,'rgba(90,160,255,0)');g.fillStyle=hg;g.fillRect(x-S,cy-S,2*S,2*S);
 g.restore();
 if(BCI.naturalWidth){const sm=g.imageSmoothingEnabled,q=g.imageSmoothingQuality;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(BCI,x-S/2,cy-S/2,S,S);g.imageSmoothingEnabled=sm;g.imageSmoothingQuality=q}
 else{const im=BCIM.azul,w=BCA.w*.26,h=BCA.h*.26;   // respaldo si el icono no carga: la mini nave de antes
  if(im.naturalWidth){const sm=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;g.drawImage(im,8*BCA.w,0,BCA.w,BCA.h,x-w/2,cy-h/2,w,h);g.imageSmoothingEnabled=sm}
  else{g.fillStyle='#9fd8ff';g.fillRect(x-6,cy-2,12,5)}}
 bcDrawElec(x,cy,S,it);
}
function bcDrawOverlay(){   // cine: tinte azul, franjas, destello y cartel. Se dibuja encima de todo
 const b=BCR;if(!b)return;
 const e=BCC.enterT;
 if(b.t<e+.5){
  const k=Math.min(Math.min(1,b.t/.35),Math.min(1,Math.max(0,(e+.45-b.t)/.45)));
  g.fillStyle='rgba(8,24,52,'+.28*k+')';g.fillRect(-8,-8,W+16,H+16);
  if(BCC.bars){const h=15*k;g.fillStyle='#000';g.fillRect(-8,-8,W+16,h+8);g.fillRect(-8,H-h,W+16,h+8)}
 }
 if(b.flash>0){g.fillStyle='rgba(205,235,255,'+Math.min(1,b.flash)*.6+')';g.fillRect(-8,-8,W+16,H+16)}
 if(b.t>.3&&b.t<e+.1){
  g.globalAlpha=Math.min(1,Math.max(0,(e+.1-b.t)/.5));
  banner('BATTLECRUISER',36,b.t-.3,['#ffffff','#a9dcff','#2f6fd6'],CY-2);
  g.font="700 15px Rajdhani,sans-serif";g.textAlign='center';g.fillStyle='#bfe3ff';g.fillText('OPERACIONAL',CX,CY+22);g.globalAlpha=1;
 }
}
