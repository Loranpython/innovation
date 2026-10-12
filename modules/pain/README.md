# Pain module (`#/pain`)

**Owner:** pain teammate. Only edit files in this folder, plus `pain.*` keys in `js/strings.js` and the pain formatter in `nurse.html`.

The patient shows **where** it hurts, **how bad** it is and **what it feels like**, then sends it to the nurse. The functionality is ported from a teammate's Lovable prototype (React). It is rebuilt here in vanilla JS, in our own square style.

## Features

1. **Body map:** front and back figures side by side, with a faint anatomy overlay (bones, muscles, organs).
2. **Close-up:** tapping a body part zooms in on it. Every tap then places a precise pain point. The toolbar has: whole body, undo last point (on this side), zoom out, zoom in (1×–2×), done. Keyboard: Enter or Space on a body part places a point in its centre.
3. **Pain level:** starts unselected (`—/10`). The patient picks it with 6 faces (0, 2, … 10) or a 0–10 slider made of 11 square colour steps.
4. **Sensations:** 8 custom pictograms, multi-select.
5. **Summary bar:** shows areas, level and sensation count, plus **Start over** (asks first) and **Review & send**. Review & send is enabled once a level is chosen; the location is optional.
6. **Review:** level + face, a figure with the points (front/back), the areas and sensations, then **Change** or **Send to nurse**.

## Files

| File | What it does |
|------|--------------|
| `pain.js` | The screen: state, layout, wiring, review and send |
| `body-regions.js` | Region paths + zoom boxes, `toPatientRegion()`, region names |
| `body-anatomy.js` | Anatomy overlay. Set `SHOW_ANATOMY = false` to hide it |
| `body-map.js` | Builds the SVG (whole body / close-up / read-only), places points, draws markers |
| `pain-faces.js` | Line faces for 0–10 |
| `sensation-icons.js` | The 8 sensation pictograms + the `SENSATIONS` list |
| `pain.css` | All styles for this screen (colour variables at the top) |
| `icons-preview.html` | Review page for the pictograms (not linked from the app) |

## Module interface

```js
export function render(container, ctx) { ... }
// ctx: { patient, room, lang, t, sendNotification, navigate, getLastResult }
```

The route is registered in `js/router.js` as `"#/pain"`. Never call `localStorage` or `fetch` yourself; always go through `ctx.sendNotification`.

## What is sent to the nurse

```js
ctx.sendNotification({
  type: "pain",
  details: {
    level: 7,                                         // 0–10 (always set)
    areas: ["Left thigh (back)", "Lower back"],       // readable, ENGLISH, patient perspective
    points: [                                         // every tap, x/y in the 240 × 580 drawing
      { view: "back", region: "left_thigh", x: 95.7, y: 340.8 },
      { view: "back", region: "lower_back", x: 120,  y: 220.3 }
    ],
    sensations: ["sharp", "burning"]                  // ids from sensation-icons.js
  }
});
ctx.navigate("#/sent");
```

`areas` and `points` can be empty, e.g. "pain 8/10, but I don't know where". The 10-second duplicate protection in `js/notifications.js` still applies.

## The left/right rule

**Everything stored or sent uses the PATIENT's left and right.**

- The region shapes are drawn once. Their `drawId`s describe the **front** view: the patient faces you, so `right_upper_arm` is on the **left of the screen**.
- On the **back** view you see the patient's back, so the shape on the left of the screen is their **left** side.
- `toPatientRegion(drawId, view)` in `body-regions.js` does the conversion. It also renames central parts on the back: head → back of head, neck → back of neck, chest → upper back, abdomen → lower back, pelvis → buttocks, hand → back of hand.

```js
toPatientRegion("right_thigh", "front") // "right_thigh"
toPatientRegion("right_thigh", "back")  // "left_thigh"
toPatientRegion("right_hand",  "back")  // "left_back_of_hand"
```

Never send a `drawId` to the nurse.

## How to add a sensation

1. In `sensation-icons.js`, write a function that returns an SVG string. Follow the rules at the top of that file: 48 × 48, stroke 2.5, square caps, a body element + the sensation in `--pain-accent`.
2. Add `{ id, icon }` to `SENSATIONS`.
3. Add `"pain.sensation.<id>"` to `en`, `nl` and `no` in `js/strings.js`.
4. Open `icons-preview.html` (via a local server) and compare it with the others at 40 px.

## How to add or change a body region

1. In `body-regions.js`, add `{ drawId, box, path }` to `REGIONS`. Name the `drawId` as seen on the **front** view (`right_…` = left of the screen).
2. If it needs a special name on the back, add it to `BACK_NAMES`.
3. Add `"pain.region.<id>"` for every patient-perspective id it can produce (front and back) in all languages.
4. Check the nurse page shows it correctly. Its `painAreas()` adds "(front)/(back)" for left/right limbs.

## Test checklist

Run `python -m http.server 8000` and open `http://localhost:8000/#/pain`.

- Place and undo points on front and back. On the **back** view, a point on the left of the screen must arrive as `left_…`.
- With `nurse.html` open in another tab, the notification must appear in readable form.
- It must fit without scrolling at 1280×800 and work at 390×844 (sticky summary bar).
