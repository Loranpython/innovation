/*
  review.js — square overlays on the pain screen (not a new route):

    createOverlay(root)  host for one dialog at a time (Escape closes it)
    openReview(...)      "Check and send": worst pain + face (only with a pain
                         spot), the figure with the markers and arrows
                         (front/back toggle; opens on the worst pain spot,
                         else the first spot), one line per spot ("2 · Right
                         foot (Front) — Cold"), then "How you feel" with the
                         general symptoms (only if any). Without spots only
                         the symptoms are shown. Buttons: Change / Send.
    openConfirm(...)     "Clear everything?" Cancel / Clear

  The review keeps the layout of the earlier version; only the content
  changed from one level + one list to per-spot information.
*/

import { el } from "../../js/ui.js";
import { faceSvg } from "./pain-faces.js";
import { regionName } from "./body-regions.js";
import { createBodyMap, fitMarkers, markerSvg } from "./body-map.js";
import { headIcon } from "./body-details.js";
import { sortSymptoms } from "./symptoms.js";
import { iconNode } from "./symptom-icons.js";
import { kindLabel } from "./symptoms.js";

export function createOverlay(root) {
  let overlay = null;
  let opener = null;

  function close() {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    opener?.focus?.();
  }

  function open(className, labelId, children) {
    const previousOpener = overlay ? opener : document.activeElement;
    close();
    opener = previousOpener;
    const dialog = el("div", {
      class: `pain-dialog ${className}`,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": labelId,
    }, children);
    overlay = el("div", { class: "pain-overlay" }, [dialog]);
    overlay.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();          // don't also cancel modes behind the dialog
      close();
    });
    root.append(overlay);
    dialog.querySelector("button")?.focus();
    return dialog;
  }

  return { open, close, isOpen: () => Boolean(overlay) };
}

function dialogButton(label, className, onClick) {
  return el("button", { type: "button", class: className, "aria-label": label, onClick }, [label]);
}

export function openConfirm({ overlay, t, onConfirm }) {
  overlay.open("pain-dialog--confirm", "pain-confirm-title", [
    el("h2", { class: "pain-dialog-title", id: "pain-confirm-title" }, [t("pain.confirmTitle")]),
    el("div", { class: "pain-dialog-actions" }, [
      dialogButton(t("pain.cancel"), "big-button", overlay.close),
      dialogButton(t("pain.clear"), "big-button pain-danger", () => {
        overlay.close();
        onConfirm();
      }),
    ]),
  ]);
}

/** One line in the review list: marker, region, level or symptom, spreads to. */
function spotItem(spot, t, viewLabel) {
  const item = el("li", { class: "pain-review-spot" });
  const marker = el("span", { class: "pain-review-marker" });
  marker.innerHTML = markerSvg(spot, 32);
  const spreads = spot.radiatesTo.length
    ? el("p", { class: "pain-review-spreads" }, [
        `→ ${t("pain.spreadsTo")}: `,
        spot.radiatesTo.map((target) => regionName(target.region, t)).join(", "),
      ])
    : null;
  item.append(
    marker,
    el("div", { class: "pain-review-spot-body" }, [
      el("p", { class: "pain-review-spot-title" }, [
        el("strong", {}, [`${regionName(spot.region, t)} (${viewLabel(spot.view)})`]),
        " — ",
        spot.kind === "pain"
          ? `${spot.level}/10`
          : el("span", { class: "pain-review-kind" }, [
              el("span", { class: "icon", "aria-hidden": "true" }, [iconNode(spot.kind)]),
              kindLabel(spot.kind, t),
            ]),
      ]),
      spreads,
    ]),
  );
  return item;
}

/** "How you feel": the chosen general symptoms with their icons. */
function symptomsBlock(symptoms, t) {
  if (!symptoms.length) return null;
  return [
    el("h3", { class: "pain-review-heading" }, [t("pain.howYouFeel")]),
    el("ul", { class: "pain-review-symptoms" }, symptoms.map((id) => el("li", {}, [
      el("span", { class: "icon", "aria-hidden": "true" }, [iconNode(id)]),
      el("span", {}, [t(`symptom.${id}`)]),
    ]))),
  ];
}

/** The view to open on: the worst pain spot's, else the first spot's. */
function startView(store) {
  const pain = store.painSpots();
  const worst = pain.length ? pain.reduce((a, b) => (b.level > a.level ? b : a)) : store.state.spots[0];
  return worst?.view ?? "front";
}

export function openReview({ overlay, t, store, viewLabel, onSend, reviewView = null }) {
  const { spots } = store.state;
  const symptoms = sortSymptoms(store.state.symptoms);
  const worst = store.maxLevel();
  const view = reviewView ?? startView(store);

  if (!spots.length) {
    overlay.open("pain-dialog--review pain-dialog--symptoms", "pain-review-title", [
      el("h2", { class: "pain-dialog-title", id: "pain-review-title" }, [t("pain.reviewTitle")]),
      el("div", { class: "pain-review-info" }, symptomsBlock(symptoms, t)),
      el("div", { class: "pain-dialog-actions" }, [
        dialogButton(t("pain.change"), "big-button", overlay.close),
        dialogButton(t("pain.sendToNurse"), "big-button big-button--send", onSend),
      ]),
    ]);
    return;
  }

  let levelBlock = null;                 // "Worst pain" only with a pain spot
  if (worst !== null) {
    levelBlock = el("div", { class: "pain-review-level" }, [
      el("span", { class: "pain-review-worst" }, [t("pain.worstPainShort")]),
      el("span", { class: "pain-value" }, [el("strong", {}, [String(worst)]), el("span", {}, ["/10"])]),
    ]);
    levelBlock.insertAdjacentHTML("beforeend", faceSvg(worst));
  }

  const viewButtons = ["front", "back"].map((name) => {
    const button = el("button", {
      type: "button",
      class: "pain-review-view",
      "aria-pressed": String(name === view),
      "aria-label": viewLabel(name),
      onClick: () => {
        openReview({ overlay, t, store, viewLabel, onSend, reviewView: name });
        document.querySelector(".pain-review-view[aria-pressed='true']")?.focus();
      },
    }, [t(name === "front" ? "pain.viewFrontLabel" : "pain.viewBackLabel")]);
    button.insertAdjacentHTML("afterbegin", headIcon(name));
    return button;
  });

  const map = el("div", { class: "pain-review-map" }, [createBodyMap({ view, spots, t })]);

  const dialog = overlay.open("pain-dialog--review", "pain-review-title", [
    el("h2", { class: "pain-dialog-title", id: "pain-review-title" }, [t("pain.reviewTitle")]),
    el("div", { class: "pain-review-grid" }, [
      el("div", { class: "pain-review-figure" }, [
        el("div", { class: "pain-review-toggle", role: "group" }, viewButtons),
        map,
      ]),
      el("div", { class: "pain-review-info" }, [
        levelBlock,
        el("h3", { class: "pain-review-heading" }, [t("pain.reviewAreas")]),
        el("ol", { class: "pain-review-spots" }, spots.map((spot) => spotItem(spot, t, viewLabel))),
        symptomsBlock(symptoms, t),
      ].flat().filter(Boolean)),
    ]),
    el("div", { class: "pain-dialog-actions" }, [
      dialogButton(t("pain.change"), "big-button", overlay.close),
      dialogButton(t("pain.sendToNurse"), "big-button big-button--send", onSend),
    ]),
  ]);
  fitMarkers(dialog);
}
