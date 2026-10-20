/*
  symptom-icons.js — the one icon set for what a patient can feel:

    painIcon()      warm red face, squeezed eyes, clenched teeth, pain flash
    nauseousIcon()  green face, puffed cheeks, wavy closed mouth
    dizzyIcon()     yellow face, eyes looking two ways, orbit with stars
    coldIcon()      light-blue face, chattering teeth, snowflake
    hotIcon()       orange-red face, sweat drop, thermometer (high)

  All drawn in code in the SAME style (64 × 64): an emoji-style round face
  (centre 32,37, r 25.5, 2.5px edge in a darker shade), white eyes with a
  dark outline, dark features, and one small sign above or next to the
  head. Signs that stick out of the face get a thin white outline, so they
  also read on a selected (black) tile. Original drawings, no stock art.

  Every function returns an <svg> string, aria-hidden (the text label next
  to it carries the meaning). Options:
    { className = "symptom-svg", x, y, size }   x/y/size for use inside
                                                another SVG (body markers)
  iconSvg(kind, options) picks the function by id; iconNode(kind) returns
  a DOM node. Preview: /icons-preview.html.
*/

const LINE = "#3a2a10";     // pupils, outlines of signs
const FEATURE = "#5a3a00";  // eye outlines, mouths
const WHITE_EDGE = `stroke="#ffffff" stroke-linejoin="round"`;

function wrap(body, { className = "symptom-svg", x, y, size } = {}) {
  const place = size ? ` x="${x ?? 0}" y="${y ?? 0}" width="${size}" height="${size}"` : "";
  return `<svg class="${className}" viewBox="0 0 64 64"${place} aria-hidden="true" focusable="false">${body}</svg>`;
}

function face(fill, edge) {
  return `<circle cx="32" cy="37" r="25.5" fill="${fill}" stroke="${edge}" stroke-width="2.5"/>`;
}

/** Two white eyes; pupils at the given offsets from the eye centre. */
function eyes([lx, ly] = [0, 0], [rx, ry] = [0, 0]) {
  return `<circle cx="23" cy="33" r="6" fill="#ffffff" stroke="${FEATURE}" stroke-width="2"/>` +
    `<circle cx="41" cy="33" r="6" fill="#ffffff" stroke="${FEATURE}" stroke-width="2"/>` +
    `<circle cx="${23 + lx}" cy="${33 + ly}" r="3.1" fill="${LINE}"/>` +
    `<circle cx="${41 + rx}" cy="${33 + ry}" r="3.1" fill="${LINE}"/>`;
}

function mouthPath(d, width = 3) {
  return `<path d="${d}" fill="none" stroke="${FEATURE}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** A 5-pointed star centred on (cx, cy), as an SVG path. */
function starPath(cx, cy, outer = 4.4, inner = 1.9) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outer : inner;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

// ---------------------------------------------------------------- dizzy
/*
  Dizzy: a yellow face with eyes looking in different directions and a
  wavy mouth, under a tilted orbit with three small stars.
*/
const ORBIT = { cx: 32, cy: 10.5, rx: 21, ry: 4.6, tilt: -8 };
const DIZZY_STARS = [
  { at: 195, fill: "#2f7fd8" },   // blue, left
  { at: 95,  fill: "#e0433a" },   // red, front
  { at: 335, fill: "#2fa84f" },   // green, right
].map(({ at, fill }) => {
  const t = (at * Math.PI) / 180;
  const tilt = (ORBIT.tilt * Math.PI) / 180;
  const x = ORBIT.rx * Math.cos(t);
  const y = ORBIT.ry * Math.sin(t);
  const cx = ORBIT.cx + x * Math.cos(tilt) - y * Math.sin(tilt);
  const cy = ORBIT.cy + x * Math.sin(tilt) + y * Math.cos(tilt);
  return `<path d="${starPath(cx, cy)}" fill="${fill}" stroke="#ffffff" stroke-width="0.9" stroke-linejoin="round"/>`;
}).join("");

const DIZZY_BODY = `
  <circle cx="32" cy="37" r="25.5" fill="#FFCC33" stroke="#E0A21B" stroke-width="2.5"/>
  <circle cx="23" cy="33" r="6" fill="#ffffff" stroke="#5a3a00" stroke-width="2"/>
  <circle cx="41" cy="33" r="6" fill="#ffffff" stroke="#5a3a00" stroke-width="2"/>
  <circle cx="20.6" cy="30.4" r="3.1" fill="#3a2a10"/>
  <circle cx="43.6" cy="35.8" r="3.1" fill="#3a2a10"/>
  <path d="M22 49q3-4 5 0t5 0t5 0t5 0" fill="none" stroke="#5a3a00" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g transform="rotate(${ORBIT.tilt} ${ORBIT.cx} ${ORBIT.cy})" fill="none">
    <ellipse cx="${ORBIT.cx}" cy="${ORBIT.cy}" rx="${ORBIT.rx}" ry="${ORBIT.ry}" stroke="#ffffff" stroke-width="3.6"/>
    <ellipse cx="${ORBIT.cx}" cy="${ORBIT.cy}" rx="${ORBIT.rx}" ry="${ORBIT.ry}" stroke="#3a2a10" stroke-width="1.8"/>
  </g>
  ${DIZZY_STARS}`;

export function dizzyIcon(options) {
  return wrap(DIZZY_BODY, options);
}

// ---------------------------------------------------------------- nauseous
/* Green face, cheeks puffed out to the sides, lids half closed, a small wavy closed mouth. */
// Cheek bulges: outline first, then the face, then the cheek fill again so
// the face edge disappears where the cheeks puff out.
const CHEEKS = (attrs) =>
  `<ellipse cx="12" cy="46" rx="7" ry="6.5" ${attrs}/><ellipse cx="52" cy="46" rx="7" ry="6.5" ${attrs}/>`;
const NAUSEOUS_BODY =
  CHEEKS(`fill="#9BD16A" stroke="#4E8F2E" stroke-width="2.5"`) +
  face("#9BD16A", "#4E8F2E") +
  CHEEKS(`fill="#9BD16A"`) +
  `<ellipse cx="15" cy="46" rx="5" ry="4.5" fill="#83C052"/>` +
  `<ellipse cx="49" cy="46" rx="5" ry="4.5" fill="#83C052"/>` +
  eyes([0, 1.8], [0, 1.8]) +
  // heavy upper lids
  `<path d="M17 33a6 6 0 0 1 12 0Z" fill="#7DB84C" stroke="${FEATURE}" stroke-width="2" stroke-linejoin="round"/>` +
  `<path d="M35 33a6 6 0 0 1 12 0Z" fill="#7DB84C" stroke="${FEATURE}" stroke-width="2" stroke-linejoin="round"/>` +
  mouthPath("M24.5 49.5q1.9-2.6 3.8 0t3.8 0t3.8 0t3.8 0");

export function nauseousIcon(options) {
  return wrap(NAUSEOUS_BODY, options);
}

// ---------------------------------------------------------------- cold
/* Light-blue face, worried brows, chattering teeth (zigzag), snowflake top right. */
function snowflake(cx, cy, r) {
  const arms = [0, 60, 120].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const dx = (r * Math.cos(a)).toFixed(1);
    const dy = (r * Math.sin(a)).toFixed(1);
    return `M${cx - dx} ${cy - dy}L${cx + Number(dx)} ${cy + Number(dy)}`;
  }).join("");
  const tips = [0, 60, 120, 180, 240, 300].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const tx = cx + r * 0.72 * Math.cos(a);
    const ty = cy + r * 0.72 * Math.sin(a);
    const s = r * 0.26;
    const p = (off) => `${(tx + s * Math.cos(a + off)).toFixed(1)} ${(ty + s * Math.sin(a + off)).toFixed(1)}`;
    return `M${p(2.5)}L${tx.toFixed(1)} ${ty.toFixed(1)}L${p(-2.5)}`;
  }).join("");
  const d = arms + tips;
  return `<path d="${d}" fill="none" ${WHITE_EDGE} stroke-width="4" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="#1f6fc4" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

const COLD_BODY =
  face("#A9D8F5", "#4A90C2") +
  eyes([0, 0.5], [0, 0.5]) +
  mouthPath("M16 25.5l8-2.5", 2.4) + mouthPath("M48 25.5l-8-2.5", 2.4) +
  `<rect x="20" y="44.5" width="24" height="10" rx="2.5" fill="#ffffff" stroke="${FEATURE}" stroke-width="2.2"/>` +
  `<path d="M20.5 49.5l2.9-3.4l2.9 3.4l2.9-3.4l2.9 3.4l2.9-3.4l2.9 3.4l2.9-3.4l2.9 3.4" fill="none" stroke="${FEATURE}" stroke-width="1.6" stroke-linejoin="round"/>` +
  snowflake(52.5, 10.5, 8.5);

export function coldIcon(options) {
  return wrap(COLD_BODY, options);
}

// ---------------------------------------------------------------- hot
/* Orange-red face, tired lids, open panting mouth, sweat drop, thermometer top left. */
const HOT_BODY =
  face("#FF8A4C", "#D2531F") +
  eyes([0, 1.5], [0, 1.5]) +
  `<path d="M17 33a6 6 0 0 1 12 0Z" fill="#F07436" stroke="${FEATURE}" stroke-width="2" stroke-linejoin="round"/>` +
  `<path d="M35 33a6 6 0 0 1 12 0Z" fill="#F07436" stroke="${FEATURE}" stroke-width="2" stroke-linejoin="round"/>` +
  `<path d="M23 46h18a9 8.5 0 0 1-18 0Z" fill="#7a1f0f" stroke="${FEATURE}" stroke-width="2.2" stroke-linejoin="round"/>` +
  `<path d="M27 51.5a5 3.2 0 0 1 10 0a5 2.6 0 0 1-10 0Z" fill="#ff9aa5"/>` +
  // sweat drop on the forehead
  `<path d="M46 15.5c-3.4 4.6-5 7.2-5 9.4a5 5 0 0 0 10 0c0-2.2-1.6-4.8-5-9.4Z" fill="#5fb4f0" ${WHITE_EDGE} stroke-width="1.6"/>` +
  `<path d="M44 24.5a2.4 2.4 0 0 0 1.6 2.4" fill="none" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>` +
  // thermometer, red almost to the top
  `<rect x="5.5" y="1.5" width="9" height="22" rx="4.5" fill="#ffffff" stroke="#ffffff" stroke-width="3"/>` +
  `<circle cx="10" cy="24" r="6.5" fill="#ffffff" stroke="#ffffff" stroke-width="3"/>` +
  `<rect x="6.5" y="2.5" width="7" height="21" rx="3.5" fill="#ffffff" stroke="${LINE}" stroke-width="1.6"/>` +
  `<rect x="8.6" y="6" width="2.8" height="16" fill="#e0332b"/>` +
  `<circle cx="10" cy="24" r="5" fill="#e0332b" stroke="${LINE}" stroke-width="1.6"/>`;

export function hotIcon(options) {
  return wrap(HOT_BODY, options);
}

// ---------------------------------------------------------------- pain
/* Warm red face (pain accent), squeezed eyes > <, furrowed brows, clenched teeth, a pain flash. */
const PAIN_BODY =
  face("#EE8B6F", "#C8553D") +
  mouthPath("M17.5 28.5l10 5l-10 5", 3.2) + mouthPath("M46.5 28.5l-10 5l10 5", 3.2) +
  mouthPath("M16 22.5l9 3", 2.6) + mouthPath("M48 22.5l-9 3", 2.6) +
  `<rect x="19" y="44.5" width="26" height="10" rx="2.5" fill="#ffffff" stroke="${FEATURE}" stroke-width="2.2"/>` +
  `<path d="M19.5 49.5h25M25.5 45v9M32 45v9M38.5 45v9" fill="none" stroke="${FEATURE}" stroke-width="1.5"/>` +
  // flash above the head, top right
  `<path d="M50 1.5l-6 10.5h5l-4 9.5l10-12.5h-5.2l4.2-7.5Z" fill="#c8553d" ${WHITE_EDGE} stroke-width="1.6"/>`;

export function painIcon(options) {
  return wrap(PAIN_BODY, options);
}

// ---------------------------------------------------------------- by id
const ICONS = {
  pain: painIcon,
  nauseous: nauseousIcon,
  dizzy: dizzyIcon,
  cold: coldIcon,
  hot: hotIcon,
};

export function hasIcon(kind) {
  return Object.hasOwn(ICONS, kind);
}

/** The icon for a kind ("pain", "nauseous", …) as an SVG string, or "" if there is none. */
export function iconSvg(kind, options) {
  return hasIcon(kind) ? ICONS[kind](options) : "";
}

/** The icon as a DOM node (to put inside an `.icon` span), or null. */
export function iconNode(kind, options) {
  if (!hasIcon(kind)) return null;
  const template = document.createElement("template");
  template.innerHTML = iconSvg(kind, options);
  return template.content.firstChild;
}
