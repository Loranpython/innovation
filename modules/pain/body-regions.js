/*
  body-regions.js — the clickable body parts of the pain body map.

  Ported from the teammate's Lovable prototype (body-map.tsx).
  Drawing box: 240 × 580 (VIEWBOX). Each region has:
    drawId  id of the DRAWN shape (see the left/right rule below)
    path    SVG path of the shape
    box     [x, y, width, height]: the area the close-up zooms to

  ┌──────────────────────── LEFT / RIGHT — IMPORTANT ────────────────────────┐
  │ The shapes are drawn ONCE and used for both the front and the back view. │
  │ Their drawIds describe the FRONT view: the figure faces you, so          │
  │ "right_upper_arm" is drawn on the LEFT of the screen (= patient's right).│
  │                                                                          │
  │ On the BACK view we look at the patient's back, so the shape on the left │
  │ of the screen is the patient's LEFT side. toPatientRegion() swaps it.    │
  │                                                                          │
  │ Everything we store or send uses PATIENT-PERSPECTIVE ids from            │
  │ toPatientRegion(). Never send a drawId to the nurse.                     │
  └──────────────────────────────────────────────────────────────────────────┘

  Names: every patient-perspective id has a translation "pain.region.<id>"
  in js/strings.js (en, nl, no).
*/

import { STRINGS } from "../../js/strings.js";

export const VIEWBOX = [0, 0, 240, 580];

export const REGIONS = [
  { drawId: "head", box: [76, 5, 88, 100], path: "M120 15C99 15 90 29 92 48C89 46 88 51 91 58C92 62 95 63 96 63C99 77 109 85 120 85C131 85 141 77 144 63C145 63 148 62 149 58C152 51 151 46 148 48C150 29 141 15 120 15Z" },
  { drawId: "neck", box: [80, 72, 80, 61], path: "M105 80C107 94 104 101 94 107Q120 121 146 107C136 101 133 94 135 80Q120 90 105 80Z" },
  { drawId: "chest", box: [64, 97, 112, 106], path: "M94 107C84 109 76 113 74 124C74 143 80 162 82 180Q120 193 158 180C160 162 166 143 166 124C164 113 156 109 146 107Q120 121 94 107Z" },
  { drawId: "abdomen", box: [67, 168, 106, 110], path: "M82 180Q120 193 158 180C158 196 151 210 153 222C154 234 157 244 158 254Q120 267 82 254C83 244 86 234 87 222C89 210 82 196 82 180Z" },
  { drawId: "pelvis", box: [62, 242, 116, 89], path: "M82 254Q120 267 158 254C162 264 166 272 165 283C164 294 151 303 141 305C132 305 128 290 120 290C112 290 108 305 99 305C89 303 76 294 75 283C74 272 78 264 82 254Z" },
  { drawId: "right_upper_arm", box: [30, 108, 69, 112], path: "M74 124C65 115 56 121 53 134C47 154 46 181 43 200Q51 209 62 205C66 185 77 165 80 145Q82 133 74 124Z" },
  { drawId: "left_upper_arm", box: [141, 108, 69, 112], path: "M166 124C175 115 184 121 187 134C193 154 194 181 197 200Q189 209 178 205C174 185 163 165 160 145Q158 133 166 124Z" },
  { drawId: "right_forearm", box: [19, 186, 60, 100], path: "M43 200Q51 209 62 205C63 224 50 248 48 273Q39 277 32 269C36 246 35 225 43 200Z" },
  { drawId: "left_forearm", box: [161, 186, 60, 100], path: "M197 200Q189 209 178 205C177 224 190 248 192 273Q201 277 208 269C204 246 205 225 197 200Z" },
  { drawId: "right_hand", box: [3, 258, 65, 79], path: "M32 269 L48 273 L51 289 Q52 302 47 300 L43 288 L41 316 Q37 322 35 316 L35 297 L30 321 Q26 325 25 318 L27 296 L22 315 Q18 318 18 311 L21 291 L16 301 Q12 303 13 297 L23 278Z" },
  { drawId: "left_hand", box: [172, 258, 65, 79], path: "M208 269 L192 273 L189 289 Q188 302 193 300 L197 288 L199 316 Q203 322 205 316 L205 297 L210 321 Q214 325 215 318 L213 296 L218 315 Q222 318 222 311 L219 291 L224 301 Q228 303 227 297 L217 278Z" },
  { drawId: "right_thigh", box: [59, 273, 70, 148], path: "M75 283C76 294 89 303 99 305C108 305 112 290 120 290C117 326 115 370 111 407Q96 416 80 407C81 387 73 364 72 341C71 319 71 299 75 283Z" },
  { drawId: "left_thigh", box: [111, 273, 70, 148], path: "M165 283C164 294 151 303 141 305C132 305 128 290 120 290C123 326 125 370 129 407Q144 416 160 407C159 387 167 364 168 341C169 319 169 299 165 283Z" },
  { drawId: "right_lower_leg", box: [65, 396, 60, 139], path: "M80 407Q96 416 111 407C108 424 113 441 108 463C103 485 101 507 101 521Q92 525 84 521C85 498 79 477 79 455C77 434 82 423 80 407Z" },
  { drawId: "left_lower_leg", box: [115, 396, 60, 139], path: "M129 407Q144 416 160 407C158 423 163 434 161 455C161 477 155 498 156 521Q148 525 139 521C139 507 137 485 132 463C127 441 132 424 129 407Z" },
  { drawId: "right_foot", box: [59, 496, 72, 98], path: "M85 521C82 530 80 540 79 549L78 555L77 560Q79 566 83 561L84 555L84 561Q87 567 90 560L91 554L91 562Q94 568 97 560L98 555L98 563Q101 569 104 560L105 555L105 564Q109 571 111 561L110 552C109 542 106 531 101 521Z" },
  { drawId: "left_foot", box: [110, 496, 72, 98], path: "M155 521C158 530 160 540 161 549L162 555L163 560Q161 566 157 561L156 555L156 561Q153 567 150 560L149 554L149 562Q146 568 143 560L142 555L142 563Q139 569 136 560L135 555L135 564Q131 571 129 561L130 552C131 542 134 531 139 521Z" },
];

/** Face details: eyes, nose and mouth on the front; hairline on the back. */
export const FACE_DETAILS = {
  front: "M109 45h2 M129 45h2 M119 49v9l3 1 M112 69q8 4 16 0",
  back: "M99 38q21-16 42 0",
};

// Central body parts have their own name on the back view.
const BACK_NAMES = {
  head: "back_of_head",
  neck: "back_of_neck",
  chest: "upper_back",
  abdomen: "lower_back",
  pelvis: "buttocks",
};

/**
 * Turn the id of a DRAWN shape into the PATIENT-PERSPECTIVE region id.
 *
 *   FRONT view: the patient faces us. Their right side is on the LEFT of the
 *               screen, which is exactly how the shapes are named.
 *               -> drawId is already correct.
 *   BACK view:  we see the patient's back. Their right side is on the RIGHT
 *               of the screen, so left and right swap. Central parts get
 *               their back names, and hands become "back of hand".
 *
 *   toPatientRegion("right_thigh", "front") -> "right_thigh"
 *   toPatientRegion("right_thigh", "back")  -> "left_thigh"
 *   toPatientRegion("right_hand",  "back")  -> "left_back_of_hand"
 *   toPatientRegion("chest",       "back")  -> "upper_back"
 */
export function toPatientRegion(drawId, view) {
  if (view === "front") return drawId;
  if (BACK_NAMES[drawId]) return BACK_NAMES[drawId];

  const [, side, part] = drawId.match(/^(left|right)_(.+)$/);
  const patientSide = side === "left" ? "right" : "left";
  return `${patientSide}_${part === "hand" ? "back_of_hand" : part}`;
}

export function findRegion(drawId) {
  return REGIONS.find((region) => region.drawId === drawId);
}

// Region ids that exist in BOTH views (e.g. "left_thigh") need "(front)" or
// "(back)" after their name, otherwise the nurse can't tell them apart.
const FRONT_IDS = new Set(REGIONS.map((r) => toPatientRegion(r.drawId, "front")));
const BACK_IDS = new Set(REGIONS.map((r) => toPatientRegion(r.drawId, "back")));
export function needsViewSuffix(regionId) {
  return FRONT_IDS.has(regionId) && BACK_IDS.has(regionId);
}

/** Translated name for the screen, e.g. "Right thigh" or "Rechterdij". */
export function regionName(regionId, t) {
  return t(`pain.region.${regionId}`);
}

/**
 * Readable ENGLISH area for the notification, e.g. "Right thigh (back)".
 * Always English so every nurse and every log reads the same text.
 */
export function englishArea(regionId, view) {
  const name = STRINGS.en[`pain.region.${regionId}`] ?? regionId;
  return needsViewSuffix(regionId) ? `${name} (${view})` : name;
}
