#!/usr/bin/env python3
"""build_marine_atlas.py - genera assets/images/sprites/marine_atlas.png desde la hoja original
(assets/images/source/marine/hoja_original_marine.png, "Terran Marine" extraida por Colton; credito apreciado).
- Corta las 9 direcciones de cada fila (0 = norte/espalda, 4 = este, 8 = sur/frente; el oeste se espeja en el juego).
- Filas del atlas: 0 = reposo | 1..9 = caminar (9 fotogramas) | 10 = disparo (sin fogonazo: el juego dibuja el suyo).
- Quita el fondo granate (113,38,38) y cambia el magenta del equipo por rojo (TEAM_RGB), conservando el brillo.
- ALINEACION: la hoja trae cada fotograma recortado al contenido, asi que no guarda la posicion de los pies. Para que el
  Marine no tiemble, cada fotograma se coloca haciendo coincidir el centro de sus hombreras (el magenta) con el del
  fotograma de reposo de esa misma direccion; el reposo se centra y se apoya sobre la linea de los pies.
Atlas: 9 columnas x 11 filas de CELL x CELL px. Uso: python3 tools/build_marine_atlas.py  (necesita Pillow y numpy)"""
import os, sys
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/source/marine/hoja_original_marine.png')
OUT = os.path.join(ROOT, 'assets/images/sprites/marine_atlas.png')
BG = (113, 38, 38)
TEAM_RGB = (214, 40, 40)
CELL, AX, BASE = 40, 20, 35          # celda, centro horizontal y linea de los pies del fotograma de reposo
# (nombre, y de la linea superior del recuadro, y de la inferior) en la hoja original
BANDS = {'stand': (11, 42), 'shoot': (99, 129), **{'w%d' % i: y for i, y in enumerate(
    [(187, 218), (231, 261), (274, 305), (318, 348), (361, 392), (405, 436), (449, 482), (494, 527), (539, 571)], 1)}}
ROWS = ['stand'] + ['w%d' % i for i in range(1, 10)] + ['shoot']
a = np.array(Image.open(SRC).convert('RGB')).astype(int)
white = (a == 255).all(axis=2)

def cells(name):
    y0, y1 = BANDS[name]
    xs = np.where(white[y0])[0]; x0, x1 = xs.min(), xs.max()
    sub = a[y0 + 1:y1, x0 + 1:x1]
    fg = ~((sub == BG).all(axis=2)); cols = fg.any(axis=0)
    spans, s = [], None
    for i, v in enumerate(list(cols) + [False]):
        if v and s is None: s = i
        if not v and s is not None: spans.append((s, i - 1)); s = None
    spans = [p for p in spans if p[1] - p[0] >= 4]      # descarta las lineas separadoras de 1 px
    assert len(spans) == 9, (name, len(spans))
    out = []
    for (c0, c1) in spans:
        blk = sub[:, c0:c1 + 1]
        rows = np.where((~((blk == BG).all(axis=2))).any(axis=1))[0]
        blk = blk[rows.min():rows.max() + 1]
        h, w = blk.shape[:2]
        rgba = np.zeros((h, w, 4), np.uint8)
        mag = np.zeros((h, w), bool)
        for y in range(h):
            for x in range(w):
                R, G, B = blk[y, x]
                if (R, G, B) == BG: continue
                if R > G + 25 and B > G + 25:
                    v = max(R, B) / 255.0; R, G, B = [int(c * v) for c in TEAM_RGB]; mag[y, x] = True
                rgba[y, x] = (R, G, B, 255)
        out.append((rgba, mag))
    return out

def center(mag, rgba):
    ys, xs = np.where(mag) if mag.sum() >= 4 else np.where(rgba[:, :, 3] > 0)
    return xs.mean(), ys.mean()

atlas = Image.new('RGBA', (9 * CELL, len(ROWS) * CELL), (0, 0, 0, 0))
stand = cells('stand'); anchor = []
worst = 0
for d in range(9):                       # posicion del reposo: centrado y apoyado en BASE; guarda el centro de las hombreras
    rgba, mag = stand[d]; h, w = rgba.shape[:2]
    ox, oy = AX - w // 2, BASE - h
    cx, cy = center(mag, rgba); anchor.append((ox + cx, oy + cy))
for r, name in enumerate(ROWS):
    cs = stand if name == 'stand' else cells(name)
    for d in range(9):
        rgba, mag = cs[d]; h, w = rgba.shape[:2]
        if name == 'stand':
            ox, oy = AX - w // 2, BASE - h
        else:
            cx, cy = center(mag, rgba); ox, oy = int(round(anchor[d][0] - cx)), int(round(anchor[d][1] - cy))
        if ox < 0 or oy < 0 or ox + w > CELL or oy + h > CELL:
            worst += 1; print('aviso: %s dir %d se sale de la celda (%d,%d %dx%d)' % (name, d, ox, oy, w, h))
        tile = Image.fromarray(rgba, 'RGBA'); atlas.alpha_composite(tile, (d * CELL + max(0, ox), r * CELL + max(0, oy)))
atlas.save(OUT)
print('OK', os.path.relpath(OUT, ROOT), atlas.size, 'avisos:', worst)
