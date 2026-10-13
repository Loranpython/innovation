/*
  body-details.js — line work that makes the FRONT and BACK figure look
  different at a glance, also for patients who can't read the labels.

    front  face, collarbones, navel, kneecaps, toes
    back   hair over the back of the head + ears, spine, shoulder blades,
           buttocks, knee creases, heels (the toes are hidden)

  Purely decorative: one <g> with pointer-events: none (pain.css), drawn
  above the region fill and below the markers. The clickable regions in
  body-regions.js are NOT changed, so taps and left/right stay the same.

  Coordinates are in the 240 × 580 drawing box. Shapes are drawn for the
  LEFT half of the screen and mirrored (x -> 240 - x) for the right half.
  Elements with class "detail-fine" are hidden when the figure is small
  (fitMarkers() in body-map.js sets "is-small" on the svg).
*/

/** Mirror a path made of absolute M/L/Q/C commands around x = 120. */
function mirror(d) {
  return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_, x, y) => `${240 - Number(x)} ${y}`);
}
const both = (d) => `${d} ${mirror(d)}`;

/** Small head pictogram for the FRONT / BACK labels (24 × 24). */
export function headIcon(view) {
  const head = `<circle class="head-icon-skin" cx="12" cy="12.5" r="7.5"/>`;
  const ears = `<ellipse class="head-icon-skin" cx="4.4" cy="13" rx="1.9" ry="2.8"/>` +
    `<ellipse class="head-icon-skin" cx="19.6" cy="13" rx="1.9" ry="2.8"/>`;
  const inner = view === "front"
    ? `${ears}${head}` +
      `<circle class="head-icon-dot" cx="9.2" cy="11.5" r="1.1"/><circle class="head-icon-dot" cx="14.8" cy="11.5" r="1.1"/>` +
      `<path class="head-icon-line" d="M9.5 15.5q2.5 2 5 0"/>`
    : `${head}<path class="head-icon-hair" d="M4.5 13C4.3 7 8 4.7 12 4.7S19.7 7 19.5 13C19.1 16.6 16.5 19.6 12 20C7.5 19.6 4.9 16.6 4.5 13Z"/>${ears}`;
  return `<svg class="head-icon" viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">${inner}</svg>`;
}

// ---------------------------------------------------------------- front
const FRONT = `
  <g class="detail-face">
    <ellipse class="detail-dot" cx="109.5" cy="46" rx="2.3" ry="1.7"/>
    <ellipse class="detail-dot" cx="130.5" cy="46" rx="2.3" ry="1.7"/>
    <path d="M104 40Q109.5 37 115 39.5 M136 40Q130.5 37 125 39.5"/>
    <path d="M119.5 49V58.5L123 59.5"/>
    <path d="M112 68.5Q120 74 128 68.5"/>
  </g>
  <path d="${both("M97 116Q107 112 117 117")}"/>
  <ellipse class="detail-dot" cx="120" cy="229" rx="1.6" ry="2.2"/>
  <ellipse cx="96" cy="410" rx="6" ry="8"/>
  <ellipse cx="144" cy="410" rx="6" ry="8"/>
  <path class="detail-fine" d="${both("M80.5 557L79.5 562 M87.5 557L86.5 563 M94.5 557L93.8 563.5 M101.5 557L101 564 M108 556L107.8 566")}"/>`;

// ---------------------------------------------------------------- back
// Heel: a mask in the background colour hides the toe outline of the foot
// region, then a rounded heel is drawn on top.
// The heel stays inside the solid part of the foot region (above the gaps
// between the toes), so every visible bit of heel is still tappable.
const HEEL_LINE = "M80.3 540C78.9 548 84 553.5 94.5 553.5C105 553.5 109.9 548 107.9 540";
const HEEL_FILL = `${HEEL_LINE}Z`;

const BACK = `
  <path class="detail-ears" d="${both("M93 51Q90.5 54 93 59")}"/>
  <path class="detail-hair" d="M120 12.5C99 12.5 89.5 27 91 48L92.5 59C94 68 100 75 107 78Q120 82 133 78C140 75 146 68 147.5 59L149 48C150.5 27 141 12.5 120 12.5Z"/>
  <path class="detail-hair-strands detail-fine" d="M120 16V77 ${both("M110 17Q101 40 106 76 M101 22Q93 42 99 70")}"/>
  <path d="M120 92V250"/>
  <path d="${both("M108 123Q95 120 92.5 127Q96 146 105 159Q109 141 108 123Z")}"/>
  <path d="${both("M118 291Q103 300 86 287")} M120 266V289"/>
  <path d="${both("M89 410Q96 413 103 410")}"/>
  <path class="detail-heel-mask" data-foot="right_foot" d="M76 542H113V576H76Z"/>
  <path class="detail-heel-mask" data-foot="left_foot" d="${mirror("M76 542L113 542L113 576L76 576Z")}"/>
  <path class="detail-heel" data-foot="right_foot" d="${HEEL_FILL}"/>
  <path class="detail-heel" data-foot="left_foot" d="${mirror(HEEL_FILL)}"/>
  <path class="detail-heel-line" d="${both(HEEL_LINE)}"/>`;

/** SVG markup (a <g> string) for the details of "front" or "back". */
export function detailsMarkup(view) {
  return `<g class="body-details body-details--${view}" aria-hidden="true">${view === "front" ? FRONT : BACK}</g>`;
}
