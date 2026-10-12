/*
  app.js — starts the patient screen.

  1. Reads the URL parameters:  ?patient=Jansen&room=12&lang=nl
     (defaults: patient "Patient", room "1", language English)
  2. Builds `ctx`, the shared object every screen receives:
       { patient, room, lang, t, sendNotification, navigate, getLastResult }
  3. Draws the header and starts the router.
*/

import { setLanguage, t } from "./strings.js";
import { configureNotifications, sendNotification, getLastResult } from "./notifications.js";
import { navigate, startRouter } from "./router.js";
import { renderHeader } from "./ui.js";

const params = new URLSearchParams(location.search);
const patient = params.get("patient") || "Patient";
const room = params.get("room") || "1";
const lang = setLanguage(params.get("lang") || "en");

// "no" is our code for Norwegian; the HTML standard code for Bokmål is "nb".
document.documentElement.lang = lang === "no" ? "nb" : lang;
document.title = t("app.title");

configureNotifications({ patient, room });

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
