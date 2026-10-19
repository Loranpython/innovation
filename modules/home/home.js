/*
  home.js — the start screen: 4 big square tiles in a 2 × 2 grid.

    🚻 Toilet        -> #/toilet      (sends the request immediately)
    🍽️ Food & drink  -> #/food-drink
    😣 Pain / unwell -> #/pain   (with "Other symptoms" -> #/symptoms)
    🗣️ Speak         -> #/speech

  The icon is the main message (many patients cannot read the language),
  the label underneath is a help.

  Above the tiles: a low "Your requests" strip with the requests sent from
  this device and their live status (see js/request-status.js). It is only
  shown when there is something to show; the grid shrinks to make room.
*/

import { createTile, createTileGrid, el } from "../../js/ui.js";
import { getVisibleRequests, onRequestsChange } from "../../js/request-status.js";

const TILES = [
  { icon: "🚻", labelKey: "home.toilet",    accent: "toilet", route: "#/toilet" },
  { icon: "🍽️", labelKey: "home.foodDrink", accent: "food",   route: "#/food-drink" },
  { icon: "😣", labelKey: "home.pain",      accent: "pain",   route: "#/pain" },
  { icon: "🗣️", labelKey: "home.speech",    accent: "speech", route: "#/speech" },
];

const STATUS_KEYS = {
  open: "requests.open",
  acknowledged: "requests.acknowledged",
  resolved: "requests.resolved",
};

let stopListening = null;

export function render(container, ctx) {
  const grid = createTileGrid("2x2");
  for (const tile of TILES) {
    grid.append(createTile({
      icon: tile.icon,
      label: ctx.t(tile.labelKey),
      accent: tile.accent,
      onClick: () => ctx.navigate(tile.route),
    }));
  }

  const strip = el("ul", {
    class: "request-strip",
    "aria-label": ctx.t("requests.label"),
    "aria-live": "polite",
  });
  const section = el("section", { class: "home" }, [strip, grid]);
  container.append(section);

  function update() {
    const requests = getVisibleRequests();
    section.classList.toggle("has-requests", requests.length > 0);
    strip.replaceChildren(...requests.map((request) => requestChip(request, ctx)));
  }
  update();
  stopListening = onRequestsChange(update);
}

export function cleanup() {
  stopListening?.();
  stopListening = null;
}

/** One request: icon, time sent, status. */
function requestChip(request, ctx) {
  const time = new Date(request.createdAt).toLocaleTimeString(ctx.lang === "no" ? "nb" : ctx.lang, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const status = ctx.t(STATUS_KEYS[request.status]);
  return el("li", { class: "request-chip", "data-status": request.status }, [
    el("span", { class: "icon request-chip-icon", "aria-hidden": "true" }, [request.icon || "🔔"]),
    el("span", { class: "request-chip-time" }, [time]),
    el("span", { class: "request-chip-status" }, [status]),
  ]);
}
