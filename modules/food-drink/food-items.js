/*
  food-items.js — the list of food the patient can ask for (#/food).

  To ADD or REMOVE a food item, edit this list only:
    id:   short English id, sent to the nurse as details.item
    icon: emoji shown on the tile

  The label comes from strings.js with the key "food.<id>",
  so for a new item also add e.g. "food.pasta" to every language there.
*/

export const FOOD_ITEMS = [
  { id: "sandwich",  icon: "🥪" },
  { id: "yoghurt",   icon: "🥣" },
  { id: "fruit",     icon: "🍎" },
  { id: "soup",      icon: "🍲" },
  { id: "something", icon: "❓" },   // generic: the nurse decides
];
