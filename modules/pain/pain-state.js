/*
  pain-state.js — the single source of truth for the pain screen. No DOM.

  The patient places SPOTS on the body. Every spot has its own location
  and KIND: pain (with a level and optional places it spreads to) or a
  symptom felt at that place (nauseous, dizzy, cold, hot):

    spot = {
      id, number,                 // number 1, 2, 3… is shown on the marker
      view: "front" | "back",
      drawId,                     // drawn shape (internal, see body-regions.js)
      region,                     // PATIENT-perspective region id
      x, y,                       // coordinates in the 240 × 580 drawing
      kind: null | "pain" | "nauseous" | "dizzy" | "cold" | "hot",   // null until chosen
      level: null | 0..10,        // pain only; null until the patient chooses
      radiatesTo: [{ view, drawId, region, x, y }]   // pain only, same view as the spot
    }

  A spot is COMPLETE when it has a kind, and a level if the kind is pain.

  General symptoms (no place, no level) chosen on the same screen:
    symptoms: ["nauseous", "dizzy"]     // ids from symptoms.js

  Every change goes through a function below. Changes to the answers push
  a snapshot to `history` (for Undo); then all listeners are called once,
  and the screen re-renders.

  UI state lives here too (no history): selected spot,
  mode ("idle" | "radiating"), close-up, zoom, hint.
*/

import { toPatientRegion } from "./body-regions.js";

const HISTORY_LIMIT = 100;

/** A kind is chosen, and a level if the kind is pain. */
export function isSpotComplete(spot) {
  return spot.kind !== null && (spot.kind !== "pain" || spot.level !== null);
}
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.25;

export function createPainStore() {
  const state = {
    spots: [],
    symptoms: [],             // general symptom ids, in the order they were tapped
    selectedSpotId: null,
    mode: "idle",             // "idle" | "radiating"
    history: [],              // snapshots of { spots, symptoms, selectedSpotId } for Undo
    closeup: null,            // { view, drawId } or null = whole body
    zoom: 1,
    hint: null,               // { key, vars } short message for the patient
    highlightMissing: false,  // flag spots without a level (after "Review & send")
  };
  const listeners = new Set();
  let nextId = 1;
  let lastActionKey = null;   // to merge slider drags into one undo step

  // ---------------------------------------------------------------- helpers
  function emit() {
    for (const listener of listeners) listener(state);
  }

  function renumber() {
    state.spots.forEach((spot, index) => { spot.number = index + 1; });
  }

  /**
   * Change the answers. `actionKey` merges repeated actions into one undo
   * step (e.g. dragging the slider of one spot from 2 to 8).
   */
  function commit(fn, actionKey = null) {
    if (!actionKey || actionKey !== lastActionKey) {
      state.history.push(JSON.stringify({ spots: state.spots, symptoms: state.symptoms, selectedSpotId: state.selectedSpotId }));
      if (state.history.length > HISTORY_LIMIT) state.history.shift();
    }
    lastActionKey = actionKey;
    fn();
    renumber();
    state.hint = null;
    if (state.highlightMissing && allSpotsComplete()) state.highlightMissing = false;
    emit();
  }

  /** Change UI state only (not undoable). */
  function ui(fn) {
    lastActionKey = null;
    fn();
    emit();
  }

  function getSpot(id) {
    return state.spots.find((spot) => spot.id === id) ?? null;
  }

  function allSpotsComplete() {
    return state.spots.every(isSpotComplete);
  }

  // ---------------------------------------------------------------- spots
  function addSpot({ view, drawId, x, y }) {
    const spot = {
      id: `spot-${nextId++}`,
      number: 0,
      view,
      drawId,
      region: toPatientRegion(drawId, view),
      x, y,
      kind: null,               // the patient chooses consciously: nothing preselected
      level: null,
      radiatesTo: [],
    };
    commit(() => {
      state.spots.push(spot);
      state.selectedSpotId = spot.id;
      state.mode = "idle";
    });
    return spot;
  }

  /**
   * Pain or a symptom at this spot. Switching away from pain clears the
   * level and the places it spreads to (Undo brings them back).
   */
  function setKind(id, kind) {
    const spot = getSpot(id);
    if (!spot || spot.kind === kind) return;
    commit(() => {
      spot.kind = kind;
      if (kind !== "pain") {
        spot.level = null;
        spot.radiatesTo = [];
        if (state.mode === "radiating") state.mode = "idle";
      }
    });
  }

  /** Choosing a level makes the spot a pain spot (from no kind or a symptom). */
  function setLevel(id, level) {
    const spot = getSpot(id);
    if (!spot || (spot.kind === "pain" && spot.level === level)) return;
    if (spot.kind !== "pain") {
      commit(() => { spot.kind = "pain"; spot.level = level; });   // its own Undo step
      return;
    }
    commit(() => { spot.level = level; }, `level:${id}`);
  }

  function moveSpot(id, { drawId, x, y }) {
    const spot = getSpot(id);
    if (!spot) return;
    commit(() => {
      spot.drawId = drawId;
      spot.region = toPatientRegion(drawId, spot.view);
      spot.x = x;
      spot.y = y;
    });
  }

  function removeSpot(id) {
    commit(() => {
      state.spots = state.spots.filter((spot) => spot.id !== id);
      if (state.selectedSpotId === id) state.selectedSpotId = null;
      if (state.mode === "radiating") state.mode = "idle";
    });
  }

  // ---------------------------------------------------------------- radiation
  /** Add a place the pain spreads to. Must be on the same view as the spot. */
  function addRadiation(id, { view, drawId, x, y }) {
    const spot = getSpot(id);
    if (!spot || spot.kind !== "pain") return false;
    if (view !== spot.view) {
      ui(() => { state.hint = { key: "pain.radiateSameSide" }; });
      return false;
    }
    commit(() => {
      spot.radiatesTo = [...spot.radiatesTo, { view, drawId, region: toPatientRegion(drawId, view), x, y }];
    });
    return true;
  }

  function removeRadiation(id, index) {
    const spot = getSpot(id);
    if (!spot) return;
    commit(() => { spot.radiatesTo = spot.radiatesTo.filter((_, i) => i !== index); });
  }

  // ---------------------------------------------------------------- symptoms
  /** Select or unselect a general symptom (nauseous, dizzy, cold, hot). */
  function toggleSymptom(id) {
    commit(() => {
      state.symptoms = state.symptoms.includes(id)
        ? state.symptoms.filter((symptom) => symptom !== id)
        : [...state.symptoms, id];
    });
  }

  // ---------------------------------------------------------------- undo / reset
  function undo() {
    const last = state.history.pop();
    if (!last) return;
    const snapshot = JSON.parse(last);
    lastActionKey = null;
    state.spots = snapshot.spots;
    state.symptoms = snapshot.symptoms ?? [];
    state.selectedSpotId = getSpot(snapshot.selectedSpotId) ? snapshot.selectedSpotId : null;
    if (state.mode === "radiating" && !getSpot(state.selectedSpotId)) state.mode = "idle";
    state.hint = null;
    emit();
  }

  /** Start over: clears all answers (can be undone). */
  function reset() {
    commit(() => {
      state.spots = [];
      state.symptoms = [];
      state.selectedSpotId = null;
      state.mode = "idle";
      state.closeup = null;
      state.zoom = 1;
      state.highlightMissing = false;
    });
  }

  // ---------------------------------------------------------------- UI state
  function select(id) {
    ui(() => {
      state.selectedSpotId = getSpot(id) ? id : null;
      state.hint = null;
    });
  }

  function startRadiating() {
    ui(() => {
      state.mode = "radiating";
      state.hint = null;
    });
  }

  /** Leave radiating mode. */
  function cancelMode() {
    ui(() => {
      state.mode = "idle";
      state.hint = null;
    });
  }

  function openCloseup(view, drawId) {
    ui(() => { state.closeup = { view, drawId }; state.zoom = 1; });
  }

  function closeCloseup() {
    ui(() => { state.closeup = null; });
  }

  function setZoom(zoom) {
    ui(() => { state.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)); });
  }

  function setHint(key, vars = {}) {
    ui(() => { state.hint = key ? { key, vars } : null; });
  }

  /** "Review & send" pressed too early: flag the incomplete spots and select the first. */
  function flagIncomplete() {
    ui(() => {
      state.highlightMissing = true;
      state.hint = { key: state.spots.some((spot) => spot.kind === null) ? "pain.needsKind" : "pain.needsLevel" };
      const first = state.spots.find((spot) => !isSpotComplete(spot));
      if (first) state.selectedSpotId = first.id;
      state.mode = "idle";
    });
  }

  // ---------------------------------------------------------------- derived
  function selectedSpot() {
    return getSpot(state.selectedSpotId);
  }

  function painSpots() {
    return state.spots.filter((spot) => spot.kind === "pain");
  }

  /** Highest level of the pain spots (null if there is none). */
  function maxLevel() {
    const levels = painSpots().map((spot) => spot.level).filter((level) => level !== null);
    return levels.length ? Math.max(...levels) : null;
  }

  /** Something to send, and every spot complete (a kind; a level for pain). */
  function canReview() {
    return !isEmpty() && allSpotsComplete();
  }

  function isEmpty() {
    return state.spots.length === 0 && state.symptoms.length === 0;
  }

  return {
    state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSpot, selectedSpot, painSpots, maxLevel, canReview, isEmpty,
    addSpot, setKind, setLevel, moveSpot, removeSpot,
    addRadiation, removeRadiation, toggleSymptom, undo, reset,
    select, startRadiating, cancelMode, openCloseup, closeCloseup, setZoom, setHint,
    flagIncomplete,
  };
}
