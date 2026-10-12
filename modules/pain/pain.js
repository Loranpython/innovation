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

const ZOOM_MIN = 1;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;

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

  // ---------------------------------------------------------------- updates
  /** Called after every change of the answers. */
  function changed() {}

  // ---------------------------------------------------------------- layout
  const { root, body } = createScreen(ctx, { title: t("pain.title"), className: "pain" });
  const side = el("div", { class: "pain-side" });
  body.append(el("div", { class: "pain-main" }, [bodyPanel, side]));

  // Hide until pain.css is loaded, so the screen does not flash unstyled.
  if (!stylesheet.sheet) {
    root.style.visibility = "hidden";
    stylesheet.addEventListener("load", () => { root.style.visibility = ""; }, { once: true });
  }

  renderBody();
  container.append(root);
}
