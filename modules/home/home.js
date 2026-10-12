/*
  home.js — the start screen: 4 big square tiles in a 2 × 2 grid.

    🚻 Toilet        -> #/toilet      (sends the request immediately)
    🍽️ Food & drink  -> #/food-drink
    😣 Pain          -> #/pain
    🗣️ Speak         -> #/speech

  The icon is the main message (many patients cannot read the language),
  the label underneath is a help.
*/

import { createTile, createTileGrid, el } from "../../js/ui.js";

const TILES = [
  { icon: "🚻", labelKey: "home.toilet",    accent: "toilet", route: "#/toilet" },
  { icon: "🍽️", labelKey: "home.foodDrink", accent: "food",   route: "#/food-drink" },
  { icon: "😣", labelKey: "home.pain",      accent: "pain",   route: "#/pain" },
  { icon: "🗣️", labelKey: "home.speech",    accent: "speech", route: "#/speech" },
];

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
  container.append(el("section", { class: "home" }, [grid]));
}
