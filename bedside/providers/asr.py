import re
import threading

import numpy as np

MODEL_NO = "NbAiLab/nb-whisper-small"
MODEL_EN = "openai/whisper-small.en"
MODEL_ID = MODEL_NO + " + " + MODEL_EN
_pipes = {}
_lock = threading.Lock()
HALLU = ("teksting av", "undertekster", "takk for at du så på", "subtitles by", "takk for følget",
         "thanks for watching", "thank you for watching", "subscribe", "like and subscribe", "please subscribe",
         "amara.org", "www.", ".com", "copyright", "©", "transcribed by", "see you in the next",
         "thank you so much for watching", "vi sees")


def _device():
    import torch
    return "mps" if torch.backends.mps.is_available() else "cpu"


def _make(model, dev):
    import torch
    from transformers import pipeline
    return pipeline("automatic-speech-recognition", model=model, device=dev, torch_dtype=torch.float32)


def _build(model):
    try:
        return _make(model, _device())
    except Exception:
        return _make(model, "cpu")


def _key(lang):
    return "en" if lang == "en" else "no"


def get_pipe(lang="no"):
    """Returns (pipeline, model_id). English uses whisper-small.en; falls back to nb-whisper if unavailable."""
    k = _key(lang)
    with _lock:
        if k not in _pipes:
            if k == "en":
                try:
                    _pipes[k] = (_build(MODEL_EN), MODEL_EN)
                except Exception:
                    if "no" not in _pipes:
                        _pipes["no"] = (_build(MODEL_NO), MODEL_NO)
                    _pipes[k] = _pipes["no"]
            else:
                _pipes[k] = (_build(MODEL_NO), MODEL_NO)
        return _pipes[k]


def _hallucinated(text: str) -> bool:
    low = text.lower()
    if not text.strip() or any(h in low for h in HALLU):
        return True
    w = re.findall(r"\w+", low)
    if len(w) >= 6:
        for n in (1, 2, 3, 4):
            seen = {}
            for i in range(len(w) - n + 1):
                g = tuple(w[i:i + n])
                seen[g] = seen.get(g, 0) + 1
                if seen[g] >= 4:
                    return True
    return False


def trim_silence(pcm: np.ndarray, sr: int = 16000, pad_ms: int = 200) -> np.ndarray:
    """Cut leading/trailing silence (less audio to decode, fewer hallucinations on pauses)."""
    fl = int(sr * 0.02)
    n = pcm.size // fl
    if n < 4:
        return pcm
    rms = np.sqrt(np.mean(pcm[:n * fl].reshape(n, fl) ** 2, axis=1))
    thr = max(0.004, float(np.percentile(rms, 95)) * 0.08)
    idx = np.where(rms > thr)[0]
    if idx.size == 0:
        return pcm
    pad = pad_ms // 20
    lo, hi = max(0, int(idx[0]) - pad), min(n, int(idx[-1]) + 1 + pad)
    return pcm[lo * fl:hi * fl] if (hi - lo) * fl >= 4800 else pcm


def _run(p, inp, kw, long_audio):
    if long_audio:
        return p(inp, chunk_length_s=28, generate_kwargs=kw)
    return p(inp, generate_kwargs=kw)


def warm_up(lang: str):
    """Run one dummy 1 s clip so the first real request does not pay kernel-compile/first-run cost."""
    p, model = get_pipe(lang)
    rng = np.random.RandomState(0)
    dummy = (rng.randn(16000) * 0.02).astype(np.float32)
    kw = {"num_beams": 1}
    if model != MODEL_EN:
        kw.update(task="transcribe", language="en" if lang == "en" else "no")
    try:
        p({"raw": dummy, "sampling_rate": 16000}, generate_kwargs=kw)
    except Exception:
        pass


def transcribe(pcm: np.ndarray, lang: str) -> dict:
    if pcm.size < 1600 or float(np.sqrt(np.mean(pcm ** 2))) < 0.003:
        return {"text": "", "no_speech": True}
    pcm = trim_silence(pcm)
    p, model = get_pipe(lang)
    en_only = model == MODEL_EN
    kw = {"num_beams": 1}  # greedy: ~2x faster than beam 5, same text on short phrases
    if not en_only:  # English-only Whisper rejects task/language arguments
        kw["task"] = "transcribe"
        kw["language"] = "en" if lang == "en" else "no"
    inp = {"raw": pcm, "sampling_rate": 16000}
    long_audio = pcm.size > 28 * 16000
    try:
        out = _run(p, inp, kw, long_audio)
    except Exception:
        if not str(p.device).startswith("mps"):
            raise
        with _lock:
            p = _make(model, "cpu")
            _pipes[_key(lang)] = (p, model)
        out = _run(p, inp, kw, long_audio)
    text = out["text"].strip()
    if _hallucinated(text):
        return {"text": "", "no_speech": True}
    return {"text": text, "no_speech": False, "engine": model, "lang": lang}
