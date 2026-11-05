#!/usr/bin/env python3
"""build_audio_data.py - genera js/audio_data.js con los efectos de sonido incrustados en base64.
Sirve para que el audio funcione al abrir index.html con doble clic (file://), donde el navegador
no deja a Web Audio leer los archivos. Si cambias un sonido de assets/audio/sfx/, vuelve a ejecutar:
    python3 tools/build_audio_data.py
(Con un servidor local o en GitHub Pages no hace falta: ahi se leen los archivos directamente.)"""
import re, os, base64
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'js/audio.js'), encoding='utf-8').read()
files = dict(re.findall(r"^\s{4}(\w+)\s*:'(assets[^']+)'", src, re.M))
isvoice = lambda n: re.match(r'^(marine|hydra|zealot)_|^dt_(ready|yes)|^bcv_', n)
data = {n: base64.b64encode(open(os.path.join(ROOT, u), 'rb').read()).decode()
        for n, u in files.items()
        if not n.startswith('music') and n != 'tension' and not isvoice(n) and n != 'nuke_explosion' and os.path.exists(os.path.join(ROOT, u))}
out = os.path.join(ROOT, 'js/audio_data.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* generado por tools/build_audio_data.py - no editar a mano */\nwindow.AUDIO_DATA={\n')
    f.write(',\n'.join('"%s":"%s"' % (n, b) for n, b in data.items()))
    f.write('\n};\n')
print('OK  js/audio_data.js  %d sonidos  (%.1f MB)' % (len(data), os.path.getsize(out) / 1e6))
