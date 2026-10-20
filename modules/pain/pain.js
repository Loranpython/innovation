/*
  pain.js — screen #/pain: "Where does it hurt?"

  The patient places PAIN SPOTS. Each spot has its own level (required)
  and optional places the pain spreads to.

    Tap a body part -> close-up -> tap the exact place -> spot + editor.
    Spreads to: the "Spreads to →" button in the editor, then tap places.
    General symptoms (nauseous, dizzy, cold, hot): 2 × 2 toggle tiles in the
                right panel (no body map, no level), sent TOGETHER with
                the spots in one notification:
                  a pain spot  -> "pain" with each spot's kind + details.symptoms
                  no pain spot -> "symptom" with { symptoms, spots }

  (The eight sensation types were removed after clinical feedback: they
  were ambiguous for patients with communication difficulties.)

  This file only wires things together:
    pain-state.js   state + changes + undo (one source of truth)
    body-map.js     the SVG figures, markers and arrows
    spot-editor.js  right panel (symptom tiles, or spot editor)
    summary-bar.js  spot + symptom chips, Undo, Start over, Review & send
    review.js       review + confirm overlays
    drag.js         moving markers in the close-up

  Every change in the store calls renderAll() once.
*/

import { createScreen, el } from "../../js/ui.js";
import { speak } from "../../js/voice.js";
import { createPainStore, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "./pain-state.js";
import { createBodyMap, fitMarkers, screenToSvg, regionAtPoint, spotDescription } from "./body-map.js";
import { headIcon } from "./body-details.js";
import { findRegion, toPatientRegion, regionName, englishRegionLabel } from "./body-regions.js";
import { faceEmoji } from "./pain-faces.js";
import { radiatingIcon } from "./pain-icons.js";
import { createSidePanel } from "./spot-editor.js";
import { createSummaryBar } from "./summary-bar.js";
import { createOverlay, openReview, openConfirm } from "./review.js";
import { startMarkerMove, swallowClickAfterRelease } from "./drag.js";
import { SYMPTOM_SEND_ICON, sortSymptoms, kindLabel } from "./symptoms.js";

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

let teardown = null;

export function render(container, ctx) {
  const { t } = ctx;
  const stylesheet = loadStyles();
  const store = createPainStore();
  const { state } = store;
  const viewLabel = (view) => t(view === "front" ? "pain.viewFront" : "pain.viewBack");
  // Big FRONT / BACK label above the figures and in the close-up title.
  const viewTitle = (view) => t(view === "front" ? "pain.viewFrontLabel" : "pain.viewBackLabel");

  // ---------------------------------------------------------------- taps on the body
  /**
   * A body part was tapped (whole view or close-up) at drawing point x, y.
   * Voice: the PATIENT-perspective name ("Left thigh"), via toPatientRegion.
   */
  function regionTapped(view, drawId, x, y, inCloseup) {
    const place = regionName(toPatientRegion(drawId, view), t);
    if (state.mode === "radiating") {
      const origin = store.selectedSpot();
      if (!origin) {
        store.setHint("pain.radiatePickOrigin");
        speak(t("pain.radiatePickOrigin"));
      } else if (store.addRadiation(origin.id, { view, drawId, x, y })) {
        speak(`${t("pain.spreadsTo")}: ${place}`);
      } else {
        speak(t("pain.radiateSameSide"));
      }
      return;
    }
    if (!inCloseup) {
      speak(place);
      store.openCloseup(view, drawId);
      return;
    }
    speak(`${place}. ${t("pain.whatFeelHere")}`);
    store.addSpot({ view, drawId, x, y });
  }

  /** A spot marker was tapped. */
  function markerTapped(spotId) {
    const spot = store.getSpot(spotId);
    if (state.mode === "radiating") {
      const origin = store.selectedSpot();
      if (!origin) { store.select(spotId); return; }          // this is where it starts
      if (spot.id !== origin.id) {
        store.addRadiation(origin.id, { view: spot.view, drawId: spot.drawId, x: spot.x, y: spot.y });
      }
      return;
    }
    speak(spotDescription(spot, t));
    store.select(spotId);
  }

  /** Close-up: the selected marker was dragged and released here. */
  function dropMarker(spotId, svg, clientX, clientY) {
    const hit = clientX === null ? null : regionAtPoint(clientX, clientY);
    if (hit && hit.svg === svg) store.moveSpot(spotId, { drawId: hit.drawId, x: hit.x, y: hit.y });
    else store.select(spotId);                       // not on the body: put it back
  }

  function wireSvg(svg, inCloseup) {
    const view = svg.dataset.view;
    if (inCloseup) {
      // Pointer events: mouse, pen and touch. touch-action: none (pain.css).
      svg.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        const marker = event.target.closest(".pain-spot");
        if (marker) {
          // Drag a marker to move it (a short tap selects it, via click).
          // Any marker can be moved, so on a phone the editor sheet does not
          // have to be open (it would cover the body).
          if (state.mode !== "radiating") {
            event.preventDefault();
            startMarkerMove(event, {
              marker, svg,
              onDrop: (x, y) => dropMarker(marker.dataset.spotId, svg, x, y),
            });
          }
          return;
        }
        const region = event.target.closest(".body-region");
        if (!region) return;                         // tapped next to the body
        event.preventDefault();
        swallowClickAfterRelease(event.pointerId);   // the editor may appear under the finger
        const { x, y } = screenToSvg(svg, event.clientX, event.clientY);
        regionTapped(view, region.dataset.drawId, x, y, true);
      });
    }
    svg.addEventListener("click", (event) => {
      const marker = event.target.closest(".pain-spot");
      if (marker) { markerTapped(marker.dataset.spotId); return; }
      if (inCloseup) return;                         // handled on pointerdown
      const region = event.target.closest(".body-region");
      if (!region) return;
      const { x, y } = screenToSvg(svg, event.clientX, event.clientY);
      regionTapped(view, region.dataset.drawId, x, y, false);
    });
    // Keyboard: Enter/Space on a marker selects it; on a region it acts as
    // a tap in the centre of the region's box.
    svg.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const marker = event.target.closest(".pain-spot");
      const region = event.target.closest(".body-region");
      if (!marker && !region) return;
      event.preventDefault();
      if (marker) { markerTapped(marker.dataset.spotId); return; }
      const [bx, by, bw, bh] = findRegion(region.dataset.drawId).box;
      regionTapped(view, region.dataset.drawId, bx + bw / 2, by + bh / 2, inCloseup);
    });
  }

  // ---------------------------------------------------------------- body panel
  const bodyPanel = el("section", { class: "pain-box pain-body" });

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

  /** Instruction line above the figure: what to do now (radiating / hint). */
  function instructionLine() {
    const origin = store.selectedSpot();
    let iconHtml = "";
    let text = "";
    let button = null;
    if (state.mode === "radiating") {
      iconHtml = radiatingIcon();
      text = t(origin ? "pain.radiateHint" : "pain.radiatePickOrigin");
      button = origin
        ? el("button", { type: "button", class: "pain-instruction-button is-primary", "data-focus-key": "instr:done",
            "aria-label": t("pain.done"), onClick: () => store.cancelMode() }, [t("pain.done")])
        : el("button", { type: "button", class: "pain-instruction-button", "data-focus-key": "instr:cancel",
            "aria-label": t("pain.cancel"), onClick: () => store.cancelMode() }, [t("pain.cancel")]);
    }
    if (state.hint) text = t(state.hint.key, state.hint.vars);
    if (!text) return null;

    const icon = el("span", { class: "pain-instruction-icon", "aria-hidden": "true" });
    icon.innerHTML = iconHtml;
    return el("div", { class: `pain-instruction${state.hint ? " is-hint" : ""}` }, [
      icon,
      el("p", { class: "pain-instruction-text", role: "status" }, [text]),
      button,
    ]);
  }

  function renderBody() {
    const common = {
      spots: state.spots,
      selectedSpotId: state.selectedSpotId,
      highlightMissing: state.highlightMissing,
      t,
      interactive: true,
    };
    let content;
    if (state.closeup) {
      const { view, drawId } = state.closeup;
      const map = createBodyMap({ ...common, view, closeup: { drawId, zoom: state.zoom } });
      wireSvg(map, true);
      content = el("div", { class: "pain-closeup" }, [
        el("div", { class: "pain-closeup-toolbar" }, [
          toolButton("whole", t("pain.wholeBody"), () => store.closeCloseup()),
          el("div", { class: "pain-closeup-tools" }, [
            toolButton("undo", t("pain.undo"), () => store.undo(), state.history.length === 0),
            toolButton("zoomOut", t("pain.zoomOut"), () => store.setZoom(state.zoom - ZOOM_STEP), state.zoom <= ZOOM_MIN),
            toolButton("zoomIn", t("pain.zoomIn"), () => store.setZoom(state.zoom + ZOOM_STEP), state.zoom >= ZOOM_MAX),
            toolButton("done", t("pain.done"), () => store.closeCloseup()),
          ]),
        ]),
        el("div", { class: "pain-closeup-map" }, [map]),
        el("p", { class: "pain-closeup-title" }, [
          el("strong", {}, [regionName(toPatientRegion(drawId, view), t)]),
          ` · ${viewTitle(view)} — ${t("pain.closeupHint")}`,
        ]),
      ]);
    } else {
      content = [
        el("div", { class: "pain-views" }, ["front", "back"].map((view) => {
          const map = createBodyMap({ ...common, view });
          wireSvg(map, false);
          const label = el("h2", { class: "pain-view-label" }, [viewTitle(view)]);
          label.insertAdjacentHTML("afterbegin", headIcon(view));
          return el("div", { class: "pain-view" }, [
            label,
            el("div", { class: "pain-view-map" }, [map]),
          ]);
        })),
      ];
    }
    bodyPanel.replaceChildren(...[instructionLine(), content].flat().filter(Boolean));
    bodyPanel.classList.toggle("is-radiating", state.mode === "radiating");
  }

  // ---------------------------------------------------------------- panels
  const { root, body } = createScreen(ctx, { title: t("pain.title"), className: "pain" });
  const overlay = createOverlay(root);
  const sidePanel = createSidePanel({ t, store, viewLabel });
  const summaryBar = createSummaryBar({
    t,
    store,
    onReview: () => {
      const located = state.spots.filter((spot) => spot.kind !== "pain")
        .map((spot) => `${kindLabel(spot.kind, t)} (${regionName(spot.region, t)})`);
      const feels = [...located, ...sortSymptoms(state.symptoms).map((id) => t(`symptom.${id}`))].join(", ");
      const worst = store.maxLevel();
      speak(worst !== null
        ? `${t("pain.reviewTitle")}. ${t("pain.worstPainShort")}: ${worst}${feels ? `. ${feels}` : ""}`
        : `${t("pain.reviewTitle")}: ${feels}`);
      openReview({ overlay, t, store, viewLabel, onSend: send });
    },
    onStartOver: () => openConfirm({ overlay, t, onConfirm: () => store.reset() }),
  });

  // One tap = one notification, never two (pain + symptom).
  function send() {
    const symptoms = sortSymptoms(state.symptoms);
    const located = (spot) => ({
      number: spot.number,
      view: spot.view,
      region: spot.region,
      regionLabel: englishRegionLabel(spot.region, spot.view),
      kind: spot.kind,
      x: spot.x,
      y: spot.y,
    });
    if (!store.painSpots().length) {
      ctx.sendNotification({
        type: "symptom",
        details: { symptoms, spots: state.spots.map(located) },
        icon: SYMPTOM_SEND_ICON,
      });
      ctx.navigate("#/sent");
      return;
    }
    const spots = state.spots.map((spot) => ({
      ...located(spot),
      level: spot.kind === "pain" ? spot.level : null,
      radiatesTo: spot.radiatesTo.map(({ view, region, x, y }) => ({
        view, region, regionLabel: englishRegionLabel(region, view), x, y,
      })),
    }));
    const maxLevel = store.maxLevel();
    ctx.sendNotification({ type: "pain", details: { maxLevel, spots, symptoms }, icon: faceEmoji(maxLevel) });
    ctx.navigate("#/sent");
  }

  // ---------------------------------------------------------------- render
  // Landscape: the summary sits under the editor in the right column, so the
  // figures get the full height (pain.css places it with a grid).
  body.append(el("div", { class: "pain-main" }, [bodyPanel, sidePanel.el, summaryBar.el]));

  let previousMode = state.mode;
  function renderAll() {
    const focusKey = document.activeElement?.dataset?.focusKey;
    renderBody();
    sidePanel.update(state);
    summaryBar.update(state);
    root.classList.toggle("has-selection", Boolean(state.selectedSpotId));
    root.classList.toggle("is-radiating", state.mode === "radiating");
    fitMarkers(bodyPanel);

    // Keep keyboard focus on the same control after a redraw.
    if (focusKey && !root.contains(document.activeElement)) {
      root.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
    }
    // Narrow screens: when choosing where the pain spreads to, bring the body into view.
    if (state.mode !== previousMode && state.mode !== "idle" && isNarrow()) {
      bodyPanel.scrollIntoView({ block: "start", behavior: "smooth" });
    }
    previousMode = state.mode;
  }
  store.subscribe(renderAll);

  const isNarrow = () => window.matchMedia("(max-width: 700px), (orientation: portrait)").matches;

  // Escape leaves "spreads to" mode, or closes the spot editor.
  root.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.mode !== "idle") store.cancelMode();
    else if (state.selectedSpotId) store.select(null);
  });

  // Markers keep their screen size when the panel resizes. The summary bar
  // height is shared with CSS, so the narrow-screen editor sheet sits above it.
  const resizeObserver = new ResizeObserver(() => {
    fitMarkers(bodyPanel);
    root.style.setProperty("--pain-summary-height", `${summaryBar.el.offsetHeight}px`);
  });
  resizeObserver.observe(bodyPanel);
  resizeObserver.observe(summaryBar.el);

  // Hide until pain.css is loaded, so the screen does not flash unstyled.
  if (!stylesheet.sheet) {
    root.style.visibility = "hidden";
    stylesheet.addEventListener("load", () => {
      root.style.visibility = "";
      fitMarkers(bodyPanel);
    }, { once: true });
  }

  container.append(root);
  renderAll();

  teardown = () => {
    resizeObserver.disconnect();
    overlay.close();
  };
}

export function cleanup() {
  teardown?.();
  teardown = null;
}
