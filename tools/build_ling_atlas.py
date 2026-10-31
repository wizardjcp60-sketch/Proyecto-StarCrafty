#!/usr/bin/env python3
"""build_ling_atlas.py - genera assets/images/sprites/zergling_atlas.png desde la hoja original
(assets/images/source/zergling/hoja_original_zergling.png, "Zerg Zergling" de ACE_Spark).
- Recorta las 9 direcciones x 7 fotogramas de CAMINAR (columnas: 0 = sur, 4 = oeste, 8 = norte; el este se espeja en el juego).
- Quita el fondo verde azulado y cambia el magenta del equipo por verde toxico (TEAM_RGB).
Atlas: 9 columnas x 7 filas, celdas de 40x40 px. Uso: python3 tools/build_ling_atlas.py  (necesita Pillow)"""
import os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/source/zergling/hoja_original_zergling.png')
OUT = os.path.join(ROOT, 'assets/images/sprites/zergling_atlas.png')
BG = (85, 170, 170)          # fondo plano de las celdas
TEAM_RGB = (157, 255, 74)    # color del equipo (el magenta se sustituye por este, conservando el brillo)
COLS, ROWS, CELL = 9, 7, 40
im = Image.open(SRC).convert('RGB')
out = Image.new('RGBA', (COLS * CELL, ROWS * CELL), (0, 0, 0, 0))
for r in range(ROWS):
    for c in range(COLS):
        x0, y0 = 2 + 43 * c, 2 + 42 * r
        cell = im.crop((x0, y0, x0 + 40, y0 + 39))
        px = cell.load(); res = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)); rp = res.load()
        for y in range(39):
            for x in range(40):
                R, G, B = px[x, y]
                if (R, G, B) == BG: continue
                if R > G + 25 and B > G + 25:                       # magenta de equipo -> verde
                    v = max(R, B) / 255.0
                    R, G, B = (int(TEAM_RGB[0] * v), int(TEAM_RGB[1] * v), int(TEAM_RGB[2] * v))
                rp[x, y] = (R, G, B, 255)
        out.paste(res, (c * CELL, r * CELL))
out.save(OUT)
print('OK', os.path.relpath(OUT, ROOT), out.size)
