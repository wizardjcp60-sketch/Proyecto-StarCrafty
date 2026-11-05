#!/usr/bin/env python3
"""build_dist.py - genera dist/coliseo-broodwar-un-solo-archivo.html
Une index.html + css/style.css + js/config.js + js/audio.js + js/granada_fx.js + js/battlecruiser.js + js/game.js + js/cursores.js en UN solo archivo y
reemplaza cada ruta 'assets/...' (imagenes, sonidos, voces, atlas del Dark Templar) por su version
incrustada en base64. Las rutas de archivos que no existen se dejan tal cual (el juego las ignora).
Uso:  python3 tools/build_dist.py        (no necesita librerias externas)"""
import base64, json, mimetypes, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
mimetypes.add_type('audio/mpeg', '.mp3'); mimetypes.add_type('audio/wav', '.wav'); mimetypes.add_type('image/webp', '.webp')
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def uri(path):
    full = os.path.join(ROOT, path)
    if not os.path.isfile(full): return None
    mime = mimetypes.guess_type(full)[0] or 'application/octet-stream'
    return 'data:%s;base64,%s' % (mime, base64.b64encode(open(full, 'rb').read()).decode())
def embed_js(text):
    return re.sub(r"(['\"])(assets/[^'\"]+)\1", lambda m: "%s%s%s" % (m.group(1), uri(m.group(2)) or m.group(2), m.group(1)), text)
html = rd('index.html')
html = re.sub(r'(src|href)="((?:js|css)/[^"?]+)\?v=[^"]*"', r'\1="\2"', html)   # quita el ?v=... de cache de index.html para que las sustituciones de abajo coincidan
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + rd('css/style.css') + '\n</style>')
html = re.sub(r'src="(assets/[^"]+)"', lambda m: 'src="%s"' % (uri(m.group(1)) or m.group(1)), html)
# cursores de StarCraft: js/cursores.js arma las rutas de los PNG al vuelo, asi que se incrustan aparte en window.CURSOR_EMBED
cur = {}
m = re.search(r'CURSORS:\{[^}]*?scale:(\d)', rd('js/config.js'))
for sub in (('x1',) if m and m.group(1) == '1' else ('x2',)):   # solo el tamano que usa el juego (CONFIG.CURSORS.scale)
    d = os.path.join(ROOT, 'assets/images/cursors', sub)
    if os.path.isdir(d):
        for n in sorted(os.listdir(d)):
            if n.endswith('.png') and '_y_' not in n: cur['assets/images/cursors/%s/%s' % (sub, n)] = uri('assets/images/cursors/%s/%s' % (sub, n))
js = 'window.CURSOR_EMBED=' + json.dumps(cur) + ';\n'
js += '\n'.join(embed_js(rd('js/' + n)) for n in ('config.js', 'audio.js', 'granada_fx.js', 'battlecruiser.js', 'game.js', 'cursores.js'))
html = html.replace('<script src="js/audio_data.js"></script>\n', '')   # en dist/ los sonidos ya van incrustados como data:
html = re.sub(r'<script src="js/config\.js"></script>\s*<script src="js/audio\.js"></script>\s*<script src="js/granada_fx\.js"></script>\s*<script src="js/battlecruiser\.js"></script>\s*<script src="js/game\.js"></script>\s*<script src="js/cursores\.js"></script>',
              lambda m: '<script>\n' + js + '\n</script>', html)
assert 'src="js/' not in html and 'href="css/' not in html, 'quedaron referencias sin incrustar'
out = os.path.join(ROOT, 'dist', 'coliseo-broodwar-un-solo-archivo.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(html)
print('OK  %s  (%.1f MB)' % (os.path.relpath(out, ROOT), os.path.getsize(out) / 1e6))
