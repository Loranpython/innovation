/*
  notifications.js — the ONLY place where notifications are sent.

  Every screen calls (via ctx):
      ctx.sendNotification({ type, details })
        type:    "toilet" | "drink" | "food" | "pain" | "speech"
        details: object with type-specific data, e.g. { item: "water" }
        icon:    (optional) emoji shown on the confirmation screen; NOT sent

  It builds this notification object:
      { id, type, details, patient, room, timestamp (ISO), status: "open" }
  and then:
      1. logs it to the console
      2. appends it to localStorage under "pcs_notifications"
      3. broadcasts it on BroadcastChannel("pcs_notifications"), so nurse.html
         open in another tab of the SAME browser receives it live (demo setup)

  ┌──────────────────────────────────────────────────────────────────────┐
  │ FUTURE BACKEND: later we replace steps 2 + 3 inside deliver() with a │
  │ real backend call (e.g. Firebase, or fetch() to a small API).        │
  │ Screens never talk to storage or the network themselves, so no       │
  │ screen code has to change when we do that.                           │
  └──────────────────────────────────────────────────────────────────────┘

  Double-tap protection: the same request TYPE cannot be sent again within
  10 seconds. sendNotification then returns { ok: false, duplicate: true }
  and the confirmation screen says "Already sent, the nurse is on the way".
*/

export const STORAGE_KEY = "pcs_notifications";
export const CHANNEL_NAME = "pcs_notifications";
export const DUPLICATE_WINDOW_MS = 10_000;

// Fallback icons for the confirmation screen when a screen gives none.
const TYPE_ICONS = {
  toilet: "🚻",
  drink: "💧",
  food: "🍽️",
  pain: "😣",
  speech: "🗣️",
};

let patientInfo = { patient: "Patient", room: "1" };
let channel = null;                 // created on first use
const lastSentAt = {};              // type -> time in ms of last successful send
let lastResult = null;              // what the confirmation screen shows

/** Called once by app.js with the patient + room from the URL. */
export function configureNotifications({ patient, room }) {
  patientInfo = { patient, room };
}

/**
 * Send a notification to the nurse.
 * Returns { ok: true, notification, icon } or { ok: false, duplicate: true, icon }.
 */
export function sendNotification({ type, details = {}, icon }) {
  const now = Date.now();
  const shownIcon = icon || TYPE_ICONS[type] || "🔔";

  // Double-tap protection
  if (lastSentAt[type] && now - lastSentAt[type] < DUPLICATE_WINDOW_MS) {
    console.info(`[notifications] "${type}" already sent less than 10 s ago, ignored.`);
    lastResult = { ok: false, duplicate: true, type, icon: shownIcon };
    return lastResult;
  }

  const notification = {
    id: makeId(),
    type,
    details,
    patient: patientInfo.patient,
    room: patientInfo.room,
    timestamp: new Date(now).toISOString(),
    status: "open",
  };

  deliver(notification);
  lastSentAt[type] = now;
  lastResult = { ok: true, notification, type, icon: shownIcon };
  return lastResult;
}

/** Result of the most recent sendNotification call (used by the "sent" screen). */
export function getLastResult() {
  return lastResult;
}

/** Read all stored notifications (oldest first). Used by nurse.html. */
export function readStoredNotifications() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn("[notifications] could not read localStorage", error);
    return [];
  }
}

/** Remove all stored notifications. Used by nurse.html. */
export function clearStoredNotifications() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[notifications] could not clear localStorage", error);
  }
}

// ---------------------------------------------------------------- internals

/** Delivery = the part we will swap for a real backend later. */
function deliver(notification) {
  // 1. Console
  console.log("[notifications] sent", notification);

  // 2. localStorage (can fail: private mode, full storage, blocked cookies…)
  try {
    const list = readStoredNotifications();
    list.push(notification);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("[notifications] could not save to localStorage", error);
  }

  // 3. BroadcastChannel (live update for nurse.html in another tab)
  try {
    if (!channel && "BroadcastChannel" in window) {
      channel = new BroadcastChannel(CHANNEL_NAME);
    }
    channel?.postMessage(notification);
  } catch (error) {
    console.warn("[notifications] could not broadcast", error);
  }
}

/** Short unique id like "n-lx3k9a-4f2c". */
function makeId() {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `n-${time}-${random}`;
}
