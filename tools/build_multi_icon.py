#!/usr/bin/env python3
"""build_multi_icon.py - convierte el emblema del Multidisparo (fondo negro) en un icono PNG transparente:
assets/images/fx/icono_multidisparo.png (64x64). El alfa sale del brillo de cada pixel, asi que el resplandor
azul se funde bien con cualquier fondo. Original en assets/images/source/emblema_multidisparo_original.png
Uso:  python3 tools/build_multi_icon.py     (necesita pillow y numpy)"""
import os, numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(ROOT, 'assets/images/source/emblema_multidisparo_original.png')).convert('RGB')
a = np.asarray(im).astype(float) / 255
alpha = a.max(axis=2)
alpha = np.clip((alpha - .04) / .5, 0, 1)                      # fondo negro -> transparente (con curva suave)
rgb = np.where(alpha[..., None] > 0, a / np.maximum(a.max(axis=2, keepdims=True), 1e-6), 0)   # color sin multiplicar por el brillo
out = np.dstack([rgb, alpha])
img = Image.fromarray((out * 255).astype('uint8'), 'RGBA')
bb = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
img = img.crop(bb); s = max(img.size)
sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.paste(img, ((s - img.width) // 2, (s - img.height) // 2))
sq.resize((64, 64), Image.LANCZOS).save(os.path.join(ROOT, 'assets/images/fx/icono_multidisparo.png'))
print('OK icono_multidisparo.png')
