/*
  ui.js — small shared helpers to build the interface.

    el(tag, attrs, children)       create any HTML element in one line
    renderHeader(headerEl, ctx)    fill the top bar: "Room 12 · Jansen"
    createScreen(ctx, options)     sub-screen with ← Back button + title
    createBackButton(ctx, target)  square "← Back" button
    createTileGrid(cols, rows)     grid that keeps its tiles square
    createTile(options)            one big square tile (icon + label)

  Every interactive element is a real <button> with an aria-label.
*/

/**
 * Create an element.
 *   el("button", { class: "tile", "aria-label": "Toilet", onClick: fn }, ["🚻"])
 * Attributes starting with "on" become event listeners.
 * Children can be strings or elements.
 */
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (name.startsWith("on") && typeof value === "function") {
      element.addEventListener(name.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(name, value === true ? "" : value);
    }
  }
  for (const child of [].concat(children)) {
    if (child === null || child === undefined) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

/** Fill the header bar with room + patient name. */
export function renderHeader(headerEl, ctx) {
  headerEl.replaceChildren(
    el("span", { class: "app-header-info" }, [
      ctx.t("header.roomPatient", { room: ctx.room, patient: ctx.patient }),
    ])
  );
}

/** Square "← Back" button. Goes to `target` (default: home). */
export function createBackButton(ctx, target = "#/home") {
  const label = ctx.t("common.back");
  return el("button", {
    class: "back-button",
    type: "button",
    "aria-label": label,
    onClick: () => ctx.navigate(target),
  }, [
    el("span", { class: "icon", "aria-hidden": "true" }, ["←"]),
    el("span", {}, [label]),
  ]);
}

/**
 * A sub-screen: toolbar with Back button + title, and a body to fill.
 * Returns { root, body }. Put your content in `body`, append `root` to the container.
 */
export function createScreen(ctx, { title, backTo = "#/home", className = "" } = {}) {
  const body = el("div", { class: "screen-body" });
  const root = el("section", { class: `screen ${className}`.trim() }, [
    el("div", { class: "screen-toolbar" }, [
      createBackButton(ctx, backTo),
      title ? el("h1", { class: "screen-title" }, [title]) : null,
    ]),
    body,
  ]);
  return { root, body };
}

/**
 * Grid whose tiles stay square and always fit on the screen.
 * `layout` picks the number of columns/rows (defined in base.css):
 *   "2x2"   2 × 2 (home)
 *   "pair"  2 tiles: side by side in landscape, stacked in portrait
 *   "many"  up to 6 tiles: 3 × 2 in landscape, 2 × 3 in portrait
 */
export function createTileGrid(layout = "2x2") {
  return el("div", { class: `tile-grid tile-grid--${layout}` });
}

/**
 * One big square tile.
 *   createTile({ icon: "🚻", label: "Toilet", accent: "toilet", onClick })
 */
export function createTile({ icon, label, accent, onClick }) {
  return el("button", {
    class: "tile",
    type: "button",
    "data-accent": accent,
    "aria-label": label,
    onClick,
  }, [
    el("span", { class: "icon tile-icon", "aria-hidden": "true" }, [icon]),
    el("span", { class: "tile-label" }, [label]),
  ]);
}
