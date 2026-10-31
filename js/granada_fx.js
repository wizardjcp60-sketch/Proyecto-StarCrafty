/* ==========================================================================
   granada_fx.js - GRANADA Y EXPLOSION DEL MARINE (solo visual y sonido)
   Se carga ANTES de game.js. Usa las variables de game.js (g, rnd, pick, GR,
   shake, time...) solo dentro de funciones, asi que el orden no importa al ejecutar.
   Ajustes en CONFIG.GFX (js/config.js). CONFIG.GFX.on=false vuelve a la granada de antes.
   NO cambia dano, radio ni tiempos: solo como se ve y como suena.
   ========================================================================== */
const GFX=CONFIG.GFX;
let BX=[],GSTOP=0,GFLASH=0;   // BX = efectos de la explosion; GSTOP = congelado de impacto; GFLASH = destello de pantalla

const gN=n=>Math.max(1,Math.round(n*(GFX.quality||1)));
const gLerp=(a,b,t)=>a+(b-a)*t;
function gCol(st,u){   // st = [[u,r,g,b],...] -> 'r,g,b' interpolado
 for(let i=1;i<st.length;i++)if(u<=st[i][0]){const a=st[i-1],b=st[i],k=(u-a[0])/(b[0]-a[0]||1);return(gLerp(a[1],b[1],k)|0)+','+(gLerp(a[2],b[2],k)|0)+','+(gLerp(a[3],b[3],k)|0)}
 const l=st[st.length-1];return l[1]+','+l[2]+','+l[3];
}
const FIRE=[[0,255,250,225],[.22,255,205,85],[.5,255,110,32],[.8,160,45,20],[1,60,26,16]];
const SMOKE=[[0,170,128,98],[.25,128,112,104],[1,84,80,88]];   // humo calido que se enfria (claro para verse sobre el suelo oscuro)
const gZ=(q,v)=>(q.zm||22)*Math.sin(Math.PI*v)+10;   // altura de la granada en el arco

/* ---- constructores de particulas ---- */
function gPuff(o){BX.push(Object.assign({k:'puff',kind:'smoke',z:0,vx:0,vy:0,vz:0,gr:0,t:0,T:.5,r:4,a:1,sq:1,drag:1.2},o))}
function gSpark(o){BX.push(Object.assign({k:'spark',z:0,vx:0,vy:0,vz:0,t:0,T:.8,g:380,bn:0,w:1,c:'255,200,90'},o))}
function gChunk(o){BX.push(Object.assign({k:'chunk',z:0,vx:0,vy:0,vz:0,t:0,T:1,g:380,bn:0,rot:rnd(0,6.28),vr:rnd(-14,14),s:2,c:'#4a3f36'},o))}

/* ---- Lanzamiento: soplido de humo en la mano y altura del arco ---- */
function gThrowFx(f,q){
 const d=Math.hypot(q.x1-q.x0,q.y1-q.y0);
 q.zm=(22+Math.min(26,d*.14))*GFX.arc;q.sd=rnd(0,6.28);q.h=[];
 for(let i=0;i<gN(3);i++)gPuff({x:f.x,y:f.y,z:11,vx:rnd(-14,14),vy:rnd(-8,8),vz:rnd(5,20),r:2,gr:8,T:rnd(.3,.5),a:.5});
 for(let i=0;i<gN(4);i++)gSpark({x:f.x,y:f.y,z:11,vx:rnd(-40,40),vy:rnd(-25,25),vz:rnd(20,70),T:rnd(.2,.4),c:'255,215,120'});
}

/* ---- Explosion principal ---- */
function gBoomFx(x,y,R){
 GSTOP=GFX.stop;GFLASH=GFX.flash;shake=Math.max(shake,GFX.shake);
 BX.push({k:'flash',x,y,R:R*1.9,t:0,T:.14});
 BX.push({k:'glow',x,y,R:R*2.6,t:0,T:.75});
 BX.push({k:'ring',x,y,R:R*1.55,t:0,T:.34,c:'255,220,150',w:5});
 BX.push({k:'ring',x,y,R:R*2.3,t:-.05,T:.55,c:'255,150,70',w:3});
 BX.push({k:'ring',x,y,R:R*3.1,t:-.1,T:.8,c:'200,170,140',w:1.5});
 BX.push({k:'scorch',x,y,R:R*.95,t:0,T:GFX.scorchT,sd:rnd(0,6.28),pts:Array.from({length:14},()=>rnd(.78,1.18)),cr:Array.from({length:9},(_,i)=>({a:i*.7+rnd(-.3,.3),l:rnd(.5,1.15)}))});
 // bola de fuego: nucleo + hongo que sube
 for(let i=0;i<gN(11);i++){const a=rnd(0,6.28),d=rnd(0,R*.4);gPuff({kind:'fire',x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*.6,z:rnd(0,8),vx:Math.cos(a)*rnd(0,35),vy:Math.sin(a)*rnd(0,18),vz:rnd(35,110),r:rnd(7,12),gr:rnd(26,44),T:rnd(.38,.62),t:-rnd(0,.05)})}
 for(let i=0;i<gN(7);i++)gPuff({kind:'fire',x:x+rnd(-8,8),y:y+rnd(-5,5),z:rnd(8,18),vx:rnd(-16,16),vy:rnd(-8,8),vz:rnd(90,170),r:rnd(5,9),gr:rnd(18,32),T:rnd(.45,.8),t:-rnd(.03,.12)});
 for(let i=0;i<gN(16);i++){const a=i/gN(16)*6.283+rnd(-.2,.2);gPuff({kind:'fire',x:x+Math.cos(a)*R*.5,y:y+Math.sin(a)*R*.3,z:2,vx:Math.cos(a)*rnd(55,95),vy:Math.sin(a)*rnd(32,56),vz:rnd(5,30),r:rnd(3.5,6),gr:rnd(10,22),T:rnd(.28,.46),sq:.75})}
 // humo oscuro que se eleva y se abre arriba
 for(let i=0;i<gN(15);i++){const up=i/15;gPuff({kind:'smoke',x:x+rnd(-9,9),y:y+rnd(-5,5),z:rnd(4,14),vx:rnd(-10,10)*(1+up*1.6),vy:rnd(-5,5),vz:rnd(22,58)*GFX.smoke,r:rnd(6,10),gr:rnd(11,18),T:rnd(1.2,2.1)*GFX.smoke,t:-rnd(.04,.4),a:rnd(.6,.95)})}
 // polvo que sale en anillo por el suelo
 for(let i=0;i<gN(18);i++){const a=i/gN(18)*6.283+rnd(-.15,.15),v=rnd(95,170);gPuff({kind:'dust',x:x+Math.cos(a)*R*.4,y:y+Math.sin(a)*R*.25,z:1,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.6,vz:rnd(0,12),r:rnd(3,5),gr:rnd(16,26),T:rnd(.5,.85),sq:.55,drag:2.6,a:.8})}
 // chispas incandescentes (rebotan en el suelo)
 for(let i=0;i<gN(46);i++){const a=rnd(0,6.283),v=rnd(80,270);gSpark({x,y,z:rnd(2,12),vx:Math.cos(a)*v,vy:Math.sin(a)*v*.6,vz:rnd(60,210),T:rnd(.5,1.15),c:pick(['255,244,180','255,190,70','255,120,35']),w:rnd(.8,1.5)})}
 // brasas que suben flotando
 for(let i=0;i<gN(12);i++){const a=rnd(0,6.283),d=rnd(0,R*.7);gSpark({x:x+Math.cos(a)*d,y:y+Math.sin(a)*d*.6,z:rnd(2,14),vx:rnd(-12,12),vy:rnd(-6,6),vz:rnd(15,45),g:-14,T:rnd(1,1.9),w:1,dot:1,c:'255,140,50',t:-rnd(0,.25)})}
 // escombros del suelo del coliseo
 for(let i=0;i<gN(13);i++){const a=rnd(0,6.283),v=rnd(45,160);gChunk({x,y,z:rnd(1,8),vx:Math.cos(a)*v,vy:Math.sin(a)*v*.6,vz:rnd(95,200),T:rnd(.8,1.35),s:rnd(1.6,3.2),c:pick(['#2a2420','#4a3f36','#6a5a50','#3d4654'])})}
 // explosiones secundarias (reventones encadenados)
 if(GFX.secondary)for(let i=0;i<3;i++){const a=rnd(0,6.283),d=rnd(R*.25,R*.75);gMini(x+Math.cos(a)*d,y+Math.sin(a)*d*.6,.07+i*.085)}
}
function gMini(x,y,dl){
 BX.push({k:'flash',x,y,R:16,t:-dl,T:.1});
 for(let i=0;i<gN(5);i++)gPuff({kind:'fire',x:x+rnd(-3,3),y:y+rnd(-2,2),z:rnd(0,6),vx:rnd(-24,24),vy:rnd(-12,12),vz:rnd(30,80),r:rnd(3,6),gr:rnd(14,26),T:rnd(.25,.45),t:-dl});
 for(let i=0;i<gN(9);i++){const a=rnd(0,6.283),v=rnd(50,170);gSpark({x,y,z:4,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.6,vz:rnd(40,140),T:rnd(.35,.8),c:pick(['255,230,150','255,160,60']),t:-dl})}
 gPuff({kind:'smoke',x,y,z:6,vz:rnd(25,45),r:4,gr:9,T:.9,t:-dl,a:.7});
}

/* ---- Actualizacion (se llama desde updP) ---- */
function gUpd(dt){
 if(GFX.on)for(const q of GR){
  if(q.kind!='g')continue;
  const v=Math.min(1,q.t/q.T),x=q.x0+(q.x1-q.x0)*v,y=q.y0+(q.y1-q.y0)*v,z=gZ(q,v);
  (q.h=q.h||[]).push({x,y:y-z});if(q.h.length>14)q.h.shift();
  q.em=(q.em||0)+dt;
  while(q.em>.02){q.em-=.02;gSpark({x,y,z,vx:rnd(-16,16),vy:rnd(-9,9),vz:rnd(-10,35),T:rnd(.25,.5),g:210,c:'255,190,70'})}
  q.sm=(q.sm||0)+dt;
  if(q.sm>.045){q.sm=0;gPuff({x,y,z,vz:rnd(4,12),r:1.6,gr:6.5,T:.5,a:.4})}
 }
 for(const b of BX){
  b.t+=dt;if(b.t<0)continue;
  if(b.k=='spark'||b.k=='chunk'){
   b.vz-=b.g*dt;b.z+=b.vz*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
   if(b.z<0&&b.g>0){b.z=0;if(b.bn<2){b.vz=-b.vz*.38;b.vx*=.55;b.vy*=.55;b.bn++}else{b.vz=0;b.vx*=Math.max(0,1-9*dt);b.vy*=Math.max(0,1-9*dt)}}
   if(b.k=='chunk'){b.rot+=b.vr*dt;b.tr=(b.tr||0)+dt;if(b.tr>.055&&b.t<b.T*.55){b.tr=0;gPuff({x:b.x,y:b.y,z:b.z,r:1.4,gr:5,T:.4,a:.45})}}
  }else if(b.k=='puff'){
   const d=Math.max(0,1-b.drag*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;b.vx*=d;b.vy*=d;b.vz*=Math.max(0,1-.9*dt);b.r+=b.gr*dt;b.gr*=Math.max(0,1-1.4*dt);
  }
 }
 BX=BX.filter(b=>b.t<b.T);
 GFLASH=Math.max(0,GFLASH-dt*3);
}

/* ---- Dibujo del suelo: mancha de quemado y luz del fogonazo (bajo los personajes) ---- */
function gDrawFloor(){
 for(const b of BX){
  if(b.t<0)continue;
  if(b.k=='glow'){const u=b.t/b.T,a=Math.pow(1-u,1.6)*.48;g.save();g.globalCompositeOperation='lighter';g.translate(b.x,b.y);g.scale(1,.6);const gr=g.createRadialGradient(0,0,0,0,0,b.R);gr.addColorStop(0,'rgba(255,170,70,'+a+')');gr.addColorStop(.5,'rgba(255,100,30,'+a*.4+')');gr.addColorStop(1,'rgba(255,60,10,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,b.R,0,7);g.fill();g.restore()}
  else if(b.k=='scorch'){
   const u=b.t/b.T,al=u<.7?1:1-(u-.7)/.3,ig=Math.max(0,1-b.t/1.5);
   g.save();g.translate(b.x,b.y);g.scale(1,.6);
   g.beginPath();b.pts.forEach((m,i)=>{const a=i/b.pts.length*6.283,px=Math.cos(a)*b.R*m,py=Math.sin(a)*b.R*m;i?g.lineTo(px,py):g.moveTo(px,py)});g.closePath();
   const gr=g.createRadialGradient(0,0,0,0,0,b.R*1.15);gr.addColorStop(0,'rgba(6,4,3,'+.85*al+')');gr.addColorStop(.6,'rgba(18,11,8,'+.6*al+')');gr.addColorStop(1,'rgba(30,20,14,0)');g.fillStyle=gr;g.fill();
   g.lineCap='round';
   b.cr.forEach(c=>{const l=b.R*c.l,x2=Math.cos(c.a)*l,y2=Math.sin(c.a)*l,mx=x2*.5+Math.sin(c.a*5)*3,my=y2*.5+Math.cos(c.a*5)*3;
    g.strokeStyle='rgba(8,5,4,'+.7*al+')';g.lineWidth=1.3;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(mx,my,x2,y2);g.stroke();
    if(ig>0){g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,'+(110+60*ig|0)+',30,'+ig*(.55+.3*Math.sin(time*40+c.a*9))+')';g.lineWidth=.9;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(mx,my,x2,y2);g.stroke();g.restore()}});
   g.restore();
  }
 }
}

/* ---- Dibujo de la explosion (sobre los personajes) ---- */
function gDrawFx(){
 if(!BX.length)return;
 // 1) humo y polvo (mezcla normal)
 for(const b of BX){
  if(b.t<0||b.k!='puff'||b.kind=='fire')continue;
  const u=b.t/b.T,r=Math.max(.5,b.r),px=b.x,py=b.y-b.z;
  g.save();g.translate(px,py);g.scale(1,b.kind=='dust'?b.sq:.9);
  if(b.kind=='dust'){const a=.4*(1-u)*b.a,gr=g.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,'rgba(150,125,95,'+a+')');gr.addColorStop(1,'rgba(150,125,95,0)');g.fillStyle=gr}
  else{const a=Math.min(1,b.t/.07)*Math.pow(1-u,1.1)*.88*b.a,c=gCol(SMOKE,u),gr=g.createRadialGradient(-r*.15,-r*.2,0,0,0,r);gr.addColorStop(0,'rgba('+c+','+a+')');gr.addColorStop(.6,'rgba('+c+','+a*.7+')');gr.addColorStop(1,'rgba('+c+',0)');g.fillStyle=gr}
  g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore();
 }
 // 2) escombros
 for(const b of BX){
  if(b.t<0||b.k!='chunk')continue;
  const u=b.t/b.T;
  if(b.z>1){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(b.x,b.y,b.s*.8,b.s*.4,0,0,7);g.fill()}
  g.save();g.globalAlpha=u<.7?1:1-(u-.7)/.3;g.translate(b.x,b.y-b.z);g.rotate(b.rot);g.fillStyle=b.c;g.fillRect(-b.s/2,-b.s/2,b.s,b.s*.7);g.restore();
 }
 // 3) todo lo que brilla (suma de luz)
 g.save();g.globalCompositeOperation='lighter';
 for(const b of BX){
  if(b.t<0)continue;
  const u=b.t/b.T;
  if(b.k=='puff'&&b.kind=='fire'){
   const a=Math.min(1,(1-u)*1.5)*.7,c=gCol(FIRE,u),r=Math.max(.5,b.r);
   g.save();g.translate(b.x,b.y-b.z);g.scale(1,b.sq*.92);
   const gr=g.createRadialGradient(0,0,0,0,0,r);gr.addColorStop(0,'rgba('+c+','+a+')');gr.addColorStop(.55,'rgba('+c+','+a*.55+')');gr.addColorStop(1,'rgba('+c+',0)');
   g.fillStyle=gr;g.beginPath();g.arc(0,0,r,0,7);g.fill();g.restore();
  }else if(b.k=='flash'){
   const a=Math.pow(1-u,1.4),r=b.R*(.55+.7*u),cy=b.y-8;
   const gr=g.createRadialGradient(b.x,cy,0,b.x,cy,r);gr.addColorStop(0,'rgba(255,255,245,'+a+')');gr.addColorStop(.35,'rgba(255,225,150,'+a*.7+')');gr.addColorStop(1,'rgba(255,140,40,0)');
   g.fillStyle=gr;g.beginPath();g.arc(b.x,cy,r,0,7);g.fill();
  }else if(b.k=='ring'){
   const e=1-Math.pow(1-u,3),rr=b.R*e,a=Math.pow(1-u,1.3);
   g.strokeStyle='rgba('+b.c+','+a*.85+')';g.lineWidth=Math.max(.6,b.w*(1-u));
   g.beginPath();g.ellipse(b.x,b.y,rr,rr*.6,0,0,7);g.stroke();
   g.strokeStyle='rgba(255,255,235,'+a*.55+')';g.lineWidth=Math.max(.4,b.w*.35*(1-u));
   g.beginPath();g.ellipse(b.x,b.y,rr*.96,rr*.6*.96,0,0,7);g.stroke();
  }else if(b.k=='spark'){
   const a=Math.min(1,(1-u)*2.2),py=b.y-b.z;
   if(b.dot){const gr=g.createRadialGradient(b.x,py,0,b.x,py,3);gr.addColorStop(0,'rgba('+b.c+','+a*(.6+.4*Math.sin(time*30+b.x))+')');gr.addColorStop(1,'rgba('+b.c+',0)');g.fillStyle=gr;g.fillRect(b.x-3,py-3,6,6)}
   else{g.strokeStyle='rgba('+b.c+','+a+')';g.lineWidth=b.w;g.beginPath();g.moveTo(b.x-b.vx*.028,b.y-b.vy*.028-(b.z-b.vz*.028));g.lineTo(b.x,py);g.stroke();g.fillStyle='rgba(255,255,230,'+a+')';g.fillRect(b.x-.5,py-.5,1,1)}
  }
 }
 g.restore();
}
function gFlashScreen(){if(GFLASH>0){g.fillStyle='rgba(255,228,170,'+(GFLASH*.5)+')';g.fillRect(-8,-8,W+16,H+16)}}

/* ---- Granada en vuelo ---- */
function gDrawGrenade(q){
 const u=Math.min(1,q.t/q.T),x=q.x0+(q.x1-q.x0)*u,y=q.y0+(q.y1-q.y0)*u,z=gZ(q,u),sy=y-z,sp=(q.sd||0)+q.t*22;
 const sh=1-Math.min(.5,z/90);
 g.fillStyle='rgba(0,0,0,'+.4*sh+')';g.beginPath();g.ellipse(x,y,3.6*sh+.5,1.8*sh+.3,0,0,7);g.fill();
 // estela de fuego
 const h=q.h||[];
 g.save();g.globalCompositeOperation='lighter';g.lineCap='round';
 for(let i=1;i<h.length;i++){const k=i/h.length;g.strokeStyle='rgba(255,'+(120+90*k|0)+',50,'+.5*k+')';g.lineWidth=.5+2*k;g.beginPath();g.moveTo(h[i-1].x,h[i-1].y);g.lineTo(h[i].x,h[i].y);g.stroke()}
 const pu=.75+.25*Math.sin(q.t*40),gl=g.createRadialGradient(x,sy,0,x,sy,8);gl.addColorStop(0,'rgba(255,170,60,'+.38*pu+')');gl.addColorStop(1,'rgba(255,120,20,0)');g.fillStyle=gl;g.fillRect(x-8,sy-8,16,16);
 g.restore();
 // cuerpo
 const bg=g.createRadialGradient(x-1,sy-1.2,.3,x,sy,3.4);bg.addColorStop(0,'#98ad66');bg.addColorStop(.55,'#586b3a');bg.addColorStop(1,'#222c14');
 g.fillStyle=bg;g.beginPath();g.arc(x,sy,3.3,0,7);g.fill();
 g.save();g.beginPath();g.arc(x,sy,3.3,0,7);g.clip();   // banda que gira
 const bx=Math.cos(sp)*2.4,bw=.5+Math.abs(Math.sin(sp))*1.2;g.fillStyle='rgba(20,26,12,.75)';g.fillRect(x+bx-bw/2,sy-4,bw,8);g.fillRect(x-4,sy+Math.sin(sp*.7)*.9,8,.7);
 g.restore();
 g.fillStyle='#8c9186';g.fillRect(x-1.2,sy-4.6,2.4,1.7);g.fillStyle='#c8ccc0';g.fillRect(x-1.2,sy-4.6,2.4,.5);   // tapa
 g.strokeStyle='#d0b050';g.lineWidth=.5;g.beginPath();g.arc(x+1.8,sy-4.2,1.1,0,7);g.stroke();   // anillo de la espoleta
 g.fillStyle='rgba(255,255,255,.85)';g.fillRect(x-1.6,sy-1.8,.8,.8);   // brillo
 // luz de la espoleta: parpadea mas rapido al acercarse
 const per=gLerp(.3,.06,u);
 if(Math.cos(sp)>-.35&&((q.t/per)%1)<.55){g.save();g.globalCompositeOperation='lighter';const lx=x+Math.cos(sp)*1.1,ly=sy-.3,lg=g.createRadialGradient(lx,ly,0,lx,ly,4.5);lg.addColorStop(0,'rgba(255,70,40,.9)');lg.addColorStop(1,'rgba(255,40,20,0)');g.fillStyle=lg;g.fillRect(lx-4.5,ly-4.5,9,9);g.fillStyle='#ffd0b0';g.fillRect(lx-.5,ly-.5,1,1);g.restore()}
}

/* ---- Marca de caida: sustituye al circulo punteado ---- */
function gDrawMark(q){
 const u=Math.min(1,q.t/q.T),R=CONFIG.GRENADE_RADIUS,x=q.x1,y=q.y1,pu=.5+.5*Math.sin(time*16);
 g.save();g.lineCap='butt';
 g.fillStyle='rgba(255,90,30,'+(.05+.13*u)+')';g.beginPath();g.ellipse(x,y,R,R*.6,0,0,7);g.fill();
 g.strokeStyle='rgba(255,170,70,.8)';g.lineWidth=1;g.setLineDash([3,3]);g.lineDashOffset=-time*18;   // anillo exterior que se cierra
 g.beginPath();g.ellipse(x,y,R*(1.55-.55*u),R*.6*(1.55-.55*u),0,0,7);g.stroke();g.setLineDash([]);
 g.strokeStyle='rgba(255,'+(110+80*u|0)+',50,'+(.6+.3*pu)+')';g.lineWidth=1.3;   // arco de cuenta atras
 g.beginPath();g.ellipse(x,y,R,R*.6,0,-Math.PI/2,-Math.PI/2+6.283*u);g.stroke();
 g.strokeStyle='rgba(255,120,60,.3)';g.lineWidth=.8;g.beginPath();g.ellipse(x,y,R,R*.6,0,0,7);g.stroke();
 g.strokeStyle='rgba(255,'+(160-80*u|0)+',70,'+(.55+.35*pu)+')';g.lineWidth=1;   // mira central
 for(let i=0;i<4;i++){const a=i*1.5708+Math.PI/4+u*1.2;g.beginPath();g.moveTo(x+Math.cos(a)*3,y+Math.sin(a)*1.8);g.lineTo(x+Math.cos(a)*7,y+Math.sin(a)*4.2);g.stroke()}
 g.fillStyle='rgba(255,230,180,'+(.6+.4*pu)+')';g.fillRect(x-.5,y-.5,1.5,1.5);
 g.restore();
}
