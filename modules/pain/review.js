/*
  review.js — square overlays on the pain screen (not a new route):

    createOverlay(root)  host for one dialog at a time (Escape closes it)
    openReview(...)      "Check and send": worst pain + face, the figure with
                         the numbered markers and arrows (front/back toggle),
                         and one line per spot. Buttons: Change / Send to nurse.
    openConfirm(...)     "Clear everything?" Cancel / Clear

  The review keeps the layout of the earlier version; only the content
  changed from one level + one list to per-spot information.
*/

import { el } from "../../js/ui.js";
import { faceSvg } from "./pain-faces.js";
import { SENSATIONS } from "./sensation-icons.js";
import { regionName } from "./body-regions.js";
import { createBodyMap, fitMarkers, markerSvg } from "./body-map.js";
import { headIcon } from "./body-details.js";

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

/** One line in the review list: marker, region, level, sensations, spreads to. */
function spotItem(spot, t, viewLabel) {
  const item = el("li", { class: "pain-review-spot" });
  const marker = el("span", { class: "pain-review-marker" });
  marker.innerHTML = markerSvg(spot, 32);
  const sensations = el("ul", { class: "pain-review-sensations" }, spot.sensations.map((id) => {
    const li = el("li", {});
    li.innerHTML = SENSATIONS.find((s) => s.id === id)?.icon() ?? "";
    li.append(el("span", {}, [t(`pain.sensation.${id}`)]));
    return li;
  }));
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
        ` — ${spot.level}/10`,
      ]),
      spot.sensations.length ? sensations : null,
      spreads,
    ]),
  );
  return item;
}

export function openReview({ overlay, t, store, viewLabel, onSend, reviewView = "front" }) {
  const { spots } = store.state;
  const worst = store.maxLevel();
  const view = reviewView;

  const levelBlock = el("div", { class: "pain-review-level" }, [
    el("span", { class: "pain-review-worst" }, [t("pain.worstPainShort")]),
    el("span", { class: "pain-value" }, [el("strong", {}, [String(worst)]), el("span", {}, ["/10"])]),
  ]);
  levelBlock.insertAdjacentHTML("beforeend", faceSvg(worst));

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
      ]),
    ]),
    el("div", { class: "pain-dialog-actions" }, [
      dialogButton(t("pain.change"), "big-button", overlay.close),
      dialogButton(t("pain.sendToNurse"), "big-button big-button--send", onSend),
    ]),
  ]);
  fitMarkers(dialog);
}
