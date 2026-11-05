#!/usr/bin/env python3
"""build_bc_atlas.py - recorta la hoja "Terran Battlecruiser" (ripped by Colton) y genera los atlas del Battlecruiser.

Entrada : assets/images/source/battlecruiser/hoja_original_battlecruiser.png  (fondo blanco, rejilla verde)
Salida  : assets/images/sprites/battlecruiser_atlas_roja.png   (equipo rojo, el color original de la hoja)
          assets/images/sprites/battlecruiser_atlas_azul.png   (mismo sprite con el color de equipo cambiado a azul)

La hoja trae 17 fotogramas girando en pasos de 11,25 grados: la proa (el semicirculo ancho) mira al SUR en el 0, al OESTE en el 8 y al NORTE en el 16;
los 3 cilindros son los motores (popa). El lado este se obtiene espejando en el juego (bcFrame en js/battlecruiser.js). El atlas es una sola fila de 17 celdas de CELL_W x CELL_H px
con la nave centrada en cada celda (centro = punto de la nave). Uso:  python3 tools/build_bc_atlas.py   (requiere numpy y Pillow)"""
import os, colorsys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/source/battlecruiser/hoja_original_battlecruiser.png')
OUT = os.path.join(ROOT, 'assets/images/sprites')
CELL_W, CELL_H = 100, 80
# limites de la rejilla de la hoja (lineas verdes): filas y, y columnas x de cada fila
ROWS = [(56, 131, [0, 75, 157, 244, 335, 429, 526, 622]),
        (133, 207, [0, 90, 178, 267, 359, 453, 547]),
        (209, 285, [0, 91, 180, 264, 343])]

im = np.array(Image.open(SRC).convert('RGB'))
cells = []
for y0, y1, xs in ROWS:
    for a, b in zip(xs[:-1], xs[1:]):
        cells.append(im[y0 + 1:y1, a + 1:b])   # dentro de las lineas verdes
assert len(cells) == 17, len(cells)

def cut(c):
    """Fondo -> transparente. La hoja usa blanco PURO (255,255,255) como fondo y la nave no lo usa nunca (sus brillos son casi-blancos),
    asi que se quitan TODOS los blancos puros, tambien los huecos atrapados entre los puntales, y se recorta al contenido."""
    white = (c == 255).all(axis=2)
    green = (c[:, :, 0] == 0) & (c[:, :, 1] == 128) & (c[:, :, 2] == 0)
    a = np.where(white | green, 0, 255).astype(np.uint8)
    rgba = np.dstack([c, a])
    ys, xs = np.where(a > 0)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def team(rgba, to_blue):
    """El color de equipo de la hoja es rojo: para el equipo azul se gira su tono (solo los pixeles rojizos y saturados)."""
    if not to_blue: return rgba
    out = rgba.copy()
    rgb = out[:, :, :3].astype(float) / 255
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    red = (r > g * 1.5) & (r > b * 1.5) & (sat > .45) & (mx > .25)
    # rojo -> azul: se intercambian los canales R y B en esos pixeles (conserva el brillo)
    out[:, :, 0] = np.where(red, out[:, :, 2], out[:, :, 0]); out[:, :, 2] = np.where(red, (rgb[:, :, 0] * 255).astype(np.uint8), out[:, :, 2])
    return out

frames = [cut(c) for c in cells]
for i, f in enumerate(frames): print('fotograma', i, f.shape[1], 'x', f.shape[0])
for name, blue in (('roja', False), ('azul', True)):
    atlas = Image.new('RGBA', (CELL_W * 17, CELL_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        h, w = f.shape[:2]
        assert w <= CELL_W and h <= CELL_H, (i, w, h)
        atlas.paste(Image.fromarray(team(f, blue), 'RGBA'), (i * CELL_W + (CELL_W - w) // 2, (CELL_H - h) // 2))
    p = os.path.join(OUT, 'battlecruiser_atlas_%s.png' % name); atlas.save(p, optimize=True)
    print('OK', os.path.relpath(p, ROOT), atlas.size, os.path.getsize(p), 'bytes')
