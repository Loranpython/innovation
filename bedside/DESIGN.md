> **Superseded (v1, kept for history).** The current design system, routes, translation method and contracts are in [SPEC-v2.md](SPEC-v2.md). v2 removed the home screen and the Food and drink, Toilet and Pain placeholders; the patient side opens directly into translation.

# Bedside Translation — design spec & build contract

Status: MVP for simulation-room testing. Norwegian (Bokmål) + English only.

## 1. Design directions (summary)

| | A. Calm Orb | B. Table Split | C. Pass the Turn (chosen) |
|---|---|---|---|
| Layout | One breathing circle fills the screen; text appears around it | Screen split in two halves, one per person; worker half rotated 180° | One card at a time + one large Speak button. After sending, the screen deliberately goes quiet and says "look up" |
| Interaction | Tap orb, speak, tap to stop | Each person taps their half | Tap Speak → check what was heard (✓ / ✗) → sent → screen recedes; reply arrives as one big card with read-aloud |
| Visual | Soft gradients, slow motion | Two colour fields, mirrored | Warm paper background, near-black ink, one strong colour per state, circle = "your voice" |
| Human connection | Weak: hypnotic shape pulls the gaze to the screen | Medium: both face the screen, not each other; needs worker at the bed | Strong: the screen only holds the current turn, then hands attention back to the person ("Se opp – sykepleieren leser nå") |

Recommendation: **C. Pass the Turn** — like passing a handwritten note. Fewest decisions per screen, no chat history to read, and the "quiet" state actively returns eye contact.

## 2. Design system

Builds on the group's existing tokens (bg #f5f3ee, ink #1b1b1b, Arial, focus #1849c9, speech tile #c3d9bf) so it sits naturally in the home screen. Square cards like the rest of the app; **only the Speak control is a circle** — the circle always means "your voice".

Colour (all text pairs ≥ 7:1 except where noted):
- `--paper #f5f3ee` background · `--card #ffffff` · `--ink #1b1b1b` · `--muted #4a4a4a` (≥ 8:1 on paper)
- `--ready #0b5e5e` deep teal (white text 7.6:1) — ready / Speak
- `--listen #8a4b00` warm amber-brown (white 6.6:1) — listening
- `--think #3a3a8c` indigo (white 9.6:1) — understanding / translating
- `--yes #1f6b35` green (white 6.7:1) — ✓ Ja, send / sent
- `--no #9e2a2b` brick (white 7.3:1) — ✗ Nei, prøv igjen
- `--person #fde7c4` soft apricot fill + 3px ink border — "Hent en person" (calm, never red, never flashing)
- `--focus #1849c9` 4px outline, 2px offset
- `--quiet #e9e5dc` dimmed state background

Type: Arial/Helvetica (as group). Patient: body 28px, labels 32px bold, message text clamp(36px, 5vw, 56px)/1.25 bold. Worker: body 18px, message 28px.
Spacing: 8 · 16 · 24 · 40 · 64. Tap targets: patient ≥ 96px (Speak button ≥ min(48vmin, 360px) diameter), worker ≥ 56px.
Shape: square cards (radius 0, 2–3px ink border); Speak = circle; ✓ = check icon, ✗ = cross icon, always with a word, and ✓ is always on the right, ✗ on the left.
Motion: slow and meaningful only. Listening = soft expanding ring every 2.4s; Understanding = three dots fading in sequence, 1.8s; state change = 300ms cross-fade. `prefers-reduced-motion`: no scaling/rings; static ring + text only.
Orientation: landscape = message card left, controls right; portrait = card top, controls bottom (Speak in the lower third, reachable).

## 3. Patient states (each = colour + shape + icon + short word)

| State | Colour | Shape/motion | Words (no / en) |
|---|---|---|---|
| ready | teal circle, mic icon | still | "Trykk og snakk" / "Tap and speak" |
| listening | amber circle, stop-square icon | rings pulse; live level meter as ring thickness | "Jeg lytter … trykk når du er ferdig" / "Listening … tap when done" |
| understanding | indigo, three dots | dots pulse | "Et øyeblikk …" / "One moment …" |
| confirm | white card with patient's own words, large | — | "Du sa:" · ✗ "Nei, prøv igjen" · ✓ "Ja, send" |
| sent | green tick, then screen dims to `--quiet` with two-people icon | tick draws once | "Sendt. Se opp – sykepleieren leser nå." / "Sent. Look up – the nurse is reading." |
| received | white card, thick teal left bar, worker's message in patient language | slide in 300ms | 🔊 "Les høyt" / "Read aloud"; Speak button returns labelled "Svar" / "Reply" |
| error | same layout, soft card with icon, never raw text | — | see §5 |

Always visible: top-left Home (house icon + "Hjem"), top-right "Hent en person" (hand icon). Bottom: one discreet line "Maskinoversatt. Viktige ting: spør en person." Mode badge (LIVE local / DEMO) small top-centre.

## 4. Worker screen (`/worker`)
One column, quiet. Top bar: room, language pair chip "Pasient: Norsk ⇄ Du: English" (tap to swap), mode badge, connection dot.
- Latest patient message card: translation (worker language) 28px; original underneath, labelled "Original (Norsk)". Time.
- "Call a person" alerts appear as a full-width banner with Acknowledge button (patient sees "Noen kommer" / "Someone is coming").
- Reply: big mic button "Speak (English)" + text field. After speech/typing → **preview**: "Patient will see:" + translated text in patient language, your text small below; buttons Cancel · Edit · **Send**.
- Status under the last reply: Sending → Delivered → **Seen** (seen = shown on patient screen while page visible ≥ 1.5 s).
- Footer: "Machine translation, not certified. Confirm important decisions with a qualified interpreter."
- "Clear conversation" (small, with confirm) — wipes server memory.

## 5. Errors (patient words; worker sees the technical reason in small grey text)
| code | patient (no) | icon | action |
|---|---|---|---|
| no_speech | "Jeg hørte ingenting. Prøv igjen." | ear | Prøv igjen |
| noisy | "Det var mye lyd rundt. Prøv igjen, litt nærmere." | waves | Prøv igjen |
| mic_denied | "Mikrofonen er slått av. En person kan hjelpe." | mic-off | Hent en person |
| offline | "Meldingen kom ikke fram. Prøv igjen." | cloud-off | Prøv igjen + Hent en person |
| translate_failed | "Oversettelsen virker ikke akkurat nå. En person kan hjelpe." | speech-bubble-x | Hent en person |
English equivalents for English-speaking patients.

## 6. Architecture & contract (both builders follow exactly)

Folder `bedside/`. Python FastAPI, reuses `../ai-lab/.venv`. Start: `./bedside/start.sh` → http://localhost:8020
Routes: `/` home (4 tiles), `/translate` patient translation, `/worker` worker, `/demo` both side by side (two iframes, for presentations).

Providers (swappable, `bedside/providers/`):
- `asr.py`: `transcribe(pcm_float32_16k, lang) -> {"text", "no_speech": bool}` — default NbAiLab/nb-whisper-small, local, MPS→CPU fallback. Treat empty/known silence hallucinations ("Teksting av", "Undertekster", "Takk for at du så på", "Subtitles by") as no_speech.
- `mt.py`: `translate(text, src, tgt) -> str` — default `local` = facebook/nllb-200-distilled-600M (`nob_Latn` ↔ `eng_Latn`); `demo` = phrasebook; `hpc` = NTNU IDUN, **disabled unless BEDSIDE_ALLOW_HPC=1** (needs owner approval: sends text off-device).
- Mode env `BEDSIDE_MODE=live|demo` (default live; auto-fallback to demo only if models fail to load, and badge must say DEMO).

HTTP:
- `GET /api/status` → `{mode:"live"|"demo", asr_model, mt_model, ready:{asr,mt}}`
- `POST /api/transcribe` multipart `audio` (16 kHz mono PCM16 WAV), `lang` (no|en) → `{text}` or `{error:"no_speech"}`; 4xx/5xx `{error:code, detail}`
- `POST /api/translate` JSON `{text, src, tgt}` → `{text}` or `{error:"translate_failed", detail}`

WebSocket `/ws?room=1&role=patient|worker` — server keeps ONE in-memory conversation per room (no disk, wiped on restart / clear). Server→client on connect: `{type:"state", lang:{patient:"no",worker:"en"}, messages:[...], peers:{patient:bool,worker:bool}}`.
Message object (compatible with group's `modules/speech` contract):
`{id, from:"patient"|"worker", originalText, originalLang, translatedText, targetLang, ts, status:"sent"|"delivered"|"seen"}`
Client→server: `{type:"send", from, originalText, originalLang, translatedText, targetLang}` · `{type:"seen", id}` · `{type:"call_person"}` · `{type:"ack_call"}` · `{type:"set_lang", patient, worker}` · `{type:"clear"}`.
Server broadcasts to all in room: `{type:"message", message}`, `{type:"status", id, status}` (delivered when the other role is connected and receives it), `{type:"call_person", ts}`, `{type:"ack_call"}`, `{type:"lang", patient, worker}`, `{type:"peers", ...}`, `{type:"cleared"}`.
Translation happens on the **sender's** side before `send` (sender previews/confirms the translation).

Data handling: audio stays in memory for one request, never written to disk, never logged. Text lives only in server memory for the session. No external calls at runtime (model weights download once from Hugging Face on first start; no patient data in that request). Browser speech recognition (Web Speech API) is **forbidden** (Chrome sends audio to Google). Read-aloud uses `speechSynthesis` **only with voices where `localService === true`** (macOS: Nora nb_NO); if none, hide the button.
