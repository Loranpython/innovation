# Pain module (`#/pain`)

**Owner:** pain teammate. Only edit files in this folder, plus `pain.*` keys in `js/strings.js` and the pain formatter in `nurse.html`.

The patient places **pain spots** on a body map. Every spot has its **own**:

- location (front/back, region, exact point)
- **pain level** 0–10 (required)
- **sensation types** (0 or more of 8 pictograms)
- optional **radiation**: places the pain spreads to

So someone can report a *sharp* headache of 8/10, a *numb* hand of 3/10, and lower-back pain of 6/10 that *spreads* down the right leg, all at once. The nurse sees the worst level first.

## Files

| File | What it does |
|------|--------------|
| `pain.js` | Wiring: builds the screen, handles taps/drops, sends the notification |
| `pain-state.js` | **The state** + all changes + Undo. No DOM code |
| `body-regions.js` | Region shapes + zoom boxes, `toPatientRegion()`, names |
| `body-anatomy.js` | Faint anatomy overlay (`SHOW_ANATOMY = false` hides it) |
| `body-map.js` | SVG figure: regions, numbered markers, badges, radiation arrows, hit testing |
| `drag.js` | Dragging feelings onto the body and moving markers (pointer events) |
| `spot-editor.js` | Right panel: the palette, or the editor of the selected spot |
| `level-picker.js` | Faces + square 0–10 slider, reusable for any spot |
| `summary-bar.js` | Bottom bar: spot chips, Undo, Start over, Review & send |
| `review.js` | Review overlay + "Clear everything?" confirm |
| `pain-faces.js` | Line faces for 0–10 |
| `sensation-icons.js` | The 8 sensation pictograms + the "Spreads to…" pictogram |
| `pain.css` | All styles of this screen (colour variables at the top) |
| `icons-preview.html` | Review page for the pictograms (not linked from the app) |

## Data model (`pain-state.js`)

```js
state = {
  spots: [{
    id, number,                  // number 1, 2, 3… is shown on the marker
    view: "front" | "back",
    drawId,                      // internal: the drawn shape (never sent)
    region,                      // PATIENT-perspective id, e.g. "left_thigh"
    x, y,                        // point in the 240 × 580 drawing
    level: null | 0..10,         // null until chosen
    sensations: ["sharp", …],
    radiatesTo: [{ view, drawId, region, x, y }]
  }],
  selectedSpotId, armedSensation,
  mode: "idle" | "placing" | "radiating",
  history,                       // snapshots for Undo
  closeup, zoom, hint, highlightMissing   // screen state
}
```

Every change goes through a function such as `addSpot`, `setLevel`, `toggleSensation`, `addSensation`, `moveSpot`, `removeSpot`, `addRadiation`, `removeRadiation`, `reset` or `undo`. Changes to the answers push an Undo snapshot. Dragging the slider counts as one step. Then the screen re-renders once.

## Two ways to make a spot

**A. Feeling first ("tool-first")**, the main flow for patients who can't read:

1. Tap a feeling in the palette. It is **armed** (dark tile), and the line above the body says "Now tap where you feel it".
2. Tap a body part to open the close-up, then tap the exact place. A spot is created with that feeling, and its editor opens.
3. Or **drag** the feeling onto the body (a ghost icon follows the finger). Dropping it on the body creates a spot right there; dropping it on an existing marker (within ~20px) adds the feeling to that spot. Dropping anywhere else cancels. A feeling is never added twice.

**B. Body first:** tap a body part, then tap in the close-up. An empty spot is created, and the patient chooses level and feelings in the editor.

**Spot editor** (right panel while a spot is selected): number + region, the pain level, "What does it feel like here?", **Spreads to…** with its targets (× removes one), **Delete spot** (asks first), and **Done**. Tapping a marker or a chip in the bottom bar selects that spot. In the close-up, markers can be **dragged** to move them; the region updates on drop, and a drop outside the body puts the marker back.

On phones (< 700px) the editor opens as a bottom sheet above the summary bar.

## Radiating pain ("Spreads to…")

1. In the editor, press **Spreads to…**. On the palette the 9th tile does the same; with no spot selected it first asks "First tap the spot where the pain starts".
2. Tap one or more places (whole body or close-up), then press **Done**.
3. Each target is drawn as a dashed arrow in the spot's level colour, with a small open circle at the target.

**Limitation:** targets must be on the **same view** (front or back) as the spot where the pain starts. Tapping the other view shows "Radiation must stay on the same side of the body" and adds nothing. Targets are rough places, not exact points.

## The left/right rule

**Everything stored or sent uses the PATIENT's left and right.**

- The shapes are drawn once. Their `drawId`s describe the **front** view, where the patient faces you, so `right_upper_arm` is on the **left of the screen**.
- On the **back** view you see the patient's back, so the shape on the left of the screen is their **left** side.
- `toPatientRegion(drawId, view)` in `body-regions.js` converts it and renames back-view parts (back of head, upper/lower back, buttocks, back of hand).

Never send a `drawId` to the nurse.

## What is sent to the nurse

```js
ctx.sendNotification({
  type: "pain",
  details: {
    maxLevel: 8,                                   // highest spot level
    spots: [{
      number: 2, view: "back", region: "lower_back",
      regionLabel: "Lower back (back)",            // English, patient perspective
      x: 120, y: 220.3, level: 6, sensations: ["aching"],
      radiatesTo: [
        { view: "back", region: "right_thigh", regionLabel: "Right thigh (back)", x: 145.2, y: 340.8 }
      ]
    }]
  }
});
ctx.navigate("#/sent");
```

**Review & send** works when there is at least one spot and **every spot has a level**. Pressed too early, it flags the spots without a level (dashed outline) and selects the first one. The 10-second duplicate protection in `js/notifications.js` still applies.

`nurse.html` shows it as:

```
Pain — worst 8/10
 1. Head (front) — 8/10 — sharp / stabbing
 2. Lower back (back) — 6/10 — dull ache → spreads to right thigh, right lower leg
 3. Right hand (front) — 3/10 — numb, pins & needles
```

## How to add a sensation

1. In `sensation-icons.js`, write a function that returns an SVG string. Follow the rules at the top of that file: 48 × 48, stroke 2.5, square caps, a body element + the sensation in `--pain-accent`.
2. Add `{ id, icon }` to `SENSATIONS`.
3. Add `"pain.sensation.<id>"` to `en`, `nl` and `no` in `js/strings.js`.
4. Open `icons-preview.html` (via a local server) and compare it with the others at 40px.

The palette is a 3 × 3 grid (8 feelings + Spreads to). A 9th feeling needs a 4th row or column in `pain.css` (`.pain-palette-grid`).

## How to add or change a body region

1. In `body-regions.js`, add `{ drawId, box, path }` to `REGIONS`. Name the `drawId` as seen on the **front** view (`right_…` = left of the screen).
2. If it has a special name on the back, add it to `BACK_NAMES`.
3. Add `"pain.region.<id>"` for every patient-perspective id it can produce, in all languages.

## Test checklist

Run `python -m http.server 8000` and open `http://localhost:8000/#/pain`, with `nurse.html` in another tab.

- Tool-first: tap Sharp, then the head, then tap in the close-up, choose 8, press Done.
- Drag Numb onto the right hand, choose 3, add Pins & needles. Then drag Burning onto that marker: it is added to the spot, and no new spot appears.
- Body-first: lower back on the back view, choose 6 and Dull ache, Spreads to, tap the right thigh and right lower leg, Done. Arrows are visible.
- While "spreading" from a back spot, tap the front view: a hint appears and nothing is added.
- A spot without a level blocks Review & send, and the flags appear.
- Undo every kind of action. Move a marker in the close-up: the region updates.
- On the **back** view, a spot on the left of the screen arrives as `left_…`.
- 1280×800 fits without scrolling; 390×844 works with the sticky bar.
