"""
check_strings.py — catches untranslated text ("pain.kindPain" on screen).

1. STATIC (always): every literal key used in the code, t("group.name") or
   ctx.t("group.name"), plus "symptom.<id>" for every id in
   modules/pain/symptoms.js, must exist in en, nl AND no in js/strings.js.
2. ON SCREEN (needs Playwright + the local server): opens home, the pain
   screen with the spot editor open, the review and the nurse dashboard in
   en / nl / no, and fails if any visible text or aria-label looks like a
   raw key ("word.word").

Run from the repo root:
    python -m http.server 8000                       (in another terminal)
    python tools/check_strings.py                    (static + on screen)
    python tools/check_strings.py --static-only
    python tools/check_strings.py --url http://localhost:8765

The on-screen part sends no notifications (it only opens the review).
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LANGS = ["en", "nl", "no"]
RAW_KEY = r"\b[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*(\.[a-zA-Z]+)*\b"


def language_keys():
    """{lang: set(keys)} parsed from the en / nl / no blocks in js/strings.js."""
    text = (ROOT / "js" / "strings.js").read_text(encoding="utf-8")
    keys = {}
    for lang in LANGS:
        block = re.search(rf"^  {lang}: \{{(.*?)^  \}},", text, re.S | re.M)
        if not block:
            sys.exit(f"could not find the '{lang}' block in js/strings.js")
        keys[lang] = set(re.findall(r'^\s*"([^"]+)":', block.group(1), re.M))
    return keys


def used_keys():
    """Literal keys in the code + symptom.<id> for every symptom."""
    used = {}
    for path in list((ROOT / "js").glob("*.js")) + list((ROOT / "modules").rglob("*.js")):
        if path.name == "strings.js":
            continue
        for key in re.findall(r'\bt\(\s*"([a-zA-Z]+\.[a-zA-Z.]+)"', path.read_text(encoding="utf-8")):
            used.setdefault(key, path.relative_to(ROOT).as_posix())
    symptoms = (ROOT / "modules" / "pain" / "symptoms.js").read_text(encoding="utf-8")
    ids = re.search(r"export const SYMPTOMS = \[(.*?)\]", symptoms, re.S)
    for symptom in re.findall(r'"(\w+)"', ids.group(1) if ids else ""):
        used.setdefault(f"symptom.{symptom}", "modules/pain/symptoms.js")
    return used


def static_check():
    keys = language_keys()
    problems = []
    for key, where in sorted(used_keys().items()):
        missing = [lang for lang in LANGS if key not in keys[lang]]
        if missing:
            problems.append(f"  {key} (used in {where}) missing in: {', '.join(missing)}")
    print(f"static: {len(used_keys())} keys checked in {', '.join(LANGS)}")
    return problems


SCAN = f"""() => {{
  const re = new RegExp({RAW_KEY!r}, "g");
  const texts = [document.body.innerText,
    ...[...document.querySelectorAll("[aria-label], [title]")].map(e => (e.getAttribute("aria-label") || "") + " " + (e.getAttribute("title") || ""))];
  return [...new Set(texts.flatMap(t => t.match(re) || []))];
}}"""


def screen_check(base):
    from playwright.sync_api import sync_playwright

    problems, errors = [], []

    def scan(page, where):
        found = page.evaluate(SCAN)
        if found:
            problems.append(f"  {where}: {', '.join(found)}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        for lang in LANGS:
            for width, height in [(1280, 800), (390, 844)]:
                page = browser.new_page(viewport={"width": width, "height": height})
                page.on("pageerror", lambda e: errors.append(str(e)))
                at = f"{lang} {width}px"

                page.goto(f"{base}/index.html?room=Check&patient=Strings&lang={lang}#/home")
                page.wait_for_selector(".tile")
                scan(page, f"{at} home")
                page.goto(f"{base}/index.html?room=Check&patient=Strings&lang={lang}#/pain")
                page.wait_for_selector(".pain-symptom-grid .symptom-tile")
                scan(page, f"{at} pain")
                page.locator(".pain-views .body-svg[data-view='front'] .body-region[data-draw-id='head']").first.focus()
                page.keyboard.press("Enter")
                page.wait_for_selector(".pain-closeup")
                page.locator(".pain-closeup .body-region[data-draw-id='head']").first.focus()
                page.keyboard.press("Enter")
                page.wait_for_selector(".pain-editor")
                scan(page, f"{at} spot editor")
                page.locator(".pain-face").nth(3).click()
                page.click(".pain-editor-done")
                page.click(".pain-symptom-grid .symptom-tile >> nth=0")
                page.click(".pain-review-button")
                page.wait_for_selector(".pain-dialog--review")
                scan(page, f"{at} review")
                page.close()
            nurse = browser.new_page(viewport={"width": 1280, "height": 900})
            nurse.on("pageerror", lambda e: errors.append(str(e)))
            nurse.goto(f"{base}/nurse.html?lang={lang}")
            scan(nurse, f"{lang} nurse start")
            nurse.click("#nurse-start-button")
            nurse.wait_for_timeout(2500)              # first poll
            scan(nurse, f"{lang} nurse dashboard")
            nurse.close()
        browser.close()
    print(f"on screen: home, pain, spot editor, review, nurse in {', '.join(LANGS)}")
    return problems + [f"  page error: {e}" for e in errors]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://localhost:8000", help="where the app is served")
    parser.add_argument("--static-only", action="store_true", help="skip the browser part")
    args = parser.parse_args()

    problems = static_check()
    if not args.static_only:
        problems += screen_check(args.url.rstrip("/"))
    if problems:
        print("FAIL: untranslated text\n" + "\n".join(problems))
        sys.exit(1)
    print("OK: no missing strings, no raw keys on screen")


if __name__ == "__main__":
    main()
