/*
  symptoms.js — general symptoms that are NOT tied to a place on the body,
  so no body map and no pain level:

    🤢 Nauseous    😰 Anxious    Dizzy (drawn SVG, 😵 as text fallback)

  They are chosen directly on the pain screen (#/pain, right panel), next
  to the body figures, and sent together with the pain spots. The old
  #/symptoms screen redirects to #/pain (js/router.js).

  This file only holds what the pain screen reuses: the list, the square
  toggle tile and its stylesheet. No urgency or diagnosis is derived from
  the choice: the nurse decides.

  What is sent (by modules/pain/pain.js):
    only symptoms -> "symptom" with { symptoms: ["nauseous", "dizzy"] }
    with spots    -> "pain" with { ..., symptoms: ["nauseous"] }

  To ADD a symptom: add { id, icon } to SYMPTOMS and "symptom.<id>" to every
  language in js/strings.js (the nurse dashboard uses the same key).
*/

import { el } from "../../js/ui.js";

/** A 5-pointed star centred on (cx, cy), as an SVG path. */
function starPath(cx, cy, outer = 4.4, inner = 1.9) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

/**
 * Dizzy, drawn in code (64 × 64): a yellow emoji-style face with eyes
 * looking in different directions and a wavy mouth, under a tilted orbit
 * with three small stars. Sized in symptoms.css to match the emoji.
 */
const ORBIT = { cx: 32, cy: 10.5, rx: 21, ry: 4.6, tilt: -8 };
const DIZZY_STARS = [
  { at: 195, fill: "#2f7fd8" },   // blue, left
  { at: 95,  fill: "#e0433a" },   // red, front
  { at: 335, fill: "#2fa84f" },   // green, right
].map(({ at, fill }) => {
  const t = (at * Math.PI) / 180;
  const tilt = (ORBIT.tilt * Math.PI) / 180;
  const x = ORBIT.rx * Math.cos(t);
  const y = ORBIT.ry * Math.sin(t);
  const cx = ORBIT.cx + x * Math.cos(tilt) - y * Math.sin(tilt);
  const cy = ORBIT.cy + x * Math.sin(tilt) + y * Math.cos(tilt);
  return `<path d="${starPath(cx, cy)}" fill="${fill}" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round"/>`;
}).join("");

const DIZZY_SVG = `<svg class="symptom-svg" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
  <!-- the orbit gets a thin white outline so it also reads on a selected (black) tile -->
  <circle cx="32" cy="37" r="25.5" fill="#FFCC33" stroke="#E0A21B" stroke-width="2.5"/>
  <circle cx="23" cy="33" r="6" fill="#ffffff" stroke="#5a3a00" stroke-width="2"/>
  <circle cx="41" cy="33" r="6" fill="#ffffff" stroke="#5a3a00" stroke-width="2"/>
  <circle cx="20.6" cy="30.4" r="3.1" fill="#3a2a10"/>
  <circle cx="43.6" cy="35.8" r="3.1" fill="#3a2a10"/>
  <path d="M22 49q3-4 5 0t5 0t5 0t5 0" fill="none" stroke="#5a3a00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="rotate(${ORBIT.tilt} ${ORBIT.cx} ${ORBIT.cy})" fill="none">
    <ellipse cx="${ORBIT.cx}" cy="${ORBIT.cy}" rx="${ORBIT.rx}" ry="${ORBIT.ry}" stroke="#ffffff" stroke-width="3.6"/>
    <ellipse cx="${ORBIT.cx}" cy="${ORBIT.cy}" rx="${ORBIT.rx}" ry="${ORBIT.ry}" stroke="#3a2a10" stroke-width="1.8"/>
  </g>
  ${DIZZY_STARS}
</svg>`;

/*
  icon: emoji, used where only text can go (confirmation screen, "Your
        requests" strip, browser notifications).
  svg:  (optional) drawn icon used on the pain screen instead of the emoji.
*/
export const SYMPTOMS = [
  { id: "nauseous", icon: "🤢" },
  { id: "anxious",  icon: "😰" },
  { id: "dizzy",    icon: "😵", svg: DIZZY_SVG },
];

// Shown on the confirmation screen when more than one symptom is sent.
export const GENERAL_ICON = "🩺";

/** Text (emoji) icon of a symptom. */
export function symptomIcon(id) {
  return SYMPTOMS.find((symptom) => symptom.id === id)?.icon ?? GENERAL_ICON;
}

/** The icon to put inside an `.icon` span: the drawn SVG if there is one, else the emoji. */
export function symptomIconContent(id) {
  const symptom = SYMPTOMS.find((s) => s.id === id);
  if (!symptom?.svg) return symptomIcon(id);
  const template = document.createElement("template");
  template.innerHTML = symptom.svg.trim();
  return template.content.firstChild;
}

/** The chosen ids in the fixed SYMPTOMS order (unknown ids are dropped). */
export function sortSymptoms(ids) {
  return SYMPTOMS.map((symptom) => symptom.id).filter((id) => ids.includes(id));
}

/** Load symptoms.css once (relative to this file, so it works on any URL). */
export function loadSymptomStyles() {
  const href = new URL("./symptoms.css", import.meta.url).href;
  let link = document.querySelector(`link[href="${href}"]`);
  if (!link) {
    link = el("link", { rel: "stylesheet", href });
    document.head.append(link);
  }
  return link;
}

/**
 * One big square toggle tile: icon on top, label below, a check mark in the
 * corner when selected. Set `aria-pressed` to show the selection.
 */
export function createSymptomTile(symptom, { t, onClick, focusKey }) {
  const label = t(`symptom.${symptom.id}`);
  return el("button", {
    type: "button",
    class: "tile symptom-tile",
    "aria-label": label,
    "aria-pressed": "false",
    "data-symptom": symptom.id,
    "data-focus-key": focusKey,
    onClick,
  }, [
    el("span", { class: "icon tile-icon", "aria-hidden": "true" }, [symptomIconContent(symptom.id)]),
    el("span", { class: "tile-label" }, [label]),
    el("span", { class: "symptom-check", "aria-hidden": "true" }, ["✓"]),
  ]);
}
