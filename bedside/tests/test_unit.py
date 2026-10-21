"""Offline unit checks (no network): python tests/test_unit.py"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from providers import asr, clinical as c  # noqa: E402


def main():
    # critical = back-translation worth paying for
    assert c.is_critical("Ta 500 mg hver sjette time") and c.is_critical("Jeg kan ikke puste")
    assert c.is_critical("Do you consent to this?") and c.is_critical("Møt klokken 14:30")
    assert not c.is_critical("Nei") and not c.is_critical("Jeg har vondt i magen") and not c.is_critical("I need to go to the toilet")
    # hard failures only -> unsure
    assert c._hard(["numbers_mismatch"]) and not c._hard(["fragment", "low_confidence", "uncertain_term"])
    # rule summary: same schema, simple keyword tasks, no invented treatment
    msgs = [{"from": "patient", "originalText": "Jeg er tørst og trenger smertestillende", "originalLang": "no",
             "translatedText": "I am thirsty and need painkillers"}]
    sm = c.summary_rule(msgs, {"patient": "no", "worker": "en"}, "1")
    assert set(sm) >= {"key_points", "tasks", "facts", "patient", "engine", "updated"}
    texts = [t["text"] for t in sm["tasks"]]
    assert "Bring water to Room 1" in texts and "Bring medication to Room 1" in texts, texts
    # merge keeps done state, drops undone missing, keeps done missing
    old = c.merge_tasks([], [{"text": "Bring water to Room 1"}, {"text": "Bring a blanket to Room 1"}], "1", "en")
    old[0]["done"] = True
    old[1]["done"] = False
    new = c.merge_tasks(old, [{"text": "Bring water to Room 1"}, {"text": "Bring food to Room 1"}], "1", "en")
    d = {t["text"]: t["done"] for t in new}
    assert d == {"Bring water to Room 1": True, "Bring food to Room 1": False}, d
    # room is appended when missing
    assert c.merge_tasks([], [{"text": "Bring ice"}], "3", "en")[0]["text"] == "Bring ice (Room 3)"
    # silence trimming keeps speech, removes lead/trail silence
    a = np.concatenate([np.zeros(16000), 0.2 * np.sin(np.arange(16000) * 0.1), np.zeros(16000)]).astype(np.float32)
    t = asr.trim_silence(a)
    assert 16000 <= t.size <= 16000 + 2 * 3600, t.size
    print("ok")


if __name__ == "__main__":
    main()
