/*
  food-drink.js — screen #/food-drink: two big tiles.

    💧 Water -> sends notification "drink" with { item: "water" }
    🍞 Food  -> goes to #/food (see food.js)
*/

import { createScreen, createTile, createTileGrid } from "../../js/ui.js";

export function render(container, ctx) {
  const { root, body } = createScreen(ctx, { title: ctx.t("foodDrink.title") });
  const grid = createTileGrid("pair");

  grid.append(
    createTile({
      icon: "💧",
      label: ctx.t("drink.water"),
      accent: "water",
      onClick: () => {
        ctx.sendNotification({ type: "drink", details: { item: "water" }, icon: "💧" });
        ctx.navigate("#/sent");
      },
    }),
    createTile({
      icon: "🍞",
      label: ctx.t("foodDrink.food"),
      accent: "food",
      onClick: () => ctx.navigate("#/food"),
    })
  );

  body.append(grid);
  container.append(root);
}
