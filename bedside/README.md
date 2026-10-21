# Bedside Translation (v2)

Translation-only bedside display (v3: faster, collapsible Summary / To-do / Key facts on the nurse screen; see [SPEC-v3.md](SPEC-v3.md)). To plug it into the main app see [integration/INTEGRATION.md](integration/INTEGRATION.md). A patient screen and a healthcare-worker screen, linked live. Norwegian (Bokmål, incl. spoken/dialect input) ↔ English, both directions. Design system, translation method and contracts: [SPEC-v2.md](SPEC-v2.md) (v1 history: [DESIGN.md](DESIGN.md)).

## Start

```
./bedside/start.sh
```

| Page | Address |
|---|---|
| Patient (opens straight into translation) | http://localhost:8020/ |
| Healthcare worker | http://localhost:8020/worker |
| Both side by side (presentations) | http://localhost:8020/demo |

Requires the NTNU network or VPN for the default translation engine. Without it, the app falls back to the local engine and labels every translation "uncertain".

| Mode | Command |
|---|---|
| Fully local (nothing leaves the Mac, lower quality) | `BEDSIDE_MT=local ./bedside/start.sh` |
| Demo (pre-written phrases, striped DEMO badge) | `BEDSIDE_MODE=demo ./bedside/start.sh` |

## Real vs simulated

| Part | Status |
|---|---|
| Speech-to-text | **Real, on this Mac.** Norwegian: NbAiLab/nb-whisper-small. English: openai/whisper-small.en |
| Translation | **Real, NTNU HPC** (`openai/gpt-oss-120b` on llm.hpc.ntnu.no) with speaker role, clinical framing, last 6 turns and matched glossary terms. Fallback: local facebook/nllb-200-distilled-600M (CC-BY-NC 4.0), always marked uncertain |
| Back-translation check | Real (second HPC call) for important messages: numbers, times, doses, negation, consent, medicine words, uncertain glossary words, or low model confidence |
| Uncertainty | Real: model confidence + clarification request + deterministic checks (numbers, negation, fragments, repetition). Unsure translations are never shown as certain |
| Running summary | Real (HPC), only from what was said; rule-based fallback |
| Quick replies | Pre-written pairs in `data/quick_replies.json` — **all marked "verify"**: a clinician and a professional translator must check them before real use |
| Glossary | `data/glossary.csv`, editable, reloaded automatically. Entries marked `uncertain` need review by a health professional |
| Read aloud | Local macOS voices only (hidden if none) |
| Demo mode | Simulated, clearly labelled |

Nothing here is medically certified. Consent, diagnoses and medication changes must be confirmed with a qualified interpreter or a person.

## Data handling

- **Audio** never leaves the Mac: browser → local server → transcribed in memory → discarded. Never written to disk or logged.
- **Text** of each message (plus the last 6 turns as context, and the conversation for the summary) is sent over HTTPS to NTNU's LLM service (approved by the project owner). NTNU's documentation says API calls are not stored and stay on NTNU's network. Use `BEDSIDE_MT=local` to keep text on the Mac.
- On the Mac, conversation text lives only in server memory until "Clear conversation" or a server stop. No database, no files, message text is not logged.
- The NTNU API key is read from `ai-lab/.env` (gitignored) and never sent to the browser.

## Test set

`../ai-lab/.venv/bin/python tests/run_testset.py` → `tests/results.md` (36 clinical phrases, calls the HPC, ~3 min).

## Swapping models

- Speech-to-text: `providers/asr.py` → `transcribe(pcm, lang)`
- Translation: `providers/clinical.py` (HPC prompts, checks, summary, glossary) and `providers/mt.py` (local / demo)
