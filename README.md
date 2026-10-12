# Patient Communication Screen (prototype)

A one-tap touchscreen next to a hospital bed. Patients who can't easily talk to a nurse can still ask for help: deaf patients, patients who don't speak the local language, and patients too ill to speak. Each request becomes a notification for the nurse.

We built it for the course **Innovation by Design Thinking**, starting from the question:
*"How might we use digital solutions in healthcare services to improve efficiency while preserving human connection and quality of care?"*

## Try it

- **Patient screen:** https://loranpython.github.io/innovation/?patient=Jansen&room=12
- **Nurse dashboard:** https://loranpython.github.io/innovation/nurse.html (optional `?lang=nl` or `?lang=no`)

URL parameters of the patient screen (all optional):

| Param | Default | Example |
|-------|---------|---------|
| `patient` | `Patient` | `?patient=Jansen` |
| `room` | `1` | `&room=12` |
| `lang` | `en` | `&lang=nl` or `&lang=no` |

**Use fictional patient names only** (`Patient`, `Jansen`, `Peeters`, …). Never enter a real person's name or details: see the [security note](#security-note).

### Demo on two devices

1. **Device A** (e.g. a phone or tablet): open https://loranpython.github.io/innovation/?patient=Jansen&room=12
2. **Device B** (e.g. a laptop): open https://loranpython.github.io/innovation/nurse.html and press **🔔 START SHIFT**. The header shows **● LIVE**.
3. On A, tap **Toilet**, or send a **Pain** request. Within a second the request appears on B with a ding.
4. On B, press **ACKNOWLEDGE**. On A, the Home screen now shows **"✓ Your nurse has seen your request"**.
5. On B, press **RESOLVED**. The card disappears and A shows **"✓ Done"** for 2 minutes.

**The day before a demo:** open the [Supabase dashboard](https://supabase.com/dashboard/project/yvstfixolrqskmpmjevl). Free Supabase projects are **paused after a period of inactivity**. Opening the dashboard shows whether it is paused and lets you restore it. A paused project means every request falls back to offline demo mode.

### Demo reset

Requests can't be deleted from the browser (on purpose). To start with an empty list:
Supabase dashboard → **SQL Editor** → run

```sql
delete from public.notifications;
```

Patient screens forget requests that no longer exist within 15 seconds.

## Architecture

```
Patient browser ──INSERT──▶ Supabase (notifications table) ──realtime──▶ Nurse browser
Nurse clicks Acknowledge ──UPDATE status──▶ Supabase ──realtime──▶ Patient: "Your nurse has seen your request ✓"
```

- **Patient → nurse:** a screen calls `ctx.sendNotification({ type, details })`. `js/notifications.js` inserts `{ patient, room, type, details }` through `js/backend.js`. The database fills in `id`, `created_at` and `status: "open"`. The nurse dashboard gets the new row through Supabase Realtime (plus a poll every 10 s as a safety net) and plays a ding.
- **Nurse → patient:** the nurse's buttons only change `status`: `open → acknowledged → resolved` (or `open → resolved`). A database trigger sets `acknowledged_at` / `resolved_at` and refuses any other change. The patient screen keeps the ids of its own requests (`localStorage` key `pcs_my_requests`). It listens to updates for its room (one app-wide subscription, plus a poll every 15 s) and shows the status above the tiles.
- **Database:** one table, `public.notifications`. The full setup is in [`supabase/setup.sql`](supabase/setup.sql). It is **documentation only**: it has already been run, so don't run it again. With the publishable key a browser can read rows, insert the 4 columns above, and move `status` forward. It **cannot delete**.
- **One dependency:** `@supabase/supabase-js` at an exact pinned version, loaded from jsDelivr inside `js/backend.js` only. It loads lazily, so if the CDN or Supabase is unreachable the patient screen still works (see below).

### Offline / local demo mode

- If `js/config.js` is **empty**, everything works like the old same-browser demo: `localStorage` + `BroadcastChannel`, with `nurse.html` open in another tab of the **same browser**. The dashboard header then says **LOCAL DEMO MODE**.
- If Supabase can't be reached, the patient screen retries once after 1.5 s and then falls back to that local path. It never sends through both, so there are no duplicates. The confirmation screen then shows a yellow **"⚠ Sent in offline demo mode: only visible on this device"** instead of "The nurse has been notified". A patient must never believe a request arrived when it didn't.

## Security note

This is a **prototype for a university course**, not a medical device.

- **Fictional data only.** No real patient names, rooms or health information.
- **No authentication.** Anyone who knows the URL can see all requests and acknowledge or resolve them.
- Only the **publishable** key (`sb_publishable_…`) is in the code (`js/config.js`). It is meant to be public; the database rules in `supabase/setup.sql` limit what it can do. **Never** commit a secret / service-role key, database password or access token. This repo is public.

A real hospital version would need at least: staff login (e.g. hospital SSO) and per-device patient registration, scoping to a ward so nurses only see their own patients, an audit log of who acknowledged what and when, a hosting and data-processing agreement with the provider (EU hosting), and a GDPR assessment (DPIA) because this is health data. It might also fall under medical-device rules.

## Run locally

ES modules do **not** work when you open `index.html` by double-clicking (`file://`). Use a small local web server:

- **VS Code:** install the **Live Server** extension → right-click `index.html` → *Open with Live Server*
- **or Python:** in this folder run
  ```
  python -m http.server 8000
  ```
  then open http://localhost:8000/?patient=Jansen&room=12

There is no npm, no build step and no framework. What's in the repo is exactly what runs. The only external code is `@supabase/supabase-js`, loaded from a CDN by `js/backend.js` (so local testing needs internet, or an empty `js/config.js` for local demo mode).

## Folder structure

```
innovation/
├── index.html              # patient screen entry point
├── nurse.html              # nurse dashboard (not linked from the patient screen)
├── .nojekyll               # tells GitHub Pages to serve files as-is
├── css/
│   ├── base.css            # colours (variables), reset, shared square components
│   └── nurse.css           # nurse dashboard
├── js/
│   ├── app.js              # boots app, reads URL params, starts router
│   ├── router.js           # hash router: maps routes to screen modules
│   ├── config.js           # Supabase URL + PUBLISHABLE key (empty = local demo mode)
│   ├── backend.js          # the ONLY file that talks to Supabase
│   ├── notifications.js    # the ONLY place notifications are sent
│   ├── request-status.js   # patient side: live status of this device's requests
│   ├── nurse.js            # nurse dashboard logic
│   ├── sound.js            # WebAudio "ding" (no audio files)
│   ├── strings.js          # all UI text (en, nl, no) + t()
│   └── ui.js               # shared helpers: header, back button, tiles
└── modules/
    ├── home/home.js                # 2 × 2 start screen + "Your requests" strip
    ├── toilet/toilet.js            # sends "toilet" immediately
    ├── food-drink/food-drink.js    # Water / Food
    ├── food-drink/food.js          # food choice screen
    ├── food-drink/food-items.js    # ← edit this list to add/remove food
    ├── pain/                       # pain module (body chart + slider)
    ├── speech/                     # speech/translation module (placeholder)
    └── sent/sent.js                # "The nurse has been notified" (or the offline warning)
supabase/
└── setup.sql               # database setup, documentation only (already applied)
```

Routes: `#/home`, `#/food-drink`, `#/food`, `#/pain`, `#/speech`, `#/sent` (and `#/toilet`).
We use hash routes because GitHub Pages would return a 404 for paths like `/pain`.

## The module interface

Every screen is a module with the same two functions:

```js
export function render(container, ctx) { ... }
// container: DOM element to draw into (the router empties it first)
// ctx: { patient, room, lang, t, sendNotification, navigate, getLastResult }

export function cleanup() { ... }   // optional: stop timers / remove listeners
```

- **Text:** `ctx.t("pain.title")`. Never hard-code text; add it to `js/strings.js` in all languages.
- **Send something to the nurse:** `ctx.sendNotification({ type, details })`, then `ctx.navigate("#/sent")`.
- **Go somewhere:** `ctx.navigate("#/home")`.

**Registering a new screen is one line in `js/router.js`:**

```js
"#/my-screen": () => import("../modules/my-screen/my-screen.js"),
```

### Notifications

`ctx.sendNotification({ type, details })` returns a Promise of `{ ok, mode: "online" | "local", id }`. Screens don't need to await it: the confirmation screen (`#/sent`) does, and shows "Sending…" in the meantime. Allowed types: `toilet`, `drink`, `food`, `pain`, `speech` (the database refuses others). How a request travels is described under [Architecture](#architecture). No screen talks to Supabase, `localStorage` or `BroadcastChannel` for notifications itself.

The same request type can't be sent twice within 10 seconds. The patient then sees "Already sent, the nurse is on the way".

## Who works on what

| Part | Folder | Owner |
|------|--------|-------|
| Pain module | `modules/pain/` (see its README) | pain teammate |
| Speech & translation | `modules/speech/` (see its README) | speech teammate |
| Everything else | `js/`, `css/`, other modules | core team |

**Only edit your own folder**, plus a one-line route in `js/router.js` and your own keys in `js/strings.js` if needed. This keeps merge conflicts to a minimum.

## Design rules

- Square corners only (`border-radius: 0`), no shadows, no gradients
- Font: `Arial, Helvetica, sans-serif`; bold only for labels and titles
- Big icons first, short labels second (many patients can't read the language)
- Every touch target is at least 64px and is a `<button>` with an `aria-label`
- All colours are CSS variables at the top of `css/base.css`

## Git workflow for teammates

```bash
git checkout main
git pull                          # 1. always get the latest version first
git checkout -b pain-improvements # 2. make your own branch
# ... work, test locally ...
git add modules/pain
git commit -m "Pain: add pain type icons"
git push -u origin pain-improvements
```

3. On GitHub, open a **pull request** into `main` and ask someone to look at it.
4. After merging, GitHub Pages updates the live site automatically within about a minute.
