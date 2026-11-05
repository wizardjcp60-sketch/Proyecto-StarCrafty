#!/usr/bin/env python3
"""build_death_sprites.py - genera las animaciones de MUERTE del Marine y del Hidralisco desde las hojas originales
(assets/images/source/marine/hoja_original_marine.png y assets/images/source/hidralisco/hoja_original_hidralisco.png).
Salida (assets/images/sprites/):
  marine_muerte.png      8 fotogramas en una fila (el primero es el Marine reventando; despues la sangre se extiende), celdas de 64x40
  hidralisco_muerte.png  12 fotogramas en una fila (explosion, restos y charco que se encoge), celdas de 50x38 (hoja reducida a 0,5: la explosion original es enorme comparada con el sprite)
Imprime las lineas ATLAS_MARINE_DEATH / ATLAS_HYDRA_DEATH que van en js/config.js (ya estan puestas).
Uso: python3 tools/build_death_sprites.py  (necesita Pillow y numpy)"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'assets/images/sprites')
TEAM_RGB = (214, 40, 40)
OUTLINE_RGBA = (24, 8, 8, 235)
LIFT, GAMMA = 1.12, 0.82

def keyed(sub, bg):
    """fondo -> transparente; magenta de equipo -> rojo (conserva el brillo)"""
    h, w = sub.shape[:2]; out = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            R, G, B = sub[y, x]
            if (R, G, B) == bg: continue
            if R > G + 25 and B > G + 25:
                v = max(R, B) / 255.0; R, G, B = [int(k * v) for k in TEAM_RGB]
            out[y, x] = (R, G, B, 255)
    return out

# ---------------- MARINE ----------------
m = np.array(Image.open(os.path.join(ROOT, 'assets/images/source/marine/hoja_original_marine.png')).convert('RGB')).astype(int)
BG_M = (113, 38, 38)
CW_M, CH_M, AX_M, AY_M = 64, 40, 32, 35          # celda y pies (el Marine vivo apoya los pies en y=35)
boxes = [(1, 583, 24, 611)]                       # fotograma 0: el Marine reventando (x0,y0,x1,y1 sin bordes)
xs = [0, 26, 61, 105, 160, 221, 280, 338]
boxes += [(xs[i] + 1, 612, xs[i + 1], 650) for i in range(7)]
atlas = Image.new('RGBA', (len(boxes) * CW_M, CH_M), (0, 0, 0, 0))
for i, (x0, y0, x1, y1) in enumerate(boxes):
    tile = Image.fromarray(keyed(m[y0:y1, x0:x1], BG_M), 'RGBA'); w, h = tile.size
    ox = AX_M - w // 2
    oy = AY_M - h if i == 0 else AY_M + 2 - h     # el primero se apoya en los pies; los charcos asoman 2 px por debajo
    atlas.alpha_composite(tile, (i * CW_M + ox, max(0, oy)))
atlas.save(os.path.join(SPR, 'marine_muerte.png'))
print('marine_muerte.png', atlas.size, 'const ATLAS_MARINE_DEATH={w:%d,h:%d,ax:%d,ay:%d,n:%d};' % (CW_M, CH_M, AX_M, AY_M, len(boxes)))

# ---------------- HIDRALISCO ----------------
hy = np.array(Image.open(os.path.join(ROOT, 'assets/images/source/hidralisco/hoja_original_hidralisco.png')).convert('RGB')).astype(int)
BG_H = (128, 127, 127)
SCALE, PAD = 0.5, 1
IW, IH = 97, 71                                   # interior de cada recuadro de la hoja
GX, GY = [437, 537, 637, 737], [85, 159, 233]     # esquina de cada recuadro (4 columnas x 3 filas)
AX0, AY0 = 48, 50                                 # pies del Hidralisco dentro del recuadro (centro y parte baja del cuerpo)
cw, ch = int(round(IW * SCALE)), int(round(IH * SCALE))
CW_H, CH_H = cw + 2 * PAD, ch + 2 * PAD
n = 12
atlas = Image.new('RGBA', (n * CW_H, CH_H), (0, 0, 0, 0))
for i in range(n):
    x0, y0 = GX[i % 4], GY[i // 4]
    big = Image.fromarray(keyed(hy[y0:y0 + IH, x0:x0 + IW], BG_H), 'RGBA').resize((cw, ch), Image.LANCZOS)
    arr = np.array(big).astype(float); arr[:, :, 3] = np.where(arr[:, :, 3] >= 110, 255, 0)
    rgb = 255.0 * np.clip((arr[:, :, :3] / 255.0) ** GAMMA * LIFT, 0, 1)
    out = np.zeros((CH_H, CW_H, 4), np.uint8)
    out[PAD:PAD + ch, PAD:PAD + cw, :3] = rgb.astype(np.uint8); out[PAD:PAD + ch, PAD:PAD + cw, 3] = arr[:, :, 3].astype(np.uint8)
    out[out[:, :, 3] == 0] = 0
    op = out[:, :, 3] > 0; nb = np.zeros_like(op)
    nb[1:, :] |= op[:-1, :]; nb[:-1, :] |= op[1:, :]; nb[:, 1:] |= op[:, :-1]; nb[:, :-1] |= op[:, 1:]
    out[nb & ~op] = OUTLINE_RGBA
    atlas.alpha_composite(Image.fromarray(out, 'RGBA'), (i * CW_H, 0))
atlas.save(os.path.join(SPR, 'hidralisco_muerte.png'))
ax, ay = int(round(AX0 * SCALE)) + PAD, int(round(AY0 * SCALE)) + PAD
print('hidralisco_muerte.png', atlas.size, 'const ATLAS_HYDRA_DEATH={w:%d,h:%d,ax:%d,ay:%d,n:%d};' % (CW_H, CH_H, ax, ay, n))
