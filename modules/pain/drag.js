/*
  drag.js — dragging with pointer events (mouse, pen and touch).

    attachSensationDrag(tile, { iconHtml, onDrop })
        Press a feeling tile and move: a ghost of the icon follows the
        pointer. On release, onDrop(clientX, clientY) decides what happens
        (new spot, add to a marker, or nothing). A short tap is NOT a drag,
        so the tile's normal click (arm the feeling) still works.

    startMarkerMove(event, { marker, onDrop })
        Move a selected marker in the close-up. On release,
        onDrop(clientX, clientY) checks that it is still on the body.

  The tiles and the close-up SVG use touch-action: none (pain.css), so the
  browser does not scroll while dragging.
*/

const THRESHOLD = 8;          // px the pointer must move before it is a drag

/** Swallow the click that the browser fires right after a drag. */
function suppressNextClick() {
  const swallow = (event) => {
    event.stopPropagation();
    event.preventDefault();
  };
  window.addEventListener("click", swallow, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
}

/**
 * Follow one pointer from `startEvent` until it is released.
 * Handlers: onStart(e), onMove(e), onEnd(e) (only after a real drag), onCancel().
 */
export function trackPointerDrag(startEvent, { onStart, onMove, onEnd, onCancel }) {
  const { pointerId, clientX: startX, clientY: startY } = startEvent;
  const target = startEvent.currentTarget;
  let dragging = false;
  try { target.setPointerCapture(pointerId); } catch { /* e.g. synthetic events */ }

  function move(event) {
    if (event.pointerId !== pointerId) return;
    if (!dragging && Math.hypot(event.clientX - startX, event.clientY - startY) > THRESHOLD) {
      dragging = true;
      document.body.classList.add("pain-dragging");
      onStart?.(event);
    }
    if (dragging) {
      event.preventDefault();
      onMove?.(event);
    }
  }
  function finish(event, cancelled) {
    if (event.pointerId !== pointerId) return;
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    document.body.classList.remove("pain-dragging");
    if (!dragging) return;
    suppressNextClick();
    if (cancelled) onCancel?.();
    else onEnd?.(event);
  }
  const up = (event) => finish(event, false);
  const cancel = (event) => finish(event, true);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
}

export function attachSensationDrag(tile, { iconHtml, onDrop }) {
  tile.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    let ghost = null;
    const place = (e) => {
      ghost.style.transform = `translate(${e.clientX - 32}px, ${e.clientY - 32}px)`;
    };
    const removeGhost = () => ghost?.remove();
    trackPointerDrag(event, {
      onStart: (e) => {
        ghost = document.createElement("div");
        ghost.className = "pain-drag-ghost";
        ghost.setAttribute("aria-hidden", "true");
        ghost.innerHTML = iconHtml;
        document.body.append(ghost);
        place(e);
      },
      onMove: place,
      onEnd: (e) => { removeGhost(); onDrop(e.clientX, e.clientY); },
      onCancel: removeGhost,
    });
  });
}

export function startMarkerMove(event, { marker, svg, onDrop }) {
  const k = Number(marker.dataset.k || 1);
  trackPointerDrag(event, {
    onStart: () => marker.classList.add("is-moving"),
    onMove: (e) => {
      const point = svg.createSVGPoint();
      point.x = e.clientX;
      point.y = e.clientY;
      const { x, y } = point.matrixTransform(svg.getScreenCTM().inverse());
      marker.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
    },
    onEnd: (e) => {
      marker.classList.remove("is-moving");
      onDrop(e.clientX, e.clientY);
    },
    onCancel: () => onDrop(null, null),
  });
}
