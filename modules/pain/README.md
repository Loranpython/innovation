# Pain module (`#/pain`)

**Owner:** pain teammate. Only edit files in this folder (plus translation keys in `js/strings.js`).

The patient taps where it hurts on a body chart, chooses how bad the pain is (0–10), and presses **Send**.

## Files

| File | What it does |
|------|--------------|
| `pain.js` | The screen: state, front/back toggle, selection list, slider, send button. Loads `pain.css` itself. |
| `body-figure.js` | The inline SVG body (front and back) and the list of clickable regions. |
| `pain.css` | Styles for this screen only (layout, figure colours, square slider). |

## Module interface (same for every screen)

```js
export function render(container, ctx) { ... }   // draw into container
export function cleanup() { ... }                 // optional
```

`ctx` contains `{ patient, room, lang, t, sendNotification, navigate, getLastResult }`.
Never call `localStorage` or `fetch` yourself. Always go through `ctx.sendNotification`.

## What it sends

```js
ctx.sendNotification({
  type: "pain",
  details: {
    regions: ["left_knee", "lower_back"], // region ids, in the order tapped
    intensity: 7,                         // 0–10
    view: "front"                         // the view shown when Send was pressed
  }
});
ctx.navigate("#/sent");
```

## Left and right

**Left/right is always from the patient's point of view.**

- **Front view:** the figure faces you, so the patient's *left* is on the *right* of the screen.
- **Back view:** you see their back, so the patient's *left* is on the *left* of the screen.

`sidePair()` in `body-figure.js` handles this. Small **L / R** letters are drawn next to the figure as a reminder.

## Adding or changing a region

1. In `body-figure.js`, draw the shape for the **left half of the screen** (points in the 200 × 440 box).
2. Add it to `FRONT_REGIONS` or `BACK_REGIONS`. Use `sidePair("name", SHAPE, view)` for body parts that come in pairs.
3. Add a label `"region.<id>"` for every language in `js/strings.js`. The nurse page uses the same key.

## Ideas for later

- Pain type (stabbing, burning, …) with icons
- Bigger touch areas for hands and feet (an invisible larger shape around them)
- Zoom on a body part
