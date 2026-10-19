/*
  food-cooldown.js — "Food" can be asked once per 30 minutes.

  The hospital brings food that fits the patient's diet, so one request is
  enough; pressing Food again within 30 minutes must not create another
  request or nurse card. ONLY food: water, toilet, pain, symptoms and speech
  are never limited by this (they keep the normal 10-second double-tap
  protection in js/notifications.js).

  The time is stored in localStorage per ROOM + PATIENT, so it survives a
  refresh and two patients (or rooms) on the same device never block each
  other:
      "pcs_food_requested:[\"12\",\"Jansen\"]" -> 1760870400000 (ms)

  It is only stored after a CONFIRMED online delivery (food-drink.js), so an
  offline attempt never blocks the next try.
*/

export const FOOD_COOLDOWN_MS = 30 * 60_000;

function storageKey(room, patient) {
  return `pcs_food_requested:${JSON.stringify([String(room), String(patient)])}`;
}

/**
 * Time (ms) of the last food request of this room + patient if it was less
 * than 30 minutes ago, otherwise null. A time in the future (clock changed)
 * counts as expired, so it can never block for good.
 */
export function recentFoodRequest(room, patient, now = Date.now()) {
  let at = NaN;
  try {
    at = Number(localStorage.getItem(storageKey(room, patient)));
  } catch {
    return null;                     // storage blocked: never block food
  }
  if (!Number.isFinite(at) || at <= 0) return null;
  const age = now - at;
  return age >= 0 && age < FOOD_COOLDOWN_MS ? at : null;
}

/** Remember a delivered food request (time in ms). */
export function rememberFoodRequest(room, patient, at = Date.now()) {
  try {
    localStorage.setItem(storageKey(room, patient), String(at));
  } catch (error) {
    console.warn("[food] could not remember the request time", error);
  }
}
