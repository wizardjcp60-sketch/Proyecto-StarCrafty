#!/usr/bin/env python3
"""build_legacy_sprites.py - regenera los 6 sprites sueltos del Marine y del Hidralisco a partir de sus atlas.

Genera en assets/images/sprites/:
  marine_lateral.png, marine_frente.png, marine_espalda.png
  hidralisco_lateral.png, hidralisco_frente.png, hidralisco_espalda.png

Para que sirven: el juego los usa en la pantalla de victoria (figura del ganador y cadaveres) y como
respaldo si un atlas no carga. Salen del fotograma de reposo (fila 0) de cada atlas:
  columna 0 = norte (espalda) | columna 4 = este (lado) | columna 8 = sur (frente)
- marine_lateral mira a la DERECHA (tal cual el este del atlas).
- hidralisco_lateral mira a la IZQUIERDA (el este del atlas, espejado).
Cada imagen se recorta al contenido y se agranda con vecino mas cercano (pixel art) hasta una altura
parecida a la de los sprites originales (Marine 56 px, Hidralisco 64 px).
Uso: python3 tools/build_legacy_sprites.py   (necesita Pillow)"""
import os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'assets/images/sprites')
CFG = open(os.path.join(ROOT, 'js/config.js'), encoding='utf-8').read()


def num(name, key):
    """lee un numero de la linea 'const NAME={...key:valor...}' de config.js"""
    line = re.search(r'const %s=\{[^}]*\}' % name, CFG).group(0)
    return int(re.search(r'\b%s:(\d+)' % key, line).group(1))


def crop_cell(atlas, col, row, cw, ch):
    cell = atlas.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
    box = cell.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return cell.crop(box)


def save(img, target_h, name, mirror=False):
    if mirror:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    k = max(1, round(target_h / img.height))
    img = img.resize((img.width * k, img.height * k), Image.NEAREST)
    img.save(os.path.join(SPR, name))
    print('%-26s %dx%d (x%d)' % (name, img.width, img.height, k))


def main():
    marine = Image.open(os.path.join(SPR, 'marine_atlas.png')).convert('RGBA')
    c = num('ATLAS_MARINE', 'cell')
    for col, name, mirror in ((4, 'marine_lateral.png', False), (8, 'marine_frente.png', False),
                              (0, 'marine_espalda.png', False)):
        save(crop_cell(marine, col, 0, c, c), 56, name, mirror)

    hydra = Image.open(os.path.join(SPR, 'hidralisco_atlas.png')).convert('RGBA')
    w, h = num('ATLAS_HYDRA', 'w'), num('ATLAS_HYDRA', 'h')
    for col, name, mirror in ((4, 'hidralisco_lateral.png', True), (8, 'hidralisco_frente.png', False),
                              (0, 'hidralisco_espalda.png', False)):
        save(crop_cell(hydra, col, 0, w, h), 64, name, mirror)


if __name__ == '__main__':
    main()
