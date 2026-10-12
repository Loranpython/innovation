/*
  pain.js — screen #/pain: "Where does it hurt, and how bad?"

  Parts of the screen:
    - body figure (body-figure.js): tap body parts to select / unselect
    - Front / Back toggle
    - list of selected body parts (tap one to remove it)
    - pain slider 0–10 with big number, face and colour bar (default 5)
    - Send button (disabled until at least one body part is selected)

  Sends:  ctx.sendNotification({ type: "pain",
            details: { regions: ["left_knee", ...], intensity: 7, view: "front" } })
  `regions` holds ids from body-figure.js; the nurse page translates them.
  Selections are kept when switching view; `view` is the view shown at send time.

  This module is self-contained: it loads its own pain.css.
*/

import { createScreen, el } from "../../js/ui.js";
import { createBodyFigure, updateBodyFigure } from "./body-figure.js";

const DEFAULT_INTENSITY = 5;

// Colour bar: one solid colour per value 0–10 (green -> red), no gradients.
const SCALE_COLOURS = [
  "#3a7d44", "#5b9a45", "#7fae46", "#a3bd45", "#c6c443", "#e0bd3e",
  "#e5a23a", "#e08636", "#d86a32", "#c94d2e", "#b3322b",
];

/** Face that matches the pain value. */
function faceFor(value) {
  if (value === 0) return "🙂";
  if (value <= 3) return "😐";
  if (value <= 6) return "😣";
  if (value <= 8) return "😖";
  return "😭";
}

/** Load pain.css once (relative to this file, so it works on any URL). */
function loadStyles() {
  const href = new URL("./pain.css", import.meta.url).href;
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

  // ---- state
  let view = "front";
  const selected = new Set();               // region ids, in tap order
  let intensity = DEFAULT_INTENSITY;
  const isSelected = (region) => selected.has(region);

  // ---- body figure
  const figureWrap = el("div", { class: "pain-figure" });
  let figure = null;
  function drawFigure() {
    figure = createBodyFigure({ view, t, isSelected, onToggle: toggleRegion });
    figureWrap.replaceChildren(figure);
  }

  function toggleRegion(region) {
    if (selected.has(region)) selected.delete(region);
    else selected.add(region);
    updateSelection();
  }

  // ---- front / back toggle
  const viewButtons = ["front", "back"].map((name) => {
    const label = t(name === "front" ? "pain.viewFront" : "pain.viewBack");
    return el("button", {
      type: "button",
      class: "pain-view-button",
      "data-view": name,
      "aria-label": label,
      onClick: () => {
        view = name;
        drawFigure();
        updateViewButtons();
      },
    }, [label]);
  });
  function updateViewButtons() {
    for (const button of viewButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.view === view));
    }
  }
  const viewToggle = el("div", {
    class: "pain-view-toggle",
    role: "group",
    "aria-label": t("pain.viewToggle"),
  }, viewButtons);

  // ---- selected list
  const selectionList = el("ul", { class: "pain-selection-list", "aria-live": "polite" });
  const clearButton = el("button", {
    type: "button",
    class: "pain-clear",
    "aria-label": t("pain.clearAria"),
    onClick: () => {
      selected.clear();
      updateSelection();
    },
  }, [t("pain.clear")]);

  // ---- intensity
  const valueNumber = el("span", { class: "pain-value-number" });
  const valueFace = el("span", { class: "pain-value-face icon", "aria-hidden": "true" });
  const scaleBar = el("div", { class: "pain-scale", "aria-hidden": "true" },
    SCALE_COLOURS.map((colour) => el("span", { class: "pain-scale-step", style: `--step-colour: ${colour}` }))
  );
  const slider = el("input", {
    type: "range",
    class: "pain-slider",
    min: "0",
    max: "10",
    step: "1",
    value: String(intensity),
    "aria-label": t("pain.intensityAria"),
    onInput: (event) => {
      intensity = Number(event.target.value);
      updateIntensity();
    },
  });

  // ---- send
  const sendButton = el("button", {
    type: "button",
    class: "big-button big-button--send pain-send",
    "aria-label": t("pain.sendAria"),
    onClick: () => {
      if (selected.size === 0) return;
      ctx.sendNotification({
        type: "pain",
        details: { regions: [...selected], intensity, view },
        icon: faceFor(intensity),
      });
      ctx.navigate("#/sent");
    },
  }, [t("pain.send")]);

  // ---- updates
  function updateSelection() {
    if (figure) updateBodyFigure(figure, isSelected);
    if (selected.size === 0) {
      selectionList.replaceChildren(el("li", { class: "pain-selection-empty" }, [t("pain.noneSelected")]));
    } else {
      selectionList.replaceChildren(...[...selected].map((region) => {
        const name = t(`region.${region}`);
        return el("li", {}, [
          el("button", {
            type: "button",
            class: "pain-chip",
            "aria-label": t("pain.removeRegion", { region: name }),
            onClick: () => toggleRegion(region),
          }, [name, el("span", { class: "pain-chip-x", "aria-hidden": "true" }, ["✕"])]),
        ]);
      }));
    }
    sendButton.disabled = selected.size === 0;
    clearButton.disabled = selected.size === 0;
  }

  function updateIntensity() {
    valueNumber.textContent = String(intensity);
    valueFace.textContent = faceFor(intensity);
    slider.setAttribute("aria-valuetext", `${intensity} / 10`);
    scaleBar.querySelectorAll(".pain-scale-step").forEach((step, index) => {
      step.classList.toggle("is-on", index <= intensity);
    });
  }

  // ---- layout
  const { root, body } = createScreen(ctx, { title: t("pain.title"), className: "pain" });
  body.append(
    el("div", { class: "pain-layout" }, [
      figureWrap,
      el("div", { class: "pain-panel" }, [
        viewToggle,
        el("div", { class: "pain-selection" }, [
          el("div", { class: "pain-panel-row" }, [
            el("h2", { class: "pain-heading" }, [t("pain.selected")]),
            clearButton,
          ]),
          selectionList,
        ]),
        el("div", { class: "pain-intensity" }, [
          el("h2", { class: "pain-heading" }, [t("pain.intensity")]),
          el("div", { class: "pain-value" }, [
            valueNumber,
            el("span", { class: "pain-value-max" }, ["/ 10"]),
            valueFace,
          ]),
          scaleBar,
          slider,
        ]),
        sendButton,
      ]),
    ])
  );

  // Hide until pain.css is loaded, so the screen does not flash unstyled.
  if (!stylesheet.sheet) {
    root.style.visibility = "hidden";
    stylesheet.addEventListener("load", () => { root.style.visibility = ""; }, { once: true });
  }

  drawFigure();
  updateViewButtons();
  updateSelection();
  updateIntensity();
  container.append(root);
}
