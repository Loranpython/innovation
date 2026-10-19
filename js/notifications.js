/*
  notifications.js — the ONLY place where notifications are sent.

  Every screen calls (via ctx):
      ctx.sendNotification({ type, details })
        type:    "toilet" | "drink" | "food" | "pain" | "speech" | "symptom"
        details: object with type-specific data, e.g. { item: "water" }
                 (food: {} — the hospital chooses; see modules/food-drink)
        icon:    (optional) emoji shown on the confirmation screen; NOT sent

  It returns a Promise of { ok, mode: "online" | "local", id }.
  Screens do not have to await it: the confirmation screen (#/sent) does.

  How a request is delivered (one path, never both, so no duplicates):
      ONLINE  js/config.js is filled in:
              insert { patient, room, type, details } into Supabase via
              js/backend.js. On failure: one retry after 1.5 s.
              Success -> the id is remembered by js/request-status.js so
              the Home screen can show "Your nurse has seen your request".
      LOCAL   config.js is empty, OR both attempts failed:
              localStorage ("pcs_notifications") + BroadcastChannel, so
              nurse.html in the SAME browser still sees it (old demo setup).
              The confirmation screen then shows a clear WARNING.

  Double-tap protection: the same request TYPE cannot be sent again within
  10 seconds. The promise then gives { ok: false, duplicate: true } and the
  confirmation screen says "Already sent, the nurse is on the way".
  Not after a FAILED online send (offline warning): then a retry is allowed
  at once, because the nurse did not get the first one.
  (Food has an extra 30-minute limit: see modules/food-drink/food-cooldown.js.)
*/

import * as backend from "./backend.js";
import { trackRequest } from "./request-status.js";

export const STORAGE_KEY = "pcs_notifications";
export const CHANNEL_NAME = "pcs_notifications";
export const DUPLICATE_WINDOW_MS = 10_000;
const RETRY_DELAY_MS = 1500;

// Fallback icons for the confirmation screen when a screen gives none.
export const TYPE_ICONS = {
  toilet: "🚻",
  drink: "💧",
  food: "🍽️",
  pain: "😣",
  speech: "🗣️",
  symptom: "🩺",
};

let patientInfo = { patient: "Patient", room: "1" };
let channel = null;                 // created on first use
const lastSentAt = {};              // type -> time in ms of last send
let lastResult = null;              // what the confirmation screen shows

/** Called once by app.js with the patient + room from the URL. */
export function configureNotifications({ patient, room }) {
  patientInfo = { patient, room };
}

/**
 * Send a notification to the nurse.
 * Returns a Promise of { ok, mode: "online" | "local", id }
 * (or { ok: false, duplicate: true } within 10 s of the same type).
 * Never rejects.
 */
export function sendNotification({ type, details = {}, icon }) {
  const now = Date.now();
  const shownIcon = icon || TYPE_ICONS[type] || "🔔";

  // Double-tap protection
  if (lastSentAt[type] && now - lastSentAt[type] < DUPLICATE_WINDOW_MS) {
    console.info(`[notifications] "${type}" already sent less than 10 s ago, ignored.`);
    const outcome = { ok: false, duplicate: true, mode: null, id: null };
    lastResult = { ...outcome, type, icon: shownIcon, done: Promise.resolve(outcome) };
    return lastResult.done;
  }
  lastSentAt[type] = now;

  const request = { patient: patientInfo.patient, room: patientInfo.room, type, details };
  const done = deliver(request, shownIcon).then((outcome) => {
    // Online send failed (fell back to this device only): the nurse did NOT
    // get it, so a retry must not be answered with "Already sent".
    if (outcome.mode === "local" && backend.isConfigured() && lastSentAt[type] === now) {
      delete lastSentAt[type];
    }
    return outcome;
  });
  lastResult = { ok: null, duplicate: false, type, icon: shownIcon, done };
  return done;
}

/**
 * The most recent send (used by the "sent" screen):
 *   { duplicate, type, icon, done }   `done` = the Promise sendNotification returned
 */
export function getLastResult() {
  return lastResult;
}

/** Read all locally stored notifications (oldest first). Used by nurse.js in local mode. */
export function readStoredNotifications() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn("[notifications] could not read localStorage", error);
    return [];
  }
}

/** Change one locally stored notification and broadcast it. Used by nurse.js in local mode. */
export function updateStoredNotification(id, changes) {
  const list = readStoredNotifications();
  const notification = list.find((n) => n.id === id);
  if (!notification) throw new Error("Request not found");
  Object.assign(notification, changes);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("[notifications] could not save to localStorage", error);
  }
  broadcast(notification);
  return notification;
}

/** Remove all locally stored notifications. */
export function clearStoredNotifications() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[notifications] could not clear localStorage", error);
  }
}

// ---------------------------------------------------------------- internals

async function deliver(request, icon) {
  if (backend.isConfigured()) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const row = await backend.insertRequest(request);
        console.log("[notifications] sent (online)", row);
        trackRequest(row, icon);
        return { ok: true, mode: "online", id: row.id };
      } catch (error) {
        console.warn(`[notifications] online send failed (attempt ${attempt})`, error);
        if (attempt === 1) await wait(RETRY_DELAY_MS);
      }
    }
    console.warn("[notifications] falling back to local demo mode");
  }
  const notification = deliverLocally(request);
  return { ok: true, mode: "local", id: notification.id };
}

/** Old demo path: localStorage + BroadcastChannel (same browser only). */
function deliverLocally(request) {
  const notification = {
    id: makeId(),
    ...request,
    timestamp: new Date().toISOString(),
    status: "open",
  };
  console.log("[notifications] sent (local demo mode)", notification);

  // localStorage (can fail: private mode, full storage, blocked cookies…)
  try {
    const list = readStoredNotifications();
    list.push(notification);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (error) {
    console.warn("[notifications] could not save to localStorage", error);
  }
  broadcast(notification);
  return notification;
}

/** BroadcastChannel: live update for nurse.html in another tab of this browser. */
function broadcast(notification) {
  try {
    if (!channel && "BroadcastChannel" in window) {
      channel = new BroadcastChannel(CHANNEL_NAME);
    }
    channel?.postMessage(notification);
  } catch (error) {
    console.warn("[notifications] could not broadcast", error);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Short unique id like "n-lx3k9a-4f2c". */
function makeId() {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 6);
  return `n-${time}-${random}`;
}
