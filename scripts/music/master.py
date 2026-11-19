"""
Judge, loop and master generated music. Run with the ACE-Step venv
(library/tools/ace-step/.venv), which has numpy, scipy, soundfile, librosa,
pyloudnorm and matplotlib. Not meant to be called by hand: see
scripts/music-soundtrack.mjs.

  master.py analyze <take.wav> --bpm 120 --key "D minor"
      -> one "@@{json}" line: duration, peaks, clipping, silences, loudness
         curve, tempo and key estimates, a score.
  master.py master <take.wav> --id battle --kind loop|stinger --bpm 150
         --key "D minor" --wav <master.wav> --ogg <out.ogg> --png <plot.png>
         [--loop-min 70 --loop-max 170 --lufs -16 --quality 0.3]
      -> one "@@{json}" line with the loop points, loudness, seam metrics.

You can't hear it here, so everything is measured: we look for a bar-aligned
loop whose two ends match (harmony, timbre, loudness, beat phase), render the
seam as an equal-power crossfade into the audio just before the loop start,
then normalise to about -16 LUFS with a gentle look-ahead limiter at -1 dBFS.
"""
import argparse
import json
import sys

import librosa
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR_A = 22050  # analysis rate
HOP = 512

KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT = {"Db": "C#", "Eb": "D#", "Gb": "F#", "Ab": "G#", "Bb": "A#"}
# Krumhansl-Kessler key profiles.
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def emit(obj):
    print("@@" + json.dumps(obj, default=lambda v: v.item() if hasattr(v, "item") else str(v)), flush=True)


def parse_key(text):
    if not text:
        return None
    parts = text.replace("min", " minor").replace("maj", " major").split()
    tonic = parts[0][0].upper() + parts[0][1:]
    tonic = FLAT.get(tonic, tonic)
    mode = "minor" if "minor" in text.lower() or (len(parts[0]) > 1 and parts[0].endswith("m")) else "major"
    return KEYS.index(tonic.rstrip("m")), mode


def estimate_key(y_mono):
    chroma = librosa.feature.chroma_cqt(y=y_mono, sr=SR_A, hop_length=HOP * 4)
    prof = chroma.mean(axis=1)
    best = []
    for i in range(12):
        for mode, p in (("major", MAJ), ("minor", MIN)):
            r = np.corrcoef(prof, np.roll(p, i))[0, 1]
            best.append((r, i, mode))
    best.sort(reverse=True)
    return best[:3]


def key_match(target, est):
    """1.0 same key, 0.75 relative major/minor, 0.5 parallel or a fifth away, else 0."""
    if target is None:
        return None
    t, tm = target
    _, e, em = est[0]
    if e == t and em == tm:
        return 1.0
    rel = (t + 3) % 12 if tm == "minor" else (t - 3) % 12
    if e == rel and em != tm:
        return 0.75
    if e == t or (em == tm and (e - t) % 12 in (5, 7)):
        return 0.5
    return 0.0


def tempo_match(target, est):
    if not target:
        return None
    ratios = [est / target, est * 2 / target, est / 2 / target, est * 1.5 / target, est / 1.5 / target]
    err = min(abs(np.log2(r)) for r in ratios)
    return float(max(0.0, 1.0 - err / 0.06))  # within ~4% scores well


def short_term_lufs(x, sr, win=3.0, hop=1.0):
    meter = pyln.Meter(sr)
    out = []
    n = int(win * sr)
    for s in range(0, max(1, len(x) - n), int(hop * sr)):
        seg = x[s:s + n]
        try:
            v = meter.integrated_loudness(seg)
        except Exception:
            v = -70.0
        out.append(max(-70.0, float(v)))
    return np.array(out)


def load(path):
    x, sr = sf.read(path, dtype="float32", always_2d=True)
    return x, sr


def analyze(path, bpm, key):
    x, sr = load(path)
    mono = librosa.resample(x.mean(axis=1), orig_sr=sr, target_sr=SR_A)
    dur = len(x) / sr
    peak = float(np.abs(x).max())
    clipped = int((np.abs(x) >= 0.999).sum())
    # The generator peak-normalises its output, so clipping inside it shows up as
    # flat tops: runs of 3+ samples pinned within 0.05% of the file's peak.
    pinned = (np.abs(x) >= peak * 0.9995).any(axis=1).astype(np.int8)
    edges = np.diff(np.concatenate([[0], pinned, [0]]))
    runs = np.flatnonzero(edges == -1) - np.flatnonzero(edges == 1)
    flat_tops = int((runs >= 3).sum())
    meter = pyln.Meter(sr)
    integ = float(meter.integrated_loudness(x))
    st = short_term_lufs(x, sr)
    mid = st[3:-3] if len(st) > 8 else st
    med = float(np.median(mid))
    dropouts = int((mid < med - 18).sum())
    # Silences: 1 s windows under -55 dBFS RMS, not counting the first/last 2 s.
    w = sr
    rms = np.array([np.sqrt(np.mean(x[i:i + w] ** 2)) + 1e-9 for i in range(2 * sr, len(x) - 3 * sr, w)])
    silences = int((20 * np.log10(rms) < -55).sum())
    tempo, _ = librosa.beat.beat_track(y=mono, sr=SR_A, hop_length=HOP, start_bpm=bpm or 120)
    tempo = float(np.atleast_1d(tempo)[0])
    kest = estimate_key(mono)
    tgt = parse_key(key)
    km = key_match(tgt, kest)
    tm = tempo_match(bpm, tempo)
    # Brightness / bandwidth: 95% roll-off frequency (muffled takes score low).
    roll = float(np.median(librosa.feature.spectral_rolloff(y=mono, sr=SR_A, roll_percent=0.95)))
    flat = float(np.median(librosa.feature.spectral_flatness(y=mono)))
    # Score: start at 1, take off for defects; tempo/key fit add a little.
    score = 1.0
    score -= min(0.4, clipped / max(1, len(x)) * 2000)
    score -= min(0.3, flat_tops * 0.01)
    score -= 0.15 * dropouts
    score -= 0.2 * silences
    score -= 0.1 * max(0.0, float(np.std(mid)) - 4.0)  # wildly uneven loudness
    if tm is not None:
        score += 0.25 * tm
    if km is not None:
        score += 0.25 * km
    return {
        "path": path,
        "duration": round(dur, 2),
        "peak": round(peak, 3),
        "clipped": clipped,
        "flat_tops": flat_tops,
        "lufs": round(integ, 2),
        "lu_std": round(float(np.std(mid)), 2),
        "dropouts": dropouts,
        "silences": silences,
        "tempo": round(tempo, 1),
        "tempo_fit": None if tm is None else round(tm, 2),
        "key": f"{KEYS[kest[0][1]]} {kest[0][2]}",
        "key_r": round(float(kest[0][0]), 3),
        "key_alt": [f"{KEYS[k[1]]} {k[2]}" for k in kest[1:]],
        "key_fit": km,
        "rolloff_hz": round(roll),
        "flatness": round(flat, 4),
        "score": round(score, 3),
        "st_lufs": [round(v, 1) for v in st.tolist()],
    }


# ---------------------------------------------------------------- loops

def beat_grid(mono, bpm, beats_per_bar):
    onset = librosa.onset.onset_strength(y=mono, sr=SR_A, hop_length=HOP)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=SR_A, hop_length=HOP, start_bpm=bpm, tightness=400)
    tempo = float(np.atleast_1d(tempo)[0])
    # The tracker may lock to half/double time: snap to the grid nearest the prompt.
    times = librosa.frames_to_time(beats, sr=SR_A, hop_length=HOP)
    if bpm and len(times) > 8:
        period = float(np.median(np.diff(times)))
        ratio = (60.0 / bpm) / period
        if ratio > 1.6:  # tracker found double-time: keep every other beat
            step = int(round(ratio))
            times = times[::step]
        elif ratio < 0.65:  # tracker found half-time: interpolate
            mid = (times[:-1] + times[1:]) / 2
            times = np.sort(np.concatenate([times, mid]))
    # Downbeat phase: the phase whose beats carry the most onset energy (plus low end).
    best, best_phase = -1, 0
    frames = librosa.time_to_frames(times, sr=SR_A, hop_length=HOP)
    frames = frames[frames < len(onset)]
    for ph in range(beats_per_bar):
        e = onset[frames[ph::beats_per_bar]].mean() if len(frames[ph::beats_per_bar]) else 0
        if e > best:
            best, best_phase = e, ph
    bars = times[best_phase::beats_per_bar]
    dur = len(mono) / SR_A
    if len(bars) < 8:
        # Too few beats found (ambient music): a grid at the prompt's tempo from the first onset.
        first = float(librosa.frames_to_time(int(np.argmax(onset > onset.mean())), sr=SR_A, hop_length=HOP))
        bars = np.arange(first, dur, beats_per_bar * 60.0 / (bpm or 120))
    else:
        # The tracker often finds nothing in quiet intros or outros: carry the grid on
        # both ways at the measured bar length.
        bl = float(np.median(np.diff(bars)))
        before = bars[0] - bl * np.arange(int(bars[0] // bl), 0, -1)
        after = bars[-1] + bl * np.arange(1, int((dur - bars[-1]) // bl) + 1)
        bars = np.concatenate([before, bars, after])
    return tempo, times, bars, onset


def window_feats(mono, t, span):
    """Features of the audio in [t - span, t + span]: chroma, MFCC, loudness, onset shape."""
    a = max(0, int((t - span) * SR_A))
    b = min(len(mono), int((t + span) * SR_A))
    seg = mono[a:b]
    if len(seg) < SR_A:
        return None
    pre = mono[max(0, int((t - span) * SR_A)):int(t * SR_A)]
    post = mono[int(t * SR_A):min(len(mono), int((t + span) * SR_A))]
    def f(s):
        c = librosa.feature.chroma_cqt(y=s, sr=SR_A, hop_length=HOP * 2).mean(axis=1)
        m = librosa.feature.mfcc(y=s, sr=SR_A, n_mfcc=20, hop_length=HOP * 2).mean(axis=1)
        r = 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)
        return c, m, r
    return f(pre), f(post)


def cos(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def find_loop(x, sr, bpm, beats_per_bar, loop_min, loop_max, top=8):
    mono = librosa.resample(x.mean(axis=1), orig_sr=sr, target_sr=SR_A)
    dur = len(mono) / SR_A
    tempo, beats, bars, onset = beat_grid(mono, bpm, beats_per_bar)
    bar_len = float(np.median(np.diff(bars))) if len(bars) > 2 else beats_per_bar * 60 / bpm
    span = min(6.0, 2 * bar_len)
    # The model often fades in/out: keep the seam away from both ends.
    # Both points sit on the bar grid, so a loop is a whole number of bars by construction.
    starts = [(i, t) for i, t in enumerate(bars) if 6.0 <= t <= min(60.0, dur * 0.4)]
    ends = [(j, t) for j, t in enumerate(bars) if t >= loop_min and t <= dur - 10.0]  # the model's outro lives in the last seconds
    # Loudness right at the seam (1 s either side), in dB: the jump end -> start.
    def rms_db(a, b):
        seg = mono[max(0, int(a * SR_A)):max(0, int(b * SR_A))]
        return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9) if len(seg) else -90.0
    cache = {}
    def feats(t):
        k = round(t, 3)
        if k not in cache:
            cache[k] = window_feats(mono, t, span)
        return cache[k]
    cands = []
    for i, s in starts:
        fs = feats(s)
        if fs is None:
            continue
        for j, e in ends:
            L = e - s
            if L < loop_min or L > loop_max:
                continue
            nbars = j - i
            fe = feats(e)
            if fe is None:
                continue
            # What leads into the end should resemble what leads into the start,
            # and what follows the start should continue it (post of start ~ post of end).
            (pc_s, pm_s, pr_s), (qc_s, qm_s, qr_s) = fs
            (pc_e, pm_e, pr_e), (qc_e, qm_e, qr_e) = fe
            chroma = 0.5 * cos(pc_s, pc_e) + 0.5 * cos(qc_s, qc_e)
            timbre = 0.5 * cos(pm_s, pm_e) + 0.5 * cos(qm_s, qm_e)
            loud = abs(pr_s - pr_e) + abs(qr_s - qr_e)
            seam_step = abs(rms_db(s, s + 1.0) - rms_db(e - 1.0, e))
            score = 2.0 * chroma + 1.5 * timbre - 0.12 * loud - 0.35 * seam_step + 0.1 * (L / loop_max)
            # Prefer bar counts that are multiples of 4 (phrases).
            if nbars % 4 == 0:
                score += 0.06
            cands.append((score, s, e, chroma, timbre, loud, nbars, seam_step))
    if not cands:
        raise SystemExit("no loop candidates (take too short or no beat grid)")
    cands.sort(reverse=True)
    out = []
    used = set()
    for score, s, e, chroma, timbre, loud, nbars, seam_step in cands:
        if (round(s, 1), round(e, 1)) in used:
            continue
        used.add((round(s, 1), round(e, 1)))
        e = align_end(onset, s, e, bar_len)
        out.append({
            "start": float(s), "end": float(e), "bars": nbars, "bar_len": bar_len, "tempo_est": tempo,
            "chroma_sim": round(chroma, 3), "timbre_sim": round(timbre, 3), "loud_diff_db": round(float(loud), 2),
            "seam_step_db": round(float(seam_step), 2), "score": round(float(score), 3), "candidates": len(cands),
        })
        if len(out) >= top:
            break
    return out


def align_end(onset, s, e, bar_len):
    """Fine-align the loop end to the start by cross-correlating onset envelopes (±60 ms)."""
    sf_ = librosa.time_to_frames(s, sr=SR_A, hop_length=HOP)
    ef_ = librosa.time_to_frames(e, sr=SR_A, hop_length=HOP)
    w = int(4 * bar_len * SR_A / HOP)
    best_lag, best_c = 0, -1e9
    max_lag = int(0.06 * SR_A / HOP) + 1
    for lag in range(-max_lag, max_lag + 1):
        a = onset[max(0, sf_ - w):sf_ + w]
        b = onset[max(0, ef_ + lag - w):ef_ + lag + w]
        n = min(len(a), len(b))
        if n < 8:
            continue
        c = float(np.dot(a[:n] - a[:n].mean(), b[:n] - b[:n].mean()))
        if c > best_c:
            best_c, best_lag = c, lag
    return e + best_lag * HOP / SR_A


def seam_vs_downbeats(y, sr, start, end, bar_len):
    """Spectral flux at the jump end -> start, against the same measure at the
    track's own bar lines inside the loop: ~1 means it sounds like any bar line."""
    s, e = int(round(start * sr)), int(round(end * sr))
    mono = y.mean(axis=1)
    n = int(1.0 * sr)
    k = n // 512
    def peak(sig):
        S = np.log1p(np.abs(librosa.stft(sig, n_fft=2048, hop_length=512)))
        f = np.sqrt((np.diff(S, axis=1).clip(min=0) ** 2).sum(axis=0))
        return float(f[max(0, k - 2):k + 3].max())
    seam = peak(np.concatenate([mono[e - n:e], mono[s:s + n]]))
    vals = [peak(mono[int(b * sr) - n:int(b * sr) + n]) for b in np.arange(start + bar_len, end - bar_len, bar_len)]
    vals = np.array(vals) if vals else np.array([seam])
    return round(seam / float(np.median(vals) + 1e-9), 2), round(float((vals < seam).mean() * 100), 1)


def render_loop(x, sr, start, end, fade, tail):
    """x[:end] with x[end-fade:end] crossfaded (equal power) into x[start-fade:start],
    then x[start:start+tail] after it, so playback can jump end -> start seamlessly
    and the decoder never has to stop exactly on the loop end."""
    s, e, f = int(round(start * sr)), int(round(end * sr)), int(round(fade * sr))
    f = min(f, s)
    t = np.linspace(0, 1, f, endpoint=False)[:, None]
    out_fade = np.cos(t * np.pi / 2)
    in_fade = np.sin(t * np.pi / 2)
    seam = x[e - f:e] * out_fade + x[s - f:s] * in_fade
    tail_n = int(tail * sr)
    return np.concatenate([x[:e - f], seam, x[s:s + tail_n]]), s, e


# ---------------------------------------------------------------- mastering

def highpass(x, sr, hz=28):
    sos = butter(2, hz, btype="highpass", fs=sr, output="sos")
    return sosfilt(sos, x, axis=0).astype(np.float32)


def true_peak(x, sr):
    up = resample_poly(x, 4, 1, axis=0)
    return float(np.abs(up).max())


def limiter(x, sr, ceiling_db=-1.0, lookahead_ms=5.0, release_ms=120.0):
    ceiling = 10 ** (ceiling_db / 20)
    # 2x oversampled peak per sample, as an approximation of the true peak.
    peak = np.abs(x).max(axis=1)
    la = max(1, int(lookahead_ms / 1000 * sr))
    peak = maximum_filter1d(peak, size=2 * la + 1)
    g = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    # Release smoothing (one-pole), attack already covered by the look-ahead window.
    a = np.exp(-1.0 / (release_ms / 1000 * sr))
    out = np.empty_like(g)
    cur = 1.0
    for i in range(len(g)):  # numba-free, still fast enough for a few minutes of audio
        v = g[i]
        cur = v if v < cur else a * cur + (1 - a) * v
        out[i] = cur
    out = uniform_filter1d(out, size=la)  # tiny smoothing to avoid steps
    return (x * out[:, None]).astype(np.float32), float(1 - out.min())


def master_audio(x, sr, lufs_target):
    x = highpass(x, sr)
    meter = pyln.Meter(sr)
    for _ in range(3):
        cur = meter.integrated_loudness(x)
        x = (x * 10 ** ((lufs_target - cur) / 20)).astype(np.float32)
        x, gr = limiter(x, sr)
    final = float(meter.integrated_loudness(x))
    return x, final, gr


def seam_metrics(y, sr, start, end):
    """Play end -> start and compare the jump with the track's normal frame-to-frame change."""
    s, e = int(round(start * sr)), int(round(end * sr))
    n = int(2.0 * sr)
    joined = np.concatenate([y[e - n:e], y[s:s + n]]).mean(axis=1)
    whole = y[s:e].mean(axis=1)
    def flux(sig):
        S = np.abs(librosa.stft(sig, n_fft=2048, hop_length=512))
        S = np.log1p(S)
        return np.sqrt((np.diff(S, axis=1).clip(min=0) ** 2).sum(axis=0))
    f_whole = flux(whole)
    f_join = flux(joined)
    k = n // 512
    seam_val = float(f_join[max(0, k - 2):k + 2].max())
    z = (seam_val - float(np.median(f_whole))) / (float(np.std(f_whole)) + 1e-9)
    pct = float((f_whole < seam_val).mean() * 100)
    jump = float(np.abs(y[s] - y[e - 1]).max())
    typical = float(np.percentile(np.abs(np.diff(y[s:e], axis=0)).max(axis=1), 99))
    rms_a = 20 * np.log10(np.sqrt(np.mean(y[e - sr:e] ** 2)) + 1e-9)
    rms_b = 20 * np.log10(np.sqrt(np.mean(y[s:s + sr] ** 2)) + 1e-9)
    return {
        "flux_z": round(z, 2), "flux_pct": round(pct, 1),
        "sample_jump": round(jump, 4), "sample_jump_p99": round(typical, 4),
        "rms_step_db": round(float(rms_b - rms_a), 2),
    }


def trim_stinger(x, sr, min_len, max_len):
    """Keep the model's own ending when it comes soon enough (it usually ends short
    pieces early, with a quick decay); else cut at the deepest energy dip (a phrase
    boundary) between min_len and max_len and fade out over it."""
    mono = np.abs(x).max(axis=1)
    env = 20 * np.log10(uniform_filter1d(mono, size=int(0.05 * sr)) + 1e-9)
    peak = env.max()
    on = int(np.argmax(env > peak - 30))
    start = max(0, on - int(0.01 * sr))
    alive = np.flatnonzero(env > peak - 40)
    natural = int(alive[-1]) if len(alive) else len(x)
    if natural - start <= (max_len + 0.5) * sr and natural - start >= min_len * sr:
        end = min(len(x), natural + int(0.25 * sr))
        fade = int(0.35 * sr)
        how = "natural"
    else:
        lo, hi = start + int(min_len * sr), min(len(x), start + int(max_len * sr))
        slow = uniform_filter1d(env, size=int(0.3 * sr))
        end = lo + int(np.argmin(slow[lo:hi])) if hi > lo else hi
        fade = int(0.8 * sr)
        how = "dip"
    y = x[start:end].copy()
    fade = min(fade, len(y) // 3)
    y[-fade:] *= np.cos(np.linspace(0, np.pi / 2, fade))[:, None] ** 2
    y[: int(0.004 * sr)] *= np.linspace(0, 1, int(0.004 * sr))[:, None]
    return y, start / sr, end / sr, how


def plot(path, y, sr, title, loop=None, st=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    mono = librosa.resample(y.mean(axis=1), orig_sr=sr, target_sr=SR_A)
    S = librosa.amplitude_to_db(np.abs(librosa.stft(mono, n_fft=2048, hop_length=1024)), ref=np.max)
    fig, ax = plt.subplots(2, 1, figsize=(12, 5), height_ratios=[3, 1], sharex=True)
    librosa.display.specshow(S, sr=SR_A, hop_length=1024, x_axis="time", y_axis="log", ax=ax[0], cmap="magma")
    ax[0].set_title(title)
    if st is not None:
        ax[1].plot(np.arange(len(st)) + 1.5, st, color="tab:blue")
        ax[1].set_ylabel("LUFS (3 s)")
        ax[1].set_ylim(-45, -5)
    if loop:
        for a in ax:
            a.axvline(loop[0], color="lime", lw=1.5)
            a.axvline(loop[1], color="red", lw=1.5)
    fig.tight_layout()
    fig.savefig(path, dpi=70)
    plt.close(fig)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd")
    p.add_argument("wav")
    p.add_argument("--bpm", type=float, default=None)
    p.add_argument("--key", default="")
    p.add_argument("--id", default="track")
    p.add_argument("--kind", default="loop")
    p.add_argument("--beats-per-bar", type=int, default=4)
    p.add_argument("--wav-out", dest="wav_out")
    p.add_argument("--ogg")
    p.add_argument("--png")
    p.add_argument("--loop-min", type=float, default=70)
    p.add_argument("--loop-max", type=float, default=175)
    p.add_argument("--stinger-min", type=float, default=3)
    p.add_argument("--stinger-max", type=float, default=8)
    p.add_argument("--lufs", type=float, default=-16.0)
    p.add_argument("--quality", type=float, default=0.2, help="Vorbis quality 0..1 (0.2 is about 105 kbps at 48 kHz stereo)")
    a = p.parse_args()

    if a.cmd == "analyze":
        emit(analyze(a.wav, a.bpm, a.key))
        return

    x, sr = load(a.wav)
    import librosa.display  # noqa: F401  (for plot)
    info = {"id": a.id, "kind": a.kind, "source": a.wav, "sample_rate": sr}
    if a.kind == "loop":
        tops = find_loop(x, sr, a.bpm, a.beats_per_bar, a.loop_min, a.loop_max)
        beat = 60.0 / (a.bpm or tops[0]["tempo_est"])
        fade = float(np.clip(beat, 0.3, 0.8))
        best = None
        for rank, lp in enumerate(tops):
            y0, s0, e0 = render_loop(x, sr, lp["start"], lp["end"], fade, tail=0.5)
            ratio, pct = seam_vs_downbeats(y0, sr, s0 / sr, e0 / sr, lp["bar_len"])
            lp.update({"rank": rank, "seam_vs_downbeats": ratio, "seam_downbeat_pct": pct})
            # Similarity score first; a seam louder than the track's own bar lines costs.
            total = lp["score"] - 0.6 * max(0.0, ratio - 1.1)
            if best is None or total > best[0]:
                best = (total, lp, y0, s0, e0)
        _, lp, y, s, e = best
        lp["tried"] = [{k: c[k] for k in ("start", "end", "score", "seam_vs_downbeats")} for c in tops]
        y, lufs, gr = master_audio(y, sr, a.lufs)
        info.update({
            "loop": lp, "loopStart": round(s / sr, 6), "loopEnd": round(e / sr, 6),
            "loopStartSample": s, "loopEndSample": e, "crossfade": round(fade, 3),
            "seam": seam_metrics(y, sr, s / sr, e / sr),
        })
    else:
        y, t0, t1, how = trim_stinger(x, sr, a.stinger_min, a.stinger_max)
        y, lufs, gr = master_audio(y, sr, a.lufs + 2.0)  # stingers sit a little above the bed
        info.update({"trim": [round(t0, 3), round(t1, 3)], "ending": how})
    tp = true_peak(y, sr)
    if tp > 10 ** (-1.0 / 20):  # inter-sample peaks the sample-peak limiter missed
        y = (y * (10 ** (-1.05 / 20) / tp)).astype(np.float32)
        lufs = float(pyln.Meter(sr).integrated_loudness(y))
        tp = true_peak(y, sr)
    info.update({
        "duration": round(len(y) / sr, 3), "lufs": round(lufs, 2),
        "true_peak_db": round(20 * np.log10(tp + 1e-9), 2), "max_gain_reduction_db": round(-20 * np.log10(1 - min(gr, 0.99)), 2),
    })
    if a.wav_out:
        sf.write(a.wav_out, y, sr, subtype="PCM_24")
    if a.ogg:
        # libsndfile's Vorbis encoder crashes on one huge write; feed it in blocks.
        with sf.SoundFile(a.ogg, "w", sr, y.shape[1], format="OGG", subtype="VORBIS", compression_level=float(1 - a.quality)) as f:
            data = np.ascontiguousarray(y, dtype=np.float32)
            for i in range(0, len(data), 16384):
                f.write(data[i:i + 16384])
        import os
        info["ogg_bytes"] = os.path.getsize(a.ogg)
        info["kbps"] = round(info["ogg_bytes"] * 8 / 1000 / info["duration"], 1)
        # Read back: the encoded file must decode to the same length.
        back, _ = sf.read(a.ogg, dtype="float32", always_2d=True)
        info["ogg_frames"] = len(back)
        info["ogg_frames_ok"] = abs(len(back) - len(y)) <= 1
    if a.png:
        st = short_term_lufs(y, sr)
        loop = (info["loopStart"], info["loopEnd"]) if a.kind == "loop" else None
        plot(a.png, y, sr, f"{a.id} ({a.kind})", loop, st)
    emit(info)


if __name__ == "__main__":
    main()
