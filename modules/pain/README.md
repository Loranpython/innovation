# Pain module (`#/pain`)

**Owner:** pain teammate. Only edit files in this folder, plus `pain.*` keys in `js/strings.js` and the pain formatter in `js/nurse.js` (`painDetails()`).

The patient places **pain spots** on a body map. Every spot has its **own**:

- location (front/back, region, exact point)
- **pain level** 0–10 (required)
- optional **radiation**: places the pain spreads to

So someone can report a headache of 8/10 and lower-back pain of 6/10 that *spreads* down the right leg, all at once. The nurse sees the worst level first.

General symptoms that have no place on the body (nauseous, anxious, dizzy) are **not** pain, but they are chosen on the **same screen**: three big toggle tiles under "Or how do you feel?" in the right panel, visible without any extra tap. Pain spots and symptoms are sent **together** in one notification. The tiles, icons and the `symptom.<id>` strings come from `modules/symptoms/symptoms.js`. The old `#/symptoms` route redirects here.

### Why there are no sensation types any more

Earlier versions had eight sensation pictograms (sharp/stabbing, burning, aching, throbbing, shooting, tingling, cramping, numb), with a palette, a "tool-first" armed mode and drag & drop. After clinical feedback from Eivind Kvernø (ICU nurse, simulation-unit supervisor) they were removed: they weren't universal enough and were ambiguous, especially for patients with communication difficulties. Location + level is what the nurse needs to start; the nurse asks the rest in person.

**Older saved notifications** that contain `sensations` are still shown correctly on the nurse dashboard (the `pain.sensation.<id>` labels stay in `js/strings.js` for that).

## Files

| File | What it does |
|------|--------------|
| `pain.js` | Wiring: builds the screen, handles taps, sends the notification |
| `pain-state.js` | **The state** + all changes + Undo. No DOM code |
| `body-regions.js` | Region shapes + zoom boxes, `toPatientRegion()`, names |
| `body-anatomy.js` | Faint anatomy overlay (`SHOW_ANATOMY = false` hides it) |
| `body-details.js` | Front/back cues (face, toes vs. hair, spine, buttocks, heels) + the FRONT/BACK head pictogram. Decorative only: never changes taps |
| `body-map.js` | SVG figure: regions, numbered markers, radiation arrows, hit testing |
| `drag.js` | Moving markers in the close-up (pointer events) |
| `spot-editor.js` | Right panel: "Tap where it hurts" + the symptom tiles, or the editor of the selected spot |
| `level-picker.js` | Faces + square 0–10 slider, reusable for any spot |
| `summary-bar.js` | Spot and symptom chips, Undo, Start over, Review & send |
| `review.js` | Review overlay + "Clear everything?" confirm |
| `pain-faces.js` | Line faces for 0–10 |
| `pain-icons.js` | The "Spreads to" pictogram |
| `pain.css` | All styles of this screen (colour variables at the top) |

## Layout

- **Landscape (1280×800):** the front/back figures on the left at **full height**. On the right the hint with the three symptom tiles *or* the spot editor, with the summary (chips, Undo, Start over, Review & send) underneath. No scrolling.
- **Phone / portrait:** figures, then the hint and the three symptom tiles in one row, then the summary bar (sticky at the bottom). The figure height is what's left after the tiles and the bar, so the tiles are visible without scrolling at 390×844. The spot editor opens as a bottom sheet.

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
    radiatesTo: [{ view, drawId, region, x, y }]
  }],
  symptoms: ["nauseous", "dizzy"],  // general symptoms, toggled with the tiles
  selectedSpotId,
  mode: "idle" | "radiating",
  history,                       // snapshots for Undo
  closeup, zoom, hint, highlightMissing   // screen state
}
```

Every change goes through a function such as `addSpot`, `setLevel`, `moveSpot`, `removeSpot`, `addRadiation`, `removeRadiation`, `toggleSymptom`, `reset` or `undo`. Changes to the answers push an Undo snapshot. Dragging the slider counts as one step. Then the screen re-renders once.

## Making a spot

Tap a body part to open the close-up, then tap the exact place. A spot is created and its editor opens.

**Spot editor** (right panel while a spot is selected): number + region, the pain level, **Spreads to →**, **Delete spot** (asks first), and **Done**. Tapping a marker or a chip selects that spot. In the close-up, markers can be **dragged** to move them; the region updates on drop, and a drop outside the body puts the marker back.

## General symptoms (nauseous, anxious, dizzy)

With no spot selected, the right panel shows "Tap where it hurts" and, under it, **Or how do you feel?** with three square toggle tiles (icon on top, label below). A selected tile is inverted with an accent border and a check mark (`aria-pressed`). Each selected symptom also gets a chip in the summary bar; tapping the chip unselects it. Toggles can be undone, and **Start over** clears them too.

While a spot is selected, the spot editor replaces the tiles. The selection is kept, and the tiles come back after **Done**.

## Radiating pain ("Spreads to →")

1. In the spot editor, press **Spreads to →** (arrow pictogram).
2. Tap one or more places (whole body or close-up), then press **Done**.
3. Each target is drawn as a dashed arrow in the spot's level colour, with a small open circle at the target.

**Limitation:** targets must be on the **same view** (front or back) as the spot where the pain starts. Tapping the other view shows "Radiation must stay on the same side of the body" and adds nothing. Targets are rough places, not exact points.

## The left/right rule

**Everything stored, sent or spoken uses the PATIENT's left and right.**

- The shapes are drawn once. Their `drawId`s describe the **front** view, where the patient faces you, so `right_upper_arm` is on the **left of the screen**.
- On the **back** view you see the patient's back, so the shape on the left of the screen is their **left** side.
- `toPatientRegion(drawId, view)` in `body-regions.js` converts it and renames back-view parts (back of head, upper/lower back, buttocks, back of hand).

Never send a `drawId` to the nurse. Voice assistance (`js/voice.js`) also says the converted name: tapping the screen-left leg on the back view says "Left lower leg".

## Voice assistance

When voice assistance is on (header toggle or `?voice=1`), the screen says the region that was tapped, a symptom's name when its tile is selected (nothing when unselected), "Left thigh. Pain level for this spot" after placing a spot, "Pain level 4" for a face (for the slider only once the finger is lifted), the places the pain spreads to, and a short summary when the review opens.

## What is sent to the nurse

Always **one** notification per Review & send:

- **Spots (with or without symptoms):** `type: "pain"`, as below, with `symptoms` (empty array if none).
- **Only symptoms, no spots:** `type: "symptom"` with `{ symptoms: ["nauseous", "dizzy"] }`, shown on the dashboard as "General symptoms".

```js
ctx.sendNotification({
  type: "pain",
  details: {
    maxLevel: 8,                                   // highest spot level
    spots: [{
      number: 2, view: "back", region: "lower_back",
      regionLabel: "Lower back (back)",            // English, patient perspective
      x: 120, y: 220.3, level: 6,
      radiatesTo: [
        { view: "back", region: "right_thigh", regionLabel: "Right thigh (back)", x: 145.2, y: 340.8 }
      ]
    }],
    symptoms: ["nauseous"]                         // general symptoms, [] if none
  }
});
ctx.navigate("#/sent");
```

**Review & send** works when there is at least one spot and **every spot has a level**, or when there are no spots and at least one symptom. Pressed too early, it flags the spots without a level (dashed outline) and selects the first one. The 10-second duplicate protection in `js/notifications.js` still applies.

The nurse dashboard (`js/nurse.js`, `painDetails()`) shows it as:

```
Pain — Worst pain: 8/10                       [HIGH PAIN badge for 7 or more]
 1 · Head (front)        8/10
 2 · Lower back (back)   6/10
     → spreads to right thigh, right lower leg
 Also feels: nauseous                          [only if symptoms were sent]
```

Older notifications with sensations read `8/10 · Sharp / stabbing`. Older ones without `symptoms` look as before.

## How to add or change a body region

1. In `body-regions.js`, add `{ drawId, box, path }` to `REGIONS`. Name the `drawId` as seen on the **front** view (`right_…` = left of the screen).
2. If it has a special name on the back, add it to `BACK_NAMES`.
3. Add `"pain.region.<id>"` for every patient-perspective id it can produce, in all languages.

## Test checklist

Run `python -m http.server 8000` and open `http://localhost:8000/#/pain`, with `nurse.html` in another browser.

- Head on the front view, tap in the close-up, choose 8, press Done.
- Lower back on the back view, choose 6, **Spreads to →**, tap the right thigh and right lower leg, Done. Arrows are visible.
- While "spreading" from a back spot, tap the front view: a hint appears and nothing is added.
- A spot without a level blocks Review & send, and the flags appear.
- Undo every kind of action. Move a marker in the close-up: the region updates.
- On the **back** view, a spot on the left of the screen arrives as `left_…` (and is spoken as "Left …").
- The three symptom tiles are visible straight away. Only symptoms -> the nurse sees "General symptoms". A spot + a symptom -> one pain card with "Also feels: …".
- A spot without a level still blocks sending, even with a symptom selected.
- Selecting a spot hides the tiles; Done brings them back with the same selection.
- `#/symptoms` redirects to `#/pain`.
- 1280×800 fits without scrolling; at 390×844 the tiles are visible above the sticky bar.
