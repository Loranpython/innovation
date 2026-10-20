# Pain module (`#/pain`)

**Owner:** pain teammate. Only edit files in this folder, plus `pain.*` / `symptom.*` keys in `js/strings.js` and the pain/symptom formatters in `js/nurse.js` (`painDetails()`, `symptomDetails()`).

The patient places **spots** on a body map. Every spot has its **own**:

- location (front/back, region, exact point)
- **kind**: **pain**, or a symptom felt at that place: **nauseous, dizzy, cold, hot**
- for pain only: a **level** 0–10 (required) and optional **radiation** (places the pain spreads to)

So someone can report a headache of 7/10, lower-back pain of 6/10 that *spreads* down the right leg, and cold feet, all at once. The nurse sees the worst level first.

Symptoms that have no place on the body are chosen on the **same screen**: four big toggle tiles (**Nauseous, Dizzy, Cold, Hot**) under "Or how do you feel?" in the right panel. Spots and symptoms are sent **together** in one notification. The old `#/symptoms` route redirects here. *Anxious* is no longer offered; old notifications with it still show on the nurse dashboard.

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
| `body-map.js` | SVG figure: regions, numbered markers (pain) and icon markers (symptoms), radiation arrows, hit testing |
| `drag.js` | Moving markers in the close-up (pointer events) |
| `spot-editor.js` | Right panel: the general symptom tiles, or the editor of the selected spot |
| `level-picker.js` | Faces + square 0–10 slider, reusable for any spot |
| `symptoms.js` | The symptom list, the kinds a spot can have, the square toggle tile |
| `symptom-icons.js` | **The one icon set**: pain, nauseous, dizzy, cold, hot, drawn as SVG in code |
| `summary-bar.js` | Spot and symptom chips, Undo, Start over, Review & send |
| `review.js` | Review overlay + "Clear everything?" confirm |
| `pain-faces.js` | Line faces for 0–10 |
| `pain-icons.js` | The "Spreads to" pictogram |
| `pain.css` | All styles of this screen (colour variables at the top) |

## Icons

All five icons come from `symptom-icons.js`, drawn in one style: a round emoji-style face (same size and position, 2.5px edge in a darker shade), white eyes with a dark outline, and one small sign above or next to the head (pain flash, orbit with stars, snowflake, sweat drop + thermometer). The signs have a thin white outline so they also read on a selected (black) tile. No emoji are used for these icons. The icons are `aria-hidden`; the text label carries the meaning.

`/icons-preview.html` shows them at 40, 64 and 128 px and on black. The nurse dashboard uses the same icons next to the symptom words.

## Layout

- **Landscape (1280×800):** the front/back figures on the left at **full height**. On the right the four symptom tiles in a **2 × 2** grid *or* the spot editor, with the summary (chips, then Undo / Start over / Review & send on one row) underneath. No scrolling.
- **Phone / portrait:** figures, then the four symptom tiles in **one row**, then the summary bar (sticky at the bottom). 2 × 2 would leave too little height for the figures. The figure height is what's left after the tiles and the bar, so the tiles are visible without scrolling at 390×844. The spot editor opens as a bottom sheet.

## Data model (`pain-state.js`)

```js
state = {
  spots: [{
    id, number,                  // number 1, 2, 3… is shown on the marker
    view: "front" | "back",
    drawId,                      // internal: the drawn shape (never sent)
    region,                      // PATIENT-perspective id, e.g. "left_thigh"
    x, y,                        // point in the 240 × 580 drawing
    kind: null | "pain" | "nauseous" | "dizzy" | "cold" | "hot",   // null until chosen
    level: null | 0..10,         // pain only; null until chosen
    radiatesTo: [{ view, drawId, region, x, y }]                   // pain only
  }],
  symptoms: ["nauseous", "dizzy"],  // general symptoms, toggled with the tiles
  selectedSpotId,
  mode: "idle" | "radiating",
  history,                       // snapshots for Undo
  closeup, zoom, hint, highlightMissing   // screen state
}
```

A spot is **complete** when it has a kind, and a level if the kind is pain (`isSpotComplete()`).

Every change goes through a function such as `addSpot`, `setKind`, `setLevel`, `moveSpot`, `removeSpot`, `addRadiation`, `removeRadiation`, `toggleSymptom`, `reset` or `undo`. Changes to the answers push an Undo snapshot. Dragging the slider counts as one step. Then the screen re-renders once.

## Making a spot

Tap a body part to open the close-up, then tap the exact place. A spot is created and its editor opens.

**Spot editor** (right panel while a spot is selected), top to bottom: number + region and **Done**; the **pain level** (faces + 0–10 slider), always visible right away; **Or something else here?** with four big tiles **Nauseous, Dizzy, Cold, Hot**; **Spreads to →** (pain only) and **Delete spot**. Nothing is preselected. The kind is implied:

- **Choosing a level** (a face or the slider) makes it a pain spot.
- **Tapping a symptom tile** makes it that symptom (cold feet, a hot forehead, nausea at the stomach): no level, no radiation. The tile is inverted with a check mark, and the level picker is dimmed but still usable: choosing a level switches back to pain.
- Switching from pain to a symptom clears the level and the radiation; **Undo** brings them back.
- A spot with neither a level nor a symptom shows "?" and blocks Review & send.

The symptom tiles take the space left in the panel: one row of 4 when it is wide and low, 2 × 2 when there is height (a CSS container query). At 1280×800 the whole editor fits without scrolling; on a phone it is a bottom sheet that scrolls inside itself.

**Delete spot** (asks first) is always there. Tapping a marker or a chip selects that spot. In the close-up, markers can be **dragged** to move them; the region updates on drop, and a drop outside the body puts the marker back.

**Markers:** pain spots are a circle in the level colour with the number ("?" without a level). Symptom spots are the small symptom icon with a dark number badge. A spot without a kind is a grey "?".

## General symptoms (nauseous, dizzy, cold, hot)

With no spot selected, the right panel shows **Or how do you feel?** with four square toggle tiles (icon on top, label below). A selected tile is inverted with an accent border and a check mark (`aria-pressed`). Each selected symptom also gets a chip in the summary bar; tapping the chip unselects it. Toggles can be undone, and **Start over** clears them too.

While a spot is selected, the spot editor replaces the tiles. The selection is kept, and the tiles come back after **Done**.

## Radiating pain ("Spreads to →")

1. In the spot editor of a **pain** spot, press **Spreads to →** (arrow pictogram).
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

When voice assistance is on (header toggle or `?voice=1`), the screen says the region that was tapped, "Left thigh. Pain level for this spot" after placing a spot, a symptom when its tile is chosen ("Cold"), a general symptom's name when its tile is selected (nothing when unselected), "Pain level 4" for a face (for the slider only once the finger is lifted), the places the pain spreads to, and a short summary when the review opens.

## Summary bar and review

- **Chips:** pain spots "1 Head · 7/10" ("?/10" in a warning style without a level); symptom spots number + icon + region ("2 (cold icon) Right foot"); a spot without a kind "Hand · ?"; general symptoms icon + label (tap to unselect).
- **Review & send** works when there is at least one spot or general symptom and **every spot has a level or a symptom**. Pressed too early, it flags the incomplete spots (dashed outline), shows "Choose a pain level or a symptom at every spot", and selects the first one.
- **Review:** the figure (front/back toggle; it opens on the view of the worst pain spot, else of the first spot), one line per spot ("1 Head (Front) — 7/10", "2 Right foot (Front) — (icon) Cold"), and **How you feel** with the general symptoms. **Worst pain** only shows when there is a pain spot. Without any spot only the symptoms are shown.

## What is sent to the nurse

Always **one** notification per Review & send:

- **At least one pain spot:** `type: "pain"`, as below. Every spot has its `kind`; symptom spots have `level: null` and no radiation. `maxLevel` is the highest pain level. `symptoms` holds the general symptoms (`[]` if none).
- **No pain spot** (symptom spots and/or general symptoms): `type: "symptom"` with `{ symptoms: [...], spots: [{ number, view, region, regionLabel, kind, x, y }] }`.

```js
ctx.sendNotification({
  type: "pain",
  details: {
    maxLevel: 7,                                   // highest pain level
    spots: [{
      number: 1, view: "front", region: "head", regionLabel: "Head (front)",
      kind: "pain", x: 120, y: 55, level: 7,
      radiatesTo: [ /* { view, region, regionLabel, x, y } */ ]
    }, {
      number: 2, view: "front", region: "right_foot", regionLabel: "Right foot (front)",
      kind: "cold", x: 92, y: 560, level: null, radiatesTo: []
    }],
    symptoms: ["nauseous"]                         // general symptoms, [] if none
  }
});
ctx.navigate("#/sent");
```

The database needs no change (both types exist). The 10-second duplicate protection in `js/notifications.js` still applies. The confirmation screen shows 🩺 for a `symptom` request (it can only show text).

The nurse dashboard (`js/nurse.js`) shows it as (icons are the same drawn SVGs):

```
Pain — Worst pain: 7/10                       [HIGH PAIN badge for 7 or more]
 1 · Head (front)        7/10
 2 · Right foot (front)  (icon) Cold
 Also feels: (icon) nauseous                  [only if general symptoms were sent]

Symptoms
 1 · Head (front)        (icon) Hot
```

Older notifications still render: pain spots without `kind` are pain, `sensations` read `8/10 · Sharp / stabbing`, requests without `symptoms` look as before, and `anxious` keeps its label (no icon).

## How to add or change a body region

1. In `body-regions.js`, add `{ drawId, box, path }` to `REGIONS`. Name the `drawId` as seen on the **front** view (`right_…` = left of the screen).
2. If it has a special name on the back, add it to `BACK_NAMES`.
3. Add `"pain.region.<id>"` for every patient-perspective id it can produce, in all languages.

## How to add a symptom

1. Add its id to `SYMPTOMS` in `symptoms.js`.
2. Draw its icon in `symptom-icons.js` (same face and outline rules) and add it to `ICONS`. Check it in `/icons-preview.html`.
3. Add `"symptom.<id>"` to every language in `js/strings.js`.

## Test checklist

Run `python -m http.server 8000` and open `http://localhost:8000/#/pain`, with `nurse.html` in another browser.

- Head, tap in the close-up, choose 7, press Done. Right foot → **Cold**. Tap **Nauseous** in the right panel. Send: the nurse sees one pain card with "2 · Right foot (front) Cold" and "Also feels: nauseous".
- Head → **Hot** only: the nurse sees a "Symptoms" card with "Head (front) Hot".
- A spot with neither a level nor a symptom blocks Review & send, and the flags appear.
- Lower back on the back view, Pain 6, **Spreads to →** the right thigh. Switch it to **Cold**: the level and arrow disappear; **Undo** brings them back.
- On the **back** view, a spot on the left of the screen arrives as `left_…` (and is spoken as "Left …").
- 1280×800 fits without scrolling; at 390×844 the four tiles are visible above the sticky bar.
- `python tools/check_strings.py` (with the server running): every key exists in en, nl and no, and no raw key ("pain.kindPain") is visible on home, pain, spot editor, review or nurse in any language.
