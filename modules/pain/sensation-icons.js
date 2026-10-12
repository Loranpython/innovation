/*
  sensation-icons.js — "What does it feel like?" pictograms + the list of
  sensations.

  Every pictogram shows a BODY ELEMENT (skin line, limb segment or hand)
  plus the SENSATION acting on it. That relation makes them readable
  without words. Rules, so they form one set:
    - viewBox 0 0 48 48, stroke-based, currentColor, stroke width 2.5
    - square line caps, miter joins (matches our square look), fill none
    - the sensation part uses the accent colour (--pain-accent)
    - readable at 40px: no tiny details, no text

  To ADD a sensation:
    1. write a function below that returns the SVG string
    2. add { id, icon } to SENSATIONS
    3. add "pain.sensation.<id>" to every language in js/strings.js
    4. check it in icons-preview.html next to the others
*/

const ACCENT_FILL = 'style="fill: var(--pain-accent)"';
const ACCENT_STROKE = 'style="stroke: var(--pain-accent)"';

function svg(content, className = "") {
  return `<svg viewBox="0 0 48 48" class="sensation-icon ${className}" aria-hidden="true" ` +
    `fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">` +
    content + `</svg>`;
}

// Open hand, palm facing us: four fingers, thumb on the right, open wrist.
const HAND = "M6 46 L3 40 V15 H9 V27 H12 V8 H18 V27 H21 V6 H27 V27 H30 V10 H36 V30 L44 22 L47 25 L39 37 V46";

/** Sharp / stabbing: a blade tip pushing into the skin, with impact lines. */
export function sharpIcon() {
  return svg(`
    <path d="M3 32 C14 32 18 39 23 39 C28 39 32 32 45 32"/>
    <path d="M23 39 L29 7 L37 10 Z"/>
    <path ${ACCENT_STROKE} d="M15 30 L8 27 M17 24 L13 17 M32 32 L39 29"/>`);
}

/** Burning: flames rising from the skin, with heat waves. */
export function burningIcon() {
  return svg(`
    <path d="M3 43 H45"/>
    <path ${ACCENT_FILL} d="M24 41 C16 41 13 34 16 28 C18 24 21 22 21 14 C26 18 27 23 27 27 C29 25 30 22 29 19 C34 24 35 30 33 35 C31 39 28 41 24 41 Z"/>
    <path ${ACCENT_FILL} d="M10 41 C6 41 4 37 6 33 C7 31 9 29 9 24 C12 27 15 32 15 36 C15 39 13 41 10 41 Z"/>
    <path ${ACCENT_FILL} d="M38 41 C35 41 33 39 33 36 C33 32 36 28 39 25 C39 29 41 31 42 33 C44 37 42 41 38 41 Z"/>
    <path d="M9 17 Q12 14 9 11 Q6 8 9 5 M39 17 Q42 14 39 11 Q36 8 39 5"/>`);
}

/** Dull ache: a heavy weight resting on a limb, pressing it in. */
export function achingIcon() {
  return svg(`
    <path d="M3 30 H12 C16 30 18 35 24 35 C30 35 32 30 36 30 H45 M3 44 H45"/>
    <path ${ACCENT_FILL} d="M14 31 C14 21 18 15 24 15 C30 15 34 21 34 31 C31 34 28 35 24 35 C20 35 17 34 14 31 Z"/>
    <path d="M19 15 V8 H29 V15"/>`);
}

/** Throbbing: a dot on a limb with pulses radiating out on both sides. */
export function throbbingIcon() {
  return svg(`
    <path d="M3 17 H4 M12 17 H36 M44 17 H45 M3 31 H4 M12 31 H36 M44 31 H45"/>
    <circle ${ACCENT_FILL} stroke="none" cx="24" cy="24" r="4.5"/>
    <path ${ACCENT_STROKE} d="M16 19 Q13 24 16 29 M32 19 Q35 24 32 29"/>
    <path ${ACCENT_STROKE} d="M10 11 Q3 24 10 37 M38 11 Q45 24 38 37"/>`);
}

/** Shooting: a zigzag bolt travelling along a limb, ending in an arrow. */
export function shootingIcon() {
  return svg(`
    <path d="M3 13 H45 M3 35 H45"/>
    <path ${ACCENT_STROKE} d="M5 24 L11 19 L17 29 L23 19 L29 29 L33 24"/>
    <path ${ACCENT_FILL} stroke="none" d="M32 16 L44 24 L32 32 Z"/>`);
}

/** Pins & needles: an open hand with small prickles over it. */
export function tinglingIcon() {
  return svg(`
    <path d="${HAND}"/>
    <g ${ACCENT_FILL} stroke="none">
      <rect x="4.5" y="7" width="3.5" height="3.5"/>
      <rect x="13.5" y="1" width="3.5" height="3.5"/>
      <rect x="31" y="3.5" width="3.5" height="3.5"/>
      <rect x="9" y="32" width="3.5" height="3.5"/>
      <rect x="17" y="38" width="3.5" height="3.5"/>
      <rect x="22" y="31" width="3.5" height="3.5"/>
      <rect x="30" y="38" width="3.5" height="3.5"/>
    </g>`);
}

/** Cramping / tight: a limb pinched in the middle, squeezed by two arrows. */
export function crampingIcon() {
  return svg(`
    <path d="M3 16 H13 L24 22 L35 16 H45 M3 32 H13 L24 26 L35 32 H45"/>
    <path ${ACCENT_STROKE} d="M24 2 V13 M19 9 L24 14 L29 9 M24 46 V35 M19 39 L24 34 L29 39"/>`);
}

/**
 * Numb: a faded, dashed hand with a "no signal" mark next to it.
 * Uses a simpler hand (fingers closed) so the dashes run along long edges
 * and the shape stays readable; the detailed HAND falls apart when dashed.
 */
export function numbIcon() {
  return svg(`
    <g opacity="0.6" stroke-dasharray="6 3.5" stroke-linecap="butt">
      <path d="M8 46 V14 H30 V31 L38 24 L42 28 L31 40 V46"/>
      <path d="M15.5 14 V26 M22.5 14 V26"/>
    </g>
    <circle ${ACCENT_STROKE} cx="39" cy="9" r="7"/>
    <path ${ACCENT_STROKE} d="M34 4 L44 14"/>`);
}

/**
 * Spreads to… (radiating pain): a dot on a limb with dashed arrows fanning
 * out along it. Not a sensation type; used for the "Spreads to" tool.
 */
export function radiatingIcon() {
  return svg(`
    <path d="M3 9 H45 M3 39 H45"/>
    <circle ${ACCENT_FILL} stroke="none" cx="9" cy="24" r="5"/>
    <g ${ACCENT_STROKE} stroke-dasharray="4 3" stroke-linecap="butt">
      <path d="M16 24 H36 M16 21 L35 13 M16 27 L35 35"/>
    </g>
    <g ${ACCENT_STROKE}>
      <path d="M38 19 L44 24 L38 29 M33 9.5 L39 12 L35 17 M33 38.5 L39 36 L35 31"/>
    </g>`);
}

/** The sensations, in the order they appear. Labels: "pain.sensation.<id>". */
export const SENSATIONS = [
  { id: "sharp", icon: sharpIcon },
  { id: "burning", icon: burningIcon },
  { id: "aching", icon: achingIcon },
  { id: "throbbing", icon: throbbingIcon },
  { id: "shooting", icon: shootingIcon },
  { id: "tingling", icon: tinglingIcon },
  { id: "cramping", icon: crampingIcon },
  { id: "numb", icon: numbIcon },
];
