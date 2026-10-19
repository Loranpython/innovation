/*
  app.js — starts the patient screen.

  1. Reads the URL parameters:  ?patient=Jansen&room=12&lang=nl&voice=1
     (defaults: patient "Patient", room "1", language English; voice:
     the remembered choice, see js/voice.js)
  2. Builds `ctx`, the shared object every screen receives:
       { patient, room, lang, t, sendNotification, navigate, getLastResult }
  3. Draws the header and starts the router.
*/

import { setLanguage, t } from "./strings.js";
import { configureNotifications, sendNotification, getLastResult } from "./notifications.js";
import { navigate, startRouter } from "./router.js";
import { renderHeader } from "./ui.js";
import { startRequestStatus } from "./request-status.js";
import { unlockAudio } from "./sound.js";
import { initVoice, unlockVoice } from "./voice.js";

const params = new URLSearchParams(location.search);
const patient = params.get("patient") || "Patient";
const room = params.get("room") || "1";
const lang = setLanguage(params.get("lang") || "en");

// "no" is our code for Norwegian; the HTML standard code for Bokmål is "nb".
document.documentElement.lang = lang === "no" ? "nb" : lang;
document.title = t("app.title");

configureNotifications({ patient, room });

// Voice assistance: ?voice=1 / ?voice=0 (set by staff) wins on page load.
initVoice({ lang, urlValue: params.get("voice") });

// Live status of this device's requests ("Your nurse has seen your request").
// One subscription for the whole app, so navigating never duplicates it.
startRequestStatus({ room });

// Browsers only allow sound and speech after a tap; the patient's first tap unlocks them.
window.addEventListener("pointerdown", unlockAudio, { once: true });
window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("pointerdown", unlockVoice, { once: true });
window.addEventListener("keydown", unlockVoice, { once: true });

const ctx = {
  patient,
  room,
  lang,
  t,
  sendNotification,
  navigate,
  getLastResult,
};

renderHeader(document.getElementById("app-header"), ctx);
startRouter(document.getElementById("app-main"), ctx);
