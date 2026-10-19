/*
  symptoms.js — general symptoms that are NOT tied to a place on the body,
  so no body map and no pain level:

    🤢 Nauseous    😰 Anxious    😵 Dizzy

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

export const SYMPTOMS = [
  { id: "nauseous", icon: "🤢" },
  { id: "anxious",  icon: "😰" },
  { id: "dizzy",    icon: "😵" },
];

// Shown on the confirmation screen when more than one symptom is sent.
export const GENERAL_ICON = "🩺";

export function symptomIcon(id) {
  return SYMPTOMS.find((symptom) => symptom.id === id)?.icon ?? GENERAL_ICON;
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
    el("span", { class: "icon tile-icon", "aria-hidden": "true" }, [symptom.icon]),
    el("span", { class: "tile-label" }, [label]),
    el("span", { class: "symptom-check", "aria-hidden": "true" }, ["✓"]),
  ]);
}
