/*
  summary-bar.js — the bottom bar of the pain screen (same box as before).

    [1 Head · 8/10] [2 Right hand · ?/10] …   Undo   Start over   Review & send

  Landscape: it sits under the spot editor in the right column (pain.css),
  so the body figures get the full height. Narrow: sticky at the bottom.

  - Spot chips wrap (landscape) or scroll sideways (narrow); tapping one
    selects that spot.
    A chip without a level shows "?/10" in a warning style.
  - "Review & send" works once there is at least one spot and every spot
    has a level. Before that it LOOKS disabled (aria-disabled), and tapping
    it flags the spots that still need a level and selects the first.

  createSummaryBar() returns { el, update(state) }.
*/

import { el } from "../../js/ui.js";
import { regionName } from "./body-regions.js";
import { markerSvg, spotDescription } from "./body-map.js";

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
      else store.setHint("pain.noSpots");
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

  function update(state) {
    chips.replaceChildren(...(state.spots.length
      ? state.spots.map((spot) => chip(spot, state))
      : [el("li", { class: "pain-chips-empty" }, [t("pain.noSpots")])]));
    undoButton.disabled = state.history.length === 0;
    startOverButton.disabled = state.spots.length === 0;
    reviewButton.setAttribute("aria-disabled", String(!store.canReview()));
  }

  return { el: bar, update };
}
