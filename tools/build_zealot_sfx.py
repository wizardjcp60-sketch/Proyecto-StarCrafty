#!/usr/bin/env python3
"""build_zealot_sfx.py - sintetiza en assets/audio/sfx/:  zealot_ataque.wav (cuchillas psi: zumbido + silbido),
zealot_carga.wav (embestida: golpe grave y estela ascendente) y zealot_impacto.wav (choque al terminar la carga).
Uso: python3 tools/build_zealot_sfx.py   (numpy y scipy). Reemplazalos por sonidos tuyos con el mismo nombre si quieres."""
import os, wave
import numpy as np
from scipy.signal import butter, lfilter
SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'audio', 'sfx')
rng = np.random.default_rng(31)
def t(sec): return np.arange(int(SR * sec)) / SR
def noise(sec): return rng.standard_normal(int(SR * sec))
def _f(x, kind, f):
    b, a = butter(2, (np.array(f) if kind == 'band' else f) / (SR / 2), kind); return lfilter(b, a, x)
def lp(x, f): return _f(x, 'low', f)
def bp(x, lo, hi): return _f(x, 'band', [lo, hi])
def norm(x, peak=.85): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, x):
    x = x.copy(); a = int(SR * .006); b = int(SR * .02)
    x[:a] *= np.linspace(0, 1, a); x[-b:] *= np.linspace(1, 0, b)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('OK', name + '.wav', round(len(x) / SR, 2), 's')

# ataque: dos tajos rapidos (dos cuchillas), zumbido psionico + silbido de aire
x = np.zeros(int(SR * .5))
for at in (0.02, 0.2):
    n = int(SR * .2); u = np.arange(n) / SR
    sw = bp(noise(.2), 1800, 7000) * np.exp(-u * 16) * np.clip(u / .01, 0, 1)
    f = 900 + 2600 * np.exp(-u * 18); hum = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u * 14) * .45
    i = int(at * SR); x[i:i + n] += (sw * .9 + hum)[:len(x) - i]
save('zealot_ataque', norm(x))

# carga: golpe grave + estela que sube
n = int(SR * .55); u = np.arange(n) / SR
thump = np.sin(2 * np.pi * np.cumsum(110 * np.exp(-u * 5) + 40) / SR) * np.exp(-u * 7)
whoosh = bp(noise(.55), 300, 3500) * np.clip(u / .15, 0, 1) * np.exp(-u * 3.5)
rise = np.sin(2 * np.pi * np.cumsum(300 + 1800 * u) / SR) * np.clip(u / .2, 0, 1) * np.exp(-u * 4) * .3
save('zealot_carga', norm(thump * .8 + whoosh * .9 + rise))

# impacto de la carga: choque seco con resonancia metalica
n = int(SR * .4); u = np.arange(n) / SR
boom = lp(noise(.4), 500) * np.exp(-u * 14) * 1.3 + np.sin(2 * np.pi * 70 * u) * np.exp(-u * 10)
ring = (np.sin(2 * np.pi * 1450 * u) + .6 * np.sin(2 * np.pi * 2330 * u)) * np.exp(-u * 18) * .25
save('zealot_impacto', norm(boom + ring))
