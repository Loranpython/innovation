/*
  food.js — screen #/food: one tile per item in food-items.js.
  Tapping a tile sends notification "food" with { item: "<id>" }.
  The Back button returns to #/food-drink.
*/

import { createScreen, createTile, createTileGrid } from "../../js/ui.js";
import { FOOD_ITEMS } from "./food-items.js";

export function render(container, ctx) {
  const { root, body } = createScreen(ctx, {
    title: ctx.t("food.title"),
    backTo: "#/food-drink",
  });
  const grid = createTileGrid("many");

  for (const item of FOOD_ITEMS) {
    grid.append(createTile({
      icon: item.icon,
      label: ctx.t(`food.${item.id}`),
      accent: "food",
      onClick: () => {
        ctx.sendNotification({ type: "food", details: { item: item.id }, icon: item.icon });
        ctx.navigate("#/sent");
      },
    }));
  }

  body.append(grid);
  container.append(root);
}
