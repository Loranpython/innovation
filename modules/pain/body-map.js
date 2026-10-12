/*
  body-map.js — builds the body map <svg> for one view ("front" or "back")
  with the pain spots on it.

  Three uses:
    whole body  regions + markers; tap a region -> onRegionTap
    close-up    zoomed to one region's box (closeup = { drawId, zoom });
                tap -> onRegionTap with the exact point
    read-only   no callbacks: e.g. the figure in the review step

  Drawn on top of the regions, in this order:
    radiation arrows (dashed, level colour)  ->  numbered spot markers

  Markers, badges and arrow heads keep the SAME SIZE ON SCREEN in every
  view: they are drawn in screen pixels and scaled by fitMarkers() after
  the SVG is on the page (and again when the panel resizes).

  Coordinates of spots are in the 240 × 580 drawing box (body-regions.js).
*/

import { VIEWBOX, REGIONS, FACE_DETAILS, findRegion, toPatientRegion, regionName } from "./body-regions.js";
import { anatomyMarkup } from "./body-anatomy.js";
import { SENSATIONS } from "./sensation-icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// Marker sizes in screen pixels.
const SIZES = {
  whole: { r: 11, font: 12, badge: 14 },
  closeup: { r: 16, font: 16, badge: 20 },
};

// Levels whose colour is light enough for dark text (others get white text).
const DARK_TEXT_LEVELS = new Set([3, 4, 5, 6]);

function escapeAttr(text) {
  return String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Fill + text colour of a marker for a level (null = grey with "?"). */
export function levelColours(level) {
  if (level === null || level === undefined) {
    return { fill: "var(--pain-spot-unset)", text: "var(--color-text)" };
  }
  return {
    fill: `var(--pain-scale-${level})`,
    text: DARK_TEXT_LEVELS.has(level) ? "var(--color-text)" : "var(--color-surface)",
  };
}

/** Small stand-alone marker SVG (for chips, editor header, review list). */
export function markerSvg(spot, size = 28) {
  const { fill, text } = levelColours(spot.level);
  return `<svg class="pain-marker-mini" viewBox="0 0 28 28" width="${size}" height="${size}" aria-hidden="true">` +
    `<circle cx="14" cy="14" r="12.5" style="fill:${fill}" class="pain-spot-dot"/>` +
    `<text x="14" y="14" dy="0.36em" text-anchor="middle" style="fill:${text}" class="pain-spot-number">${spot.number}</text>` +
    `</svg>`;
}

/**
 * viewBox for the close-up, ported from the prototype:
 * start from the region's box and shrink it around its centre by `zoom`.
 */
export function closeupViewBox(box, zoom) {
  const [x, y, w, h] = box;
  return [x + (w - w / zoom) / 2, y + (h - h / zoom) / 2, w / zoom, h / zoom];
}

/** Accessible description of a spot, e.g. "Spot 2: Right hand (Front), pain 3 of 10, Numb". */
export function spotDescription(spot, t) {
  const view = t(spot.view === "front" ? "pain.viewFront" : "pain.viewBack");
  const level = spot.level === null ? t("pain.levelMissing") : t("pain.levelOutOf", { n: spot.level });
  const parts = [`${regionName(spot.region, t)} (${view})`, level,
    ...spot.sensations.map((s) => t(`pain.sensation.${s}`))];
  return t("pain.spotAria", { n: spot.number, region: parts.join(", ") });
}

function badgeMarkup(spot, size) {
  if (spot.sensations.length === 0) return "";
  const shown = spot.sensations.slice(0, 2);
  const extra = spot.sensations.length - shown.length;
  const pad = 2;
  const width = shown.length * size + (shown.length - 1) * 2 + pad * 2 + (extra ? size * 0.9 : 0);
  const icons = shown.map((id, i) => {
    const icon = SENSATIONS.find((s) => s.id === id)?.icon() ?? "";
    return icon.replace("<svg ", `<svg x="${pad + i * (size + 2)}" y="${pad}" width="${size}" height="${size}" `);
  }).join("");
  const more = extra
    ? `<text class="pain-spot-more" x="${width - pad - 1}" y="${pad + size / 2}" dy="0.36em" text-anchor="end" font-size="${size * 0.62}">+${extra}</text>`
    : "";
  return `<g class="pain-spot-badge"><rect x="0" y="0" width="${width}" height="${size + pad * 2}"/>${icons}${more}</g>`;
}

/**
 * Build the SVG.
 *   view, spots, selectedSpotId, highlightMissing, t
 *   closeup      { drawId, zoom } or null
 *   interactive  true -> regions and markers are focusable buttons
 */
export function createBodyMap({ view, spots, selectedSpotId = null, highlightMissing = false, closeup = null, t, interactive = false }) {
  const viewBox = closeup ? closeupViewBox(findRegion(closeup.drawId).box, closeup.zoom) : VIEWBOX;
  const viewSpots = spots.filter((spot) => spot.view === view);
  const viewLabel = t(view === "front" ? "pain.viewFront" : "pain.viewBack");
  const size = SIZES[closeup ? "closeup" : "whole"];

  const regionsMarkup = REGIONS.map(({ drawId, path }) => {
    const selected = viewSpots.some((spot) => spot.drawId === drawId);
    const label = `${regionName(toPatientRegion(drawId, view), t)}, ${viewLabel}`;
    const a11y = interactive
      ? `role="button" tabindex="0" aria-label="${escapeAttr(label)}" data-focus-key="${view}:${drawId}"`
      : `aria-hidden="true"`;
    return `<path class="body-region${selected ? " is-selected" : ""}" d="${path}" data-draw-id="${drawId}" ${a11y}/>`;
  }).join("");

  // Radiation: dashed line in user units + an open circle and arrow head in px.
  const rays = viewSpots.flatMap((spot) => spot.radiatesTo
    .filter((target) => target.view === view)
    .map((target) => {
      const colour = levelColours(spot.level).fill;
      const angle = Math.atan2(target.y - spot.y, target.x - spot.x) * 180 / Math.PI;
      return `<g class="pain-ray" style="--ray-colour:${colour}">` +
        `<line class="pain-ray-line" x1="${spot.x}" y1="${spot.y}" x2="${target.x}" y2="${target.y}"/>` +
        `<g class="pain-fixed" data-x="${target.x}" data-y="${target.y}" data-angle="${angle}">` +
        `<path class="pain-ray-head" d="M-7 0 L-17 -6 L-17 6 Z"/>` +
        `<circle class="pain-ray-end" r="6"/></g></g>`;
    })).join("");

  const markers = viewSpots.map((spot) => {
    const { fill, text } = levelColours(spot.level);
    const classes = ["pain-spot"];
    if (spot.id === selectedSpotId) classes.push("is-selected");
    if (highlightMissing && spot.level === null) classes.push("is-missing");
    const ring = size.r + 6;
    const a11y = interactive
      ? `role="button" tabindex="0" aria-label="${escapeAttr(spotDescription(spot, t))}" data-focus-key="spot:${spot.id}"`
      : `aria-hidden="true"`;
    return `<g class="${classes.join(" ")} pain-fixed" data-spot-id="${spot.id}" data-x="${spot.x}" data-y="${spot.y}" ${a11y}>` +
      `<rect class="pain-spot-ring" x="${-ring}" y="${-ring}" width="${ring * 2}" height="${ring * 2}"/>` +
      `<circle class="pain-spot-dot" r="${size.r}" style="fill:${fill}"/>` +
      `<text class="pain-spot-number" dy="0.36em" text-anchor="middle" font-size="${size.font}" style="fill:${text}">${spot.level === null ? "?" : spot.number}</text>` +
      `<g transform="translate(${size.r + 3} ${-size.r - 4})">${badgeMarkup(spot, size.badge)}</g>` +
      `</g>`;
  }).join("");

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox.join(" "));
  svg.setAttribute("class", `body-svg body-svg--${view}${closeup ? " body-svg--closeup" : ""}`);
  svg.dataset.view = view;
  svg.dataset.mode = closeup ? "closeup" : "whole";
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", viewLabel);
  svg.innerHTML =
    regionsMarkup +
    anatomyMarkup(view) +
    `<path class="body-detail" d="${FACE_DETAILS[view]}"/>` +
    `<g class="pain-rays">${rays}</g>` +
    `<g class="pain-spots">${markers}</g>`;
  return svg;
}

/**
 * Give markers, badges and arrow heads their screen size, and push
 * overlapping markers apart (whole view only; the data stays exact).
 * Call after the SVG is in the page, and when it resizes.
 */
export function fitMarkers(root) {
  for (const svg of root.querySelectorAll(".body-svg")) {
    const ctm = svg.getScreenCTM();
    if (!ctm || !ctm.a) continue;
    const k = 1 / ctm.a;                       // drawing units per screen pixel
    const placed = [];                          // marker centres in px
    const spread = svg.dataset.mode === "whole";
    for (const item of svg.querySelectorAll(".pain-fixed")) {
      const x = Number(item.dataset.x);
      const y = Number(item.dataset.y);
      let dx = 0;
      let dy = 0;
      if (spread && item.classList.contains("pain-spot")) {
        // Shift a marker that would cover an earlier one (22px apart).
        const px = x / k;
        const py = y / k;
        let tries = 0;
        while (tries < 6 && placed.some(([ax, ay]) => Math.hypot(ax - (px + dx), ay - (py + dy)) < 20)) {
          dx += 14;
          dy -= 8;
          tries += 1;
        }
        placed.push([px + dx, py + dy]);
      }
      const angle = item.dataset.angle ? ` rotate(${item.dataset.angle})` : "";
      item.setAttribute("transform", `translate(${x} ${y}) scale(${k}) translate(${dx} ${dy})${angle}`);
      item.dataset.k = String(k);
    }
  }
}

/** Screen pixels -> drawing coordinates of `svg` (ported from the prototype). */
export function screenToSvg(svg, clientX, clientY) {
  const matrix = svg.getScreenCTM();
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const result = point.matrixTransform(matrix.inverse());
  return { x: Math.round(result.x * 10) / 10, y: Math.round(result.y * 10) / 10 };
}

/** The body region under a screen point: { svg, view, drawId, x, y } or null. */
export function regionAtPoint(clientX, clientY) {
  for (const element of document.elementsFromPoint(clientX, clientY)) {
    const region = element.closest?.(".body-region");
    if (!region) continue;
    const svg = region.ownerSVGElement;
    return { svg, view: svg.dataset.view, drawId: region.dataset.drawId, ...screenToSvg(svg, clientX, clientY) };
  }
  return null;
}

/** The spot marker within `radius` screen px of a point (closest), or null. */
export function markerAtPoint(root, clientX, clientY, radius = 20) {
  let best = null;
  for (const dot of root.querySelectorAll(".pain-spot .pain-spot-dot")) {
    const rect = dot.getBoundingClientRect();
    const distance = Math.hypot(rect.left + rect.width / 2 - clientX, rect.top + rect.height / 2 - clientY);
    if (distance <= Math.max(radius, rect.width / 2) && (!best || distance < best.distance)) {
      best = { spotId: dot.parentElement.dataset.spotId, distance };
    }
  }
  return best?.spotId ?? null;
}
