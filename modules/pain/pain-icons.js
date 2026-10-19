/*
  pain-icons.js — pictograms of the pain screen.

  Rules, so new pictograms match:
    - viewBox 0 0 48 48, stroke-based, currentColor, stroke width 2.5
    - square line caps, miter joins (matches our square look), fill none
    - the meaningful part uses the accent colour (--pain-accent)
    - readable at 40px: no tiny details, no text

  The eight sensation pictograms (sharp, burning, …) were removed after
  clinical feedback: they were not universal enough for patients with
  communication difficulties. Older notifications with sensations are still
  shown on the nurse dashboard (labels "pain.sensation.<id>" in strings.js).
*/

const ACCENT_FILL = 'style="fill: var(--pain-accent)"';
const ACCENT_STROKE = 'style="stroke: var(--pain-accent)"';

function svg(content, className = "") {
  return `<svg viewBox="0 0 48 48" class="pain-pictogram ${className}" aria-hidden="true" ` +
    `fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">` +
    content + `</svg>`;
}

/**
 * Spreads to (radiating pain): a dot on a limb with dashed arrows fanning
 * out along it. Used for the "Spreads to →" button in the spot editor.
 */
export function radiatingIcon() {
  return svg(`
    <path d="M3 9 H45 M3 39 H45"/>
    <circle ${ACCENT_FILL} stroke="none" cx="9" cy="24" r="5"/>
    <g ${ACCENT_STROKE} stroke-dasharray="4 3" stroke-linecap="butt">
      <path d="M16 24 H35 M16 22 L30 16.5 M16 26 L30 31.5"/>
    </g>
    <path ${ACCENT_FILL} stroke="none" d="M44 24 L35 19 L35 29 Z M38 13 L32.5 20.5 L29 12 Z M38 35 L32.5 27.5 L29 36 Z"/>`);
}
