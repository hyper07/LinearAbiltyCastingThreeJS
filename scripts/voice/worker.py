"""
AI Arcademia's voice worker: Qwen3-TTS (Apache-2.0) and Whisper
large-v3-turbo (MIT) on Apple silicon, driven by scripts/voice-gen.mjs.

Reads one JSON request per line on stdin and answers each with one
"@@{json}" line on stdout (anything else on stdout is a log line). Run with
the venv in library/tools/qwen3-tts; not meant to be called by hand.

  {"cmd": "load", "models": ["design", "base", "asr"]}
  {"cmd": "design", "text": "...", "lang": "en", "instruct": "...", "seed": 11, "out": "ref.wav"}
      -> VoiceDesign renders a reference clip (a voice made from a description).
  {"cmd": "voice", "key": "hoot/en/normal", "wav": "ref.wav", "text": "..."}
      -> builds and keeps a voice prompt (Base model) from a reference clip.
  {"cmd": "similarity", "a": "ref1.wav", "b": "ref2.wav"}
      -> cosine similarity of the two clips' speaker embeddings.
  {"cmd": "pitch", "wav": "ref.wav"}
      -> median speaking pitch in Hz (librosa pYIN).
  {"cmd": "speak", "items": [{"key": "hoot/en/normal", "text": "...", "lang": "en", "seed": 1, "out": "x.wav"}]}
      -> one batch of lines in cloned voices; per item: duration and signal checks.
  {"cmd": "asr", "items": [{"wav": "x.wav", "lang": "en"}]}
      -> transcripts.
  {"cmd": "encode", "wav": "x.wav", "out": "x.webm", "bitrate": 24000}
      -> WebM/Opus (PyAV; no system ffmpeg needed).
"""
import gc
import json
import os
import sys
import time
import traceback

import numpy as np
import soundfile as sf
import torch

WEIGHTS = os.environ.get("VOICE_WEIGHTS", "weights")
DEVICE = "mps" if torch.backends.mps.is_available() else "cpu"
# float32: on MPS, bfloat16 and float16 make the model miss its end of speech and run on (measured: 0/32 runaway takes in float32, 13/32 in float16) and are no faster.
DTYPE = torch.float32
def _chip():
    try:
        import subprocess

        return subprocess.run(["sysctl", "-n", "machdep.cpu.brand_string"], capture_output=True, text=True).stdout.strip()
    except Exception:
        return ""


CHIP = _chip()
# Whisper in batches on an M1 or M2 GPU took 87 GB for 12 clips (and was slower than one at a time).
ASR_BATCH = int(os.environ.get("VOICE_ASR_BATCH") or (1 if any(f"M{n}" in CHIP.split() for n in (1, 2)) else 16))
LANG_NAMES = {"en": "English", "ko": "Korean", "es": "Spanish", "ja": "Japanese", "zh": "Chinese"}

models = {}
voices = {}


def emit(obj):
    sys.stdout.write("@@" + json.dumps(obj, default=lambda v: v.item() if hasattr(v, "item") else str(v)) + "\n")
    sys.stdout.flush()


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def seed_all(seed):
    torch.manual_seed(int(seed))
    np.random.seed(int(seed) % (2**32))


def load(names):
    from qwen_tts import Qwen3TTSModel

    for name in names:
        if name in models:
            continue
        t = time.time()
        if name in ("design", "base"):
            path = os.path.join(WEIGHTS, "Qwen3-TTS-12Hz-1.7B-VoiceDesign" if name == "design" else "Qwen3-TTS-12Hz-1.7B-Base")
            models[name] = Qwen3TTSModel.from_pretrained(path, device_map=DEVICE, dtype=DTYPE, attn_implementation="sdpa")
            chunk_decoder(models[name].model.speech_tokenizer)
        elif name == "asr":
            from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor

            path = os.path.join(WEIGHTS, "whisper-large-v3-turbo")
            # float32: Whisper in float16 on MPS transcribes everything as "!".
            m = AutoModelForSpeechSeq2Seq.from_pretrained(path, dtype=torch.float32, low_cpu_mem_usage=True).to(DEVICE)
            models[name] = (m, AutoProcessor.from_pretrained(path))
        log(f"loaded {name} in {time.time() - t:.1f}s")
    return {"device": DEVICE, "models": sorted(models), "chip": CHIP, "asrBatch": ASR_BATCH}


def chunk_decoder(tok, size=6):
    """Decode a batch's speech codes a few at a time. Each take is decoded together with its voice's
    reference codes, and a whole batch at once in float32 needed so much memory that macOS killed
    the process (SIGKILL)."""
    original = tok.decode

    def decode(encoded):
        if isinstance(encoded, list) and len(encoded) > size:
            wavs, fs = [], None
            for i in range(0, len(encoded), size):
                w, fs = original(encoded[i : i + size])
                wavs.extend(w)
                if DEVICE == "mps":
                    torch.mps.empty_cache()
            return wavs, fs
        return original(encoded)

    tok.decode = decode


def signal_checks(wav, sr):
    """Clipping, silences and level, measured on the raw take."""
    x = np.asarray(wav, dtype=np.float32)
    dur = len(x) / sr
    peak = float(np.max(np.abs(x))) if len(x) else 0.0
    clipped = float(np.mean(np.abs(x) >= 0.995)) if len(x) else 0.0
    hop = int(sr * 0.01)
    frames = len(x) // hop
    if frames < 3:
        return {"duration": dur, "peak": peak, "clipped": clipped, "speech": 0.0, "lead": dur, "tail": dur, "longestGap": 0.0, "rmsDb": -120.0}
    rms = np.sqrt(np.mean(x[: frames * hop].reshape(frames, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    loud = db > max(-45.0, float(np.percentile(db, 95)) - 35.0)
    idx = np.nonzero(loud)[0]
    if not len(idx):
        return {"duration": dur, "peak": peak, "clipped": clipped, "speech": 0.0, "lead": dur, "tail": dur, "longestGap": 0.0, "rmsDb": float(np.mean(db))}
    first, last = int(idx[0]), int(idx[-1])
    gap = best = 0
    for v in loud[first : last + 1]:
        gap = 0 if v else gap + 1
        best = max(best, gap)
    return {
        "duration": dur,
        "peak": peak,
        "clipped": clipped,
        "speech": (last - first + 1) * 0.01,
        "lead": first * 0.01,
        "tail": (frames - 1 - last) * 0.01,
        "longestGap": best * 0.01,
        "rmsDb": float(np.mean(db[first : last + 1])),
    }


def read_audio(path):
    wav, sr = sf.read(path, dtype="float32", always_2d=False)
    if wav.ndim > 1:
        wav = wav.mean(axis=1)
    return wav, sr


def cmd_design(req):
    m = models["design"]
    seed_all(req.get("seed", 0))
    wavs, sr = m.generate_voice_design(text=req["text"], language=LANG_NAMES[req["lang"]], instruct=req["instruct"])
    sf.write(req["out"], wavs[0], sr, subtype="PCM_16")
    return {"out": req["out"], "sr": sr, **signal_checks(wavs[0], sr)}


def cmd_design_batch(req):
    """Several reference clips at once (VoiceDesign), one per item."""
    m = models["design"]
    items = req["items"]
    t = time.time()
    seed_all(req.get("seed", 0))
    longest = max(len(it["text"]) for it in items)
    wavs, sr = m.generate_voice_design(
        text=[it["text"] for it in items],
        language=[LANG_NAMES[it["lang"]] for it in items],
        instruct=[it["instruct"] for it in items],
        max_new_tokens=int(min(1200, 60 + longest * 2.2)),
    )
    out = []
    for it, w in zip(items, wavs):
        w = np.asarray(w, dtype=np.float32)
        sf.write(it["out"], w, sr, subtype="FLOAT")
        out.append({"out": it["out"], **signal_checks(w, sr)})
    return {"items": out, "seconds": time.time() - t}


def cmd_voice(req):
    m = models["base"]
    wav, sr = read_audio(req["wav"])
    items = m.create_voice_clone_prompt(ref_audio=(wav, sr), ref_text=req["text"], x_vector_only_mode=bool(req.get("xvec", False)))
    voices[req["key"]] = items[0]
    return {"key": req["key"]}


def embedding(path):
    import librosa

    m = models["base"]
    wav, sr = read_audio(path)
    target = m.model.speaker_encoder_sample_rate
    if sr != target:
        wav = librosa.resample(y=wav, orig_sr=sr, target_sr=target)
    e = m.model.extract_speaker_embedding(audio=wav, sr=target)
    return e.float().flatten().cpu().numpy()


def cmd_similarity(req):
    a, b = embedding(req["a"]), embedding(req["b"])
    return {"similarity": float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))}


def cmd_pitch(req):
    """Median speaking pitch (Hz) of a clip: keeps designed voices in a natural range."""
    import librosa

    wav, sr = read_audio(req["wav"])
    if sr != 16000:
        wav = librosa.resample(y=wav, orig_sr=sr, target_sr=16000)
    f0, voiced, _ = librosa.pyin(wav, fmin=60, fmax=700, sr=16000, frame_length=1024)
    f0 = f0[~np.isnan(f0)]
    return {"f0": float(np.median(f0)) if len(f0) else None}


def cmd_speak(req):
    m = models["base"]
    items = req["items"]
    t = time.time()
    seed_all(items[0].get("seed", 0))
    prompts = [voices[it["key"]] for it in items]
    kw = {}
    if req.get("temperature") is not None:
        kw["temperature"] = float(req["temperature"])
    # Codec tokens are 12.5 per second: room for twice the expected length, never runaway.
    longest = max(float(it.get("seconds", 8)) for it in items)
    kw["max_new_tokens"] = int(min(2048, max(120, longest * 12.5 * 2.2 + 40)))
    wavs, sr = m.generate_voice_clone(text=[it["text"] for it in items], language=[LANG_NAMES[it["lang"]] for it in items], voice_clone_prompt=prompts, **kw)
    out = []
    audio = 0.0
    for it, w in zip(items, wavs):
        w = np.asarray(w, dtype=np.float32)
        sf.write(it["out"], w, sr, subtype="FLOAT")
        chk = signal_checks(w, sr)
        audio += chk["duration"]
        out.append({"out": it["out"], **chk})
    took = time.time() - t
    return {"items": out, "sr": sr, "seconds": took, "audio": audio}


def cmd_asr(req):
    """Transcribe clips of one language in batches (they should already be trimmed: Whisper invents words in long silences)."""
    import librosa

    m, proc = models["asr"]
    items = req["items"]
    out = []
    bs = int(req.get("batch") or ASR_BATCH)
    for i in range(0, len(items), bs):
        group = items[i : i + bs]
        wavs = []
        for it in group:
            wav, sr = read_audio(it["wav"])
            wavs.append(librosa.resample(y=wav, orig_sr=sr, target_sr=16000) if sr != 16000 else wav)
        feats = proc(wavs, sampling_rate=16000, return_tensors="pt").input_features.to(DEVICE, dtype=torch.float32)
        limit = max(int(it.get("maxTokens", 120)) for it in group)
        with torch.no_grad():
            ids = m.generate(feats, language=group[0]["lang"], task="transcribe", max_new_tokens=min(440, limit), no_repeat_ngram_size=0)
        for it, text in zip(group, proc.batch_decode(ids, skip_special_tokens=True)):
            out.append({"wav": it["wav"], "text": text.strip()})
    return {"items": out}


def cmd_encode(req):
    import av

    wav, sr = read_audio(req["wav"])
    # Opus runs at 48 kHz.
    if sr != 48000:
        import librosa

        wav = librosa.resample(y=wav, orig_sr=sr, target_sr=48000)
        sr = 48000
    pcm = np.clip(wav, -1, 1).astype(np.float32)
    fmt = {"webm": "webm", "ogg": "ogg", "m4a": "mp4"}[req.get("format", "webm")]
    codec = "aac" if fmt == "mp4" else "libopus"
    with av.open(req["out"], "w", format=fmt) as box:
        st = box.add_stream(codec, rate=sr)
        st.bit_rate = int(req.get("bitrate", 24000))
        st.layout = "mono"
        if codec == "libopus":
            st.options = {"application": "audio", "vbr": "on", "compression_level": "10"}
        frame_len = 960
        for i in range(0, len(pcm), frame_len):
            chunk = pcm[i : i + frame_len]
            frame = av.AudioFrame.from_ndarray(chunk.reshape(1, -1), format="flt", layout="mono")
            frame.sample_rate = sr
            for p in st.encode(frame):
                box.mux(p)
        for p in st.encode(None):
            box.mux(p)
    return {"out": req["out"], "bytes": os.path.getsize(req["out"])}


_tagger = None


def cmd_kana(req):
    """Japanese texts as their pronunciation in katakana (fugashi + unidic-lite), so a take is
    checked on what was said, not on kana-or-kanji spelling (すわって / 座って)."""
    global _tagger
    if _tagger is None:
        import fugashi

        _tagger = fugashi.Tagger()
    out = []
    for text in req["texts"]:
        parts = []
        for w in _tagger(text):
            pron = getattr(w.feature, "pron", None)
            parts.append(pron if pron and pron != "*" else w.surface)
        out.append("".join(parts))
    return {"texts": out}


HANDLERS = {
    "load": lambda r: load(r.get("models", [])),
    "design": cmd_design,
    "design_batch": cmd_design_batch,
    "voice": cmd_voice,
    "similarity": cmd_similarity,
    "pitch": cmd_pitch,
    "speak": cmd_speak,
    "asr": cmd_asr,
    "encode": cmd_encode,
    "kana": cmd_kana,
    "ping": lambda r: {"ok": True},
}


def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            out = HANDLERS[req["cmd"]](req)
            if DEVICE == "mps" and isinstance(out, dict):
                out["gpuGB"] = round(torch.mps.driver_allocated_memory() / 1e9, 1)
            emit(out)
        except Exception as e:  # report and keep serving
            log(traceback.format_exc())
            emit({"error": f"{type(e).__name__}: {e}"[:500]})
        finally:
            release()


def release():
    """Hand MPS's cached blocks back after each request: batches change shape all the time, and a
    growing cache got the process killed by macOS (SIGKILL, no crash report) after a few minutes."""
    gc.collect()
    if DEVICE == "mps":
        torch.mps.empty_cache()


if __name__ == "__main__":
    main()
