#!/usr/bin/env python3
"""build_pet_assets.py - genera los sprites del HUEVO ZERG y de la MASCOTA ZERGLING
Fuentes (assets/images/source/zergling/):
  hoja_original_huevo_nacimiento.png   "Zerg Larvae, Eggs and Birth" (ACE_Spark): huevo, pre-nacimiento, nacimiento del zergling y capa inferior
  hoja_original_zergling.png           "Zerg Zergling" (ACE_Spark): caminar, ataque y muerte
Salida (assets/images/sprites/):
  huevo_atlas.png                      celdas de 64x48, 12 columnas. Filas: 0 = transformacion en huevo (4) | 1 = huevo en pie (12)
                                       | 2 = pre-nacimiento (8) | 3 = nacimiento del zergling (7) | 4 = capa inferior (5, va DEBAJO del nacimiento)
                                       Todos los fotogramas van centrados en su celda como en la hoja original (el magenta del equipo pasa a verde toxico).
  zergling_mascota_neutral.png         9 columnas = direcciones (0 sur, 4 oeste, 8 norte; el este se espeja), celdas de 40x40.
  zergling_mascota_azul.png            filas 0..6 = CAMINAR (7) | 7..11 = ATAQUE (5) | desde y = 480: MUERTE (7 fotogramas de 65x53)
  zergling_mascota_roja.png            (neutral = verde toxico, sin dueno | azul = del luchador izquierdo | rojo = del derecho)
Uso: python3 tools/build_pet_assets.py   (necesita Pillow y numpy)"""
import os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'assets/images/source/zergling')
SPR = os.path.join(ROOT, 'assets/images/sprites')
KEY_EGG = (74, 221, 1)       # transparente de la hoja del huevo
KEY_LING = (85, 170, 170)    # transparente de la hoja del zergling
TEAMS = {'neutral': (157, 255, 74), 'azul': (70, 150, 255), 'roja': (214, 40, 40)}

def cell(a, key, x0, y0, w, h, team):
    """recorta w x h, quita el fondo y cambia el magenta de equipo por el color 'team' conservando el brillo"""
    c = a[y0:y0 + h, x0:x0 + w].astype(int)
    out = np.zeros((h, w, 4), np.uint8)
    opaque = ~np.all(c == key, axis=2)
    R, G, B = c[:, :, 0], c[:, :, 1], c[:, :, 2]
    mag = opaque & (R > G + 25) & (B > G + 25)
    v = np.maximum(R, B) / 255.0
    for i in range(3):
        out[:, :, i] = np.where(mag, (team[i] * v).astype(int), c[:, :, i])
    out[:, :, 3] = np.where(opaque, 255, 0)
    return Image.fromarray(out, 'RGBA')

# ---------------------------------------------------------------- HUEVO
egg = np.array(Image.open(os.path.join(SRC_DIR, 'hoja_original_huevo_nacimiento.png')).convert('RGB'))
CW, CH, COLS = 64, 48, 12
# (fila del atlas, y0 en la hoja, ancho, alto, x0, paso, cantidad, desplazamiento x extra para alinear la base del huevo)
EGG_ROWS = [(0, 174, 33, 37, 2, 36, 4, 0), (1, 214, 33, 37, 2, 36, 12, 0), (2, 372, 33, 37, 2, 36, 8, 0),
            (3, 582, 56, 42, 2, 59, 7, 1), (4, 412, 59, 29, 2, 62, 5, 2)]
atlas = Image.new('RGBA', (CW * COLS, CH * len(EGG_ROWS)), (0, 0, 0, 0))
for row, y0, w, h, x0, step, n, dx in EGG_ROWS:
    for i in range(n):
        fr = cell(egg, KEY_EGG, x0 + step * i, y0, w, h, TEAMS['neutral'])
        atlas.alpha_composite(fr, (i * CW + (CW - w) // 2 + dx, row * CH + (CH - h) // 2))   # centrado en la celda (convencion de la hoja original)
atlas.save(os.path.join(SPR, 'huevo_atlas.png')); print('OK huevo_atlas.png', atlas.size)

# ---------------------------------------------------------------- MASCOTA ZERGLING
ling = np.array(Image.open(os.path.join(SRC_DIR, 'hoja_original_zergling.png')).convert('RGB'))
DIRS, WALK_N, ATK_N, CELL = 9, 7, 5, 40
DEATH_Y, DW, DH, DN = CELL * (WALK_N + ATK_N), 65, 53, 7
for name, rgb in TEAMS.items():
    out = Image.new('RGBA', (max(DIRS * CELL, DN * DW), DEATH_Y + DH), (0, 0, 0, 0))
    for r in range(WALK_N + ATK_N):
        for c in range(DIRS):
            out.alpha_composite(cell(ling, KEY_LING, 2 + 43 * c, 2 + 42 * r, 40, 39, rgb), (c * CELL, r * CELL))
    for i in range(DN):
        out.alpha_composite(cell(ling, KEY_LING, 2 + 68 * i, 548, DW, DH, rgb), (i * DW, DEATH_Y))
    out.save(os.path.join(SPR, 'zergling_mascota_%s.png' % name)); print('OK zergling_mascota_%s.png' % name, out.size)
