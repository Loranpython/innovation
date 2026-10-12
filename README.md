# Patient Communication Screen (prototype)

A one-tap touchscreen next to a hospital bed. Patients who can't easily talk to a nurse can still ask for help: deaf patients, patients who don't speak the local language, and patients too ill to speak. Each request becomes a notification for the nurse.

We built it for the course **Innovation by Design Thinking**, starting from the question:
*"How might we use digital solutions in healthcare services to improve efficiency while preserving human connection and quality of care?"*

## Try it

- **Live:** https://loranpython.github.io/innovation/
- **With patient, room and language:**
  https://loranpython.github.io/innovation/?patient=Jansen&room=12&lang=nl
- **Nurse debug view:** https://loranpython.github.io/innovation/nurse.html

URL parameters (all optional):

| Param | Default | Example |
|-------|---------|---------|
| `patient` | `Patient` | `?patient=Jansen` |
| `room` | `1` | `&room=12` |
| `lang` | `en` | `&lang=nl` or `&lang=no` |

### Demo setup (patient + nurse side by side)

1. Open the **patient screen** in one browser window: `…/innovation/?patient=Jansen&room=12`
2. Open **`nurse.html`** in a second window of the **same browser** and put them side by side.
3. Tap a request on the patient screen. It appears live on the nurse page.

This works because both pages share a `BroadcastChannel` and `localStorage`. That only works within one browser on one device. A real backend comes later (see `js/notifications.js`).

## Run locally

ES modules do **not** work when you open `index.html` by double-clicking (`file://`). Use a small local web server:

- **VS Code:** install the **Live Server** extension → right-click `index.html` → *Open with Live Server*
- **or Python:** in this folder run
  ```
  python -m http.server 8000
  ```
  then open http://localhost:8000/?patient=Jansen&room=12

There is no npm, no build step and no framework. What's in the repo is exactly what runs.

## Folder structure

```
innovation/
├── index.html              # patient screen entry point
├── nurse.html              # debug nurse view (not linked from the patient screen)
├── .nojekyll               # tells GitHub Pages to serve files as-is
├── css/
│   └── base.css            # colours (variables), reset, shared square components
├── js/
│   ├── app.js              # boots app, reads URL params, starts router
│   ├── router.js           # hash router: maps routes to screen modules
│   ├── notifications.js    # the ONLY place notifications are sent
│   ├── strings.js          # all UI text (en, nl, no) + t()
│   └── ui.js               # shared helpers: header, back button, tiles
└── modules/
    ├── home/home.js                # 2 × 2 start screen
    ├── toilet/toilet.js            # sends "toilet" immediately
    ├── food-drink/food-drink.js    # Water / Food
    ├── food-drink/food.js          # food choice screen
    ├── food-drink/food-items.js    # ← edit this list to add/remove food
    ├── pain/                       # pain module (body chart + slider)
    ├── speech/                     # speech/translation module (placeholder)
    └── sent/sent.js                # "The nurse has been notified"
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

`js/notifications.js` builds `{ id, type, details, patient, room, timestamp, status: "open" }`. It logs the notification to the console, stores it in `localStorage` (`pcs_notifications`) and broadcasts it on `BroadcastChannel("pcs_notifications")`.
Later we replace that with a real backend in **one function** (`deliver()`). No screen code has to change.

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
