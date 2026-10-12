/*
  body-figure.js — the human body chart (inline SVG) for the pain screen.

  Draws a neutral standing figure (like a medical body chart: arms a bit
  away from the body, palms forward) in FRONT or BACK view.
  Every body part is its own clickable SVG shape with:
      id="pain-front-left_knee"   data-region="left_knee"

  ┌─────────────────────── LEFT / RIGHT — IMPORTANT ───────────────────────┐
  │ "left" and "right" are ALWAYS from the PATIENT's point of view.         │
  │ FRONT view: the figure faces you, so the patient's LEFT side is on the  │
  │             RIGHT of the screen (like looking at someone in front of    │
  │             you).                                                       │
  │ BACK view:  you look at the patient's back, so their LEFT side is on    │
  │             the LEFT of the screen.                                     │
  │ The sidePair() helper below handles this — do not swap it by hand.      │
  └────────────────────────────────────────────────────────────────────────┘

  Coordinates use a 200 × 440 box (viewBox). Shapes are written once for
  the LEFT half of the screen and mirrored for the right half.
*/

const SVG_NS = "http://www.w3.org/2000/svg";
const WIDTH = 200;
const HEIGHT = 440;

// ---------------------------------------------------------------- shapes
// Points [x, y] for the body parts on the LEFT half of the screen.

const HEAD = { ellipse: { cx: 100, cy: 30, rx: 19, ry: 23 } };
const NECK = [[91, 50], [109, 50], [111, 68], [89, 68]];
const CHEST = [[89, 68], [111, 68], [132, 74], [134, 100], [131, 140], [69, 140], [66, 100], [68, 74]];
const ABDOMEN = [[69, 140], [131, 140], [129, 166], [132, 192], [68, 192], [71, 166]];
const PELVIS = [[68, 192], [132, 192], [135, 212], [133, 229], [100, 233], [67, 229], [65, 212]];

const SHOULDER = [[68, 74], [66, 100], [51, 98], [52, 86], [58, 77]];
const UPPER_ARM = [[51, 98], [66, 100], [62, 130], [57, 165], [41, 163], [45, 130]];
const FOREARM = [[41, 163], [57, 165], [50, 200], [44, 228], [31, 226], [34, 195]];
const HAND = [[31, 226], [44, 228], [47, 242], [44, 258], [37, 263], [30, 259], [27, 243]];
const THIGH = [[67, 229], [99, 233], [97, 266], [95, 300], [73, 300], [68, 262]];
const KNEE = [[73, 300], [95, 300], [95, 326], [75, 326]];
const LOWER_LEG = [[75, 326], [95, 326], [94, 360], [91, 398], [79, 398], [74, 360]];
const FOOT = [[79, 398], [91, 398], [93, 410], [92, 420], [69, 420], [71, 410]];

// Back view: shoulders + chest together form the upper back.
const UPPER_BACK = [
  [68, 74], [89, 68], [111, 68], [132, 74], [142, 77], [148, 86], [149, 98], [134, 100],
  [131, 140], [69, 140], [66, 100], [51, 98], [52, 86], [58, 77],
];

/** Mirror points from the left half of the screen to the right half. */
function mirror(points) {
  return points.map(([x, y]) => [WIDTH - x, y]);
}

/**
 * Make the left + right version of one body part.
 * `screenLeftPoints` = the shape drawn on the LEFT half of the screen.
 * FRONT view: screen-left is the patient's RIGHT side.
 * BACK view:  screen-left is the patient's LEFT side.
 */
function sidePair(name, screenLeftPoints, view) {
  const screenLeftSide = view === "front" ? "right" : "left";
  const screenRightSide = view === "front" ? "left" : "right";
  return [
    { region: `${screenLeftSide}_${name}`, shape: screenLeftPoints },
    { region: `${screenRightSide}_${name}`, shape: mirror(screenLeftPoints) },
  ];
}

// ---------------------------------------------------------------- regions
// Region ids are also the translation keys in strings.js ("region.<id>").

export const FRONT_REGIONS = [
  { region: "head", shape: HEAD },
  { region: "neck", shape: NECK },
  { region: "chest", shape: CHEST },
  { region: "abdomen", shape: ABDOMEN },
  { region: "pelvis", shape: PELVIS },
  ...sidePair("shoulder", SHOULDER, "front"),
  ...sidePair("upper_arm", UPPER_ARM, "front"),
  ...sidePair("forearm", FOREARM, "front"),
  ...sidePair("hand", HAND, "front"),
  ...sidePair("thigh", THIGH, "front"),
  ...sidePair("knee", KNEE, "front"),
  ...sidePair("lower_leg", LOWER_LEG, "front"),
  ...sidePair("foot", FOOT, "front"),
];

export const BACK_REGIONS = [
  { region: "back_of_head", shape: HEAD },
  { region: "back_of_neck", shape: NECK },
  { region: "upper_back", shape: UPPER_BACK },
  { region: "lower_back", shape: ABDOMEN },
  { region: "buttocks", shape: PELVIS },
  ...sidePair("upper_arm", UPPER_ARM, "back"),   // arms: same ids as front
  ...sidePair("forearm", FOREARM, "back"),
  ...sidePair("hand", HAND, "back"),
  ...sidePair("back_thigh", THIGH, "back"),
  ...sidePair("back_knee", KNEE, "back"),
  ...sidePair("calf", LOWER_LEG, "back"),
  ...sidePair("heel", FOOT, "back"),
];

// ---------------------------------------------------------------- drawing

function svg(tag, attrs = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  return element;
}

function shapeElement(shape) {
  if (shape.ellipse) return svg("ellipse", shape.ellipse);
  return svg("polygon", { points: shape.map((p) => p.join(",")).join(" ") });
}

/**
 * Build the SVG figure.
 *   view:       "front" | "back"
 *   t:          translation function (for labels)
 *   isSelected: (regionId) => boolean
 *   onToggle:   (regionId) => void   called when a region is tapped
 * Returns the <svg> element.
 */
export function createBodyFigure({ view, t, isSelected, onToggle }) {
  const regions = view === "front" ? FRONT_REGIONS : BACK_REGIONS;
  const root = svg("svg", {
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    class: `body-figure body-figure--${view}`,
    role: "group",
    "aria-label": t(view === "front" ? "pain.viewFront" : "pain.viewBack"),
  });

  for (const { region, shape } of regions) {
    const element = shapeElement(shape);
    element.setAttribute("id", `pain-${view}-${region}`);
    element.setAttribute("data-region", region);
    element.setAttribute("class", "body-region");
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", t(`region.${region}`));
    element.setAttribute("aria-pressed", String(isSelected(region)));
    element.addEventListener("click", () => onToggle(region));
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle(region);
      }
    });
    root.append(element);
  }

  root.append(...decorations(view, t));
  return root;
}

/** Update the selected look of all regions without redrawing. */
export function updateBodyFigure(svgElement, isSelected) {
  for (const element of svgElement.querySelectorAll(".body-region")) {
    element.setAttribute("aria-pressed", String(isSelected(element.dataset.region)));
  }
}

/**
 * Non-clickable details: face (front) or spine (back), plus the side
 * letters so patient and nurse see which side is which.
 */
function decorations(view, t) {
  const items = [];
  if (view === "front") {
    items.push(
      svg("rect", { x: 92, y: 24, width: 4, height: 4, class: "body-detail-fill" }),
      svg("rect", { x: 104, y: 24, width: 4, height: 4, class: "body-detail-fill" }),
      svg("line", { x1: 94, y1: 40, x2: 106, y2: 40, class: "body-detail" })
    );
  } else {
    items.push(svg("line", { x1: 100, y1: 72, x2: 100, y2: 190, class: "body-detail body-detail--dashed" }));
  }

  // Patient's right is on the screen-left in front view, screen-right in back view.
  const screenLeft = view === "front" ? "Right" : "Left";
  const screenRight = view === "front" ? "Left" : "Right";
  for (const [x, side] of [[12, screenLeft], [188, screenRight]]) {
    const label = svg("text", { x, y: 24, class: "body-side-label", "text-anchor": "middle" });
    label.textContent = t(`pain.side${side}Short`);
    const title = svg("title");
    title.textContent = t(`pain.side${side}`);
    label.append(title);
    items.push(label);
  }

  for (const item of items) item.setAttribute("aria-hidden", "true");
  return items;
}
