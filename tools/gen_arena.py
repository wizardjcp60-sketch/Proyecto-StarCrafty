"""
gen_arena.py - genera el fondo del coliseo (assets/images/background/arena_generada.jpg)

Uso (desde la carpeta tools):   python gen_arena.py
Requiere:  pip install numpy scipy pillow
Cambia semillas, colores y umbrales para obtener otra version. La elipse jugable
(CX, CY, RX, RY) debe coincidir con las constantes del juego en js/game.js.
Al final imprime las posiciones de los braseros para CONFIG.TORCHES (js/config.js).
"""
import numpy as np
from scipy import ndimage as ndi
from PIL import Image, ImageDraw, ImageFilter
H,W=540,960
CX,CY,RX,RY=480,292,330,168               # elipse jugable (no cambiar: coincide con el juego)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
R=np.random.default_rng(7)
def nz(sig,seed):
    r=np.random.default_rng(seed);n=ndi.gaussian_filter(r.random((H,W)).astype(np.float32),sig,mode='wrap')
    return (n-n.min())/(n.max()-n.min()+1e-9)
def fbm(base,seed,octs=4):
    t=0;a=1;s=0
    for i in range(octs):t=t+a*nz(max(.6,base/2**i),seed+i);s+=a;a*=.5
    return t/s
def ridge(n):return 1-np.abs(2*n-1)
def ell(i,k=1.0):                         # radio eliptico del escenario con tier i
    return np.sqrt(((xx-CX)/(RX+24*i))**2+((yy-(CY+5*i))/(RY+15*i))**2)
def mix(a,b,t):return a*(1-t[...,None])+b*t[...,None]
def col(h):return np.array([int(h[i:i+2],16) for i in (1,3,5)],np.float32)
img=np.zeros((H,W,3),np.float32)
# ---------- 1) roca volcanica (Char) + lava
base=fbm(18,10);det=fbm(3,20,3);cr=ridge(fbm(30,30,3))
rock=mix(np.broadcast_to(col('#140b0b'),(H,W,3)).copy(),np.broadcast_to(col('#4a2a20'),(H,W,3)).copy(),np.clip(base*.8+det*.35,0,1))
lava_mask=np.clip((cr-.962)*70,0,1)*(base>.42)
glow=ndi.gaussian_filter(lava_mask,6)
img=rock*(1-lava_mask[...,None]*.9)+lava_mask[...,None]*col('#ff7a1a')*1.0
img+=glow[...,None]*col('#ff4a10')*.32
dk=ridge(fbm(9,45,3));img*=(1-.55*np.clip((dk-.93)*25,0,1))[...,None]*(1-lava_mask[...,None]*0)
img*=(.62+.55*nz(1.6,40))[...,None]
# ---------- 2) gradas de piedra con bloques
def stone(i):
    n=fbm(4,100+i,3);base=np.clip(.35+.5*n,0,1)
    return mix(np.broadcast_to(col('#2a2321'),(H,W,3)).copy(),np.broadcast_to(col('#7b6a5c'),(H,W,3)).copy(),base)
for i in range(4,0,-1):
    m=ell(i)<=1.0
    th=np.arctan2((yy-(CY+5*i))/(RY+15*i),(xx-CX)/(RX+24*i))
    r_in=ell(i-1) if i>1 else ell(0)
    band=np.clip((ell(i)-r_in*0)/1,0,1)
    st=stone(i)
    # bloques: cuadricula en coordenadas polares
    seg=(th+np.pi)/(2*np.pi)*(30+8*i)
    bid=np.floor(seg);edge=np.abs(seg-np.round(seg))
    hid=np.sin(bid*12.9898+i*78.233)*43758.5453;hid=hid-np.floor(hid)
    st*= (0.82+.36*hid)[...,None]
    st*= (1-.45*np.clip(1-edge/.05,0,1))[...,None]
    # altura de gradas: luz arriba
    shade=1.12-0.30*(yy-(CY-RY-15*i))/(2*(RY+15*i))
    st*=shade[...,None]
    # borde exterior iluminado / sombra interior
    e=ell(i)
    st*=(1+.35*np.clip((e-.93)/.07,0,1))[...,None]
    st*=(1-.35*np.clip((.0+ (ell(i-1) if i>1 else 0)),0,1)*0)[...,None]
    img=np.where(m[...,None],st,img)
    # sombra proyectada sobre la grada inferior (fuera)
    sh=ndi.gaussian_filter((m).astype(np.float32),5)
    img=np.where((~m)[...,None],img*(1-.35*sh[...,None]),img)
# ---------- 3) pared interior lejana (cara vertical con arcos)
fl=ell(0)
top=(yy<CY)&(ell(1)<=1.0)&(fl>1.0)
wall=np.clip(.45+.5*fbm(3,200,3),0,1)
wc=mix(np.broadcast_to(col('#241d1c'),(H,W,3)).copy(),np.broadcast_to(col('#6f6054'),(H,W,3)).copy(),wall)
course=np.floor((yy)/7);hh=np.sin(course*91.7)*43758.5;hh=hh-np.floor(hh)
joint=np.abs(((xx+hh*30)%26)-13)
wc*=(1-.5*(np.abs((yy%7)-3.5)>3.2))[...,None]
wc*=(1-.5*(joint>11.8))[...,None]
wc*=(.55+.45*np.clip((fl-1.0)/.12,0,1))[...,None]*.9
img=np.where(top[...,None],wc,img)
# ---------- 4) suelo
floor=fl<=1.0
fx,fy=xx-CX,yy-CY
# 4a) neutro: roca oscura agrietada
nb=fbm(10,300,4);nd=fbm(2,310,3)
neutral=mix(np.broadcast_to(col('#2b2224'),(H,W,3)).copy(),np.broadcast_to(col('#56443d'),(H,W,3)).copy(),np.clip(nb*.9+nd*.2,0,1))
crack=ridge(fbm(14,320,3));neutral*=(1-.5*np.clip((crack-.94)*30,0,1))[...,None]
# 4b) plataforma Terran (izquierda): placas de acero 32px
TX,TY=32,19
tx=np.floor((xx-CX+TX*20)/TX);ty=np.floor((yy-CY+TY*20)/TY)
tid=np.sin(tx*127.1+ty*311.7)*43758.5453;tid=tid-np.floor(tid)
steel=np.broadcast_to(col('#3a4351'),(H,W,3)).copy()*(0.78+.4*tid)[...,None]
lx=(xx-CX+TX*20)%TX;ly=(yy-CY+TY*20)%TY
bev=np.zeros((H,W),np.float32)
bev+= (ly<2)*.35 + (lx<2)*.22
bev-= (ly>=TY-2)*.38 + (lx>=TX-2)*.28    # sombra abajo/derecha
steel*= (1+bev)[...,None]
# placa de diamante en algunas
dia=(tid>.62)
dpat=((lx+ly*1.6)%8<2.2)|((lx-ly*1.6)%8<2.2)
steel=np.where((dia&dpat)[...,None],steel*1.18,steel)
# remaches
for ox,oy in ((5,4),(TX-6,4),(5,TY-5),(TX-6,TY-5)):
    d=np.hypot(lx-ox,ly-oy);steel*=(1+.45*np.clip(1-d/2.6,0,1)-.35*np.clip(1-np.abs(d-3.4)/1.2,0,1)*0)[...,None]
steel*=(.86+.28*fbm(6,400,3))[...,None]
# desgaste y manchas de aceite
wear=np.clip((fbm(5,410,3)-.62)*3,0,1);steel*=(1-.45*wear)[...,None]
# franja de peligro amarilla/negra junto a la linea central
hz=np.abs(fx+26)<7
stripe=(((xx+yy*1.6)//9)%2)==0
hzc=np.where(stripe[...,None],col('#d9a62b')*(.8+.2*fbm(3,420,2))[...,None],col('#16161a')*np.ones((H,W,1)))
steel=np.where(hz[...,None],hzc*(0.9+.0),steel)
# tiras de luz azul
for lxn in (-250,-120):
    strip=(np.abs(fx-lxn)<2)&(np.abs(fy)<130)&(((yy//9)%2)==0)
    glow=ndi.gaussian_filter(strip.astype(np.float32),5)
    steel=np.where(strip[...,None],col('#8fd4f0'),steel)+glow[...,None]*col('#2a8fd0')*.35
# rejillas de ventilacion y luces naranjas de aviso
vent=(tid>.30)&(tid<.37)&(lx>6)&(lx<TX-6)&(ly>4)&(ly<TY-4)
steel=np.where((vent&((ly%4)<2))[...,None],steel*.42,steel)
lamp=(tid>.9)&(lx>6)&(lx<11)&(ly>5)&(ly<9)
lg=ndi.gaussian_filter(lamp.astype(np.float32),4)
steel=np.where(lamp[...,None],col('#ffb040'),steel)+lg[...,None]*col('#ff7a10')*.9
# plataforma circular amarilla
pad=np.abs(np.sqrt(((xx-(CX-190))/84)**2+((yy-CY)/50)**2)-1)<.05
pad|=(np.abs(np.sqrt(((xx-(CX-190))/58)**2+((yy-CY)/34)**2)-1)<.03)&(((xx+yy)//10)%2==0)
steel=np.where(pad[...,None],steel*.35+col('#d9a62b')*.65,steel)
terran=steel
# 4c) creep Zerg (derecha)
cn=fbm(8,500,4);cd=fbm(2,510,3)
creep=mix(np.broadcast_to(col('#2a1236'),(H,W,3)).copy(),np.broadcast_to(col('#7a3592'),(H,W,3)).copy(),np.clip(cn*1.35-.2+cd*.25,0,1))
vein=ridge(fbm(16,520,3));creep+= (np.clip((vein-.945)*24,0,1))[...,None]*col('#b060c8')*.30
pus=nz(4,530);pm=(pus>.84);creep=np.where(pm[...,None],creep*.55,creep)
ph=ndi.gaussian_filter(pm.astype(np.float32),1.2);creep+=np.clip(np.roll(ph,-2,0)-ph,0,1)[...,None]*col('#e9a6ff')*1.2
creep*=(.62+.6*nz(1.0,540))[...,None]
# mascara de creep: derecha con borde irregular
edge=fx-8+ (fbm(14,600,3)-.5)*170 + (fbm(5,610,3)-.5)*46 + np.sin(fy/23)*9
isl=np.clip((fbm(9,630,3)-.70)*18,0,1)*(fx>-150)*(fx<40)
cmask=np.maximum(np.clip(edge/16,0,1),isl)
# mascara de plataforma: izquierda
tedge=-fx-22+(fbm(10,620,3)-.5)*14
tmask=np.clip(tedge/3,0,1)
fcol=neutral
fcol=mix(fcol,terran,tmask)
fcol=mix(fcol,creep,cmask)
# bruma de creep sobre la roca
halo=ndi.gaussian_filter(cmask,10);fcol=fcol+halo[...,None]*col('#6a2c80')*.15*(1-cmask[...,None])
# oclusion ambiental al borde del suelo + luz de lava
ao=np.clip((fl-.84)/.16,0,1)**1.5
fcol*=(1-.55*ao)[...,None]
# aro central tenue
ring=np.abs(np.sqrt((fx/70)**2+(fy/35)**2)-1)<.045
fcol=np.where(ring[...,None],fcol*1.0+col('#8a7766')*.35,fcol)
img=np.where(floor[...,None],fcol,img)
# borde del suelo: reborde de piedra
rim=(np.abs(fl-1.0)<.012)
img=np.where(rim[...,None],img*.5+col('#b09a85')*.5,img)
# ---------- 5) publico (sprites diminutos)
pil=Image.fromarray(np.clip(img,0,255).astype('uint8'))
d=ImageDraw.Draw(pil)
pr=np.random.default_rng(3)
for _ in range(230):
    t=pr.uniform(1.7,3.6);a=pr.uniform(0,6.283)
    x=CX+np.cos(a)*(RX+24*t-12);y=CY+5*t+np.sin(a)*(RY+15*t-8)
    if not(8<x<W-8 and 8<y<H-8): continue
    k=pr.integers(0,3)
    c=[('#8fa9d8','#33466e'),('#a56a4a','#4e2a1a'),('#9a7ab8','#46305a')][k]
    d.ellipse([x-3,y+3,x+3,y+5],fill=(0,0,0))
    d.rectangle([x-2,y-4,x+1,y+3],fill=c[1]);d.rectangle([x-2,y-6,x+1,y-4],fill=c[0])
# ---------- 6) braseros (base); la llama se anima en el juego
TORCH=[]
for i in range(8):
    a=i/8*6.283+.4;x=CX+np.cos(a)*(RX+48);y=CY+8+np.sin(a)*(RY+30)
    TORCH.append((x/2,y/2))
    d.rectangle([x-4,y-10,x+4,y],fill=(48,36,30));d.rectangle([x-6,y-14,x+6,y-10],fill=(86,70,60));d.rectangle([x-5,y-15,x+5,y-13],fill=(30,20,16))
img2=np.asarray(pil).astype(np.float32)
# resplandor de los braseros sobre la piedra
gl=np.zeros((H,W),np.float32)
for (tx_,ty_) in TORCH:
    gl+=np.exp(-(((xx-tx_*2)**2+(yy-(ty_*2-14))**2)/(2*28**2)))
img2+=gl[...,None]*col('#ff8a2a')*.28
# ---------- 7) viñeta y gradacion
v=1-.5*np.clip(((xx-W/2)/(W*.62))**2+((yy-H/2)/(H*.62))**2,0,1.2)
img2*=v[...,None]
gray=img2.mean(2,keepdims=True);img2=gray+(img2-gray)*.86
img2+=np.random.default_rng(9).normal(0,5.5,(H,W,1)).astype(np.float32)
img2=np.clip(img2,0,255)
out=Image.fromarray(img2.astype('uint8'))
import os
os.makedirs('../assets/images/background',exist_ok=True)
out.save('../assets/images/background/arena_generada.jpg',quality=92)
print('arena_generada.jpg',out.size,'| llamas (coordenadas logicas) para CONFIG.TORCHES:',[[round(float(a)),round(float(b))-8] for a,b in TORCH])
