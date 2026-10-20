/*
  summary-bar.js — the bottom bar of the pain screen (same box as before).

    [1 Head · 8/10] [2 Right hand · ?/10] [🤢 Nauseous] …   Undo   Start over   Review & send

  Landscape: it sits under the spot editor in the right column (pain.css),
  so the body figures get the full height. Narrow: sticky at the bottom.

  - Spot chips wrap (landscape) or scroll sideways (narrow); tapping one
    selects that spot.
    A chip without a level shows "?/10" in a warning style.
  - One chip per selected general symptom (icon + label); tapping it
    unselects that symptom.
  - "Review & send" works when every spot has a level (at least one spot),
    or when there are no spots and at least one symptom. Before that it
    LOOKS disabled (aria-disabled), and tapping it flags the spots that
    still need a level and selects the first.

  createSummaryBar() returns { el, update(state) }.
*/

import { el } from "../../js/ui.js";
import { regionName } from "./body-regions.js";
import { markerSvg, spotDescription } from "./body-map.js";
import { iconNode } from "./symptom-icons.js";

const UNDO_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" class="pain-tool-icon"><path d="M9 4L4 9l5 5 M4 9h11a5 5 0 0 1 0 10h-5"/></svg>`;

export function createSummaryBar({ t, store, onReview, onStartOver }) {
  const chips = el("ul", { class: "pain-chips", "aria-label": t("pain.reviewAreas") });

  const undoButton = el("button", {
    type: "button",
    class: "pain-undo",
    "aria-label": t("pain.undoAction"),
    "data-focus-key": "bar:undo",
    onClick: () => store.undo(),
  });
  undoButton.innerHTML = UNDO_ICON;
  undoButton.append(el("span", {}, [t("pain.undoAction")]));

  const startOverButton = el("button", {
    type: "button",
    class: "pain-start-over",
    "aria-label": t("pain.startOver"),
    "data-focus-key": "bar:startover",
    onClick: onStartOver,
  }, [t("pain.startOver")]);

  const reviewButton = el("button", {
    type: "button",
    class: "big-button big-button--send pain-review-button",
    "aria-label": t("pain.reviewSend"),
    "data-focus-key": "bar:review",
    onClick: () => {
      if (store.canReview()) onReview();
      else if (store.state.spots.length) store.flagMissingLevels();
      else store.setHint("pain.chooseFirst");
    },
  }, [t("pain.reviewSend")]);

  const bar = el("div", { class: "pain-summary" }, [
    chips,
    el("div", { class: "pain-summary-actions" }, [undoButton, startOverButton, reviewButton]),
  ]);

  function chip(spot, state) {
    const button = el("button", {
      type: "button",
      class: "pain-chip",
      "aria-label": spotDescription(spot, t),
      "aria-current": spot.id === state.selectedSpotId ? "true" : "false",
      "data-focus-key": `chip:${spot.id}`,
      onClick: () => store.select(spot.id),
    });
    button.classList.toggle("is-missing", spot.level === null);
    button.classList.toggle("is-flagged", state.highlightMissing && spot.level === null);
    button.innerHTML = markerSvg(spot, 28);
    button.append(el("span", { class: "pain-chip-text" }, [
      `${regionName(spot.region, t)} · `,
      el("strong", {}, [`${spot.level ?? "?"}/10`]),
    ]));
    return el("li", {}, [button]);
  }

  function symptomChip(id) {
    const label = t(`symptom.${id}`);
    return el("li", {}, [el("button", {
      type: "button",
      class: "pain-chip pain-chip--symptom",
      "aria-label": t("pain.removeSymptom", { symptom: label }),
      "data-focus-key": `chip:symptom:${id}`,
      onClick: () => store.toggleSymptom(id),
    }, [
      el("span", { class: "icon pain-chip-icon", "aria-hidden": "true" }, [iconNode(id)]),
      el("span", { class: "pain-chip-text" }, [label]),
      el("span", { class: "pain-target-x", "aria-hidden": "true" }, ["×"]),
    ])]);
  }

  function update(state) {
    chips.replaceChildren(...(store.isEmpty()
      ? [el("li", { class: "pain-chips-empty" }, [t("pain.noSpots")])]
      : [...state.spots.map((spot) => chip(spot, state)), ...state.symptoms.map(symptomChip)]));
    undoButton.disabled = state.history.length === 0;
    startOverButton.disabled = store.isEmpty();
    reviewButton.setAttribute("aria-disabled", String(!store.canReview()));
  }

  return { el: bar, update };
}
