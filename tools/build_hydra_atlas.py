#!/usr/bin/env python3
"""build_hydra_atlas.py - genera assets/images/sprites/hidralisco_atlas.png desde la hoja original
(assets/images/source/hidralisco/hoja_original_hidralisco.png, "Zerg Hydralisk" de ACE_Spark).
- Corta las 9 direcciones (columnas: 0 = norte/espalda, 4 = este, 8 = sur/frente; el oeste se espeja en el juego).
- Filas del atlas: 0..6 = CAMINAR (7 fotogramas; el reposo usa el 0) | 7..11 = ATAQUE (5 fotogramas, la cabeza se lanza).
- Quita el fondo gris (128,127,127) y los bordes de la celda y cambia el magenta del equipo por rojo (TEAM_RGB), conservando el brillo.
- ALINEACION: a diferencia del Marine, esta hoja NO esta recortada al contenido: cada fotograma ya conserva su posicion
  original (el balanceo del cuerpo es parte de la animacion), asi que se copia tal cual, sin recolocar.
- NITIDEZ: la hoja original es de 42x55 px por celda, oscura y de bajo contraste. Para que se vea nitido y del mismo tamano
  de pixel que el Marine, el atlas se reduce a SCALE (0.75 = tamano parecido al Hidralisco de antes) con remuestreo de calidad
  y se DIBUJA SIEMPRE A ESCALA ENTERA (HYDRA_ART.scale = 1). Ademas se aclaran las sombras (LIFT, GAMMA) y se anade un contorno
  oscuro de 1 px (OUTLINE) que separa al Hidralisco del suelo. SCALE = 1.0 lo deja en tamano original (mas grande).
  El script reescribe la linea ATLAS_HYDRA de js/config.js con el tamano de celda y los pies resultantes.
Atlas: 9 columnas x 12 filas. Uso: python3 tools/build_hydra_atlas.py  (necesita Pillow y numpy)"""
import os, re
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/source/hidralisco/hoja_original_hidralisco.png')
OUT = os.path.join(ROOT, 'assets/images/sprites/hidralisco_atlas.png')
BG = (128, 127, 127)
TEAM_RGB = (214, 40, 40)          # color del equipo (el magenta se sustituye por este, conservando el brillo)
W, H = 42, 55                     # tamano de la celda de la hoja original (interior, sin bordes)
AX0, AY0 = 21, 42                 # pies dentro de esa celda
SCALE = 0.75                      # reduccion del atlas (1.0 = sin reducir)
OUTLINE = True                    # contorno oscuro de 1 px alrededor del sprite
OUTLINE_RGBA = (24, 8, 8, 235)
LIFT, GAMMA = 1.12, 0.82          # aclarado: multiplicador y gamma (<1 aclara las sombras)
PAD = 1                           # margen de la celda para que quepa el contorno
X0, Y_WALK, Y_ATK, STEP_X, STEP_Y = 2, 2, 408, 45, 58      # origen de cada bloque de la hoja y paso entre celdas
WALK_N, ATK_N, DIRS = 7, 5, 9
a = np.array(Image.open(SRC).convert('RGB')).astype(int)
# 1) copia fiel de las celdas (fondo transparente, magenta -> rojo)
big = Image.new('RGBA', (DIRS * W, (WALK_N + ATK_N) * H), (0, 0, 0, 0)); ap = big.load()
for r in range(WALK_N + ATK_N):
    y0 = (Y_WALK + STEP_Y * r) if r < WALK_N else (Y_ATK + STEP_Y * (r - WALK_N))
    for c in range(DIRS):
        x0 = X0 + STEP_X * c
        for y in range(H):
            for x in range(W):
                R, G, B = a[y0 + y, x0 + x]
                if (R, G, B) == BG or R + G + B < 30: continue          # fondo o borde negro/azul de la celda
                if R > G + 25 and B > G + 25:                           # magenta de equipo -> rojo
                    v = max(R, B) / 255.0; R, G, B = [int(k * v) for k in TEAM_RGB]
                ap[c * W + x, r * H + y] = (int(R), int(G), int(B), 255)
# 2) reduccion por celda con remuestreo de calidad, borde duro (pixel art), aclarado y contorno
cw, ch = int(round(W * SCALE)), int(round(H * SCALE))
CW, CH = cw + 2 * PAD, ch + 2 * PAD
atlas = Image.new('RGBA', (DIRS * CW, (WALK_N + ATK_N) * CH), (0, 0, 0, 0))
for r in range(WALK_N + ATK_N):
    for c in range(DIRS):
        cell = big.crop((c * W, r * H, (c + 1) * W, (r + 1) * H))
        if SCALE != 1.0: cell = cell.resize((cw, ch), Image.LANCZOS)
        arr = np.array(cell).astype(float)
        arr[:, :, 3] = np.where(arr[:, :, 3] >= 110, 255, 0)            # borde duro: sin semitransparencias
        rgb = 255.0 * np.clip((arr[:, :, :3] / 255.0) ** GAMMA * LIFT, 0, 1)
        out = np.zeros((CH, CW, 4), np.uint8)
        out[PAD:PAD + ch, PAD:PAD + cw, :3] = rgb.astype(np.uint8); out[PAD:PAD + ch, PAD:PAD + cw, 3] = arr[:, :, 3].astype(np.uint8)
        out[out[:, :, 3] == 0] = 0
        if OUTLINE:
            op = out[:, :, 3] > 0; nb = np.zeros_like(op)
            nb[1:, :] |= op[:-1, :]; nb[:-1, :] |= op[1:, :]; nb[:, 1:] |= op[:, :-1]; nb[:, :-1] |= op[:, 1:]
            edge = nb & ~op; out[edge] = OUTLINE_RGBA
        atlas.alpha_composite(Image.fromarray(out, 'RGBA'), (c * CW, r * CH))
atlas.save(OUT)
ax, ay = int(round(AX0 * SCALE)) + PAD, int(round(AY0 * SCALE)) + PAD
cfg = os.path.join(ROOT, 'js/config.js'); txt = open(cfg, encoding='utf-8').read()
line = 'const ATLAS_HYDRA={w:%d,h:%d,ax:%d,ay:%d,walkRow:0,walkN:%d,atkRow:%d,atkN:%d};' % (CW, CH, ax, ay, WALK_N, WALK_N, ATK_N)
txt, n = re.subn(r'const ATLAS_HYDRA=\{.*?\};', lambda m: line, txt); assert n == 1, 'no se encontro ATLAS_HYDRA en config.js'
open(cfg, 'w', encoding='utf-8').write(txt)
print('OK', os.path.relpath(OUT, ROOT), atlas.size, '| celda %dx%d, pies (%d,%d)' % (CW, CH, ax, ay))
