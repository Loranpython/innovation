/*
  body-map.js — builds the body map <svg> for one view ("front" or "back").

  Three uses:
    whole body  tap a region -> onRegion(drawId)              (opens close-up)
    close-up    focusDrawId set: zoomed to that region's box;
                tap anywhere on the body -> onPoint(drawId, x, y)
    read-only   neither callback: e.g. the small figure in the review step

  Points are drawn as a marker with a soft halo. Regions that contain a
  point on this view get the "selected" look.

  Coordinates of points are in the 240 × 580 drawing box (see body-regions.js).
*/

import { VIEWBOX, REGIONS, FACE_DETAILS, findRegion, toPatientRegion, regionName } from "./body-regions.js";
import { anatomyMarkup } from "./body-anatomy.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function escapeAttr(text) {
  return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * viewBox for the close-up, ported from the prototype:
 * start from the region's box and shrink it around its centre by `zoom`.
 */
export function closeupViewBox(box, zoom) {
  const [x, y, w, h] = box;
  return [x + (w - w / zoom) / 2, y + (h - h / zoom) / 2, w / zoom, h / zoom];
}

/**
 * Build the SVG.
 *   view         "front" | "back"
 *   points       all points [{ view, drawId, x, y }] (only this view is drawn)
 *   focusDrawId  region of the close-up, or null for the whole body
 *   zoom         1–2, close-up only
 *   t            translation function
 *   onRegion     (drawId) => void   whole body: region tapped
 *   onPoint      (drawId, x, y) => void   close-up: point placed
 */
export function createBodyMap({ view, points, focusDrawId = null, zoom = 1, t, onRegion, onPoint }) {
  const closeup = Boolean(focusDrawId);
  const interactive = Boolean(onRegion || onPoint);
  const viewBox = closeup ? closeupViewBox(findRegion(focusDrawId).box, zoom) : VIEWBOX;
  const viewPoints = points.filter((p) => p.view === view);
  const viewLabel = t(view === "front" ? "pain.viewFront" : "pain.viewBack");

  const regionsMarkup = REGIONS.map(({ drawId, path }) => {
    const selected = viewPoints.some((p) => p.drawId === drawId);
    const label = `${regionName(toPatientRegion(drawId, view), t)}, ${viewLabel}`;
    const a11y = interactive
      ? `role="button" tabindex="0" aria-label="${escapeAttr(label)}"`
      : `aria-hidden="true"`;
    return `<path class="body-region${selected ? " is-selected" : ""}" d="${path}" data-draw-id="${drawId}" ${a11y}/>`;
  }).join("");

  // Markers stay the same size on screen: smaller in the close-up, and
  // divided by zoom so zooming in does not blow them up.
  const markR = closeup ? 2.8 / zoom : 6;
  const haloR = closeup ? 6 / zoom : 13;
  const markers = viewPoints.map((p) =>
    `<circle class="pain-mark-halo" cx="${p.x}" cy="${p.y}" r="${haloR}"/>` +
    `<circle class="pain-mark" cx="${p.x}" cy="${p.y}" r="${markR}"/>`
  ).join("");

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox.join(" "));
  svg.setAttribute("class", `body-svg body-svg--${view}${closeup ? " body-svg--closeup" : ""}`);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", viewLabel);
  svg.innerHTML =
    regionsMarkup +
    anatomyMarkup(view) +
    `<path class="body-detail" d="${FACE_DETAILS[view]}"/>` +
    `<g class="pain-marks">${markers}</g>`;

  if (closeup && onPoint) {
    // Pointer events work for mouse, pen and touch. touch-action: none
    // (pain.css) stops the browser from scrolling while tapping.
    svg.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const regionEl = event.target.closest(".body-region");
      if (!regionEl) return;                          // tapped next to the body
      event.preventDefault();
      const { x, y } = screenToSvg(svg, event.clientX, event.clientY);
      onPoint(regionEl.dataset.drawId, x, y);
    });
  } else if (onRegion) {
    svg.addEventListener("click", (event) => {
      const regionEl = event.target.closest(".body-region");
      if (regionEl) onRegion(regionEl.dataset.drawId);
    });
  }

  if (interactive) {
    // Keyboard: Enter/Space opens the close-up, or in the close-up places a
    // point in the centre of the region's box.
    svg.addEventListener("keydown", (event) => {
      const regionEl = event.target.closest(".body-region");
      if (!regionEl || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      const drawId = regionEl.dataset.drawId;
      if (closeup) {
        const [bx, by, bw, bh] = findRegion(drawId).box;
        onPoint?.(drawId, bx + bw / 2, by + bh / 2);
      } else {
        onRegion?.(drawId);
      }
    });
  }

  return svg;
}

/** Screen pixels -> drawing coordinates (ported from the prototype). */
function screenToSvg(svg, clientX, clientY) {
  const matrix = svg.getScreenCTM();
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const result = point.matrixTransform(matrix.inverse());
  return { x: Math.round(result.x * 10) / 10, y: Math.round(result.y * 10) / 10 };
}
