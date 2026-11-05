#!/usr/bin/env python3
"""build_bc_audio.py - sintetiza el audio del super ataque del BATTLECRUISER (sin archivos externos ni derechos de terceros).

Genera:
  assets/audio/music/bc.mp3                     musica de combate que sustituye a arena.mp3 mientras el Battlecruiser esta en pantalla
                                                (stereo, ~51 s, 150 BPM, mi menor; guitarra distorsionada, bajo, bateria, metales y lead)
  assets/audio/sfx/bc_entrada.wav               salto tactico: la nave llega
  assets/audio/sfx/bc_bocina.wav                bocina grave del cartel "Battlecruiser"
  assets/audio/sfx/bc_laser.wav                 disparo de la bateria laser
  assets/audio/sfx/bc_laser_impacto.wav         impacto del laser
  assets/audio/sfx/bc_yamato_carga.wav          carga del canon Yamato
  assets/audio/sfx/bc_yamato_disparo.wav        disparo e impacto del Yamato
  assets/audio/sfx/bc_salida.wav                la nave se retira
Puedes reemplazar cualquiera por un archivo tuyo con el mismo nombre (p. ej. bc.mp3 con la musica Terran que prefieras).
Uso:  python3 tools/build_bc_audio.py        (requiere numpy, scipy y ffmpeg para el mp3)
Despues:  python3 tools/build_audio_data.py   (incrusta los efectos nuevos en js/audio_data.js para abrir index.html con doble clic)"""
import os, subprocess, wave, tempfile
import numpy as np
from scipy.signal import butter, lfilter, fftconvolve

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, 'assets', 'audio', 'sfx')
MUS = os.path.join(ROOT, 'assets', 'audio', 'music')
rng = np.random.default_rng(2026)

# ------------------------------------------------------------------ utilidades
def t(sec): return np.arange(int(SR * sec)) / SR
def noise(sec): return rng.standard_normal(int(SR * sec))
def _f(x, kind, f, o=2):
    b, a = butter(o, (np.array(f) if kind == 'band' else f) / (SR / 2), kind); return lfilter(b, a, x)
def lp(x, f, o=2): return _f(x, 'low', f, o)
def hp(x, f, o=2): return _f(x, 'high', f, o)
def bp(x, lo, hi): return _f(x, 'band', [lo, hi])
def glide(f0, f1, sec): x = t(sec); return f0 * (f1 / f0) ** (x / sec)
def sine_f(freq):   # seno con frecuencia variable (array)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR)
def saw_f(freq):
    ph = np.cumsum(freq) / SR; return 2 * (ph % 1) - 1
def fade(x, ms=12):
    n = int(SR * ms / 1000); m = int(SR * .001); x = x.copy(); x[:m] *= np.linspace(0, 1, m); x[-n:] *= np.linspace(1, 0, n); return x
def norm(x, peak=.88): return x / (np.max(np.abs(x)) + 1e-9) * peak
def place(buf, snd, at):
    i = int(at * SR); n = min(len(snd), len(buf) - i)
    if n > 0 and i >= 0: buf[i:i + n] += snd[:n]
def save_wav(name, x):
    pcm = (np.clip(fade(x), -1, 1) * 32767).astype('<i2')
    with wave.open(os.path.join(SFX, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print('OK  sfx/%s.wav  %.2f s' % (name, len(x) / SR))
def boom(sec, d, f0=140, f1=34, nz=1.0):
    x = t(sec)
    sub = np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-x * 7)) / SR)) * np.exp(-x * d)
    body = lp(noise(sec), 2800) * np.exp(-x * d * .9) * nz
    crack = hp(noise(sec), 2200) * np.exp(-x * 120) * .7
    return sub * .9 + body * .6 + crack

# ------------------------------------------------------------------ efectos
os.makedirs(SFX, exist_ok=True); os.makedirs(MUS, exist_ok=True)

# salto tactico: barrido que sube + chisporroteo electrico y, al llegar, un golpe grave
d = 2.4; x = t(d); n = len(x)
sweep = bp(noise(d), 250, 4200) * (x / d) ** 2.2
f = glide(90, 1500, d); whine = sine_f(f) * (x / d) ** 2 * .35
crackle = hp(noise(d), 4500) * (rng.random(n) > .985) * (x / d) * 2.2
hit_at = 1.55; y = np.zeros(n); place(y, boom(.85, 4.5, 110, 28, 1.1) * 1.6, hit_at)
place(y, hp(noise(.5), 3000) * np.exp(-t(.5) * 9) * .8, hit_at)
air = lp(noise(d), 900) * np.exp(-np.abs(x - hit_at) * 2.2) * .5
env_in = np.where(x < hit_at, 1, np.exp(-(x - hit_at) * 2.6))
save_wav('bc_entrada', norm((sweep * 1.1 + whine + crackle) * env_in + y + air))

# bocina grave del cartel (dos notas largas con metales)
d = 2.2; x = t(d); y = np.zeros(len(x))
for off, fr, dur in ((0, 55, 1.0), (.78, 41.2, 1.4)):
    xx = t(dur); fq = fr * (1 + .004 * np.sin(2 * np.pi * 5 * xx))
    v = sum(saw_f(fq * k * (1 + .003 * j)) / k for k in (1, 2, 3) for j in (-1, 0, 1)) / 6
    v = lp(v, 900) * np.minimum(1, xx / .08) * np.exp(-np.maximum(0, xx - dur * .55) * 4.2)
    place(y, v, off)
save_wav('bc_bocina', norm(np.tanh(1.6 * y) + lp(noise(d), 200) * .05, .8))

# laser: chirrido que cae + chasquido
d = .34; x = t(d); fq = glide(2600, 330, d)
y = (sine_f(fq) + .5 * saw_f(fq * .5)) * np.exp(-x * 10) + hp(noise(d), 3500) * np.exp(-x * 60) * .7 + bp(noise(d), 800, 2500) * np.exp(-x * 24) * .3
save_wav('bc_laser', norm(np.tanh(1.4 * y), .8))

# impacto del laser: explosion corta
save_wav('bc_laser_impacto', norm(boom(.42, 11, 170, 52, .9) + hp(noise(.42), 3500) * np.exp(-t(.42) * 45) * .4))

# carga del Yamato: zumbido que sube con temblor y retumbo creciente
d = 1.7; x = t(d); fq = glide(70, 2300, d)
trem = .75 + .25 * np.sin(2 * np.pi * (6 + 20 * x / d) * x)
y = (sine_f(fq) * .55 + saw_f(fq * .5) * .2) * trem * (x / d) ** 1.4
y += lp(noise(d), 260) * (x / d) ** 2.2 * 1.3 + hp(noise(d), 5500) * (x / d) ** 3 * .25
save_wav('bc_yamato_carga', norm(np.tanh(1.5 * y)))

# disparo del Yamato: estallido enorme + onda que cae
d = 1.7; x = t(d); y = np.zeros(len(x))
place(y, boom(1.7, 2.6, 190, 24, 1.3) * 1.5, 0)
place(y, hp(noise(.35), 1500) * np.exp(-t(.35) * 16) * 1.0, 0)
place(y, sine_f(glide(1800, 90, .9)) * np.exp(-t(.9) * 3.4) * .55, 0)
y += lp(noise(d), 500) * np.exp(-x * 2.0) * .7
save_wav('bc_yamato_disparo', norm(np.tanh(1.3 * y), .95))

# salida: barrido que sube y se apaga
d = 1.25; x = t(d)
y = bp(noise(d), 300, 3800) * np.sin(np.pi * np.minimum(1, x / d)) ** 1.5 + sine_f(glide(200, 1900, d)) * np.exp(-x * 2.2) * .35
place(y, boom(.5, 9, 90, 30, .8) * .5, 0)
save_wav('bc_salida', norm(y, .8))

# ------------------------------------------------------------------ musica
BPM = 150; BEAT = 60 / BPM; BAR = BEAT * 4; STEP = BEAT / 4
NB = 32; TAIL = 2.5
N = int((NB * BAR + TAIL) * SR)
mf = lambda m: 440 * 2 ** ((m - 69) / 12)

def at_bar(b, step=0): return b * BAR + step * STEP
bus = {k: np.zeros(N) for k in ('kick', 'snare', 'hat', 'bass', 'gtr', 'pad', 'lead', 'fx')}

def put(name, snd, at):
    i = int(at * SR); n = min(len(snd), N - i)
    if n > 0: bus[name][i:i + n] += snd[:n]

# --- batería
def kick():
    x = t(.5); fq = 48 + 110 * np.exp(-x * 38)
    return (np.sin(2 * np.pi * np.cumsum(fq) / SR) * np.exp(-x * 9) + hp(noise(.5), 3000) * np.exp(-x * 140) * .35) * 1.05
def snare():
    x = t(.32)
    return (bp(noise(.32), 1100, 7500) * np.exp(-x * 17) * .8 + np.sin(2 * np.pi * 190 * x) * np.exp(-x * 30) * .6 + hp(noise(.32), 4200) * np.exp(-x * 60) * .3)
def hat(op=False):
    x = t(.3 if op else .08); return hp(noise(len(x) / SR), 7500) * np.exp(-x * (13 if op else 70))
def crash():
    x = t(2.6); return hp(noise(2.6), 4200) * np.exp(-x * 1.7) * .7
KICK, SNARE, HAT, OHAT, CRASH = kick(), snare(), hat(), hat(True), crash()

def drums(b, mode):
    """mode: 'sparse' (intro), 'main', 'b' (seccion B), 'fill' (ultimo compas de la subida)"""
    if mode == 'sparse':
        for s in (0, 8): put('kick', KICK * .8, at_bar(b, s))
        for s in range(0, 16, 4): put('hat', HAT * .5, at_bar(b, s))
        return
    kicks = {'main': (0, 3, 4, 8, 10, 12), 'b': (0, 4, 6, 8, 12, 14), 'fill': (0, 4, 8, 10, 12, 13, 14, 15)}[mode]
    for s in kicks: put('kick', KICK * (1 if s % 4 == 0 else .75), at_bar(b, s))
    for s in (4, 12): put('snare', SNARE, at_bar(b, s))
    if mode == 'fill':
        for s in (13, 14, 15): put('snare', SNARE * .8, at_bar(b, s))
    for s in range(0, 16, 2): put('hat', HAT * (.8 if s % 4 == 0 else .5), at_bar(b, s))
    put('hat', OHAT * .8, at_bar(b, 14))

# --- bajo y guitarra (potencia en mi menor)
def bass_note(m, dur):
    x = t(dur); fq = mf(m) * np.ones_like(x)
    return (saw_f(fq) * .7 + np.sin(2 * np.pi * np.cumsum(fq) / SR) * .5) * np.minimum(1, x / .005) * np.exp(-x * 3.2)
def gtr_chord(root, dur, accent):
    x = t(dur); y = np.zeros(len(x))
    for iv, g in ((0, 1), (7, .8), (12, .7)):
        for det in (-.004, 0, .004):
            y += saw_f(mf(root + iv) * (1 + det) * np.ones_like(x)) * g / 3
    return y * np.minimum(1, x / .003) * np.exp(-x * (24 if not accent else 11))

PROG = {'A': (40, 40, 41, 38), 'B': (36, 38, 40, 35), 'I': (40, 40, 40, 40), 'U': (36, 38, 40, 40)}
SEC = ['I'] * 4 + ['A'] * 8 + ['B'] * 8 + ['A'] * 8 + ['U'] * 4     # 32 compases
GALLOP = (1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1)
for b in range(NB):
    sec = SEC[b]; root = PROG[sec][b % 4]
    mode = 'sparse' if sec == 'I' else 'fill' if b == NB - 1 else 'b' if sec == 'B' else 'main'
    drums(b, mode)
    for s in range(16):          # bajo: corcheas con salto de octava
        if s % 2 == 0 and not (sec == 'I' and b < 2):
            put('bass', bass_note(root + (12 if s in (6, 14) else 0), STEP * 2.2), at_bar(b, s))
    if sec != 'I':               # guitarra al galope
        for s in range(16):
            if GALLOP[s]: put('gtr', gtr_chord(root + 12, STEP * 3, s % 4 == 0 and s in (0, 8)), at_bar(b, s))
    # colchon de metales: una nota larga por compas
    dur = BAR * 1.02; x = t(dur)
    for iv in (12, 19, 24):
        fq = mf(root + iv) * np.ones_like(x)
        v = sum(saw_f(fq * (1 + d_)) for d_ in (-.006, -.002, .002, .006)) / 4
        put('pad', v * np.minimum(1, x / .35) * np.minimum(1, (dur - x) / .3) * (.5 if sec == 'I' else 1), at_bar(b))
    if b in (4, 12, 20): put('fx', CRASH, at_bar(b))
# riser de la intro y de la subida final
for b0 in (2, 28):
    d = 2 * BAR; x = t(d); put('fx', hp(noise(d), 1200) * (x / d) ** 2.5 * .8, at_bar(b0))

# --- lead (secciones B y la A final)
def lead_note(m, dur):
    x = t(dur); fq = mf(m) * (1 + .004 * np.sin(2 * np.pi * 5.4 * x) * np.minimum(1, x / .25))
    y = saw_f(fq) * .6 + np.sign(np.sin(2 * np.pi * np.cumsum(fq) / SR)) * .3
    return y * np.minimum(1, x / .02) * np.minimum(1, np.maximum(0, (dur - x) / .08)) * (.8 + .2 * np.exp(-x * 4))
MEL_B = [[(76, 0, 1.5), (74, 1.5, .5), (72, 2, 1), (71, 3, 1)], [(69, 0, 1.5), (72, 1.5, .5), (74, 2, 2)],
         [(76, 0, 1), (79, 1, 1), (76, 2, 1), (74, 3, 1)], [(71, 0, 2), (74, 2, 1), (71, 3, 1)]]
MEL_B2 = MEL_B[:2] + [[(83, 0, 1), (79, 1, 1), (76, 2, 2)], [(81, 0, 1.5), (79, 1.5, .5), (76, 2, 2)]]
MEL_A = [[(76, 0, 2), (77, 2, 1), (76, 3, 1)], [(79, 0, 1.5), (76, 1.5, .5), (74, 2, 2)],
         [(77, 0, 2), (81, 2, 1), (77, 3, 1)], [(74, 0, 1), (76, 1, 1), (74, 2, 2)]]
for b in range(12, 28):
    sec = SEC[b]; k = b % 4
    mel = (MEL_B if b < 16 else MEL_B2 if b < 20 else MEL_A)[k] if sec in ('B', 'A') and b >= 12 else None
    if mel and (sec == 'B' or b >= 24):
        for m, st, ln in mel: put('lead', lead_note(m, ln * BEAT * .96), b * BAR + st * BEAT)

# --- mezcla: compresion por "sidechain" del bombo, filtros por bus, reverb corta y paneo
kick_env = np.zeros(N)
ks = bus['kick']; trig = np.abs(ks) > .5
idx = np.flatnonzero(np.diff(trig.astype(int)) == 1)
last = -10 ** 9
for i in idx:
    if i - last > int(.08 * SR):
        L = min(int(.35 * SR), N - i); kick_env[i:i + L] = np.maximum(kick_env[i:i + L], np.exp(-np.arange(L) / (.1 * SR))); last = i
duck = 1 - .55 * kick_env
G = dict(kick=.7, snare=1.0, hat=.5, bass=.42, gtr=.55, pad=.42, lead=.55, fx=.35)   # ganancias de la mezcla (el oido de un portatil/movil no reproduce bien los graves: bajo y bombo van contenidos)
drumb = hp(bus['kick'], 35) * G['kick'] + bus['snare'] * G['snare'] + bus['hat'] * G['hat']
bass = lp(np.tanh(1.8 * lp(bus['bass'], 700)), 900) * G['bass'] * duck
gtr = lp(np.tanh(5 * hp(lp(bus['gtr'], 3800), 90)), 4200) * G['gtr'] * (.75 + .25 * duck)
pad = lp(bus['pad'], 1700) * G['pad'] * duck
lead = lp(bus['lead'], 3800) * G['lead']
fx = bus['fx'] * G['fx']
echo = np.zeros(N); dl = int(BEAT * .75 * SR); echo[dl:] = lead[:-dl] * .35; echo[2 * dl:] += lead[:-2 * dl] * .18
ir = (rng.standard_normal(int(.7 * SR)) * np.exp(-np.arange(int(.7 * SR)) / (.17 * SR)))[:, None]
wet_src = pad * .8 + lead * .6 + bus['snare'] * .35 + echo
wet = fftconvolve(wet_src, ir[:, 0])[:N] * .035
L = drumb + bass + gtr * 1.0 + pad * 1.05 + lead * 1.0 + fx + echo * .8 + wet
R = drumb + bass + gtr * .85 + pad * .95 + lead * .85 + fx + echo * 1.0 + wet
# ensanchado: gtr y hats un poco desplazados entre canales
sh = int(.011 * SR); R[sh:] = R[sh:] * .9 + gtr[:-sh] * .25; L[sh:] = L[sh:] * .9 + gtr[:-sh] * .1
st = np.stack([L, R])
st = np.tanh(st * (1.0 / (np.percentile(np.abs(st), 99.5) + 1e-9)) * 1.1)
st = st / (np.max(np.abs(st)) + 1e-9) * .89
# fundido de entrada (evita chasquido); el bucle del juego hace el fundido cruzado al final
fi = int(.05 * SR); st[:, :fi] *= np.linspace(0, 1, fi)
pcm = (st.T * 32767).astype('<i2')
tmp = os.path.join(tempfile.gettempdir(), 'bc_music.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
out = os.path.join(MUS, 'bc.mp3')
# igualar la sonoridad con arena.mp3 (~ -15 LUFS): se mide la pista y se aplica la ganancia que falta, para que el cambio de pista no suene como un salto de volumen
TARGET_LUFS = -14.8
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', tmp, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
lufs = float([l for l in r.splitlines() if l.strip().startswith('I:')][-1].split()[1])
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', 'volume=%.2fdB' % (TARGET_LUFS - lufs), '-codec:a', 'libmp3lame', '-b:a', '160k', out], check=True)
print('OK  music/bc.mp3  %.1f s  %.2f MB' % (N / SR, os.path.getsize(out) / 1e6))
print('    pico %.2f  RMS %.3f' % (np.max(np.abs(st)), np.sqrt(np.mean(st ** 2))))
