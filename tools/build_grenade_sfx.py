#!/usr/bin/env python3
"""build_grenade_sfx.py - sintetiza los sonidos de la granada del Marine (no usa archivos externos):
   assets/audio/sfx/granada_lanza.wav   (chasquido de la espoleta + silbido del lanzamiento)
   assets/audio/sfx/granada_explota.wav (golpe seco + estallido + escombros + eco), estereo
Uso:  python3 tools/build_grenade_sfx.py     (requiere numpy y scipy)
Puedes reemplazar los .wav por tus propios sonidos con el mismo nombre."""
import os, wave
import numpy as np
from scipy.signal import butter, lfilter, fftconvolve

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'audio', 'sfx')
rng = np.random.default_rng(7)
def t(sec): return np.arange(int(SR * sec)) / SR
def lp(x, f): b, a = butter(2, f / (SR / 2), 'low'); return lfilter(b, a, x)
def hp(x, f): b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)
def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)
def sweep_lp(x, f0, f1, tau):   # filtro paso-bajo cuyo corte baja con el tiempo (por bloques)
    out = np.zeros_like(x); n = 512; zi = None
    for i in range(0, len(x), n):
        f = f1 + (f0 - f1) * np.exp(-(i / SR) / tau)
        b, a = butter(2, min(f, SR / 2 - 100) / (SR / 2), 'low')
        if zi is None: zi = np.zeros(max(len(a), len(b)) - 1)
        y, zi = lfilter(b, a, x[i:i + n], zi=zi); out[i:i + n] = y
    return out
def norm(x, peak=.92): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, data):
    d = np.atleast_2d(data)
    if d.shape[0] == 1: d = d.T if d.shape[1] > 1 else d
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    ch = 1 if data.ndim == 1 else data.shape[0]
    if ch == 2: pcm = (np.clip(data.T, -1, 1) * 32767).astype('<i2').reshape(-1)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('OK', name)

os.makedirs(OUT, exist_ok=True)

# ---------------- LANZAMIENTO ----------------
x = t(.55)
ping = np.sin(2 * np.pi * 3400 * x) * np.exp(-x * 90) * (x < .06)               # "tink" de la anilla
ping += .5 * np.sin(2 * np.pi * 5100 * x) * np.exp(-x * 110) * (x < .05)
click = hp(rng.standard_normal(len(x)), 1500) * np.exp(-x * 220) * .5            # chasquido del seguro
thunk = np.sin(2 * np.pi * (140 - 70 * np.minimum(x, .12) / .12) * x) * np.exp(-(x) * 28) * .8   # golpe del brazo
env = np.clip((x - .04) / .12, 0, 1) * np.exp(-np.maximum(x - .12, 0) * 7)
whoosh = bp(rng.standard_normal(len(x)), 500, 3800) * env * .55                    # silbido
whoosh = whoosh * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * x))                         # giro de la granada
sig = ping * .6 + click + thunk + whoosh
save('granada_lanza.wav', norm(sig, .85))

# ---------------- EXPLOSION ----------------
L = 2.4; x = t(L); n = len(x)
crack = hp(rng.standard_normal(n), 2500) * np.exp(-x * 160) * 1.0                  # estallido seco inicial
body = sweep_lp(rng.standard_normal(n), 5500, 160, .22) * np.exp(-x * 2.9)         # cuerpo: ruido que se vuelve grave
body *= np.clip(x / .003, 0, 1)
f = 135 * np.exp(-x * 6) + 32                                                      # golpe grave que cae de tono
sub = np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-x * 4.2) * 1.15
# escombros: chasquidos sueltos que se van espaciando
deb = np.zeros(n)
for k in range(70):
    ts = (.05 + rng.random() ** 1.7 * 1.4)
    i = int(ts * SR)
    if i < n - 400:
        c = np.exp(-np.arange(400) / rng.uniform(8, 40)) * rng.standard_normal(400)
        deb[i:i + 400] += c * rng.uniform(.05, .22) * np.exp(-ts * 1.6)
deb = bp(deb, 900, 7000)
dry = crack * .8 + body * 1.0 + sub * .9 + deb * .9
dry = np.tanh(dry * 1.25)
# eco: respuesta al impulso distinta por canal (estereo ancho)
def ir(seed, sec=.9):
    r = np.random.default_rng(seed); k = t(sec)
    return lp(r.standard_normal(len(k)), 3200) * np.exp(-k * 5.5)
wetL = fftconvolve(dry, ir(1))[:n]; wetR = fftconvolve(dry, ir(2))[:n]
wetL, wetR = wetL / (np.max(np.abs(wetL)) + 1e-9), wetR / (np.max(np.abs(wetR)) + 1e-9)
d = int(.007 * SR)
left = dry + .34 * wetL; right = np.concatenate([np.zeros(d), dry[:-d]]) + .34 * wetR
fade = np.clip((L - x) / .25, 0, 1)
stereo = np.vstack([left * fade, right * fade])
stereo = stereo / np.max(np.abs(stereo)) * .93
save('granada_explota.wav', stereo)
