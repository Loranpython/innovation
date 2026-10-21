"""Clinical translation pipeline: prompts, HPC client, checks, glossary, summary.

Privacy: message text is never logged here.
"""
import csv
import json
import os
import re
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional

BASE = Path(__file__).resolve().parents[1]
GLOSSARY_PATH = BASE / "data" / "glossary.csv"
QUICK_PATH = BASE / "data" / "quick_replies.json"
ENV_PATH = BASE.parent / "ai-lab" / ".env"
MODEL = "openai/gpt-oss-120b"
TIMEOUT = 25
LANGN = {"no": "Norwegian (Bokmål)", "en": "English"}
HARD_WARN = ("numbers_mismatch", "negation_mismatch", "meaning_changed", "hallucination")
WARN_CODES = ("numbers_mismatch", "negation_mismatch", "fragment", "uncertain_term", "meaning_changed",
              "low_confidence", "fallback_engine", "hallucination")

# ---------------- HPC client ----------------
_cfg = {}
_state = {"reachable": None, "ts": 0.0}


def _config():
    if not _cfg:
        # Key lookup order: environment, bedside/.env, then the older ai-lab/.env. Never commit any .env file.
        key, base = os.environ.get("IDUN_API_KEY", ""), os.environ.get("IDUN_BASE_URL", "https://llm.hpc.ntnu.no/v1")
        for path in (BASE / ".env", ENV_PATH):
            if key:
                break
            try:
                for line in path.read_text().splitlines():
                    if "=" in line:
                        k, v = line.split("=", 1)
                        if k.strip() == "IDUN_API_KEY":
                            key = v.strip()
                        elif k.strip() == "IDUN_BASE_URL":
                            base = v.strip()
            except OSError:
                pass
        base = base.rstrip("/")
        _cfg.update(key=key, base=base)
    return _cfg


def strip_fences(s: str) -> str:
    s = (s or "").strip()
    m = re.match(r"^```[a-zA-Z]*\s*(.*?)\s*```$", s, re.S)
    return m.group(1).strip() if m else s


def parse_json(s: str) -> Optional[dict]:
    s = strip_fences(s)
    for cand in (s, s[s.find("{"):s.rfind("}") + 1] if "{" in s else ""):
        if not cand:
            continue
        try:
            v = json.loads(cand)
            if isinstance(v, dict):
                return v
        except ValueError:
            pass
    return None


_client = {"c": None}
_client_lock = threading.Lock()


def _http():
    """Persistent keep-alive client (TLS handshake paid once, not per call)."""
    import httpx
    with _client_lock:
        if _client["c"] is None:
            _client["c"] = httpx.Client(timeout=TIMEOUT, limits=httpx.Limits(max_keepalive_connections=8, keepalive_expiry=120))
        return _client["c"]


def hpc_chat(messages: List[dict], max_tokens: int = 1500, effort: str = "low") -> str:
    c = _config()
    if not c["key"]:
        raise RuntimeError("no_key")
    try:
        r = _http().post(c["base"] + "/chat/completions", headers={"Authorization": "Bearer " + c["key"]},
                         json={"model": MODEL, "temperature": 0, "max_tokens": max_tokens,
                               "reasoning_effort": effort, "messages": messages})
        r.raise_for_status()
        out = (r.json()["choices"][0]["message"].get("content") or "")
    except Exception:
        _state.update(reachable=False, ts=time.time())
        raise
    _state.update(reachable=True, ts=time.time())
    return out


def hpc_json(messages: List[dict], max_tokens: int = 1500, effort: str = "low") -> dict:
    """Call HPC, parse JSON; one retry (with a bigger token budget) on bad/empty/truncated output."""
    for attempt in (0, 1):
        msgs = messages if attempt == 0 else messages + [
            {"role": "user", "content": "Your previous answer was not valid JSON. Answer again with ONLY the JSON object."}]
        out = hpc_chat(msgs, max_tokens if attempt == 0 else max_tokens * 3, effort)
        j = parse_json(out)
        if j is not None:
            return j
    raise ValueError("bad_json")


def hpc_reachable(max_age: float = 30.0) -> bool:
    if _state["reachable"] is not None and time.time() - _state["ts"] < max_age:
        return bool(_state["reachable"])
    c = _config()
    try:
        r = _http().get(c["base"] + "/models", headers={"Authorization": "Bearer " + c["key"]}, timeout=4)
        ok = r.status_code < 500 and bool(c["key"]) and r.status_code != 401
    except Exception:
        ok = False
    _state.update(reachable=ok, ts=time.time())
    return ok


def hpc_warmup():
    """Open the TLS connection and prime the route at startup."""
    try:
        _state["reachable"] = None
        return hpc_reachable()
    except Exception:
        return False


# ---------------- glossary / quick replies ----------------
_gl = {"mtime": None, "rows": []}
_gl_lock = threading.Lock()


def glossary() -> List[dict]:
    try:
        mt = GLOSSARY_PATH.stat().st_mtime
    except OSError:
        return []
    with _gl_lock:
        if _gl["mtime"] != mt:
            with open(GLOSSARY_PATH, newline="", encoding="utf-8") as f:
                _gl["rows"] = [r for r in csv.DictReader(f) if r.get("no") and r.get("en")]
            _gl["mtime"] = mt
        return _gl["rows"]


def _has_term(term: str, low: str) -> bool:
    t = term.strip().lower()
    if not t:
        return False
    for part in re.split(r"\s*/\s*", t):
        part = part.strip()
        if part and re.search(r"(?<!\w)" + re.escape(part), low):
            return True
    return False


def match_glossary(text: str) -> List[dict]:
    low = text.lower()
    return [r for r in glossary() if _has_term(r["no"], low) or _has_term(r["en"], low)][:25]


_q = {"mtime": None, "pairs": {}}


def quick_pairs() -> Dict[str, dict]:
    """normalized phrase (either language) -> {'no':..,'en':..}"""
    try:
        mt = QUICK_PATH.stat().st_mtime
    except OSError:
        return {}
    if _q["mtime"] != mt:
        d = json.loads(QUICK_PATH.read_text(encoding="utf-8"))
        pairs = {}
        for grp in ("patient", "worker"):
            for it in d.get(grp, []):
                if it.get("no") and it.get("en"):
                    pairs[norm(it["no"])] = it
                    pairs[norm(it["en"])] = it
        _q.update(mtime=mt, pairs=pairs)
    return _q["pairs"]


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^\w ]", "", (s or "").lower())).strip()


def quick_match(text: str, src: str, tgt: str) -> Optional[str]:
    it = quick_pairs().get(norm(text))
    if it and norm(text) == norm(it.get(src, "")):
        return it.get(tgt)
    return None


# ---------------- deterministic checks ----------------
_NUM = re.compile(r"\d+(?:[.,:]\d+)*")
_NEG_NO = re.compile(r"\b(ikke|ikkje|itj|aldri|ingen|intet|ingenting|nei)\b|\bikke\b", re.I)
_NEG_EN = re.compile(r"n't\b|\b(not|no|never|none|nothing|cannot|nobody)\b", re.I)
_NUMWORDS = re.compile(r"\b(en|ett|to|tre|fire|fem|seks|sju|syv|åtte|ni|ti|elleve|tolv|tjue|femti|hundre|"
                       r"one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|fifty|hundred)\b", re.I)
_DOSE = re.compile(r"\b(mg|ml|mikrogram|gram|tablett|tabletter|dose|doser|tablet|tablets|dose|doses|units|enheter|"
                   r"times|ganger|daglig|daily)\b", re.I)
_CONSENT = re.compile(r"samtykke|godtar|agree|consent|accept", re.I)
_SHORT_OK = {"ja", "nei", "takk", "hei", "ok", "okay", "yes", "no", "thanks", "thank you", "hello", "hi",
             "god morgen", "good morning", "god natt", "good night", "unnskyld", "sorry", "please", "vær så snill"}


def _nums(s: str) -> List[str]:
    return sorted(re.sub(r"[.,:]", ".", n) for n in _NUM.findall(s))


def _neg(s: str, lang: str) -> bool:
    return bool((_NEG_NO if lang == "no" else _NEG_EN).search(s))


_NUMWORDS_SAFE = re.compile(r"\b(fire|fem|seks|sju|syv|åtte|elleve|tolv|tjue|femti|hundre|"
                            r"two|three|four|five|six|seven|eight|nine|eleven|twelve|twenty|fifty|hundred)\b", re.I)


def is_critical(text: str) -> bool:
    """Hard-critical content that deserves a back-translation check: digits/times/doses, negation, consent."""
    if _NUM.search(text) or _NUMWORDS_SAFE.search(text) or _DOSE.search(text) or _CONSENT.search(text):
        return True
    if norm(text) in _SHORT_OK:  # bare "Nei"/"No" answers
        return False
    return bool(_NEG_NO.search(text) or _NEG_EN.search(text))


def _repeats(s: str) -> bool:
    w = re.findall(r"\w+", s.lower())
    for n, lim in ((3, 3), (2, 4), (1, 6)):
        if len(w) < n * lim:
            continue
        seen = {}
        for i in range(len(w) - n + 1):
            g = tuple(w[i:i + n])
            seen[g] = seen.get(g, 0) + 1
            if seen[g] >= lim and (n > 1 or len(g[0]) > 2):
                return True
    return False


def det_checks(src_text: str, out: str, src: str, tgt: str) -> List[str]:
    w = []
    if _nums(src_text) != _nums(out):
        w.append("numbers_mismatch")
    if _neg(src_text, src) != _neg(out, tgt):
        w.append("negation_mismatch")
    if not out.strip() or len(out) > 4 * len(src_text) + 80 or _repeats(out):
        w.append("hallucination")
    return w


def is_fragment(text: str) -> bool:
    n = norm(text)
    return len(n.split()) <= 2 and n not in _SHORT_OK and n not in quick_pairs()


# ---------------- translation prompt ----------------
def _fmt_history(history: List[dict]) -> str:
    if not history:
        return "(no earlier turns)"
    return "\n".join("- %s: %s" % ("Patient" if h["from"] == "patient" else "Healthcare worker", h["text"])
                     for h in history[-6:])


def build_translate_prompt(text, src, tgt, speaker, history, rows) -> List[dict]:
    who = "the PATIENT" if speaker == "patient" else "the HEALTHCARE WORKER"
    gl = "\n".join("- no: %s | en: %s | uncertain: %s%s" % (r["no"], r["en"], "yes" if r.get("status") == "uncertain" else "no",
                   (" | note: " + r["note"]) if r.get("note") else "") for r in rows) or "(none matched)"
    system = (
        "You are a medical interpreter assistant for a hospital bedside conversation between a patient and a "
        "healthcare worker. Norwegian (Bokmål, including spoken dialect) and English only.\n"
        "Speaker: %s. Direction: %s -> %s.\n\n"
        "RULES\n"
        "1. Translate the meaning faithfully. Never add, remove or soften information. Keep negation, numbers, units, "
        "doses, times and names EXACTLY (14:30 stays 14:30).\n"
        "2. Use correct medical terms. Respectful, calm tone.\n"
        "3. If the speaker is the healthcare worker: use plain everyday words and short sentences, no jargon, but keep every fact.\n"
        "4. Spoken or dialect Norwegian (æ, itj, ikkje, mæ, dæ, kji, ittje ...) is valid input; interpret it as normal speech.\n"
        "5. Use the earlier turns only to resolve pronouns and references; do not translate them.\n"
        "6. If the input is a fragment, ambiguous or could mean several different things, do NOT guess: set "
        "needs_clarification=true, confidence=\"low\", give your best literal attempt, and write a short kind "
        "clarify_question in the SOURCE language (%s) that the speaker can answer.\n"
        "7. Output ONLY one JSON object, no prose, no code fences:\n"
        "{\"translation\": str, \"confidence\": \"high\"|\"medium\"|\"low\", \"needs_clarification\": bool, "
        "\"clarify_question\": str|null, \"uncertain_terms\": [str]}\n\n"
        "EARLIER TURNS (oldest first)\n%s\n\nGLOSSARY (matched; prefer these renderings)\n%s"
        % (who, LANGN[src], LANGN[tgt], LANGN[src], _fmt_history(history), gl))
    return [{"role": "system", "content": system},
            {"role": "user", "content": "Translate this %s text into %s:\n%s" % (LANGN[src], LANGN[tgt], text)}]


def build_back_prompt(text, translation, src, tgt) -> List[dict]:
    system = (
        "You verify a medical translation. First translate the TRANSLATION back into %s as literally as possible, "
        "without looking at the ORIGINAL. Then compare with the ORIGINAL. Verdict: same (identical meaning), minor "
        "(wording differs, all facts equal), changed (any fact, number, time, dose, negation or intent differs). "
        "Output ONLY JSON: {\"back_translation\": str, \"verdict\": \"same\"|\"minor\"|\"changed\", \"reason\": str} "
        "with reason a short sentence in English." % LANGN[src])
    return [{"role": "system", "content": system},
            {"role": "user", "content": "ORIGINAL (%s): %s\nTRANSLATION (%s): %s" % (LANGN[src], text, LANGN[tgt], translation)}]


def _conf(v) -> str:
    return v if v in ("high", "medium", "low") else "low"


def _hard(warnings: List[str]) -> bool:
    return any(w in HARD_WARN for w in warnings)


def translate_hpc(text, src, tgt, speaker, history) -> dict:
    rows = match_glossary(text)
    budget = min(1500, 300 + 2 * len(text))  # reasoning (low) + small JSON; retry triples it if truncated
    j = hpc_json(build_translate_prompt(text, src, tgt, speaker, history, rows), budget)
    out = str(j.get("translation") or "").strip()
    conf = _conf(j.get("confidence"))
    need = bool(j.get("needs_clarification"))
    cq = j.get("clarify_question") if need else None
    terms = [str(t) for t in (j.get("uncertain_terms") or []) if t][:8]
    warnings = det_checks(text, out, src, tgt)
    if need or is_fragment(text):
        warnings.append("fragment")
    if conf != "high":
        warnings.append("low_confidence")
    if terms:
        warnings.append("uncertain_term")
    # Back-translation only for hard-critical messages (digits/times/doses, negation, consent).
    # Glossary-uncertain words and low confidence stay as soft warnings and cost no second call.
    back, check, reason = None, "skipped", ""
    if out and is_critical(text):
        try:
            b = hpc_json(build_back_prompt(text, out, src, tgt), 500)
            back = str(b.get("back_translation") or "").strip() or None
            check = b.get("verdict") if b.get("verdict") in ("same", "minor", "changed") else "skipped"
            if check == "changed":
                warnings.append("meaning_changed")
            reason = str(b.get("reason") or "")[:240]
        except Exception:
            warnings.append("low_confidence")
    warnings = [w for i, w in enumerate(warnings) if w not in warnings[:i]]
    hard = _hard(warnings)
    status = "unsure" if hard else "ok"
    need = need and hard
    if need and not cq:
        cq = "Kan du si litt mer om hva du mener?" if src == "no" else "Could you tell me a little more about what you mean?"
    return {"text": out, "engine": "hpc", "status": status, "confidence": conf, "needs_clarification": need,
            "clarify_question": (str(cq).strip() or None) if (cq and need) else None, "back_translation": back,
            "check": check, "reason": reason, "warnings": warnings, "uncertain_terms": terms}


def fallback_result(out: str, engine: str, text: str, src: str, tgt: str) -> dict:
    warnings = det_checks(text, out, src, tgt)
    if is_fragment(text):
        warnings.append("fragment")
    warnings.append("fallback_engine")
    return {"text": out, "engine": engine, "status": "unsure", "confidence": "low",
            "needs_clarification": _hard(warnings), "clarify_question": None, "back_translation": None,
            "check": "skipped", "reason": "", "warnings": warnings, "uncertain_terms": []}


# ---------------- summary (v3) ----------------
def _in_lang(m: dict, lang: str) -> str:
    return m["originalText"] if m.get("originalLang") == lang else (m.get("translatedText") or m["originalText"])


def task_id(text: str) -> str:
    import hashlib
    return hashlib.sha1(norm(text).encode("utf-8")).hexdigest()[:10]


def _room_label(wl: str, room: str) -> str:
    return ("Rom %s" if wl == "no" else "Room %s") % room


def _tokset(s: str) -> set:
    return set(norm(s).split())


def merge_tasks(old: List[dict], new: List[dict], room: str, wl: str) -> List[dict]:
    """Merge LLM/rule tasks into the room's list. Done-state survives regeneration (same id, or near-identical
    wording); undone tasks the generator no longer returns are dropped, done ones are kept."""
    label = _room_label(wl, room)
    by_id = {t["id"]: t for t in old}
    out, seen = [], set()
    for t in new:
        text = str(t.get("text") or "").strip()
        if not text:
            continue
        if room and room not in re.findall(r"\d+|\w+", text):  # make sure the room is in the text
            text = "%s (%s)" % (text.rstrip(". "), label)
        tid = task_id(text)
        prev = by_id.get(tid)
        if prev is None:  # near-identical wording keeps identity (and done-state)
            ts = _tokset(text)
            for o in old:
                os_ = _tokset(o["text"])
                if ts and os_ and len(ts & os_) / len(ts | os_) >= 0.8:
                    prev = o
                    break
        if prev is not None:
            tid, text = prev["id"], prev["text"]
        if tid in seen:
            continue
        seen.add(tid)
        out.append({"id": tid, "text": text, "room": room, "done": bool(prev and prev.get("done"))})
    for o in old:
        if o.get("done") and o["id"] not in seen:
            out.append(o)
    return out[:12]


_TASK_RULES = [
    (re.compile(r"\bvann\b|water|tørst|thirst|drikke|\bdrink", re.I), ("Bring water to %s", "Hent vann til %s")),
    (re.compile(r"\bmat\b|food|sulten|hungry|\bspise|\beat\b", re.I), ("Bring food to %s", "Hent mat til %s")),
    (re.compile(r"\bdo\b|toalett|toilet|\bbad\b|bathroom", re.I), ("Help the patient to the toilet, %s", "Hjelp pasienten til toalettet, %s")),
    (re.compile(r"smertestill|painkiller|pain medic|medisin|medicine|medication|tablett", re.I), ("Bring medication to %s", "Hent medisin til %s")),
    (re.compile(r"hjelp|\bhelp\b", re.I), ("Check on the patient in %s", "Se til pasienten på %s")),
]


def summary_rule(messages: List[dict], langs: Dict[str, str], room: str = "1") -> dict:
    """Offline fallback, same schema as the LLM summary. Never infers treatment or diagnoses."""
    wl, pl = langs["worker"], langs["patient"]
    pm = [m for m in messages if m["from"] == "patient"]
    kp = [_in_lang(m, wl).strip() for m in pm[-2:] if _in_lang(m, wl).strip()]
    low = " ".join((m["originalText"] + " " + _in_lang(m, wl)) for m in pm[-6:])
    tasks = []
    for rx, (en, no) in _TASK_RULES:
        if rx.search(low):
            tasks.append({"text": (no if wl == "no" else en) % _room_label(wl, room)})
    last = messages[-4:]
    return {"key_points": kp[:3], "tasks": tasks, "facts": [],
            "patient": [_in_lang(m, pl).strip() for m in last], "engine": "rules", "updated": int(time.time() * 1000)}


def empty_summary() -> dict:
    return {"key_points": [], "tasks": [], "facts": [], "patient": [], "engine": "rules", "updated": int(time.time() * 1000)}


def summarize(messages: List[dict], langs: Dict[str, str], room: str = "1", existing_tasks: Optional[List[dict]] = None) -> dict:
    """Returns {key_points, tasks:[{text}], facts, patient, engine, updated}; the caller merges tasks (ids/done)."""
    if not messages:
        return empty_summary()
    wl, pl = langs["worker"], langs["patient"]
    conv = "\n".join("%s: %s" % ("PATIENT" if m["from"] == "patient" else "WORKER", _in_lang(m, wl)) for m in messages[-30:])
    conv_p = "\n".join("%s: %s" % ("PATIENT" if m["from"] == "patient" else "WORKER", _in_lang(m, pl)) for m in messages[-12:])
    ex = "\n".join("- " + t["text"] for t in (existing_tasks or [])) or "(none)"
    system = (
        "You help a nurse at a hospital bedside. Summarise the conversation between PATIENT and WORKER for the nurse. "
        "Use ONLY what was actually said. No diagnoses, no medical conclusions, no advice, no guesses. Keep numbers, "
        "times, doses and negations exact. Never write 'patient said'.\n"
        "Output ONLY one JSON object: {\"key_points\": [str], \"tasks\": [str], \"facts\": [{\"label\": str, \"value\": str}], "
        "\"patient_lines\": [str]}.\n"
        "- key_points: 1 to 3 long, information-dense sentences in %(wl)s about what matters most right now. NOT one "
        "bullet per utterance. State the facts directly (e.g. 'Sharp stomach pain since this morning, 7 out of 10, "
        "worse after eating.').\n"
        "- tasks: every concrete thing the patient asked for OR the worker promised/offered to do ('I will bring you "
        "water' -> a task; 'Can I have a blanket?' -> a task), as short action sentences in %(wl)s that INCLUDE the "
        "room, e.g. 'Bring pain medication to Room %(room)s'. Never invent treatment, tests or medical orders that "
        "nobody asked for or promised. Go through EVERY patient request (I need / can I have / I want / trenger / vil ha) and every worker promise: each one is a task, including requests made after earlier tasks were created. If there really is nothing, return []. If an existing task below still applies, repeat its text EXACTLY; "
        "omit it if it is no longer relevant.\n"
        "- facts: at most 8 label/value pairs in %(wl)s, only clinical facts that were stated (pain location, pain "
        "level, allergies, medicines and doses, times) - never requests, needs (thirst, food) or feelings. If nothing was stated, [].\n"
        "- A short answer (yes / no / I don't understand) is meaningless alone: only include it together with the "
        "question it answers; if unclear which question it answers, leave it out.\n"
        "- patient_lines: at most 4 short, simple lines in %(pl)s recapping what was discussed for the patient to read.\n\n"
        "EXISTING TASKS\n%(ex)s"
        % {"wl": LANGN[wl], "pl": LANGN[pl], "room": room, "ex": ex})
    try:
        j = hpc_json([{"role": "system", "content": system},
                      {"role": "user", "content": "Conversation in %s:\n%s\n\nSame conversation in %s (for patient_lines):\n%s"
                       % (LANGN[wl], conv, LANGN[pl], conv_p)}], 1800, "low")

        def lst(k, n):
            return [str(x).strip() for x in (j.get(k) or []) if str(x).strip()][:n]
        facts = []
        for f in (j.get("facts") or [])[:8]:
            if isinstance(f, dict) and str(f.get("label") or "").strip() and str(f.get("value") or "").strip():
                facts.append({"label": str(f["label"]).strip(), "value": str(f["value"]).strip()})
        tasks = [{"text": (t.get("text") if isinstance(t, dict) else t)} for t in (j.get("tasks") or [])][:8]
        return {"key_points": lst("key_points", 3), "tasks": tasks, "facts": facts,
                "patient": lst("patient_lines", 4), "engine": "hpc", "updated": int(time.time() * 1000)}
    except Exception:
        return summary_rule(messages, langs, room)
