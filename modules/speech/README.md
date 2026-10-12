# Speech & translation module (`#/speech`)

**Owner:** speech/translation teammate. Only edit files in this folder (plus translation keys in `js/strings.js`).

**Status:** placeholder. `speech.js` now only shows a dashed "TODO" box.

**Goal:** the patient speaks in their own language (e.g. Romanian), and the nurse receives the text translated into the hospital's language (e.g. Norwegian).

## The interface you must implement

`speech.js` must export:

```js
export function render(container, ctx) { ... }
export function cleanup() { ... }   // stop microphone, timers, listeners
```

### `render(container, ctx)`

- Draw your whole screen **into `container`**. The router empties it before calling you.
- Keep the shared look: use `createScreen(ctx, { title: ctx.t("speech.title") })` from `js/ui.js`. It gives you the header row with the square **← Back** button.
- Put all text in `js/strings.js` and read it with `ctx.t("speech.something")`. Never hard-code UI text.
- Load your styles from `speech.css` (see `loadStyles()` in `speech.js`).

### `ctx` contains

| Field | Meaning |
|-------|---------|
| `ctx.patient`, `ctx.room` | From the URL (`?patient=Jansen&room=12`) |
| `ctx.lang` | Interface language: `"en"`, `"nl"` or `"no"` |
| `ctx.t(key, vars)` | Translate a UI text |
| `ctx.sendNotification({...})` | Send a request to the nurse (the **only** way to send) |
| `ctx.navigate(hash)` | Go to another screen |

### When the patient is done

```js
ctx.sendNotification({
  type: "speech",
  details: {
    originalText: "Mi-e sete",     // what the patient said
    originalLang: "ro",            // language of the patient
    translatedText: "Jeg er tørst", // translation for the nurse
    targetLang: "no"               // language of the nurse
  }
});
ctx.navigate("#/sent");   // shows "The nurse has been notified"
```

The nurse page (`nurse.html`) already shows these four fields.

### `cleanup()`

The router calls this when the patient leaves the screen. Stop speech recognition and the microphone, and clear any timers here.

## Rules

- Only `ctx.sendNotification` sends data. No direct `fetch`, `localStorage` or `BroadcastChannel` calls for notifications.
- Use square buttons (no `border-radius`), at least 64px tall, and give each one an `aria-label`.
- The screen is already registered in `js/router.js` (`"#/speech"`), so you don't need to touch the router.
