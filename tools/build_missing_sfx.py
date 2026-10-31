#!/usr/bin/env python3
"""build_missing_sfx.py - sintetiza los efectos de sonido que faltaban (no usa archivos externos).
Genera en assets/audio/sfx/ (mono, 44.1 kHz, .wav):
  impacto, recoger_escudo, recoger_stimpack, recoger_medkit, recoger_multidisparo, especial_listo,
  acido_escupe, acido_cae, zergling_cae, zergling_explota, inicio_ronda, cuenta_atras, fight, ko,
  victoria, nuclear_cae
  y los nuevos: dt_evade, critico, dt_cloak, dt_reveal, ling_beep, ling_pop, acido_chisporroteo,
  reloj_alerta
Uso:  python3 tools/build_missing_sfx.py     (requiere numpy y scipy)
Puedes reemplazar cualquier .wav por un sonido tuyo con el mismo nombre."""
import os, wave
import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'audio', 'sfx')
rng = np.random.default_rng(11)

def t(sec): return np.arange(int(SR * sec)) / SR
def noise(sec): return rng.standard_normal(int(SR * sec))
def _f(x, kind, f):
    b, a = butter(2, (np.array(f) if kind == 'band' else f) / (SR / 2), kind); return lfilter(b, a, x)
def lp(x, f): return _f(x, 'low', f)
def hp(x, f): return _f(x, 'high', f)
def bp(x, lo, hi): return _f(x, 'band', [lo, hi])
def env(x, a=.003, d=8): return np.clip(x / a, 0, 1) * np.exp(-x * d)
def tone(f, sec, d=6, a=.003, harm=(1,)):
    x = t(sec)
    if np.ndim(f): f = np.pad(f, (0, max(0, len(x) - len(f))), mode='edge')[:len(x)]   # barrido mas corto que la nota: mantiene la ultima frecuencia
    else: f = f * np.ones_like(x)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(np.sin(ph * (i + 1)) / (i + 1) ** .8 for i in range(len(harm))) * env(x, a, d)
def glide(f0, f1, sec): x = t(sec); return f0 * (f1 / f0) ** (x / sec)
def place(buf, snd, at):
    i = int(at * SR); n = min(len(snd), len(buf) - i)
    if n > 0: buf[i:i + n] += snd[:n]
def fade(x, ms=12):
    n = int(SR * ms / 1000); m = int(SR * .001); x = x.copy(); x[:m] *= np.linspace(0, 1, m); x[-n:] *= np.linspace(1, 0, n); return x
def norm(x, peak=.85): return x / (np.max(np.abs(x)) + 1e-9) * peak
def save(name, x):
    pcm = (np.clip(fade(x), -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('OK', name + '.wav', round(len(x) / SR, 2), 's')
def boom(sec, d, f0=140, f1=34, nz=1.0):   # golpe grave + ruido que se oscurece
    x = t(sec); n = len(x)
    sub = np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-x * 7)) / SR)) * np.exp(-x * d)
    body = lp(noise(sec), 2800) * np.exp(-x * d * .9) * nz
    crack = hp(noise(sec), 2200) * np.exp(-x * 120) * .7
    return sub * .9 + body * .6 + crack

os.makedirs(OUT, exist_ok=True)

# ---- golpes ----
x = t(.28)
save('impacto', norm(boom(.28, 16, 190, 70, .8) + bp(noise(.28), 600, 3000) * np.exp(-x * 35) * .5))
x = t(.3)
save('critico', norm(hp(noise(.3), 1800) * np.exp(-x * 70) + tone(1250, .3, 40) * .5
                     + tone(glide(260, 80, .3), .3, 22) * .9 + bp(noise(.3), 3000, 7000) * np.exp(-x * 25) * .35))

# ---- objetos ----
b = np.zeros(int(SR * .7))                                                   # escudo: barrido electrico ascendente
for i, f in enumerate([523, 784, 1047, 1568]): place(b, tone(f, .45, 7, harm=(1, 2)) * .6, i * .06)
b += bp(noise(.7), 2000, 6000) * env(t(.7), .05, 6) * .15
save('recoger_escudo', norm(b))
x = t(.6)                                                                    # stimpack: siseo de jeringa + pulso grave
b = bp(noise(.6), 2500, 9000) * np.clip(x / .02, 0, 1) * np.exp(-x * 9) * .6
place(b, tone(95, .5, 8, harm=(1, 2)) * .9, .1); place(b, tone(95, .4, 9, harm=(1, 2)) * .6, .28)
save('recoger_stimpack', norm(b))
b = np.zeros(int(SR * .75))                                                  # medkit: dos campanitas suaves
place(b, tone(659, .4, 7, harm=(1, 2, 3)) * .6, 0); place(b, tone(880, .55, 6, harm=(1, 2, 3)) * .6, .13)
save('recoger_medkit', norm(b))
b = np.zeros(int(SR * .6))                                                   # multidisparo: tres tiros rapidos ascendentes
for i, f in enumerate([700, 900, 1150]):
    place(b, bp(noise(.1), 800, 5000) * env(t(.1), .001, 45) * .6 + tone(f, .1, 30, harm=(1, 2)) * .5, i * .07)
place(b, tone(1700, .35, 9, harm=(1, 2)) * .45, .2)
save('recoger_multidisparo', norm(b))
b = np.zeros(int(SR * .8))                                                   # especial listo: ding doble brillante
place(b, tone(988, .5, 7, harm=(1, 2, 3)) * .7, 0); place(b, tone(1319, .7, 5, harm=(1, 2, 3)) * .8, .11)
save('especial_listo', norm(b))

# ---- acido ----
x = t(.5); f = glide(220, 900, .5)                                           # escupida: burbujeo humedo que sube
save('acido_escupe', norm(bp(noise(.5), 300, 2500) * np.clip(x / .04, 0, 1) * np.exp(-x * 5) * (.6 + .4 * np.sin(2 * np.pi * 38 * x))
                          + tone(f, .5, 7) * .35 * (.5 + .5 * np.sin(2 * np.pi * 30 * x))))
x = t(.8)                                                                    # cae: chapoteo + chisporroteo
b = lp(noise(.8), 1800) * env(x, .002, 14) * .9 + bp(noise(.8), 3500, 9000) * np.exp(-x * 4) * (rng.random(len(x)) > .93) * 2.2
save('acido_cae', norm(b + tone(glide(300, 90, .8), .8, 10) * .4))
x = t(.7); crack = (rng.random(len(x)) > .96) * rng.standard_normal(len(x))   # chisporroteo al impactar
save('acido_chisporroteo', norm(hp(crack, 2500) * np.exp(-x * 4.5) + bp(noise(.7), 4000, 9000) * np.exp(-x * 6) * .2, .6))

# ---- zergling ----
x = t(.45)
save('zergling_cae', norm(boom(.45, 14, 120, 55, .6) + tone(glide(1500, 700, .3), .45, 11, harm=(1, 2)) * .35 * (x < .3)))
save('zergling_explota', norm(boom(.9, 5, 160, 40, 1.2) + hp(noise(.9), 1500) * np.exp(-t(.9) * 45) * .5))
b = np.zeros(int(SR * .12)); place(b, tone(1800, .1, 40) * .9, 0)           # pitido de la cuenta atras
save('ling_beep', norm(b, .7))
x = t(.3)                                                                    # explosion debil por tiempo: "pop"
save('ling_pop', norm(tone(glide(420, 90, .3), .3, 16) * .9 + bp(noise(.3), 500, 4000) * np.exp(-x * 30) * .6))

# ---- ritmo de ronda ----
x = t(1.3)                                                                   # inicio de ronda: gong/cuerno grave
b = sum(np.sin(2 * np.pi * f * x + i) * a for i, (f, a) in enumerate([(98, 1), (147, .55), (196, .5), (293, .3), (392, .2)]))
save('inicio_ronda', norm(b * env(x, .02, 2.6) + lp(noise(1.3), 900) * env(x, .005, 8) * .3))
save('cuenta_atras', norm(tone(880, .3, 14, harm=(1, 2)) * .8 + tone(440, .3, 14) * .4, .8))
x = t(1.1)                                                                   # FIGHT!: golpe de metales + barrido
b = sum(np.sin(2 * np.pi * f * x) * a for f, a in [(220, 1), (330, .6), (440, .7), (660, .35)])
b = np.tanh(b * 1.2) * env(x, .008, 3.5)
save('fight', norm(b + boom(1.1, 5, 120, 45, .8) * .8 + bp(noise(1.1), 800, 6000) * env(x, .15, 4) * .3))
x = t(1.6)                                                                   # K.O.: impacto enorme + caida de tono
save('ko', norm(boom(1.6, 3.2, 170, 36, 1.1) * 1.1 + tone(glide(420, 55, 1.6), 1.6, 2.4, harm=(1, 2)) * .5))
b = np.zeros(int(SR * 2.2))                                                  # victoria: fanfarria ascendente
for f, at, du in [(392, 0, .3), (523, .22, .3), (659, .44, .3), (784, .66, 1.4)]:
    n = tone(f, du, 3, harm=(1, 2, 3, 4)); place(b, n * .6, at); place(b, tone(f / 2, du, 3, harm=(1, 2)) * .4, at)
save('victoria', norm(b))

# ---- nuclear ----
L = 2.6; x = t(L)                                                            # silbido del misil que cae (baja de tono, sube de volumen)
f = glide(2600, 380, L); w = np.sin(2 * np.pi * np.cumsum(f) / SR) * .5
wh = bp(noise(L), 600, 3500) * .5
a = (x / L) ** 1.6
save('nuclear_cae', norm((w + wh) * a * (1 - np.clip((x - (L - .05)) / .05, 0, 1))))

# ---- Dark Templar: evasion y camuflaje ----
x = t(.7); f = glide(2200, 500, .7)                                          # whoosh fantasmal con eco
b = bp(noise(.7), 700, 4000) * np.sin(np.pi * np.clip(x / .7, 0, 1)) ** 1.5 * .7 + tone(f, .7, 4, a=.05) * .25
echo = np.zeros_like(b); place(echo, b * .4, .11); place(echo, b * .2, .22)
save('dt_evade', norm(b + echo, .75))
x = t(.9); sh = sum(np.sin(2 * np.pi * (1800 + 700 * k) * x + k) * (.6 + .4 * np.sin(2 * np.pi * (5 + 2 * k) * x)) for k in range(4))
save('dt_cloak', norm(sh * np.sin(np.pi * x / .9) ** 2 * np.exp(-x * 1.2) + tone(glide(900, 220, .9), .9, 3, a=.1) * .3, .6))   # se oculta: brillo que se apaga
x = t(.5)
save('dt_reveal', norm(bp(noise(.5), 1500, 8000) * env(x, .004, 9) * .8 + tone(glide(300, 1500, .5), .5, 7, harm=(1, 2)) * .4, .7))   # se revela: destello

# ---- reloj de ronda (ultimos 10 s) ----
b = np.zeros(int(SR * .2)); place(b, tone(660, .14, 25, harm=(1, 3)) * .8, 0)
save('reloj_alerta', norm(b, .7))
