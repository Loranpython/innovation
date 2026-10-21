# Bedside Translation v2 — shared spec (read this, not the whole repo)

Translation feature ONLY. Norwegian (Bokmål, incl. spoken/dialect input) ↔ English. Build on existing code in `bedside/`; keep the WebSocket hub, speak → confirm → send flow, call-a-person, read-aloud, demo mode. Python 3.9 venv: `/Users/tommynguyen/innovation-main/ai-lab/.venv/bin/python` (system `python3` is blocked by an Xcode licence prompt — never use it). No new frameworks, no CDNs, no external fonts.

## 0. Diagnosis (decided by lead)
1. NLLB-600M hallucinates fluent wrong text on short, fragmentary, dialect and numeric input ("Vondt her" → "It's not that bad"; "14:30" lost). Most dangerous failure: confident wrong output.
2. Context lost: text split per sentence (mt.py:45), no previous turns → pronouns ("Den") lost.
3. No speaker role, no clinical framing, no glossary, no register control.
4. No uncertainty signal or check: every output shown as certain.
5. ASR: Norwegian-tuned nb-whisper-small forced to English for English speech ("chest" → "best"); weak hallucination filter.

## 1. Translation method (owner: Agent C)
Engine order: `hpc` (default, approved by owner) → `local` NLLB fallback (labelled) → `demo`.
- HPC: `https://llm.hpc.ntnu.no/v1/chat/completions`, model `openai/gpt-oss-120b`, key `IDUN_API_KEY` from `/Users/tommynguyen/innovation-main/ai-lab/.env`, timeout 25 s, temperature 0. Only TEXT is sent, never audio. Never log message text.
- One call per translation, JSON-only answer:
  `{"translation": str, "confidence": "high|medium|low", "needs_clarification": bool, "clarify_question": str|null (in SOURCE language, short, kind), "uncertain_terms": [str]}`
- Prompt content: hospital bedside conversation between a patient and a healthcare worker; who is speaking; direction; last 6 turns (speaker + original text) as context; glossary rows whose Norwegian or English term appears in the text (include `uncertain` flag); rules: translate meaning faithfully, never add/remove/soften information, keep negation, numbers, units, doses, times, names exactly, keep medical terms correct, respectful tone; worker→patient: plain everyday words, short sentences, no jargon, but keep every fact; spoken/dialect Norwegian (æ, itj, ikkje, mæ, dæ…) is valid input; if input is a fragment, ambiguous or could mean several things → do NOT guess: `needs_clarification=true`, low confidence, best literal attempt.
- Back-translation check (second call) for IMPORTANT messages = contains digits/number words, time, dose/unit, negation (ikke/ikkje/itj/not/no/never), consent words (samtykke/agree/consent/godtar), medicine glossary terms, or confidence ≠ high. Call returns `{"back_translation": str, "verdict": "same|minor|changed", "reason": str}`.
- Deterministic checks (always, cheap): digits/clock times in source == in translation; negation present on both sides; empty/very long output; repeated n-grams (hallucination). Each failure → warning code.
- Final `status`: `ok` (high + checks pass) | `unsure` (anything else). Never present `unsure` as certain.
- Local fallback (NLLB) when HPC unreachable: translate whole utterance (no sentence split for ≤ 3 sentences), always `status:"unsure"` with warning `fallback_engine` unless text matches a quick-reply pair exactly.
- Glossary: `bedside/data/glossary.csv` (`no,en,category,status,note`), reloaded on file change (mtime). Editable by staff.

## 2. ASR (owner: Agent C)
Norwegian: keep NbAiLab/nb-whisper-small, `num_beams=5`. English: `openai/whisper-small.en` (~1 GB; disk is tight — check `df` first, abort and report if < 3 GB free). Stronger hallucination filter (repeated phrases, known subtitle phrases). Return `{text, lang, engine}`. Speaker always sees the transcript and confirms BEFORE translation (two checked steps).

## 3. API contract (C implements; A and B consume)
- `POST /api/transcribe` multipart `audio`, `lang` → `{text}` | `{error}` (unchanged shape).
- `POST /api/translate` JSON `{text, src, tgt, speaker:"patient"|"worker", room:"1"}` →
  `{text, engine:"hpc"|"local"|"demo", status:"ok"|"unsure", confidence, needs_clarification, clarify_question, back_translation|null, check:"same"|"minor"|"changed"|"skipped", warnings:[codes], uncertain_terms:[]}` or `{error:"translate_failed", detail}`.
  Warning codes: `numbers_mismatch, negation_mismatch, fragment, uncertain_term, meaning_changed, low_confidence, fallback_engine, hallucination`.
- `GET /api/quick` → contents of `bedside/data/quick_replies.json`. Quick replies are pre-translated pairs: sent with NO translation call, `engine:"phrasebook"`, `status:"ok"`.
- `GET /api/status` adds `engine` (current translation engine) and `hpc_reachable`.
- WebSocket: unchanged events, plus
  - message object gains: `engine, quality:"ok"|"unsure", warnings, back_translation, quick:bool`. (`status` on messages stays delivery-only: sent/delivered/seen.)
  - patient may also send `set_lang` (language switch on patient side).
  - server → all: `{type:"summary", summary}` after each message (debounced 1.5 s, computed server-side via HPC; local fallback = rule-based). Also included in the `state` event as `summary`.
  - `summary = {worker: {patient_said:[], patient_needs:[], worker_said:[], open_questions:[]}, patient: [≤4 short lines in patient language], engine, updated}` — built ONLY from what was said; no diagnoses, no medical conclusions, no advice. Worker version in worker language.
- Route `/` → serves `translate.html` (patient opens directly into translation). `home.html` is deleted. `/translate`, `/worker`, `/demo` stay.

## 4. Design system v2 (tokens in `static/tokens.css`, written by lead — do not edit without asking)
Feel: light, airy, warm, trustworthy. Rounded, soft depth, generous space. Never a grid of boxes.
- Colours: page `--bg #F3F7FA` (+ soft radial tint `--bg-tint #E6F3F1`), `--surface #FFFFFF`, `--ink #0F2233`, `--muted #475869`, `--line #D8E2EA`.
  Primary teal `--teal #0A6670` (white text 6.4:1), `--teal-soft #E0F1F1`. Worker blue `--blue #2A5699` (white 7.0:1), `--blue-soft #E7EEF9`.
  Warm accent `--warm #FFE4C4` / `--warm-ink #7A3E00` (call a person, gentle highlights). Listening `--listen #9A4A0E`. Success `--ok #1D7048`, `--ok-soft #E3F3EA`. No/stop `--no #A3303D`, `--no-soft #FBE9EB`. Unsure `--unsure-bg #FFF4D4`, `--unsure-ink #6B4A00`, `--unsure-line #D9A621`.
- Type: `ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif` (local only). Patient: body 22px, labels 26px/600, message 34–46px/600 line-height 1.25. Worker: body 17px, message 21px/500, labels 15px/600.
- Spacing scale 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Patient tap targets ≥ 88px (Speak ≥ min(40vmin, 300px)), worker ≥ 48px.
- Radius: cards 28px, bubbles 24px (corner on the speaker's side 8px), buttons/pills 999px, inputs 18px.
- Shadows: `--shadow-1: 0 1px 2px rgba(15,34,51,.06), 0 4px 12px rgba(15,34,51,.06)`, `--shadow-2: 0 2px 4px rgba(15,34,51,.06), 0 12px 32px rgba(15,34,51,.10)`. No hard borders except focus and unsure.
- Icons: inline SVG, 24 grid, stroke 2.25, round caps/joins, `currentColor`, aria-hidden, always paired with a word.
- Conversation: own messages right, other side left, on BOTH screens. Patient bubbles teal-soft with "Pasient"/"Patient" label; worker bubbles blue-soft with "Helsepersonell"/"Nurse" label (in reader's language). Small label + alignment + colour (never colour alone). Unsure messages: amber dashed outline + ⚠ "Usikker oversettelse"/"Translation uncertain".
- Motion: message arrival 280ms ease-out (fade + 8px rise); listening = soft breathing halo 2.4s; sent = check draws 500ms; state changes cross-fade 200ms. `prefers-reduced-motion`: no movement, opacity only.
- Layout: tablet portrait and landscape; landscape puts conversation left, controls right.

## 5. Patient screen (owner: Agent A — `static/translate.html`, `translate.js`, `tts.js`, `ws.js`)
> **Update 2026-10-20 (nurse feedback, see FEEDBACK-2026-10.md) — overrides the layout below:** one screen, no scrolling (100dvh). Mic is the hero (`min(62vmin,460px)`), hold-to-talk with tap fallback (<400 ms = tap mode), soft earcons on start/stop. Conversation + summary live in a right-edge drawer ("Samtale", unread badge), closed by default; only the newest worker reply shows on the main screen. Language pill removed from the patient (nurse sets language on the worker screen). Unacknowledged "Hent en person" is kept server-side (`room.call`) until a nurse acknowledges; green "En person er på vei" banner on ack.

Top bar (slim): language pill "Norsk ⇄ English" (tap to switch, sends set_lang), LIVE/DEMO/LOCAL badge, "Hent en person" warm pill. No Home button.
Main: conversation (last ~4 turns, large bubbles, newest at bottom, read-aloud 🔊 on every received bubble) + summary chip "Det vi har snakket om" that expands to the patient summary lines.
Controls: big round Speak + quick-reply row (6 big pills with icon + word: Ja ✓, Nei ✗, Jeg forstår ikke, Kan du gjenta?, Snakk saktere, Jeg trenger hjelp). Quick replies send immediately (pre-translated, no confirm needed; brief "Sendt" check). "Jeg trenger hjelp" also triggers call_person.
States kept: ready, listening, understanding (transcribing), confirm ("Du sa:" + ✗ Nei, prøv igjen / ✓ Ja, send), translating ("Oversetter …"), sent → quiet ("Se opp – sykepleieren leser nå"), received, error codes (no_speech, noisy, mic_denied, offline, translate_failed).
New state `unsure`: "Jeg er ikke helt sikker på at oversettelsen ble riktig." + clarify_question (if any, in patient language) + buttons: "Si det igjen" (retry), "Send likevel" (sends with status unsure, worker sees warning), "Hent en person".
When the worker asks a yes/no question, the Ja/Nei pills are emphasised (larger) — detect `?` at end of received text.
Footer (discreet): "Maskinoversatt. Viktige beslutninger (samtykke, diagnose, medisiner) må bekreftes med tolk eller en person."

## 6. Worker screen (owner: Agent B — `static/worker.html`, `worker.js`, `demo.html`)
Layout: left = conversation (full history in order, bubbles: original small under translation, engine + status chips, ⚠ unsure with back-translation and reason, seen ticks); right column = running summary card (4 sections, compact) + call-alert banner when active.
Composer (bottom): mic "Snakk/Speak", text field, worker quick-phrase chips (from /api/quick; scroll row; each with a tiny "verify" dot + tooltip "Check with clinician/translator before real use"). Step 1 shows the transcript (editable) → step 2 "Preview: patient will see" with translation, status (✓ checked / ⚠ unsure + back-translation + reason + clarify) → Send / Edit / Cancel. Quick phrases skip translation (show preview, one tap Send).
Top bar: room, language pair chip (swap), engine badge (HPC/LOCAL fallback/DEMO), connection, Clear conversation (confirm).
Footer: "Machine translation, not certified. Consent, diagnoses and medication changes must be confirmed with a qualified interpreter."

## 7. File ownership (no one edits outside their list)
- Lead (Opus): SPEC-v2.md, static/tokens.css, data/quick_replies.json, DESIGN.md, README.md, delete static/home.html.
- Agent C (Sonnet): server.py, providers/*.py (new: providers/clinical.py for prompts/checks/summary/glossary), static/audio.js (API helpers: `translate(text,src,tgt,speaker)` returns the full object), tests/run_testset.py.
- Agent A (Sonnet): static/translate.html, translate.js, tts.js, ws.js.
- Agent B (Sonnet): static/worker.html, worker.js, demo.html.
- Agent E (Haiku, done): data/glossary.csv, tests/testset.json. Agent F (Haiku): read-only checks.

## 8. Done criteria
No food/toilet/pain/home traces. Both screens use tokens.css and look rounded and calm. Every translation returns status + warnings; unsure is visible on both sides. Summary, quick replies, read-aloud, yes/no without speaking, and patient language switch work. Test set run with honest results. `node --check` passes on all JS; server starts with `./bedside/start.sh`.
