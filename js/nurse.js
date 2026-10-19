/*
  nurse.js — logic of the nurse dashboard (nurse.html).

  START SHIFT (a click is needed before browsers allow sound/notifications):
    - unlocks audio (WebAudio ding, js/sound.js)
    - asks permission for browser notifications (continues if refused)
    - loads open + acknowledged requests, starts the realtime subscription

  All requests live in one Map (id -> row), merged by id so nothing is ever
  shown twice. Three ways rows come in, all through upsert():
    1. realtime INSERT / UPDATE / DELETE (backend.subscribe)
    2. a poll every 10 s (fetchOpen + resolved in the last hour)
    3. our own button clicks (backend.updateStatus returns the new row)
  A status only ever moves forward (open -> acknowledged -> resolved), so an
  older poll result can never undo a newer realtime update.

  Lists: OPEN (oldest first, never re-sorted by severity), ACKNOWLEDGED,
  and a collapsible "Resolved (last hour)".

  LOCAL DEMO MODE (js/config.js empty): reads localStorage + listens on the
  BroadcastChannel like the old debug page; buttons change the local copy.
*/

import { setLanguage, t, hasString } from "./strings.js";
import * as backend from "./backend.js";
import { CHANNEL_NAME, TYPE_ICONS, readStoredNotifications, updateStoredNotification } from "./notifications.js";
import { unlockAudio, playDing } from "./sound.js";
import { el } from "./ui.js";

const POLL_MS = 10_000;
const TICK_MS = 30_000;
const WAITING_LONG_MS = 5 * 60_000;
const RESOLVED_WINDOW_MS = 60 * 60_000;
const HIGH_PAIN = 7;
const RANK = { open: 0, acknowledged: 1, resolved: 2 };

const params = new URLSearchParams(location.search);
const lang = setLanguage(params.get("lang") || "en");
const locale = lang === "no" ? "nb" : lang;
document.documentElement.lang = locale;

const localMode = !backend.isConfigured();

const requests = new Map();     // id -> row { id, patient, room, type, details, status, created_at, ... }
const pending = new Set();      // ids with a button click in progress
const errors = new Map();       // id -> inline error message
const arriving = new Set();     // ids to highlight on the next render
const announced = new Set();    // ids we already played a ding for
let initialLoadDone = false;
let wasLive = false;

const $ = (id) => document.getElementById(id);
const els = {
  title: $("nurse-title"),
  indicators: $("nurse-indicators"),
  connection: $("nurse-connection"),
  sound: $("nurse-sound"),
  notify: $("nurse-notify"),
  start: $("nurse-start"),
  startButton: $("nurse-start-button"),
  dashboard: $("nurse-dashboard"),
  error: $("nurse-error"),
  openHeading: $("nurse-open-heading"),
  openList: $("nurse-open-list"),
  ackHeading: $("nurse-ack-heading"),
  ackList: $("nurse-ack-list"),
  resolvedHeading: $("nurse-resolved-heading"),
  resolvedList: $("nurse-resolved-list"),
};

// ---------------------------------------------------------------- start

document.title = t("nurse.stationTitle");
els.title.textContent = t("nurse.stationTitle");
$("nurse-start-title").textContent = t("nurse.stationTitle");
$("nurse-start-hint").textContent = t("nurse.startHint");
els.startButton.textContent = t("nurse.startShift");
els.startButton.addEventListener("click", startShift, { once: true });

async function startShift() {
  const soundOn = unlockAudio();
  playDing({ volume: 0.15 });   // confirms sound works

  els.start.hidden = true;
  els.dashboard.hidden = false;
  els.indicators.hidden = false;
  els.sound.textContent = t(soundOn ? "nurse.soundOn" : "nurse.soundOff");
  showNotificationState();
  render();

  if (localMode) startLocal();
  else startOnline();
  setInterval(render, TICK_MS);   // "3 min ago", "Waiting 5+ min"

  if ("Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.warn("[nurse] notification permission failed", error);
    }
    showNotificationState();
  }
}

function showNotificationState() {
  const on = "Notification" in window && Notification.permission === "granted";
  els.notify.textContent = t(on ? "nurse.notificationsOn" : "nurse.notificationsOff");
}

// ---------------------------------------------------------------- online

function startOnline() {
  setConnection("connecting");
  backend.subscribe(onRealtime, onChannelStatus);
  poll();
  setInterval(poll, POLL_MS);
  window.addEventListener("offline", () => setConnection("offline"));
  window.addEventListener("online", poll);
}

function onChannelStatus(status) {
  if (status === "SUBSCRIBED") {
    if (!wasLive && initialLoadDone) poll();   // reconnected: catch up on missed events
    wasLive = true;
    setConnection("live");
  } else if (status === "CLOSED") {
    wasLive = false;
    setConnection("offline");
  } else {
    // CHANNEL_ERROR / TIMED_OUT: supabase-js keeps retrying by itself
    wasLive = false;
    setConnection(navigator.onLine === false ? "offline" : "reconnecting");
  }
}

function onRealtime({ event, row, old }) {
  if (event === "DELETE") {
    if (old?.id) requests.delete(old.id);   // demo reset in the SQL Editor
  } else if (row?.id) {
    const isNew = upsert(row);
    if (event === "INSERT" && isNew) announce(row);
  }
  render();
}

async function poll() {
  const startedAt = Date.now();
  try {
    const since = new Date(Date.now() - RESOLVED_WINDOW_MS).toISOString();
    const [active, resolved] = await Promise.all([backend.fetchOpen(), backend.fetchResolvedSince(since)]);
    const seen = new Set();
    for (const row of [...active, ...resolved]) {
      seen.add(row.id);
      const isNew = upsert(row);
      if (isNew && initialLoadDone) announce(row);   // missed by realtime
    }
    // Gone from the database (demo reset) or resolved > 1 h ago. Rows that
    // arrived while this poll was running are kept.
    for (const [id, row] of requests) {
      if (!seen.has(id) && row._seenAt < startedAt) requests.delete(id);
    }
    initialLoadDone = true;
    els.error.hidden = true;
  } catch (error) {
    console.warn("[nurse] poll failed", error);
    els.error.textContent = t("nurse.loadFailed");
    els.error.hidden = false;
    if (!wasLive) setConnection(navigator.onLine === false ? "offline" : "reconnecting");
  }
  render();
}

// ---------------------------------------------------------------- local demo mode

function startLocal() {
  setConnection("local");
  for (const notification of readStoredNotifications()) upsert(fromLocal(notification));
  initialLoadDone = true;
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      const row = fromLocal(event.data);
      if (upsert(row)) announce(row);
      render();
    });
  }
  render();
}

/** Old local notification { id, timestamp, ... } -> the same shape as a database row. */
function fromLocal(n) {
  return {
    id: n.id,
    patient: n.patient,
    room: n.room,
    type: n.type,
    details: n.details || {},
    status: n.status || "open",
    created_at: n.created_at || n.timestamp,
    acknowledged_at: n.acknowledged_at || null,
    resolved_at: n.resolved_at || null,
  };
}

function updateLocal(id, status) {
  const row = requests.get(id);
  if (!row || RANK[status] <= RANK[row.status]) throw new Error(`Invalid status change: ${row?.status} -> ${status}`);
  const now = new Date().toISOString();
  const changes = { status };
  if (status === "acknowledged") changes.acknowledged_at = now;
  if (status === "resolved") {
    changes.resolved_at = now;
    changes.acknowledged_at = row.acknowledged_at || now;
  }
  return fromLocal(updateStoredNotification(id, changes));
}

// ---------------------------------------------------------------- state

/** Merge a row by id; status only moves forward. Returns true if the id is new. */
function upsert(row) {
  if (!row?.id || !(row.status in RANK)) return false;
  const current = requests.get(row.id);
  if (current && RANK[current.status] > RANK[row.status]) return false;
  requests.set(row.id, { ...current, ...row, _seenAt: current?._seenAt ?? Date.now() });
  return !current;
}

/** A new request arrived: highlight, ding, browser notification if the tab is hidden. */
function announce(row) {
  if (row.status !== "open" || announced.has(row.id)) return;
  announced.add(row.id);
  arriving.add(row.id);
  playDing();
  if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
    try {
      const notification = new Notification(
        t("nurse.notifyTitle", { room: row.room, type: typeLabel(row.type) }),
        { body: summaryLine(row), tag: row.id }
      );
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.warn("[nurse] could not show notification", error);
    }
  }
}

async function setStatus(id, status) {
  pending.add(id);
  errors.delete(id);
  render();
  try {
    const row = localMode ? updateLocal(id, status) : await backend.updateStatus(id, status);
    upsert(row);
  } catch (error) {
    console.warn("[nurse] update failed", error);
    errors.set(id, t("nurse.updateFailed", { error: error.message }));
    if (!localMode) poll();   // maybe another nurse already changed it
  } finally {
    pending.delete(id);
    render();
  }
}

function setConnection(state) {
  const keys = {
    connecting: "nurse.connecting",
    live: "nurse.live",
    reconnecting: "nurse.reconnecting",
    offline: "nurse.offline",
    local: "nurse.localDemo",
  };
  els.connection.dataset.state = state;
  els.connection.textContent = state === "local" ? t(keys[state]) : `● ${t(keys[state])}`;
}

// ---------------------------------------------------------------- render

function render() {
  const now = Date.now();
  const all = [...requests.values()];
  const byCreated = (a, b) => time(a.created_at) - time(b.created_at);
  const open = all.filter((r) => r.status === "open").sort(byCreated);
  const acknowledged = all.filter((r) => r.status === "acknowledged").sort(byCreated);
  const resolved = all
    .filter((r) => r.status === "resolved" && now - time(r.resolved_at) < RESOLVED_WINDOW_MS)
    .sort((a, b) => time(b.resolved_at) - time(a.resolved_at));

  els.openHeading.textContent = `${t("nurse.openSection")} (${open.length})`;
  els.ackHeading.textContent = `${t("nurse.ackSection")} (${acknowledged.length})`;
  els.resolvedHeading.textContent = `${t("nurse.resolvedSection")} (${resolved.length})`;

  els.openList.replaceChildren(...(open.length ? open.map((r) => openCard(r, now)) : [empty("nurse.noOpen")]));
  els.ackList.replaceChildren(...(acknowledged.length ? acknowledged.map(ackCard) : [empty("nurse.noAck")]));
  els.resolvedList.replaceChildren(...(resolved.length ? resolved.map(resolvedItem) : [empty("nurse.noResolved")]));
  arriving.clear();

  const title = t("nurse.stationTitle");
  document.title = open.length ? `(${open.length}) ${title}` : title;
}

function openCard(row, now) {
  const age = now - time(row.created_at);
  const high = isHighPain(row);
  const card = el("li", {
    class: cls("nurse-card", "nurse-card--open", high && "is-high", arriving.has(row.id) && "is-arriving"),
    "data-id": row.id,
  });
  card.append(...[
    el("div", { class: "nurse-card-top" }, [
      el("span", { class: "nurse-card-who" }, [t("header.roomPatient", { room: row.room, patient: row.patient })]),
      el("span", { class: "nurse-badges" }, [
        high ? el("span", { class: "nurse-badge nurse-badge--high" }, [t("nurse.highPain")]) : null,
        age >= WAITING_LONG_MS
          ? el("span", { class: "nurse-badge nurse-badge--wait" }, [t("nurse.waitingLong")])
          : el("span", { class: "nurse-badge nurse-badge--new" }, [t("nurse.new")]),
      ]),
    ]),
    el("div", { class: "nurse-card-type-row" }, [
      el("span", { class: "nurse-card-type" }, [
        el("span", { class: "icon", "aria-hidden": "true" }, [TYPE_ICONS[row.type] || "🔔"]),
        typeLabel(row.type),
      ]),
      el("span", { class: "nurse-card-time" }, [`${clock(row.created_at)} · ${relative(age)}`]),
    ]),
    detailsElement(row),   // null for toilet: nothing to add
    actions(row, ["acknowledged", "resolved"]),
  ].filter(Boolean));
  return card;
}

function ackCard(row) {
  return el("li", { class: "nurse-card nurse-card--ack", "data-id": row.id }, [
    el("span", { class: "nurse-ack-text" }, [
      el("span", { class: "icon", "aria-hidden": "true" }, [TYPE_ICONS[row.type] || "🔔"]),
      el("span", {}, [
        el("strong", {}, [`${t("nurse.room", { room: row.room })} · ${typeLabel(row.type)}`]),
        el("br"),
        el("span", { class: "nurse-detail-muted" }, [
          `${row.patient} · ${t("nurse.seenAt", { time: clock(row.acknowledged_at) })}`,
        ]),
      ]),
    ]),
    actions(row, ["resolved"]),
  ]);
}

function resolvedItem(row) {
  return el("li", { class: "nurse-resolved-item" }, [
    el("span", { class: "icon", "aria-hidden": "true" }, [TYPE_ICONS[row.type] || "🔔"]),
    el("span", {}, [
      `${t("nurse.room", { room: row.room })} · ${row.patient} · ${typeLabel(row.type)} · `
        + t("nurse.resolvedAt", { time: clock(row.resolved_at) }),
    ]),
  ]);
}

function actions(row, statuses) {
  const busy = pending.has(row.id);
  const box = el("div", { class: "nurse-actions" });
  for (const status of statuses) {
    const label = t(status === "acknowledged" ? "nurse.acknowledge" : "nurse.resolve");
    box.append(el("button", {
      type: "button",
      class: status === "acknowledged" ? "nurse-button--ack" : "nurse-button--resolve",
      "aria-label": `${label}: ${t("nurse.room", { room: row.room })}, ${typeLabel(row.type)}`,
      disabled: busy,
      onClick: () => setStatus(row.id, status),
    }, [label]));
  }
  if (errors.has(row.id)) {
    box.append(el("span", { class: "nurse-card-error", role: "alert" }, [errors.get(row.id)]));
  }
  return box;
}

function empty(key) {
  return el("li", { class: "nurse-empty" }, [t(key)]);
}

// ---------------------------------------------------------------- request details

/** Readable details of a request (a node, or null for "toilet"). */
function detailsElement(row) {
  const d = row.details && typeof row.details === "object" ? row.details : {};
  const line = (text, className = "nurse-detail nurse-detail-main") => el("div", { class: className }, [text]);
  switch (row.type) {
    case "toilet":
      return null;
    case "drink":
    case "food":
      return line(foodDrinkText(row.type, d));
    case "speech":
      return el("div", { class: "nurse-detail" }, [
        line(t("nurse.detailLine", { type: typeLabel("speech"), value: d.translatedText ?? d.originalText ?? "" })),
        d.originalText && d.originalText !== d.translatedText
          ? line(t("nurse.speechOriginal", { lang: d.originalLang ?? "?", text: d.originalText }), "nurse-detail-muted")
          : null,
      ]);
    case "pain":
      return painDetails(d);
    case "symptom":
      // General symptoms: a plain list, never shown as pain, no urgency.
      return line(symptomList(d) || "?");
    default:
      return line(JSON.stringify(d), "nurse-detail nurse-detail-muted");
  }
}

/**
 * Pain, current format { maxLevel, spots: [{ number, view, region, regionLabel,
 * level, radiatesTo: [{ view, region, regionLabel }] }] }:
 *   Worst pain: 8/10
 *   1 · Head (front)        8/10
 *   2 · Lower back (back)   6/10
 *       → spreads to right thigh, right lower leg
 * Spots are listed worst first; levels of 7 or more are highlighted.
 * Older requests may still have `sensations` per spot ("· Sharp / stabbing");
 * those are shown too, so saved notifications keep their meaning.
 *
 * Older format { level, areas, points, sensations } is shown as
 *   Pain: 7/10 · Where: Right thigh (front), Lower back · Feels: Burning
 */
function painDetails(d) {
  const box = el("div", { class: "nurse-detail" });
  if (Array.isArray(d.spots)) {
    const spots = d.spots.filter((s) => s && typeof s === "object");
    const levelOf = (spot) => (Number.isFinite(Number(spot.level)) && spot.level !== null ? Number(spot.level) : -1);
    const worst = d.maxLevel ?? Math.max(0, ...spots.map(levelOf));
    box.append(el("div", { class: "nurse-detail-main" }, [t("nurse.worstPainLine", { n: worst })]));
    const list = el("ol", { class: "nurse-spots" });
    [...spots].sort((a, b) => levelOf(b) - levelOf(a)).forEach((spot, index) => {
      const sensations = (Array.isArray(spot.sensations) ? spot.sensations : []).map((s) => label(`pain.sensation.${s}`, s));
      const spreads = (Array.isArray(spot.radiatesTo) ? spot.radiatesTo : [])
        .map((r) => lower(label(`pain.region.${r?.region}`, r?.regionLabel ?? r?.region ?? "?")));
      list.append(el("li", { class: cls("nurse-spot", Number(spot.level) >= HIGH_PAIN && "is-high") }, [
        el("span", {}, [`${spot.number ?? index + 1} · ${spotName(spot)}`]),
        el("span", {}, [
          el("span", { class: "nurse-spot-level" }, [`${spot.level ?? "?"}/10`]),
          sensations.length ? ` · ${sensations.join(", ")}` : "",
        ]),
        spreads.length
          ? el("span", { class: "nurse-spot-spread" }, [`→ ${t("nurse.spreadsLine", { places: spreads.join(", ") })}`])
          : null,
      ]));
    });
    box.append(list);
    return box;
  }

  // Older format: one level for the whole body
  const parts = [t("nurse.painLevelLine", { n: d.level ?? "—" })];
  const areas = oldPainAreas(d);
  if (areas) parts.push(t("nurse.whereLine", { areas }));
  const sensations = (Array.isArray(d.sensations) ? d.sensations : []).map((s) => label(`pain.sensation.${s}`, s));
  if (sensations.length) parts.push(t("nurse.feelsLine", { sensations: sensations.join(", ") }));
  box.append(el("div", { class: "nurse-detail-main" }, [parts.join(" · ")]));
  return box;
}

/** "Head (front)": translated region + view. Falls back to the English regionLabel. */
function spotName(spot) {
  if (spot.region && hasString(`pain.region.${spot.region}`)) {
    const view = t(spot.view === "back" ? "nurse.viewBack" : "nurse.viewFront");
    return `${t(`pain.region.${spot.region}`)} (${view})`;
  }
  return spot.regionLabel ?? spot.region ?? "?";
}

/** Old format: areas from `points` (one per view + region), else the `areas` strings. */
function oldPainAreas(d) {
  const seen = new Map();
  for (const point of Array.isArray(d.points) ? d.points : []) {
    if (point?.region) seen.set(`${point.view}:${point.region}`, point);
  }
  if (seen.size === 0) return Array.isArray(d.areas) ? d.areas.join(", ") : "";
  return [...seen.values()].map(({ view, region }) => {
    const name = label(`pain.region.${region}`, region);
    const isLimb = /^(left|right)_/.test(region) && !/hand$/.test(region);
    return isLimb ? `${name} (${t(view === "back" ? "nurse.viewBack" : "nurse.viewFront")})` : name;
  }).join(", ");
}

/**
 * "Food requested" for the generic food request (no item: the hospital
 * chooses food that fits the diet). Older requests with an item still read
 * "Food: Sandwich"; drinks read "Drink: Water".
 */
function foodDrinkText(type, d) {
  if (type === "food" && !d.item) return t("nurse.foodRequested");
  return t("nurse.detailLine", { type: typeLabel(type), value: label(`${type}.${d.item}`, d.item ?? "?") });
}

/** "Nauseous, Dizzy" from { symptoms: ["nauseous", "dizzy"] }. Unknown ids are shown as they are. */
function symptomList(d) {
  return (Array.isArray(d.symptoms) ? d.symptoms : []).map((s) => label(`symptom.${s}`, s)).join(", ");
}

function isHighPain(row) {
  if (row.type !== "pain") return false;
  const d = row.details || {};
  if (Array.isArray(d.spots) && d.spots.some((s) => Number(s?.level) >= HIGH_PAIN)) return true;
  return Number(d.maxLevel) >= HIGH_PAIN || Number(d.level) >= HIGH_PAIN;
}

/** One-line summary for the browser notification body. */
function summaryLine(row) {
  const d = row.details || {};
  if (row.type === "pain") {
    const n = d.maxLevel ?? d.level;
    return n !== undefined && n !== null ? t("nurse.worstPainLine", { n }) : typeLabel("pain");
  }
  if (row.type === "food" || row.type === "drink") return foodDrinkText(row.type, d);
  if (row.type === "speech") return d.translatedText ?? typeLabel("speech");
  if (row.type === "symptom") return symptomList(d) || typeLabel("symptom");
  return row.patient;
}

// ---------------------------------------------------------------- small helpers

function typeLabel(type) {
  return label(`type.${type}`, type);
}

/** Translate `key`, or return `fallback` if no translation exists. */
function label(key, fallback) {
  return hasString(key) ? t(key) : String(fallback);
}

function lower(text) {
  return String(text).toLocaleLowerCase(locale);
}

function time(iso) {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? 0 : ms;
}

function clock(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function relative(ms) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return t("nurse.justNow");
  if (minutes < 60) return t("nurse.minAgo", { n: minutes });
  return t("nurse.hoursAgo", { n: Math.floor(minutes / 60) });
}

/** Class list from parts, skipping false/null: cls("a", high && "is-high"). */
function cls(...parts) {
  return parts.filter(Boolean).join(" ");
}
