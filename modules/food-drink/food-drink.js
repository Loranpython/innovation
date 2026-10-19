/*
  food-drink.js — screen #/food-drink: two big tiles.

    💧 Water -> sends notification "drink" with { item: "water" }.
               Never limited (only the normal 10 s double-tap protection):
               a thirsty patient must always be able to ask for water.
    🍽️ Food  -> sends a generic "food" request at once, with no choice of
               dish: the hospital brings food that fits the patient's diet.

  Food can be asked once per 30 minutes (food-cooldown.js). Pressing Food
  again within that time sends NOTHING: a large ✓ "Food already requested
  at 12:40" appears near the top for a few seconds (and is spoken when voice
  assistance is on). The 30 minutes only start after a confirmed ONLINE
  delivery, so an offline attempt never blocks the next try.
*/

import { createScreen, createTile, createTileGrid, el } from "../../js/ui.js";
import { speak } from "../../js/voice.js";
import { recentFoodRequest, rememberFoodRequest } from "./food-cooldown.js";

const NOTICE_MS = 5000;

let foodInFlight = false;      // a food request is being delivered right now
let noticeTimer = null;

export function render(container, ctx) {
  const { root, body } = createScreen(ctx, { title: ctx.t("foodDrink.title") });
  const grid = createTileGrid("pair");

  // "Food already requested": not a new request, so it must not look like "sent".
  const notice = el("div", { class: "already-notice", role: "status", "aria-live": "polite", hidden: true });

  function showAlreadyRequested(at) {
    const time = new Date(at).toLocaleTimeString(ctx.lang === "no" ? "nb" : ctx.lang, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const text = ctx.t("food.alreadyRequested");
    const when = ctx.t("food.requestedAt", { time });
    notice.replaceChildren(
      el("span", { class: "already-notice-mark", "aria-hidden": "true" }, ["✓"]),
      el("span", { class: "already-notice-text" }, [
        el("strong", {}, [text]),
        el("span", {}, [when]),
      ]),
    );
    notice.hidden = false;
    speak(`${text} ${when}`);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.hidden = true; }, NOTICE_MS);
  }

  function requestFood() {
    const recent = recentFoodRequest(ctx.room, ctx.patient);
    if (recent !== null) {
      showAlreadyRequested(recent);
      return;
    }
    if (foodInFlight) return;            // second tap while the first is being sent
    foodInFlight = true;
    const requestedAt = Date.now();
    ctx.sendNotification({ type: "food", details: {}, icon: "🍽️" })
      .then((outcome) => {
        // Only a request that really reached the nurse starts the 30 minutes.
        if (outcome.ok && outcome.mode === "online") rememberFoodRequest(ctx.room, ctx.patient, requestedAt);
      })
      .finally(() => { foodInFlight = false; });
    ctx.navigate("#/sent");
  }

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
      icon: "🍽️",
      label: ctx.t("foodDrink.food"),
      accent: "food",
      onClick: requestFood,
    })
  );

  body.append(grid);
  root.append(notice);
  container.append(root);
}

export function cleanup() {
  clearTimeout(noticeTimer);
  noticeTimer = null;
}
