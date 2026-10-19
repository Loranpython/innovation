/*
  spot-editor.js — the right-hand panel of the pain screen. It shows:

    HINT     (no spot selected)
      "Tap where it hurts", short, so the body figures get the space.

    EDITOR   (a spot is selected)
      "2 · Right hand (Front)" + Done, the pain level for this spot,
      one "Spreads to →" button with its targets (× to remove) and
      "Delete spot" (with a square inline confirm).

  createSidePanel() returns { el, update(state) }. update() rebuilds only
  when the panel switches between the hint and another spot; otherwise it
  updates the existing elements (so slider drags and focus survive).
*/

import { el } from "../../js/ui.js";
import { radiatingIcon } from "./pain-icons.js";
import { regionName } from "./body-regions.js";
import { markerSvg } from "./body-map.js";
import { createLevelPicker } from "./level-picker.js";

export function createSidePanel({ t, store, viewLabel }) {
  const root = el("div", { class: "pain-side" });
  let shownKey = null;
  let parts = null;            // elements of the current hint / editor

  // ---------------------------------------------------------------- hint
  function buildHint() {
    const section = el("section", { class: "pain-box pain-side-hint" }, [
      el("span", { class: "icon pain-side-hint-icon", "aria-hidden": "true" }, ["👆"]),
      el("p", {}, [t("pain.bodyHint")]),
    ]);
    return { el: section };
  }

  // ---------------------------------------------------------------- editor
  function buildEditor(spot) {
    const title = el("h2", { class: "pain-editor-title" });
    const marker = el("span", { class: "pain-editor-marker" });
    const doneButton = el("button", {
      type: "button",
      class: "pain-editor-done",
      "aria-label": t("pain.done"),
      "data-focus-key": "editor:done",
      onClick: () => store.select(null),
    }, [t("pain.done")]);

    const picker = createLevelPicker({
      t,
      heading: t("pain.spotLevelHeading"),
      onChange: (level) => store.setLevel(spot.id, level),
    });

    const spreadButton = el("button", {
      type: "button",
      class: "pain-spreads",
      "aria-label": t("pain.spreadsToButton"),
      "data-focus-key": "editor:spreads",
      onClick: () => (store.state.mode === "radiating" ? store.cancelMode() : store.startRadiating()),
    });
    spreadButton.innerHTML = radiatingIcon();
    spreadButton.append(el("span", {}, [t("pain.spreadsToButton")]));
    const targetList = el("ul", { class: "pain-targets" });

    let confirming = false;
    const actions = el("div", { class: "pain-editor-delete" });
    function renderDelete() {
      if (!confirming) {
        actions.replaceChildren(el("button", {
          type: "button",
          class: "pain-delete",
          "aria-label": t("pain.deleteSpot"),
          "data-focus-key": "editor:delete",
          onClick: () => { confirming = true; renderDelete(); actions.querySelector("button")?.focus(); },
        }, [t("pain.deleteSpot")]));
        return;
      }
      actions.replaceChildren(
        el("span", { class: "pain-delete-question", role: "alert" }, [t("pain.deleteSpotConfirm", { n: store.getSpot(spot.id)?.number ?? "" })]),
        el("button", {
          type: "button",
          class: "pain-delete-cancel",
          "aria-label": t("pain.cancel"),
          onClick: () => { confirming = false; renderDelete(); },
        }, [t("pain.cancel")]),
        el("button", {
          type: "button",
          class: "pain-danger",
          "aria-label": t("pain.delete"),
          onClick: () => store.removeSpot(spot.id),
        }, [t("pain.delete")]),
      );
    }
    renderDelete();

    const editor = el("div", { class: "pain-editor", role: "region", "aria-label": t("pain.spot") }, [
      el("div", { class: "pain-box pain-editor-head" }, [marker, title, doneButton]),
      picker.el,
      el("div", { class: "pain-box pain-editor-actions" }, [
        el("div", { class: "pain-editor-spreads" }, [spreadButton, targetList]),
        actions,
      ]),
    ]);
    return { el: editor, title, marker, picker, spreadButton, targetList };
  }

  function updateEditor(state, spot) {
    parts.marker.innerHTML = markerSvg(spot, 36);
    parts.title.textContent = `${spot.number} · ${regionName(spot.region, t)} (${viewLabel(spot.view)})`;
    parts.picker.update(spot.level);
    parts.picker.el.classList.toggle("is-missing", state.highlightMissing && spot.level === null);
    const radiating = state.mode === "radiating";
    parts.spreadButton.setAttribute("aria-pressed", String(radiating));
    parts.targetList.replaceChildren(...spot.radiatesTo.map((target, index) => {
      const name = regionName(target.region, t);
      return el("li", {}, [el("button", {
        type: "button",
        class: "pain-target",
        "aria-label": t("pain.removeTarget", { place: name }),
        "data-focus-key": `target:${index}`,
        onClick: () => store.removeRadiation(spot.id, index),
      }, [name, el("span", { class: "pain-target-x", "aria-hidden": "true" }, ["×"])])]);
    }));
  }

  // ---------------------------------------------------------------- update
  function update(state) {
    const spot = store.selectedSpot();
    const key = spot ? `spot:${spot.id}` : "hint";
    if (key !== shownKey) {
      shownKey = key;
      parts = spot ? buildEditor(spot) : buildHint();
      root.replaceChildren(parts.el);
      root.classList.toggle("is-editing", Boolean(spot));
    }
    if (spot) updateEditor(state, spot);
  }

  return { el: root, update };
}
