#!/usr/bin/env python3
"""build_extra_sfx.py - sintetiza (sin archivos externos) en assets/audio/sfx/:
   paso_marine, paso_dt   pasos (botas metalicas, pisada etérea; el del Hidralisco: tools/build_step_hydra.py)
   publico_ko, publico_critico, publico_nuclear   el publico del coliseo
   tension   latido en bucle que acompana los ultimos 10 s de la ronda
Uso:  python3 tools/build_extra_sfx.py     (requiere numpy y scipy)
Puedes reemplazar cualquier .wav por un sonido tuyo con el mismo nombre."""
import os, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'audio', 'sfx')
rng = np.random.default_rng(23)

def t(sec): return np.arange(int(SR * sec)) / SR
def noise(sec): return rng.standard_normal(int(SR * sec))
def _f(x, kind, f):
    b, a = butter(2, (np.array(f) if kind == 'band' else f) / (SR / 2), kind); return lfilter(b, a, x)
def lp(x, f): return _f(x, 'low', f)
def hp(x, f): return _f(x, 'high', f)
def bp(x, lo, hi): return _f(x, 'band', [lo, hi])
def env(x, a=.003, d=8): return np.clip(x / a, 0, 1) * np.exp(-x * d)
def sine(f, sec, d=8, a=.003):
    x = t(sec); f = f * np.ones_like(x) if not np.ndim(f) else np.pad(f, (0, max(0, len(x) - len(f))), mode='edge')[:len(x)]
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(x, a, d)
def glide(f0, f1, sec): x = t(sec); return f0 * (f1 / f0) ** (x / sec)
def place(buf, snd, at):
    i = int(at * SR); n = min(len(snd), len(buf) - i)
    if n > 0: buf[i:i + n] += snd[:n]
def norm(x, peak=.85): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, x, f_in=6, f_out=14):
    x = x.copy(); a = int(SR * f_in / 1000); b = int(SR * f_out / 1000)
    if a: x[:a] *= np.linspace(0, 1, a)
    if b: x[-b:] *= np.linspace(1, 0, b)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('OK', name + '.wav', round(len(x) / SR, 2), 's')

os.makedirs(OUT, exist_ok=True)

# ---------------- PASOS ----------------
x = t(.2)                                                                    # Marine: bota sobre metal (golpe seco + chasquido + ping)
b = sine(glide(120, 50, .1), .2, 28) * 1.0 + bp(noise(.2), 700, 3500) * env(x, .001, 90) * .8 + sine(1900, .2, 55) * .22 + sine(2750, .2, 70) * .12
save('paso_marine', norm(b, .8))
x = t(.34)                                                                   # Hidralisco: arrastre humedo (sh-shlk)
sl = bp(noise(.34), 250, 1900) * np.sin(np.pi * np.clip(x / .3, 0, 1)) ** 1.3 * (.55 + .45 * np.sin(2 * np.pi * 36 * x))
sq = lp(noise(.34), 700) * env(x - 0, .004, 26) * .6 * (x < .12)
# (paso_hidralisco ya no se guarda aqui: el 'arrastre humedo' sonaba a roce continuo; el paso actual lo genera tools/build_step_hydra.py. Se sigue calculando solo para no cambiar el ruido aleatorio de los sonidos siguientes)
_ = norm(sl + sq + sine(glide(95, 55, .12), .34, 24) * .5, .8)
x = t(.3)                                                                    # Dark Templar: pisada suave con brillo psionico
b = lp(noise(.3), 500) * env(x, .002, 40) * .9 + sine(glide(110, 60, .1), .3, 26) * .5
b += (sine(1320, .3, 14) * .13 + sine(1980, .3, 18) * .09) * (1 + .4 * np.sin(2 * np.pi * 22 * x))
save('paso_dt', norm(b, .7))

# ---------------- PUBLICO ----------------
def crowd(sec, n=34, lo=130, hi=270, glide_to=1.0, vowel=((700, 1300), (1200, 2600))):
    """n 'voces': dientes de sierra con vibrato y glissando, filtrados como una vocal, mas ruido de multitud"""
    x = t(sec); out = np.zeros(len(x))
    for _ in range(n):
        f0 = rng.uniform(lo, hi); g = 1 + (glide_to - 1) * np.clip(x / sec, 0, 1)
        vib = 1 + .012 * np.sin(2 * np.pi * rng.uniform(4, 7) * x + rng.uniform(0, 6.3))
        ph = 2 * np.pi * np.cumsum(f0 * g * vib) / SR
        v = sum(np.sin(ph * k) / k for k in range(1, 9))
        on = rng.uniform(0, .25 * sec); off = rng.uniform(.6 * sec, sec)
        out += v * np.clip((x - on) / .12, 0, 1) * np.clip((off - x) / .3, 0, 1) * rng.uniform(.5, 1)
    f1 = bp(out, *vowel[0]); f2 = bp(out, *vowel[1])
    roar = bp(noise(sec), 300, 3200) * (.5 + .5 * np.abs(lp(noise(sec), 6) * 12))
    return f1 + .6 * f2 + roar * .9
x = t(3.2)                                                                   # K.O.: gran rugido que sube y se apaga
b = crowd(3.2, 40, 120, 250) * np.clip(x / .25, 0, 1) * np.exp(-np.maximum(x - .9, 0) * .85)
save('publico_ko', norm(b, .8), 8, 400)
x = t(1.3)                                                                   # critico: "ooooh!" corto que sube de tono
b = crowd(1.3, 26, 140, 300, 1.25, ((420, 900), (900, 2000))) * np.sin(np.pi * np.clip(x / 1.3, 0, 1)) ** .8
save('publico_critico', norm(b, .7), 8, 250)
x = t(4.2)                                                                  # nuclear: inhalacion de susto + murmullo que crece hasta rugido
gasp = bp(noise(.7), 1200, 6500) * np.sin(np.pi * np.clip(t(.7) / .7, 0, 1)) ** 1.4 * .7
body = crowd(4.2, 44, 110, 240, .88, ((500, 1000), (1000, 2300))) * np.clip(x / 2.8, 0, 1) ** 1.5 * np.exp(-np.maximum(x - 3.0, 0) * 1.4)
b = body.copy(); place(b, gasp, 0)
save('publico_nuclear', norm(b, .8), 8, 500)

# ---------------- TENSION (latido, bucle de 1 s) ----------------
x = t(1.0); b = np.zeros(len(x))
place(b, sine(glide(75, 42, .16), .3, 12) * 1.0, 0)
place(b, sine(glide(66, 38, .16), .3, 13) * .75, .22)
b += bp(noise(1.0), 60, 240) * (env(x, .004, 18) + .7 * env(np.maximum(x - .22, 0), .004, 18) * (x >= .22)) * .25
save('tension', norm(b, .85), 0, 0)
