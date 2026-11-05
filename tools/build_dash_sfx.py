#!/usr/bin/env python3
"""build_dash_sfx.py - sintetiza assets/audio/sfx/dash.wav (soplido corto del dash de todos los luchadores).
Uso:  python3 tools/build_dash_sfx.py      (requiere numpy y scipy)
Despues:  python3 tools/build_audio_data.py   (para incrustarlo en js/audio_data.js)
Puedes reemplazar el .wav por un sonido tuyo con el mismo nombre."""
import os, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'audio', 'sfx', 'dash.wav')
rng = np.random.default_rng(41)
dur = .24
x = np.arange(int(SR * dur)) / SR
n = rng.standard_normal(len(x))
# soplido: ruido filtrado cuyo brillo sube y baja (barrido de paso de banda por bloques)
out = np.zeros_like(n)
B = 256
for i in range(0, len(n), B):
    u = i / len(n)
    c = 700 + 3200 * np.sin(np.pi * min(1, u * 1.15))        # centro del filtro: sube y vuelve a bajar
    lo, hi = c * .6, min(c * 1.7, SR / 2 - 100)
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band')
    out[i:i + B] = lfilter(b, a, n[i:i + B])
env = np.clip(x / .035, 0, 1) * np.exp(-((x - .07) / .09) ** 2 * .0 - x * 9)
thump = np.sin(2 * np.pi * (140 - 70 * x / dur) * x) * np.exp(-x * 30) * .5   # golpe grave del impulso
y = out * env + thump
y = y / (np.max(np.abs(y)) + 1e-9) * .8
a = int(SR * .004); b = int(SR * .03)
y[:a] *= np.linspace(0, 1, a); y[-b:] *= np.linspace(1, 0, b)
with wave.open(OUT, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
print('OK dash.wav', round(len(y) / SR, 2), 's')
