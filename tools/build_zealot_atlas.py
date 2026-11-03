#!/usr/bin/env python3
"""build_zealot_atlas.py - genera los sprites del Zealot desde la hoja original
(assets/images/source/zealot/hoja_original_zealot.png, "Protoss Zealot" extraida y compilada por ACE_Spark).
Salida (assets/images/sprites/ y assets/images/ui/):
  zealot_atlas_azul.png   9 columnas = direcciones (0 norte/espalda, 4 este, 8 sur/frente; el oeste se espeja)
  zealot_atlas_roja.png   filas: 0..7 = CAMINAR (8 fotogramas; el reposo usa el 0) | 8..12 = ATAQUE (5 fotogramas)
                          (azul = luchador izquierdo, rojo = derecho: el magenta del equipo se sustituye)
  zealot_muerte.png       7 fotogramas en una fila (la muerte protoss: explosion psionica), celdas de 54x72
El script tambien reescribe la linea ATLAS_ZEAL de js/config.js. Uso: python3 tools/build_zealot_atlas.py (Pillow y numpy)"""
import os, re
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/source/zealot/hoja_original_zealot.png')
SPR = os.path.join(ROOT, 'assets/images/sprites')
KEY = (74, 221, 1)                      # color transparente de la hoja
TEAMS = {'azul': (70, 150, 255), 'roja': (214, 40, 40)}
W, H = 39, 41                           # interior de cada celda de la hoja
X0, Y0, STEP_X, STEP_Y = 1, 2, 42, 44   # origen y paso de la cuadricula
WALK_N, ATK_N, DIRS = 8, 5, 9
AX0, AY0 = 15, 33                       # pies dentro de la celda original
SCALE = 1.0                             # 1.0 = tamano original de la hoja
LIFT, GAMMA = 1.12, 0.82                # aclarado de sombras (la hoja es oscura)
OUTLINE_RGBA = (20, 8, 8, 235); PAD = 1
DX0, DY0, DSTEP, DW, DH, DN = 1, 575, 57, 54, 72, 7     # fotogramas de muerte

a = np.array(Image.open(SRC).convert('RGB')).astype(int)

def cell(x0, y0, w, h, team):
    out = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        for x in range(w):
            R, G, B = a[y0 + y, x0 + x]
            if (R, G, B) == KEY: continue
            if team and R > G + 25 and B > G + 25:           # magenta de equipo -> color del lado
                v = max(R, B) / 255.0; R, G, B = [int(k * v) for k in team]
            out[y, x] = (R, G, B, 255)
    return out

def finish(arr, outline=True):
    arr = arr.astype(float)
    rgb = 255.0 * np.clip((arr[:, :, :3] / 255.0) ** GAMMA * LIFT, 0, 1)
    o = np.zeros((arr.shape[0] + 2 * PAD, arr.shape[1] + 2 * PAD, 4), np.uint8)
    o[PAD:-PAD, PAD:-PAD, :3] = rgb.astype(np.uint8); o[PAD:-PAD, PAD:-PAD, 3] = arr[:, :, 3].astype(np.uint8)
    o[o[:, :, 3] == 0] = 0
    if outline:
        op = o[:, :, 3] > 0; nb = np.zeros_like(op)
        nb[1:, :] |= op[:-1, :]; nb[:-1, :] |= op[1:, :]; nb[:, 1:] |= op[:, :-1]; nb[:, :-1] |= op[:, 1:]
        o[nb & ~op] = OUTLINE_RGBA
    return Image.fromarray(o, 'RGBA')

CW, CH = W + 2 * PAD, H + 2 * PAD
rows = WALK_N + ATK_N
for name, rgb in TEAMS.items():
    atlas = Image.new('RGBA', (DIRS * CW, rows * CH), (0, 0, 0, 0))
    for r in range(rows):
        for c in range(DIRS):
            im = finish(cell(X0 + STEP_X * c, Y0 + STEP_Y * r, W, H, rgb))
            atlas.alpha_composite(im, (c * CW, r * CH))
    if SCALE != 1.0: atlas = atlas.resize((int(atlas.width * SCALE), int(atlas.height * SCALE)), Image.LANCZOS)
    atlas.save(os.path.join(SPR, 'zealot_atlas_%s.png' % name)); print('OK zealot_atlas_%s.png' % name, atlas.size)

# muerte: sin contorno ni cambio de color (es energia psionica)
death = Image.new('RGBA', (DN * DW, DH), (0, 0, 0, 0))
for i in range(DN):
    c = cell(DX0 + DSTEP * i, DY0, DW, DH, None)
    death.alpha_composite(Image.fromarray(c, 'RGBA'), (i * DW, 0))
death.save(os.path.join(SPR, 'zealot_muerte.png')); print('OK zealot_muerte.png', death.size)

# (el retrato assets/images/ui/retrato_zealot.jpg ya no se genera aqui: es el recorte del Zealot de la hoja de retratos de StarCraft II,
#  guardado en assets/images/source/retrato_zealot_original.png)

cfg = os.path.join(ROOT, 'js/config.js'); txt = open(cfg, encoding='utf-8').read()
line = 'const ATLAS_ZEAL={w:%d,h:%d,ax:%d,ay:%d,walkRow:0,walkN:%d,atkRow:%d,atkN:%d,dw:%d,dh:%d,dax:27,day:56,deathN:%d};' % (
    CW, CH, AX0 + PAD, AY0 + PAD, WALK_N, WALK_N, ATK_N, DW, DH, DN)
if 'const ATLAS_ZEAL=' in txt: txt = re.sub(r'const ATLAS_ZEAL=\{.*?\};', lambda m: line, txt)
else: txt += '\n/* Atlas del Zealot (ver tools/build_zealot_atlas.py): celdas w x h, pies (ax,ay), caminar 8 + ataque 5; muerte: 7 fotogramas de dw x dh con pivote (dax,day) */\n' + line + '\n'
open(cfg, 'w', encoding='utf-8').write(txt); print('config.js OK')
