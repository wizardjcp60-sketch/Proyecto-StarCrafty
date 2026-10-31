#!/usr/bin/env python3
"""build_acid_fx.py - recorta de la hoja original del Hidralisco (ACE_Spark) los 8 fotogramas
"Attack Hit" (salpicadura de acido) y genera assets/images/fx/acido_impacto.png:
una tira horizontal de 8 fotogramas de 31x32 px con fondo transparente.
Uso:  python3 tools/build_acid_fx.py     (necesita pillow)
La hoja completa esta guardada en assets/images/source/hidralisco/ para futuras modificaciones."""
import os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = Image.open(os.path.join(ROOT, 'assets/images/source/hidralisco/hoja_original_hidralisco.png')).convert('RGB')
X0, Y0, STEP, FW, FH, N = 437, 307, 34, 31, 32, 8      # cuadricula medida sobre la hoja
out = Image.new('RGBA', (FW * N, FH), (0, 0, 0, 0))
for i in range(N):
    fr = src.crop((X0 + i * STEP, Y0, X0 + i * STEP + FW, Y0 + FH)).convert('RGBA')
    px = fr.load()
    for y in range(FH):
        for x in range(FW):
            r, g, b, _ = px[x, y]
            if abs(r - 128) <= 6 and abs(g - 127) <= 6 and abs(b - 127) <= 6: px[x, y] = (0, 0, 0, 0)   # fondo gris (128,127,127) de los fotogramas -> transparente
            else: px[x, y] = (r, g, b, 255)
    out.paste(fr, (i * FW, 0))
os.makedirs(os.path.join(ROOT, 'assets/images/fx'), exist_ok=True)
out.save(os.path.join(ROOT, 'assets/images/fx/acido_impacto.png'))
print('OK acido_impacto.png', out.size)
