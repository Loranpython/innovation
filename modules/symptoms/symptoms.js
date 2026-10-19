/*
  symptoms.js — screen #/symptoms: "How do you feel?"

  General symptoms that are NOT tied to a place on the body, so no body
  map and no pain level. Opened with the big "Other symptoms" button at the
  top of the pain screen (the Home tile is called "Pain / unwell").

    🤢 Nauseous    😰 Anxious    😵 Dizzy

  1. Tap one or more tiles (tap again to unselect).
  2. Review & send -> a short check: the chosen symptoms, Change / Send.
  3. Sends notification "symptom" with { symptoms: ["nauseous", "dizzy"] }.

  No urgency or diagnosis is derived from the choice: the nurse decides.

  To ADD a symptom: add { id, icon } to SYMPTOMS and "symptom.<id>" to every
  language in js/strings.js (the nurse dashboard uses the same key).
*/

import { createScreen, el } from "../../js/ui.js";
import { speak } from "../../js/voice.js";

export const SYMPTOMS = [
  { id: "nauseous", icon: "🤢" },
  { id: "anxious",  icon: "😰" },
  { id: "dizzy",    icon: "😵" },
];

// Shown on the confirmation screen when more than one symptom is sent.
const GENERAL_ICON = "🩺";

/** Load symptoms.css once (relative to this file, so it works on any URL). */
function loadStyles() {
  const href = new URL("./symptoms.css", import.meta.url).href;
  let link = document.querySelector(`link[href="${href}"]`);
  if (!link) {
    link = el("link", { rel: "stylesheet", href });
    document.head.append(link);
  }
  return link;
}

export function render(container, ctx) {
  const { t } = ctx;
  const stylesheet = loadStyles();
  const selected = new Set();
  const { root, body } = createScreen(ctx, {
    title: t("symptoms.title"),
    backTo: "#/pain",
    className: "symptoms",
  });

  // ---------------------------------------------------------------- choose
  const hint = el("p", { class: "symptoms-hint", role: "status" }, [t("symptoms.hint")]);

  const tiles = SYMPTOMS.map((symptom) => {
    const label = t(`symptom.${symptom.id}`);
    return el("button", {
      type: "button",
      class: "tile symptom-tile",
      "aria-label": label,
      "aria-pressed": "false",
      "data-symptom": symptom.id,
      onClick: () => toggle(symptom.id),
    }, [
      el("span", { class: "icon tile-icon", "aria-hidden": "true" }, [symptom.icon]),
      el("span", { class: "tile-label" }, [label]),
      el("span", { class: "symptom-check", "aria-hidden": "true" }, ["✓"]),
    ]);
  });

  const reviewButton = el("button", {
    type: "button",
    class: "big-button big-button--send symptoms-review-button",
    "aria-label": t("symptoms.reviewSend"),
    "aria-disabled": "true",
    onClick: () => {
      if (selected.size === 0) {
        hint.textContent = t("symptoms.chooseFirst");
        hint.classList.add("is-warning");
        speak(t("symptoms.chooseFirst"));
        return;
      }
      showReview();
    },
  }, [t("symptoms.reviewSend")]);

  const chooseView = el("div", { class: "symptoms-choose" }, [
    el("div", { class: "symptoms-grid" }, tiles),
    el("div", { class: "symptoms-bar" }, [hint, reviewButton]),
  ]);

  function toggle(id) {
    const label = t(`symptom.${id}`);
    if (selected.has(id)) {
      selected.delete(id);
      speak(t("voice.removed", { item: label }));
    } else {
      selected.add(id);
      speak(label);
    }
    for (const tile of tiles) {
      tile.setAttribute("aria-pressed", String(selected.has(tile.dataset.symptom)));
    }
    reviewButton.setAttribute("aria-disabled", String(selected.size === 0));
    hint.textContent = t("symptoms.hint");
    hint.classList.remove("is-warning");
  }

  // ---------------------------------------------------------------- review
  function chosen() {
    return SYMPTOMS.filter((symptom) => selected.has(symptom.id));   // fixed order
  }

  function showReview() {
    const list = chosen();
    speak(`${t("symptoms.reviewTitle")}: ${list.map((symptom) => t(`symptom.${symptom.id}`)).join(", ")}`);
    const review = el("section", {
      class: "symptoms-review",
      role: "region",
      "aria-labelledby": "symptoms-review-title",
    }, [
      el("h2", { class: "symptoms-review-title", id: "symptoms-review-title" }, [t("symptoms.reviewTitle")]),
      el("ul", { class: "symptoms-review-list" }, list.map((symptom) => el("li", {}, [
        el("span", { class: "icon", "aria-hidden": "true" }, [symptom.icon]),
        el("span", {}, [t(`symptom.${symptom.id}`)]),
      ]))),
      el("div", { class: "symptoms-review-actions" }, [
        el("button", {
          type: "button",
          class: "big-button",
          "aria-label": t("symptoms.change"),
          onClick: () => {
            body.replaceChildren(chooseView);
            reviewButton.focus();
          },
        }, [t("symptoms.change")]),
        el("button", {
          type: "button",
          class: "big-button big-button--send",
          "aria-label": t("symptoms.send"),
          onClick: (event) => {
            event.currentTarget.disabled = true;   // one tap = one request
            send(list);
          },
        }, [t("symptoms.send")]),
      ]),
    ]);
    body.replaceChildren(review);
    review.querySelector("button")?.focus();
  }

  function send(list) {
    ctx.sendNotification({
      type: "symptom",
      details: { symptoms: list.map((symptom) => symptom.id) },
      icon: list.length === 1 ? list[0].icon : GENERAL_ICON,
    });
    ctx.navigate("#/sent");
  }

  // Hide until symptoms.css is loaded, so the screen does not flash unstyled.
  if (!stylesheet.sheet) {
    root.style.visibility = "hidden";
    stylesheet.addEventListener("load", () => { root.style.visibility = ""; }, { once: true });
  }

  body.append(chooseView);
  container.append(root);
}
