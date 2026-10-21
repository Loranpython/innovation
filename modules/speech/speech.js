/*
  speech.js — Speech & translation module (#/speech).

  Shows the bedside translation screen (served by the separate `bedside/` service)
  inside the app's normal screen frame, and forwards patient messages to the nurse
  through ctx.sendNotification, the only way this app sends requests.

  The service address defaults to http://localhost:8020. Use ?bedside=https://host
  in the app URL to point somewhere else.
  Details: bedside/integration/INTEGRATION.md
*/

import { createScreen, el } from "../../js/ui.js";

const DEFAULT_BEDSIDE_URL = "http://localhost:8020";

let frame = null;
let onMessage = null;

/** Load speech.css once (relative to this file). */
function loadStyles() {
  const href = new URL("./speech.css", import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(el("link", { rel: "stylesheet", href }));
  }
}

function bedsideUrl() {
  const fromUrl = new URLSearchParams(location.search).get("bedside");
  return (fromUrl || DEFAULT_BEDSIDE_URL).replace(/\/+$/, "");
}

export function render(container, ctx) {
  loadStyles();
  const base = bedsideUrl();
  const { root, body } = createScreen(ctx, { title: ctx.t("speech.title") });
  body.classList.add("speech-body");

  const src = `${base}/?embed=1&room=${encodeURIComponent(ctx.room)}&patient=${encodeURIComponent(ctx.patient)}`;
  frame = el("iframe", { class: "speech-frame", src, title: ctx.t("speech.title"), allow: "microphone" });
  body.append(frame);

  onMessage = (event) => {
    if (event.origin !== new URL(base).origin) return; // only trust the bedside service
    const d = event.data;
    if (!d || d.source !== "bedside") return;

    if (d.type === "message" && d.details) {
      // The four fields documented in README.md
      ctx.sendNotification({ type: "speech", details: d.details });
    } else if (d.type === "call_person") {
      ctx.sendNotification({
        type: "speech",
        details: { originalText: "", originalLang: "", translatedText: "The patient asks for a person", targetLang: "en" },
      });
    }
  };
  window.addEventListener("message", onMessage);

  container.append(root);
}

export function cleanup() {
  // Removing the iframe also releases the microphone.
  if (onMessage) window.removeEventListener("message", onMessage);
  if (frame) {
    frame.src = "about:blank";
    frame.remove();
  }
  onMessage = null;
  frame = null;
}
