#!/usr/bin/env python3
"""build_step_hydra.py - sintetiza el PASO DEL HIDRALISCO (assets/audio/sfx/paso_hidralisco.mp3).
El paso anterior era un 'arrastre humedo' de 0,34 s (ruido agudo sostenido con granulado): al sonar 3 veces por segundo se pegaban
unos con otros y parecia que arrastraba algo. Este es una PISADA pesada y corta: golpe grave + chasquido humedo breve, que se apaga en
unos 100 ms. El original se conserva en assets/audio/source/paso_hidralisco_arrastre_original.mp3 (copialo sobre el actual para volver).
Uso:  python3 tools/build_step_hydra.py     (requiere numpy, scipy y ffmpeg)  y despues  python3 tools/build_audio_data.py
Ajustes: THUMP (cuerpo grave), SQUELCH (chasquido humedo), LEN (duracion total en s)."""
import os, subprocess, tempfile, wave
import numpy as np
from scipy.signal import butter, lfilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/audio/sfx/paso_hidralisco.mp3')
SR, LEN, THUMP, SQUELCH = 44100, .17, 1.0, .55
rng = np.random.default_rng(231)              # semilla propia: no cambia el resto de sonidos
x = np.arange(int(SR * LEN)) / SR
def bp(s, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, s)
def lp(s, f): b, a = butter(2, f / (SR / 2), 'low'); return lfilter(b, a, s)
def env(a, d): return np.clip(x / a, 0, 1) * np.exp(-x * d)
glide = 118 * (46 / 118) ** (x / .1)          # golpe grave que baja de 118 a 46 Hz
thump = np.sin(2 * np.pi * np.cumsum(glide) / SR) * env(.003, 30)
body = lp(rng.standard_normal(len(x)), 420) * env(.002, 34) * .6          # peso del impacto
squelch = bp(rng.standard_normal(len(x)), 350, 1500) * env(.003, 48) * (x < .07) * (1 + .5 * np.sin(2 * np.pi * 70 * x))   # chasquido humedo: dura menos de 70 ms
sig = thump * THUMP + body + squelch * SQUELCH
sig *= np.clip((LEN - x) / .02, 0, 1)         # cierre suave de 20 ms (sin corte seco)
rms = np.sqrt(np.convolve(sig ** 2, np.ones(int(SR * .01)) / int(SR * .01), 'same'))
sig *= 10 ** (-10.3 / 20) / rms.max()         # misma sonoridad de pico (-10,3 dBFS) que el paso anterior, para no tocar el volumen del juego
sig = np.clip(sig, -.98, .98)
pcm = (sig * 32767).astype('<i2')
with tempfile.TemporaryDirectory() as td:
    wav = os.path.join(td, 'p.wav')
    with wave.open(wav, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', OUT], check=True)
print('OK paso_hidralisco.mp3 %.2f s' % LEN)
