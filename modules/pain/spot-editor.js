/*
  spot-editor.js — the right-hand panel of the pain screen. It shows:

    PALETTE  (no spot selected)
      8 sensation tiles + "Spreads to…". Tap a tile to ARM it, then tap the
      body ("tool-first"); or drag a tile onto the body / onto a marker.

    EDITOR   (a spot is selected)
      "2 · Right hand (Front)" + Done, the pain level for this spot,
      "What does it feel like here?" toggles, "Spreads to…" with its
      targets (× to remove) and "Delete spot" (with a square inline confirm).

  createSidePanel() returns { el, update(state) }. update() rebuilds only
  when the panel switches between palette and another spot; otherwise it
  updates the existing elements (so slider drags and focus survive).
*/

import { el } from "../../js/ui.js";
import { SENSATIONS, radiatingIcon } from "./sensation-icons.js";
import { regionName } from "./body-regions.js";
import { markerSvg } from "./body-map.js";
import { createLevelPicker } from "./level-picker.js";

/** One square sensation tile (shared look with the old sensation buttons). */
function sensationTile({ id, iconHtml, label, focusKey, onClick }) {
  const button = el("button", {
    type: "button",
    class: "pain-sensation",
    "aria-label": label,
    "data-sensation": id,
    "data-focus-key": focusKey,
    onClick,
  });
  button.innerHTML = iconHtml;
  button.append(
    el("span", { class: "pain-sensation-label" }, [label]),
    el("span", { class: "pain-sensation-check", "aria-hidden": "true" }),
  );
  return button;
}

export function createSidePanel({ t, store, viewLabel, attachTileDrag }) {
  const root = el("div", { class: "pain-side" });
  let shownKey = null;
  let parts = null;            // elements of the current palette / editor

  // ---------------------------------------------------------------- palette
  function buildPalette() {
    const tiles = SENSATIONS.map(({ id, icon }) => {
      const tile = sensationTile({
        id,
        iconHtml: icon(),
        label: t(`pain.sensation.${id}`),
        focusKey: `palette:${id}`,
        onClick: () => store.arm(id),
      });
      tile.classList.add("pain-tool-tile");
      attachTileDrag?.(tile, id);
      return tile;
    });
    const spreadTile = sensationTile({
      id: "radiating",
      iconHtml: radiatingIcon(),
      label: t("pain.spreadsToButton"),
      focusKey: "palette:radiating",
      onClick: () => (store.state.mode === "radiating" ? store.cancelMode() : store.startRadiating()),
    });
    spreadTile.classList.add("pain-tool-tile", "pain-sensation--radiate");

    const section = el("section", { class: "pain-box pain-sensations pain-palette" }, [
      el("h2", { class: "pain-heading" }, [t("pain.sensationHeading")]),
      el("p", { class: "pain-palette-hint" }, [t("pain.paletteHint")]),
      el("div", { class: "pain-palette-grid" }, [...tiles, spreadTile]),
    ]);
    return { el: section, tiles, spreadTile };
  }

  function updatePalette(state) {
    for (const tile of parts.tiles) {
      const armed = state.armedSensation === tile.dataset.sensation;
      tile.setAttribute("aria-pressed", String(armed));
      tile.classList.toggle("is-armed", armed);
    }
    const radiating = state.mode === "radiating";
    parts.spreadTile.setAttribute("aria-pressed", String(radiating));
    parts.spreadTile.classList.toggle("is-armed", radiating);
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

    const toggles = SENSATIONS.map(({ id, icon }) => sensationTile({
      id,
      iconHtml: icon(),
      label: t(`pain.sensation.${id}`),
      focusKey: `editor:${id}`,
      onClick: () => store.toggleSensation(spot.id, id),
    }));

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
      el("section", { class: "pain-box pain-sensations pain-editor-sensations" }, [
        el("h2", { class: "pain-heading" }, [t("pain.spotSensationHeading")]),
        el("div", { class: "pain-sensations-grid" }, toggles),
      ]),
      el("div", { class: "pain-box pain-editor-actions" }, [
        el("div", { class: "pain-editor-spreads" }, [spreadButton, targetList]),
        actions,
      ]),
    ]);
    return { el: editor, title, marker, picker, toggles, spreadButton, targetList };
  }

  function updateEditor(state, spot) {
    parts.marker.innerHTML = markerSvg(spot, 36);
    parts.title.textContent = `${spot.number} · ${regionName(spot.region, t)} (${viewLabel(spot.view)})`;
    parts.picker.update(spot.level);
    parts.picker.el.classList.toggle("is-missing", state.highlightMissing && spot.level === null);
    for (const toggle of parts.toggles) {
      toggle.setAttribute("aria-pressed", String(spot.sensations.includes(toggle.dataset.sensation)));
    }
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
    const key = spot ? `spot:${spot.id}` : "palette";
    if (key !== shownKey) {
      shownKey = key;
      parts = spot ? buildEditor(spot) : buildPalette();
      root.replaceChildren(parts.el);
      root.classList.toggle("is-editing", Boolean(spot));
    }
    if (spot) updateEditor(state, spot);
    else updatePalette(state);
  }

  return { el: root, update };
}
