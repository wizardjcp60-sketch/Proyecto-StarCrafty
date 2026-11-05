#!/usr/bin/env python3
"""build_bc_icon.py - convierte la capsula de la baliza del Battlecruiser (fondo negro) en un icono PNG transparente:
assets/images/fx/icono_baliza_bc.png (96x96). El cuerpo de la capsula queda opaco (silueta trazada a mano) y el
resplandor azul de fuera se vuelve semitransparente (alfa por brillo), asi se funde con cualquier fondo.
Original en assets/images/source/capsula_baliza_original.jpg (1402x1122)
Uso:  python3 tools/build_bc_icon.py     (necesita pillow, numpy y scipy)"""
import os, numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as ndi
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(ROOT, 'assets/images/source/capsula_baliza_original.jpg')).convert('RGB')
W, H = im.size
POLY = [(548,62),(905,62),(965,98),(1012,150),(1075,172),(1108,212),(1108,305),(1078,368),(1066,372),(1064,742),(1100,762),(1108,792),
        (1108,862),(1062,925),(1022,945),(1002,985),(905,1048),(497,1048),(400,985),(380,945),(340,925),(298,862),(298,792),(332,742),
        (344,372),(326,368),(298,305),(298,212),(330,172),(392,150),(440,98)]
m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(POLY, fill=255)
sil = ndi.binary_dilation(np.asarray(m) > 0, iterations=4)                  # incluye el borde negro de la pieza
a = np.asarray(im).astype(float) / 255
mx = a.max(axis=2)
glow = np.clip((mx - .05) / .55, 0, 1) * .8                                  # resplandor: alfa por brillo
near = np.clip(1 - ndi.distance_transform_edt(~sil) / 110, 0, 1) ** 1.5      # y solo cerca de la capsula (icono compacto)
alpha = np.where(sil, 1.0, glow * near)
alpha = ndi.gaussian_filter(alpha, 1.2) if False else alpha
rgb = np.where(sil[..., None], a, a / np.maximum(mx[..., None], 1e-6))       # fuera: color sin multiplicar por el brillo
out = Image.fromarray((np.dstack([rgb, alpha]) * 255).clip(0, 255).astype('uint8'), 'RGBA')
ys, xs = np.nonzero(sil); cx, cy = (xs.min() + xs.max()) // 2, (ys.min() + ys.max()) // 2
s = int(max(xs.max() - xs.min(), ys.max() - ys.min()) * 1.22) // 2           # margen para el resplandor
box = (cx - s, cy - s, cx + s, cy + s)
sq = Image.new('RGBA', (2 * s, 2 * s), (0, 0, 0, 0)); sq.paste(out, (-box[0], -box[1]))
sq.resize((96, 96), Image.LANCZOS).save(os.path.join(ROOT, 'assets/images/fx/icono_baliza_bc.png'), optimize=True)
print('OK icono_baliza_bc.png')
