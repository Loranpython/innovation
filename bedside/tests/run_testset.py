"""Run tests/testset.json through the translation pipeline and record results (no judging)."""
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import server  # noqa: E402

MIN_GAP = 3.2  # <= ~18 requests/min; each item costs 1-2 HPC calls


def main():
    items = json.loads((HERE / "testset.json").read_text(encoding="utf-8"))
    rows = []
    last = 0.0
    for it in items:
        src = it.get("src", "no")
        tgt = "en" if src == "no" else "no"
        wait = MIN_GAP * 2 - (time.time() - last)
        if wait > 0:
            time.sleep(wait)
        t0 = time.time()
        try:
            r = server.translate_full(it["text"], src, tgt, it["speaker"], [])
        except Exception as e:
            r = {"text": "", "status": "error", "warnings": [type(e).__name__], "back_translation": None}
        last = time.time()
        rows.append({"id": it["id"], "speaker": it["speaker"], "src": src, "text": it["text"], "output": r.get("text"),
                     "reference": it.get("reference"), "status": r.get("status"), "engine": r.get("engine"),
                     "warnings": r.get("warnings"), "back_translation": r.get("back_translation"),
                     "ms": int((last - t0) * 1000), "result": r})
        print(it["id"], r.get("status"), flush=True)
    (HERE / "results.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    esc = lambda v: str(v if v is not None else "").replace("|", "\\|").replace("\n", " ")
    md = ["| id | speaker | src | text | output | reference | status | warnings | back_translation | ms |", "|" + "---|" * 10]
    for r in rows:
        md.append("| " + " | ".join(esc(x) for x in (r["id"], r["speaker"], r["src"], r["text"], r["output"], r["reference"],
                  r["status"], ",".join(r["warnings"] or []), r["back_translation"], r["ms"])) + " |")
    (HERE / "results.md").write_text("\n".join(md) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
