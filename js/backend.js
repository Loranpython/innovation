/*
  backend.js — the ONLY file that talks to Supabase.

  Table: public.notifications (see supabase/setup.sql)
    { id, patient, room, type, details, status, created_at,
      acknowledged_at, resolved_at }
  status: "open" -> "acknowledged" -> "resolved" (or "open" -> "resolved").
  The database sets the timestamps and refuses any other change.

  Functions (all return Promises, all throw on failure):
    isConfigured()                       false = local demo mode (config.js empty)
    insertRequest({ patient, room, type, details })  -> row
    updateStatus(id, "acknowledged" | "resolved")    -> row
    fetchOpen()                          open + acknowledged rows, oldest first
    fetchResolvedSince(isoTime)          resolved rows since then, newest first
    fetchByIds(ids)                      rows with these ids
    subscribe(onChange, onStatus)        every INSERT/UPDATE/DELETE  (nurse)
    subscribeRoom(room, onUpdate, onStatus)  UPDATEs for one room   (patient)
      onChange({ event, row, old }), onUpdate(row), onStatus("SUBSCRIBED" | ...)
      Both return an unsubscribe() function.

  supabase-js is loaded lazily with import() the first time it is needed.
  So in local demo mode nothing is downloaded, and if the CDN is down the
  patient screen still starts and falls back to local mode.
*/

import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";

// Exact pinned version: the ONE external dependency of this project.
const SUPABASE_ESM = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

const TABLE = "notifications";
const REQUEST_TIMEOUT_MS = 3000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let clientPromise = null;
let channelCount = 0;   // every channel gets its own name

export function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

export async function insertRequest({ patient, room, type, details }) {
  return run((db) => db.insert({ patient, room, type, details }).select().single());
}

export async function updateStatus(id, status) {
  return run((db) => db.update({ status }).eq("id", id).select().single());
}

export async function fetchOpen() {
  return run((db) => db.select("*")
    .in("status", ["open", "acknowledged"])
    .order("created_at", { ascending: true })
    .limit(500));
}

export async function fetchResolvedSince(isoTime) {
  return run((db) => db.select("*")
    .eq("status", "resolved")
    .gte("resolved_at", isoTime)
    .order("resolved_at", { ascending: false })
    .limit(200));
}

export async function fetchByIds(ids) {
  const valid = ids.filter((id) => UUID.test(id));
  if (valid.length === 0) return [];
  return run((db) => db.select("*").in("id", valid));
}

export function subscribe(onChange, onStatus = () => {}) {
  return listen(
    { event: "*", schema: "public", table: TABLE },
    (payload) => onChange({ event: payload.eventType, row: payload.new, old: payload.old }),
    onStatus
  );
}

export function subscribeRoom(room, onUpdate, onStatus = () => {}) {
  return listen(
    { event: "UPDATE", schema: "public", table: TABLE, filter: `room=eq.${room}` },
    (payload) => onUpdate(payload.new),
    onStatus
  );
}

// ---------------------------------------------------------------- internals

function getClient() {
  if (!isConfigured()) return Promise.reject(new Error("Supabase is not configured (js/config.js)"));
  if (!clientPromise) {
    clientPromise = import(SUPABASE_ESM)
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }))
      .catch((error) => {
        clientPromise = null;   // try loading again next time
        throw error;
      });
  }
  return clientPromise;
}

/** Run one query on the table with a timeout. Returns data or throws. */
async function run(buildQuery) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const client = await withTimeout(getClient(), REQUEST_TIMEOUT_MS);
    const { data, error } = await buildQuery(client.from(TABLE)).abortSignal(controller.signal);
    if (error) throw new Error(error.message || "Supabase error");
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Timed out")), ms)),
  ]);
}

function listen(filter, handler, onStatus) {
  let stopped = false;
  let client = null;
  let channel = null;

  getClient().then((loaded) => {
    if (stopped) return;
    client = loaded;
    channel = client
      .channel(`pcs-${TABLE}-${++channelCount}`)
      .on("postgres_changes", filter, handler)
      .subscribe((status, error) => onStatus(status, error));
  }).catch((error) => {
    console.warn("[backend] realtime unavailable", error);
    onStatus("CHANNEL_ERROR", error);
  });

  return function unsubscribe() {
    stopped = true;
    if (client && channel) client.removeChannel(channel);
  };
}
