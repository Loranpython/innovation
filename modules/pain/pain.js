/*
  pain.js — screen #/pain: "Where does it hurt?"

  The patient:
    1. taps a body part (front or back) -> close-up -> taps the exact spot(s)
    2. chooses a pain level 0–10 (faces or slider)        (required)
    3. chooses what it feels like (sensation pictograms)   (optional)
    4. presses "Review & send", checks, and sends it to the nurse

  State lives in `state` inside render(); every change calls a small
  update function for the part of the screen that changed.

  This module is self-contained: it loads its own pain.css and only uses
  ctx + the shared helpers in js/ui.js.
*/

import { createScreen, el } from "../../js/ui.js";
import { createBodyMap } from "./body-map.js";
import { toPatientRegion, regionName } from "./body-regions.js";
import { faceSvg } from "./pain-faces.js";

const ZOOM_MIN = 1;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;
const FACE_VALUES = [0, 2, 4, 6, 8, 10];
const LEVELS = Array.from({ length: 11 }, (_, i) => i);   // 0..10

// Square toolbar icons (24 × 24, stroke-based like our pictograms).
const TOOL_ICONS = {
  whole: "M20 12H5 M11 6l-6 6 6 6",
  undo: "M9 4L4 9l5 5 M4 9h11a5 5 0 0 1 0 10h-5",
  zoomOut: "M5 12h14",
  zoomIn: "M5 12h14 M12 5v14",
  done: "M4 12l5 5L20 6",
};

function toolIcon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" class="pain-tool-icon"><path d="${TOOL_ICONS[name]}"/></svg>`;
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

  // ---------------------------------------------------------------- state
  const state = {
    level: null,       // 0–10, null = not chosen yet (the patient must choose)
    points: [],        // [{ view, drawId, region (patient id), x, y }]
    focus: null,       // close-up: { view, drawId } — null = whole body
    zoom: 1,
  };

  const viewLabel = (view) => t(view === "front" ? "pain.viewFront" : "pain.viewBack");

  // ---------------------------------------------------------------- body panel
  const bodyPanel = el("section", { class: "pain-box pain-body" });

  function openCloseup(view, drawId) {
    state.focus = { view, drawId };
    state.zoom = 1;
    renderBody(`${view}:${drawId}`);
  }

  function closeCloseup() {
    const { view, drawId } = state.focus;
    state.focus = null;
    renderBody(`${view}:${drawId}`);
  }

  function addPoint(drawId, x, y) {
    const { view } = state.focus;
    state.points.push({ view, drawId, region: toPatientRegion(drawId, view), x, y });
    renderBody();
    changed();
  }

  function undoPoint() {
    // Remove the last point on the side (front/back) of the close-up.
    const index = state.points.map((p) => p.view).lastIndexOf(state.focus.view);
    if (index >= 0) state.points.splice(index, 1);
    renderBody();
    changed();
  }

  function setZoom(zoom) {
    state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
    renderBody();
  }

  function toolButton(name, label, onClick, disabled = false) {
    const button = el("button", {
      type: "button",
      class: "pain-tool",
      "aria-label": label,
      title: label,
      "data-focus-key": `tool:${name}`,
      disabled,
      onClick,
    });
    button.innerHTML = toolIcon(name);
    return button;
  }

  /**
   * Redraw the body panel. Keeps keyboard focus on the same element
   * (data-focus-key), or on `focusKey` when given.
   */
  function renderBody(focusKey) {
    const keepKey = focusKey ?? document.activeElement?.dataset?.focusKey;

    if (state.focus) {
      const { view, drawId } = state.focus;
      const hasPointsOnSide = state.points.some((p) => p.view === view);
      const map = createBodyMap({
        view, points: state.points, focusDrawId: drawId, zoom: state.zoom, t, onPoint: addPoint,
      });
      bodyPanel.replaceChildren(
        el("div", { class: "pain-closeup" }, [
          el("div", { class: "pain-closeup-toolbar" }, [
            toolButton("whole", t("pain.wholeBody"), closeCloseup),
            el("div", { class: "pain-closeup-tools" }, [
              toolButton("undo", t("pain.undo"), undoPoint, !hasPointsOnSide),
              toolButton("zoomOut", t("pain.zoomOut"), () => setZoom(state.zoom - ZOOM_STEP), state.zoom <= ZOOM_MIN),
              toolButton("zoomIn", t("pain.zoomIn"), () => setZoom(state.zoom + ZOOM_STEP), state.zoom >= ZOOM_MAX),
              toolButton("done", t("pain.done"), closeCloseup),
            ]),
          ]),
          el("div", { class: "pain-closeup-map" }, [map]),
          el("p", { class: "pain-closeup-title" }, [
            el("strong", {}, [regionName(toPatientRegion(drawId, view), t)]),
            ` · ${viewLabel(view)} — ${t("pain.closeupHint")}`,
          ]),
        ])
      );
    } else {
      bodyPanel.replaceChildren(
        el("div", { class: "pain-views" }, ["front", "back"].map((view) =>
          el("div", { class: "pain-view" }, [
            el("h2", { class: "pain-view-label" }, [viewLabel(view)]),
            el("div", { class: "pain-view-map" }, [
              createBodyMap({
                view, points: state.points, t, onRegion: (drawId) => openCloseup(view, drawId),
              }),
            ]),
          ])
        )),
        el("p", { class: "pain-hint" }, [t("pain.bodyHint")]),
      );
    }

    // Give every region a focus key so focus survives a redraw.
    for (const svg of bodyPanel.querySelectorAll(".body-svg")) {
      const view = svg.classList.contains("body-svg--back") ? "back" : "front";
      for (const region of svg.querySelectorAll(".body-region")) {
        region.dataset.focusKey = `${view}:${region.dataset.drawId}`;
      }
    }
    if (keepKey) bodyPanel.querySelector(`[data-focus-key="${keepKey}"]`)?.focus();
  }

  // ---------------------------------------------------------------- pain level
  const valueOutput = el("output", { class: "pain-value", "aria-live": "polite" });

  const faceButtons = FACE_VALUES.map((value) => {
    const button = el("button", {
      type: "button",
      class: "pain-face",
      style: `--face-colour: var(--pain-scale-${value})`,
      "aria-label": t("pain.levelAria", { n: value }),
      onClick: () => setLevel(value),
    });
    button.innerHTML = faceSvg(value);
    button.append(el("span", { class: "pain-face-number" }, [String(value)]));
    return button;
  });

  // Slider: 11 square colour steps (no gradient) with a square thumb.
  // Built as an ARIA slider so the thumb lines up exactly with the steps
  // and the numbers below them.
  const thumb = el("span", { class: "pain-scale-thumb", "aria-hidden": "true" });
  const slider = el("div", {
    class: "pain-scale",
    role: "slider",
    tabindex: "0",
    "aria-label": t("pain.sliderAria"),
    "aria-valuemin": "0",
    "aria-valuemax": "10",
  }, [
    ...LEVELS.map((i) => el("span", {
      class: "pain-scale-step",
      style: `--step-colour: var(--pain-scale-${i}); grid-column: ${i + 1}`,
    })),
    thumb,
  ]);

  function levelFromPointer(event) {
    const rect = slider.getBoundingClientRect();
    const index = Math.floor(((event.clientX - rect.left) / rect.width) * LEVELS.length);
    return Math.min(10, Math.max(0, index));
  }
  slider.addEventListener("pointerdown", (event) => {
    slider.setPointerCapture(event.pointerId);
    setLevel(levelFromPointer(event));        // touching it also sets a null level
  });
  slider.addEventListener("pointermove", (event) => {
    if (slider.hasPointerCapture(event.pointerId)) setLevel(levelFromPointer(event));
  });
  slider.addEventListener("keydown", (event) => {
    const current = state.level ?? 0;
    const keys = {
      ArrowRight: current + 1, ArrowUp: current + 1, ArrowLeft: current - 1, ArrowDown: current - 1,
      PageUp: current + 2, PageDown: current - 2, Home: 0, End: 10,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    setLevel(state.level === null && event.key !== "Home" && event.key !== "End"
      ? current : Math.min(10, Math.max(0, keys[event.key])));
  });

  const levelSection = el("section", { class: "pain-box pain-level" }, [
    el("div", { class: "pain-level-head" }, [
      el("h2", { class: "pain-heading" }, [t("pain.levelHeading")]),
      valueOutput,
    ]),
    el("div", { class: "pain-faces" }, faceButtons),
    slider,
    el("div", { class: "pain-scale-numbers", "aria-hidden": "true" },
      LEVELS.map((i) => el("span", {}, [String(i)]))),
    el("div", { class: "pain-scale-labels" }, [
      el("span", {}, [t("pain.noPain")]),
      el("span", {}, [t("pain.worstPain")]),
    ]),
  ]);

  function setLevel(value) {
    state.level = value;
    renderLevel();
    changed();
  }

  function renderLevel() {
    const { level } = state;
    valueOutput.replaceChildren(
      el("strong", {}, [level === null ? "—" : String(level)]),
      el("span", {}, ["/10"]),
    );
    for (const [i, button] of faceButtons.entries()) {
      const value = FACE_VALUES[i];
      button.setAttribute("aria-pressed", String(level === value));
      // The nearest face lights up while sliding (7 -> face 6 or 8).
      button.classList.toggle("is-active", level !== null && Math.round(level / 2) * 2 === value);
    }
    slider.classList.toggle("is-unset", level === null);
    slider.setAttribute("aria-valuenow", String(level ?? 0));
    slider.setAttribute("aria-valuetext", level === null ? t("pain.levelNotSet") : `${level}/10`);
    slider.querySelectorAll(".pain-scale-step").forEach((step, i) => {
      step.classList.toggle("is-on", level !== null && i <= level);
    });
    thumb.hidden = level === null;
    thumb.style.gridColumn = String((level ?? 0) + 1);
  }

  // ---------------------------------------------------------------- updates
  /** Called after every change of the answers. */
  function changed() {}

  // ---------------------------------------------------------------- layout
  const { root, body } = createScreen(ctx, { title: t("pain.title"), className: "pain" });
  const side = el("div", { class: "pain-side" }, [levelSection]);
  body.append(el("div", { class: "pain-main" }, [bodyPanel, side]));

  // Hide until pain.css is loaded, so the screen does not flash unstyled.
  if (!stylesheet.sheet) {
    root.style.visibility = "hidden";
    stylesheet.addEventListener("load", () => { root.style.visibility = ""; }, { once: true });
  }

  renderBody();
  renderLevel();
  container.append(root);
}
