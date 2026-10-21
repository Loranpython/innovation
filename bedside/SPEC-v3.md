# v3 changes (nurse feedback round 2) — read with SPEC-v2.md. This file wins on conflicts.

Goals: nurses work fast → fewer boxes, fewer words, much faster round trip. Worker screen gets 3 collapsible panels.

## 1. Remove clutter (UI)
- Worker bubbles: NO engine chips (HPC / Phrasebook / Quick phrase), NO amber "Translation uncertain" box, NO back-translation text, NO "Checked – meaning matches". Bubble = translation (big) + original (small) + seen ticks. A tiny ⚠ icon (with `title` tooltip, no extra box) only when `msg.quality === "unsure"`.
- Worker preview step: translation + Send / Edit / Cancel only (no check box, no warnings text).
- Remove the "HPC" badge on worker and "LIVE · NTNU" on patient. Show a badge ONLY if (a) demo mode → striped DEMO badge (must stay: honesty), or (b) engine is the local fallback → small amber dot + "Offline model" (worker top bar) / nothing on patient.
- Patient "unsure" screen only when the translate result `status === "unsure"` (see §3: now only for hard failures).

## 2. Summary → 3 collapsible panels (worker, right column / below in portrait)
Use `<details>` (keyboard accessible, summary row ≥48px, chevron icon, open state remembered in localStorage). Default: all open.
1. **Summary** — 1–3 bullets, each one a full, information-dense sentence; ONLY what matters most; no "Patient said" label; no per-sentence bullets.
2. **To-do** — checklist with count badge ("2"). Each task: checkbox (≥48px target), text, small room chip ("Room 1"). Tap toggles done (strike-through, moves to bottom). Tasks come from the server (connected to the summary).
3. **Key facts** — compact label/value rows the nurse wants at a glance (pain location, pain level, allergies, medicines/doses, times). Only facts actually stated. Hidden rows if empty; panel shows "Nothing yet" when empty.

## 3. Contract changes (server → clients)
`summary` object (in `state` and `{type:"summary"}` events):
```
{ key_points:[str]      // ≤3, worker language, long informative sentences
, tasks:[{id,text,room,done}]   // text in worker language; includes the room ("Bring pain medication to Room 1"); only things the patient asked for or the worker promised; NEVER invented treatment or medical orders
, facts:[{label,value}] // worker language, ≤8, only stated facts
, patient:[str]         // ≤4 simple lines, patient language (unchanged)
, engine, updated }
```
Old `summary.worker.*` is removed. Task `id` = stable hash of normalised text so done-state survives regeneration. Server keeps `room.tasks` (merge by id, keep `done`; drop tasks the LLM no longer returns only if not done).
New client→server event: `{type:"task_toggle", id}`; server toggles `done` and re-broadcasts `summary`.
Translate result: `status:"unsure"` ONLY for hard failures (`numbers_mismatch, negation_mismatch, meaning_changed, hallucination`) or local fallback engine; other warnings (`fragment, uncertain_term, low_confidence`) stay in `warnings` but status stays `ok`. `needs_clarification` only with hard failures. Add `ms` (server time) to translate/transcribe responses.

## 4. Speed (target: send→worker sees translation feels instant; transcript ≤ ~2 s for short phrases)
Server: persistent keep-alive httpx client for HPC; `reasoning_effort:"low"` and small `max_tokens` on translate calls (verify the HPC accepts it, else drop); back-translation only for hard-critical messages (digits/times/doses, negation, consent words) — not for glossary-uncertain or low-confidence; ASR greedy decoding (num_beams=1), trim leading/trailing silence, warm up both ASR models and the HPC connection at startup; summary debounce 2 s, low effort. Measure before/after and report.
Clients (speculative translation): as soon as a transcript is available, start `translate()` in the background and cache by (text,src,tgt); "Ja, send" / Send uses the cached promise (instant). Discard on ✗/Edit. Worker: after speaking, auto-show the preview with translation (no extra Preview tap); debounce 500 ms re-translate on edit; typed text + Enter/Preview uses cache if present. Privacy note: text is sent to NTNU HPC before the speaker taps send (text only, same destination as before).

## 5. Ownership (this round)
- Agent S (Sonnet): server.py, providers/*.py, static/audio.js (helpers only), tests/ (rerun testset for regressions).
- Agent W (Sonnet): static/worker.html, worker.js, demo.html.
- Agent P (Sonnet): static/translate.html, translate.js.
- Agent R (Haiku, read-only): root app module contract for integration.
