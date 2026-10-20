/*
  symptoms.js — what a patient can feel, besides pain, on the pain screen.

  GENERAL symptoms (no place on the body), the 2 × 2 tiles in the right
  panel under "Or how do you feel?":

    Nauseous   Dizzy
    Cold       Hot

  The same four can also be the KIND of a body spot ("cold feet"), next
  to "pain" (see spot-editor.js). No urgency or diagnosis is derived from
  the choice: the nurse decides.

  Icons: symptom-icons.js (drawn SVG, one set). Labels: "symptom.<id>" in
  js/strings.js (the nurse dashboard uses the same keys; "symptom.anxious"
  stays there only for old notifications).

  To ADD a symptom: add its id to SYMPTOMS, an icon to symptom-icons.js and
  "symptom.<id>" to every language in js/strings.js.
*/

import { el } from "../../js/ui.js";
import { iconNode } from "./symptom-icons.js";

export const SYMPTOMS = ["nauseous", "dizzy", "cold", "hot"];

/** What a body spot can be. */
export const KINDS = ["pain", ...SYMPTOMS];

// Shown on the confirmation screen after a "symptom" request (text only).
export const SYMPTOM_SEND_ICON = "🩺";

export function kindLabel(kind, t) {
  return kind === "pain" ? t("pain.kindPain") : t(`symptom.${kind}`);
}

/** The chosen ids in the fixed SYMPTOMS order (unknown ids are dropped). */
export function sortSymptoms(ids) {
  return SYMPTOMS.filter((id) => ids.includes(id));
}

/**
 * One big square toggle tile: drawn icon on top, label below, a check mark
 * in the corner when selected. Set `aria-pressed` to show the selection.
 */
export function createKindTile(kind, { t, onClick, focusKey }) {
  const label = kindLabel(kind, t);
  return el("button", {
    type: "button",
    class: "tile symptom-tile",
    "aria-label": label,
    "aria-pressed": "false",
    "data-kind": kind,
    "data-focus-key": focusKey,
    onClick,
  }, [
    el("span", { class: "icon tile-icon", "aria-hidden": "true" }, [iconNode(kind)]),
    el("span", { class: "tile-label" }, [label]),
    el("span", { class: "symptom-check", "aria-hidden": "true" }, ["✓"]),
  ]);
}
