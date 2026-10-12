/*
  request-status.js — patient side: "what happened to MY requests?"

  Remembers the requests sent from THIS device (online only) in localStorage
  ("pcs_my_requests"), so they survive a refresh:
      { id, type, icon, createdAt, status, doneAt }
  and keeps their status up to date:
      - ONE app-wide realtime subscription for this room (UPDATE events),
        started once by app.js, so navigating never creates duplicates
      - plus a poll every 15 s (fetchByIds) in case realtime misses something

  The Home screen shows getVisibleRequests() and re-draws on
  onRequestsChange(). Visible = not resolved, or resolved < 2 minutes ago.
  When a request becomes "acknowledged" a soft ding plays (if audio is
  unlocked, i.e. the patient has tapped the screen before).

  A request that no longer exists in the database (demo reset) is dropped.
*/

import * as backend from "./backend.js";
import { playDing } from "./sound.js";

const STORAGE_KEY = "pcs_my_requests";
const POLL_MS = 15_000;
const SHOW_RESOLVED_MS = 2 * 60_000;
const RANK = { open: 0, acknowledged: 1, resolved: 2 };

let requests = load();
const listeners = new Set();
let started = false;

/** Start the room subscription + poll. Called once by app.js. */
export function startRequestStatus({ room }) {
  if (started || !backend.isConfigured()) return;
  started = true;
  backend.subscribeRoom(room, (row) => applyRows([row]));
  setInterval(refresh, POLL_MS);
  refresh();
}

/** Remember a request that was just inserted (called by notifications.js). */
export function trackRequest(row, icon) {
  requests.push({
    id: row.id,
    type: row.type,
    icon,
    createdAt: row.created_at,
    status: row.status || "open",
    doneAt: null,
  });
  save();
  emit();
}

/** This device's requests to show on Home, newest first. */
export function getVisibleRequests() {
  prune();
  return [...requests].reverse();
}

/** Call `listener` whenever the list changes. Returns an unsubscribe function. */
export function onRequestsChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------- internals

async function refresh() {
  const waiting = requests.filter((r) => r.status !== "resolved").map((r) => r.id);
  if (waiting.length > 0) {
    try {
      const rows = await backend.fetchByIds(waiting);
      const found = new Set(rows.map((row) => row.id));
      // Gone from the database (demo reset): forget it.
      requests = requests.filter((r) => r.status === "resolved" || found.has(r.id));
      applyRows(rows);
    } catch (error) {
      console.warn("[request-status] poll failed", error);
    }
  }
  prune();
  save();
  emit();   // also lets "Done" disappear after 2 minutes
}

function applyRows(rows) {
  let changed = false;
  for (const row of rows) {
    const request = requests.find((r) => r.id === row?.id);
    if (!request || !(row.status in RANK)) continue;
    if (RANK[row.status] <= RANK[request.status]) continue;   // only forward
    if (row.status === "acknowledged") playDing({ volume: 0.12, notes: [660, 880] });
    if (row.status === "resolved") request.doneAt = Date.now();
    request.status = row.status;
    changed = true;
  }
  if (changed) {
    save();
    emit();
  }
}

function prune() {
  const now = Date.now();
  requests = requests.filter((r) => r.status !== "resolved" || now - (r.doneAt || 0) < SHOW_RESOLVED_MS);
}

function emit() {
  for (const listener of listeners) {
    try {
      listener();
    } catch (error) {
      console.error("[request-status] listener failed", error);
    }
  }
}

function load() {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(list) ? list.filter((r) => r && r.id && r.status in RANK) : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch (error) {
    console.warn("[request-status] could not save", error);
  }
}
