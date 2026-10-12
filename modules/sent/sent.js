/*
  sent.js — confirmation screen shown after every request (#/sent).

  Shows ✅ + the icon of what was asked + "The nurse has been notified".
  If the same request was already sent less than 10 s ago, it shows
  "Already sent, the nurse is on the way" instead.
  Goes back to home automatically after 6 seconds (visible countdown).
*/

import { el } from "../../js/ui.js";

const AUTO_RETURN_SECONDS = 6;

let timer = null;

export function render(container, ctx) {
  const result = ctx.getLastResult();          // null if the page was reloaded on #/sent
  const message = result && result.duplicate
    ? ctx.t("sent.alreadySent")
    : ctx.t("sent.notified");

  let secondsLeft = AUTO_RETURN_SECONDS;
  const countdown = el("p", { class: "sent-countdown", "aria-live": "polite" }, [
    ctx.t("sent.countdown", { s: secondsLeft }),
  ]);

  const backLabel = ctx.t("sent.backToStart");
  container.append(
    el("section", { class: "sent" }, [
      el("div", { class: "sent-icons icon", "aria-hidden": "true" }, [
        el("span", {}, ["✅"]),
        result ? el("span", {}, [result.icon]) : null,
      ]),
      el("h1", { class: "sent-message", role: "status" }, [message]),
      el("button", {
        class: "big-button",
        type: "button",
        "aria-label": backLabel,
        onClick: () => ctx.navigate("#/home"),
      }, [backLabel]),
      countdown,
    ])
  );

  timer = setInterval(() => {
    secondsLeft -= 1;
    if (secondsLeft <= 0) {
      ctx.navigate("#/home");
    } else {
      countdown.textContent = ctx.t("sent.countdown", { s: secondsLeft });
    }
  }, 1000);
}

export function cleanup() {
  clearInterval(timer);
  timer = null;
}
