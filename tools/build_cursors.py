#!/usr/bin/env python3
"""build_cursors.py - recorta los cursores de StarCraft (hoja de ACE_Spark) en PNG sueltos.
Entrada : assets/images/source/cursores_starcraft_hoja.png   (fondo verde turquesa 0,238,157)
Salida  : assets/images/cursors/x1/*.png  (tamano original)  y  x2/*.png (doble, pixel perfecto)
Uso     : python3 tools/build_cursors.py        (necesita pillow y numpy)
Imprime la tabla de 'hotspots' (punto exacto del cursor) que se copia en js/cursores.js (CUR_SETS).
Cuadricula de la hoja: celdas de 41x43 px, paso 44 en X y 46 en Y, origen (2,2). El punto activo de
flechas, elipses y anillos es siempre el pixel (19,16) de la celda."""
import os, shutil
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/source/cursores_starcraft_hoja.png')
OUT = os.path.join(ROOT, 'assets/images/cursors')
BG = (0, 238, 157); CW, CH, PX, PY, OX, OY = 41, 43, 44, 46, 2, 2; HOT = (19, 16)
im = Image.open(SRC).convert('RGB'); a = np.array(im)
def cell(r, c):
    x0, y0 = OX + PX * c, OY + PY * r
    rgba = np.zeros((CH, CW, 4), np.uint8); sub = a[y0:y0 + CH, x0:x0 + CW]
    rgba[..., :3] = sub; rgba[..., 3] = np.where((sub == BG).all(axis=2), 0, 255)
    return rgba
# nombre -> (fila, columnas)
SETS = {
    'arrow':   (0, range(0, 5)),      # flecha normal (5 fotogramas de brillo)
    'forbid':  (0, range(6, 11)),     # flecha tachada (accion no permitida)
    'hover_g': (1, range(0, 2)),      # elipse verde: sobre algo propio / pulsable
    'hover_y': (1, range(2, 4)),      # elipse amarilla: neutral
    'hover_r': (1, range(4, 6)),      # elipse roja: enemigo
    'ring_g':  (2, range(0, 14)),     # anillo de punteria giratorio, verde
    'ring_y':  (3, range(0, 14)),     # ... amarillo
    'ring_r':  (4, range(0, 14)),     # ... rojo
}
shutil.rmtree(OUT, ignore_errors=True)
for s in (1, 2): os.makedirs(os.path.join(OUT, 'x%d' % s))
print('CUR_SETS = {')
for name, (r, cols) in SETS.items():
    frames = [cell(r, c) for c in cols]
    al = np.max([f[..., 3] for f in frames], axis=0); ys, xs = np.where(al > 0)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1     # recorte comun a todo el set
    hx, hy = HOT
    if name == 'forbid':   # punta de la flecha verde dentro del circulo rojo
        f = frames[0]; m = (f[..., 3] > 0) & (f[..., 1].astype(int) > f[..., 0].astype(int) + 20)
        yy, xx = np.where(m); i = np.lexsort((xx, yy))[0]; hx, hy = int(xx[i]), int(yy[i])
    for i, f in enumerate(frames):
        img = Image.fromarray(f[by0:by1, bx0:bx1], 'RGBA')
        for s in (1, 2):
            (img if s == 1 else img.resize((img.width * 2, img.height * 2), Image.NEAREST)).save(
                os.path.join(OUT, 'x%d' % s, '%s_%d.png' % (name, i)))
    w, h = bx1 - bx0, by1 - by0
    print("  %-8s{n:%d, w:%d, h:%d, hx:%d, hy:%d}," % (name + ':', len(frames), w, h, hx - bx0, hy - by0))
print('};')
