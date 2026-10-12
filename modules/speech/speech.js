/*
  speech.js — PLACEHOLDER for the speech & translation module (#/speech).

  A teammate is building the real version: the patient speaks in their own
  language and the nurse receives a translation. See README.md in this
  folder for the interface to implement.

  For now this shows a dashed box with "TODO: … (in development)".
*/

import { createScreen, el } from "../../js/ui.js";

/** Load speech.css once (relative to this file). */
function loadStyles() {
  const href = new URL("./speech.css", import.meta.url).href;
  if (!document.querySelector(`link[href="${href}"]`)) {
    document.head.append(el("link", { rel: "stylesheet", href }));
  }
}

export function render(container, ctx) {
  loadStyles();
  const { root, body } = createScreen(ctx, { title: ctx.t("speech.title") });

  body.append(
    el("div", { class: "speech-placeholder" }, [
      el("span", { class: "icon speech-placeholder-icon", "aria-hidden": "true" }, ["🗣️"]),
      el("p", { class: "speech-placeholder-text" }, [ctx.t("speech.todo")]),
    ])
  );

  container.append(root);
}

export function cleanup() {
  // The real module should stop the microphone / recognition here.
}
