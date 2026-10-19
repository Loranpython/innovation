/*
  voice.js — optional spoken feedback ("voice assistance") for patients who
  cannot see the screen well. Uses the browser's built-in Web Speech API
  (speechSynthesis): no AI service, no network, no cost, no library.

  ON / OFF
    - Staff set ?voice=1 (or ?voice=0) in the bedside URL. On page load the
      URL parameter wins, so a screen set up for a blind patient always
      starts with voice on.
    - The toggle in the header switches it. The choice is remembered in
      localStorage ("pcs_voice"), across screens and refreshes.

  Use in a screen:
      speak("Water")                      say it now (stops older speech)
      speak(text, { queue: true })        say it after the current sentence
  speak() never throws, never waits and does nothing when voice is off or
  the browser has no speech synthesis. So it can't block a tap or cause a
  second request.

  Language: the interface language (en / nl / no). We pick an installed
  voice for that language if there is one. Not every device has a Dutch or
  Norwegian voice: then the browser uses its default voice.

  Browsers only allow speech after the user has tapped the page once
  (like sound, see js/sound.js). app.js calls unlockVoice() on the first tap.
*/

const STORAGE_KEY = "pcs_voice";

// BCP 47 tags per interface language; the first one is used for the utterance.
const LANG_TAGS = {
  en: ["en-gb", "en-us", "en"],
  nl: ["nl-nl", "nl-be", "nl"],
  no: ["nb-no", "no-no", "nn-no", "nb", "no", "nn"],
};

let enabled = false;
let lang = "en";
let voice;                    // undefined = not looked up yet, null = none found
const listeners = new Set();

export function isSpeechSupported() {
  try {
    return Boolean(window.speechSynthesis) && typeof window.SpeechSynthesisUtterance === "function";
  } catch {
    return false;
  }
}

/**
 * Called once by app.js.
 *   urlValue: the ?voice= parameter ("1" / "0" / null). It wins on page load.
 */
export function initVoice({ lang: interfaceLang, urlValue = null }) {
  lang = LANG_TAGS[interfaceLang] ? interfaceLang : "en";
  if (urlValue === "1" || urlValue === "0") {
    enabled = urlValue === "1";
    save();
  } else {
    enabled = load();
  }
  if (isSpeechSupported()) {
    // Voices often load after the page; look again when the list changes.
    window.speechSynthesis.addEventListener?.("voiceschanged", () => { voice = undefined; });
  }
}

export function isVoiceEnabled() {
  return enabled;
}

export function setVoiceEnabled(on) {
  enabled = Boolean(on);
  save();
  if (!enabled) stopSpeaking();
  for (const listener of listeners) listener(enabled);
}

/** Call `listener(enabled)` when voice is switched on/off. Returns an unsubscribe function. */
export function onVoiceChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Say `text` in the interface language (only when voice assistance is on). */
export function speak(text, { queue = false } = {}) {
  const words = clean(text);
  if (!enabled || !words || !isSpeechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    if (!queue) synth.cancel();             // the newest choice replaces older speech
    const utterance = new SpeechSynthesisUtterance(words);
    utterance.lang = LANG_TAGS[lang][0];
    const chosen = findVoice();
    if (chosen) utterance.voice = chosen;
    utterance.rate = 0.95;
    utterance.onerror = (event) => {
      if (event.error !== "interrupted" && event.error !== "canceled") {
        console.warn("[voice] speech failed:", event.error);
      }
    };
    synth.speak(utterance);
    if (synth.paused) synth.resume();
  } catch (error) {
    console.warn("[voice] could not speak", error);
  }
}

export function stopSpeaking() {
  try {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
  } catch (error) {
    console.warn("[voice] could not stop", error);
  }
}

/**
 * Some browsers (e.g. Safari on iPad) only allow speech that was started
 * from a tap. Saying nothing, silently, during the first tap unlocks it.
 */
export function unlockVoice() {
  if (!enabled || !isSpeechSupported()) return;
  try {
    const silent = new SpeechSynthesisUtterance(" ");
    silent.volume = 0;
    window.speechSynthesis.speak(silent);
  } catch (error) {
    console.warn("[voice] could not unlock speech", error);
  }
}

// ---------------------------------------------------------------- internals

/** Remove symbols a voice would read out ("✓", "⚠", emoji, "…"). */
function clean(text) {
  return String(text ?? "")
    .replace(/[…]/g, "")
    .replace(/[←-⇿☀-➿\u{1f000}-\u{1faff}️‍]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** An installed voice for the interface language, or null (browser default). */
function findVoice() {
  if (voice !== undefined) return voice;
  let voices = [];
  try {
    voices = window.speechSynthesis.getVoices() || [];
  } catch {
    voices = [];
  }
  if (voices.length === 0) return null;       // not loaded yet: try again next time
  const tag = (v) => String(v.lang || "").toLowerCase().replace("_", "-");
  voice = null;
  for (const wanted of LANG_TAGS[lang]) {
    const match = voices.find((v) => tag(v) === wanted) || voices.find((v) => tag(v).startsWith(`${wanted}-`));
    if (match) {
      voice = match;
      break;
    }
  }
  return voice;
}

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch (error) {
    console.warn("[voice] could not save the setting", error);
  }
}
