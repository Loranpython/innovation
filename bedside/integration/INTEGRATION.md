# Integrating the Speech/Translation feature into the main app

Two parts:

| Part | What it is | Where it lives |
|---|---|---|
| **Frontend adapter** | Replaces the placeholder `modules/speech/speech.js`. Shows the translation screen inside the app's normal frame (header + Back button) and forwards patient messages to the nurse through the app's own `ctx.sendNotification`. | `bedside/integration/modules/speech/speech.js` → copy to `modules/speech/speech.js` |
| **Backend service** | Python (FastAPI). Speech-to-text runs locally; translation + summary call the NTNU LLM. Cannot run on GitHub Pages. | `bedside/` (new top-level folder, owned by the speech developer) |

The main app stays static and unchanged except for `modules/speech/` (the folder the README already assigns to the speech owner).

## How to share it: one repo, not two

Do **not** make a separate repo for the other developer to copy from. Their README already defines the workflow (edit only your own folder, branch from `main`, pull request into `main`). Follow it:

```bash
git clone https://github.com/loranpython/innovation.git
cd innovation
git checkout -b feature/speech-translation
cp -R /Users/tommynguyen/innovation-main/bedside ./bedside        # backend + integration files
cp bedside/integration/modules/speech/speech.js modules/speech/speech.js
git status        # check: NO .env, NO .venv, NO api keys in the list
git add bedside modules/speech/speech.js
git commit -m "Speech & translation module (bedside service + adapter)"
git push -u origin feature/speech-translation
```
Then open a pull request into `main` on GitHub and ask the other developer to review it. (If you don't have write access, fork the repo first and open the PR from your fork.)

Before the first `git add`: confirm `bedside/.gitignore` exists (it ignores `.env` and `.venv`) and that your NTNU key is only in `bedside/.env` or `ai-lab/.env`, never in a committed file. `ai-lab/` is not part of the PR.

## Run both together (demo / simulation room)

1. Backend (needs the NTNU network or VPN for the translation engine):
   ```bash
   cd bedside
   python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
   cp .env.example .env        # then paste the NTNU key after IDUN_API_KEY=
   ./start.sh                  # http://localhost:8020
   ```
2. Main app (from the repo root): `python3 -m http.server 8000` → `http://localhost:8000/?patient=Jansen&room=12`
3. Patient taps **Speak** → the translation screen appears inside the app.
4. Nurse opens `http://localhost:8020/worker?room=12` (the room number must match the patient's `room`).

The adapter uses `http://localhost:8020` by default; for another host use `?bedside=https://your-host` in the app URL.

## What the adapter does (contract)

- Iframe: `{bedside}/?embed=1&room={ctx.room}&patient={ctx.patient}` with `allow="microphone"`.
- Messages from the iframe (`window.postMessage`, origin-checked, `source:"bedside"`):
  - `message` → `ctx.sendNotification({type:"speech", details:{originalText, originalLang, translatedText, targetLang}})`, exactly the four fields in `modules/speech/README.md`.
  - `call_person` → a `speech` notification "The patient asks for a person".
- `cleanup()` removes the iframe (releases the microphone) and the listener.
- Tested: tile → Speak → embedded screen loads, Back works, "Hent en person" lands in `pcs_notifications` with the right patient and room.

## Things the other developer must decide

1. **Duplicate protection.** `js/notifications.js` ignores a second notification of the same `type` within 10 s. A conversation sends several `speech` messages, so some will be dropped. Suggested fix (their file): make the duplicate key `type + JSON.stringify(details)` or exempt `speech`.
2. **Hosting.** GitHub Pages is https; the backend must then be https too (browsers block http calls from https pages, except localhost in Chrome). For a real deployment the service needs a hospital server, TLS, authentication and a data-protection assessment. For the course demo, run both locally.
3. **The real backend for `deliver()`** in `notifications.js`: today nurse notifications only work inside one browser. The conversation itself (the nurse's `/worker` page) already syncs across devices through the bedside service.
4. **Strings and symbols:** the adapter uses `speech.title` from `js/strings.js`. The translation screen has its own Norwegian/English text (inside `bedside/static`), because it follows the nurse-chosen language pair, not the app's `?lang=`.
5. **Data:** audio never leaves the machine; text goes to the NTNU LLM (see `bedside/README.md`). Nothing is stored.
