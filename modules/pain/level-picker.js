/*
  level-picker.js — pain level 0–10: six faces + square 11-step slider.

  Reusable: bind it to any spot.
    const picker = createLevelPicker({ t, heading, onChange: (level) => … });
    panel.append(picker.el);
    picker.update(spot.level);          // null = not chosen yet ("—/10")

  update() changes the existing elements in place, so a slider drag keeps
  working while the rest of the screen re-renders.
*/

import { el } from "../../js/ui.js";
import { faceSvg } from "./pain-faces.js";

const FACE_VALUES = [0, 2, 4, 6, 8, 10];
const LEVELS = Array.from({ length: 11 }, (_, i) => i);   // 0..10

export function createLevelPicker({ t, heading, onChange }) {
  let level = null;
  const setLevel = (value) => onChange(Math.min(10, Math.max(0, value)));

  const valueOutput = el("output", { class: "pain-value", "aria-live": "polite" });

  const faceButtons = FACE_VALUES.map((value) => {
    const button = el("button", {
      type: "button",
      class: "pain-face",
      style: `--face-colour: var(--pain-scale-${value})`,
      "aria-label": t("pain.levelAria", { n: value }),
      "data-focus-key": `face:${value}`,
      onClick: () => setLevel(value),
    });
    button.innerHTML = faceSvg(value);
    button.append(el("span", { class: "pain-face-number" }, [String(value)]));
    return button;
  });

  // Slider: 11 square colour steps (no gradient) with a square thumb.
  // An ARIA slider, so the thumb lines up exactly with the steps.
  const thumb = el("span", { class: "pain-scale-thumb", "aria-hidden": "true" });
  const slider = el("div", {
    class: "pain-scale",
    role: "slider",
    tabindex: "0",
    "aria-label": t("pain.sliderAria"),
    "aria-valuemin": "0",
    "aria-valuemax": "10",
    "data-focus-key": "slider",
  }, [
    ...LEVELS.map((i) => el("span", {
      class: "pain-scale-step",
      style: `--step-colour: var(--pain-scale-${i}); grid-column: ${i + 1}`,
    })),
    thumb,
  ]);

  function levelFromPointer(event) {
    const rect = slider.getBoundingClientRect();
    return Math.floor(((event.clientX - rect.left) / rect.width) * LEVELS.length);
  }
  slider.addEventListener("pointerdown", (event) => {
    try { slider.setPointerCapture(event.pointerId); } catch { /* synthetic event */ }
    setLevel(levelFromPointer(event));        // touching it also sets a null level
  });
  slider.addEventListener("pointermove", (event) => {
    if (slider.hasPointerCapture(event.pointerId)) setLevel(levelFromPointer(event));
  });
  slider.addEventListener("keydown", (event) => {
    const current = level ?? 0;
    const keys = {
      ArrowRight: current + 1, ArrowUp: current + 1, ArrowLeft: current - 1, ArrowDown: current - 1,
      PageUp: current + 2, PageDown: current - 2, Home: 0, End: 10,
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    setLevel(level === null && event.key !== "Home" && event.key !== "End" ? current : keys[event.key]);
  });

  const root = el("section", { class: "pain-box pain-level" }, [
    el("div", { class: "pain-level-head" }, [
      el("h2", { class: "pain-heading" }, [heading]),
      valueOutput,
    ]),
    el("div", { class: "pain-faces" }, faceButtons),
    slider,
    el("div", { class: "pain-scale-numbers", "aria-hidden": "true" },
      LEVELS.map((i) => el("span", {}, [String(i)]))),
    el("div", { class: "pain-scale-labels" }, [
      el("span", {}, [t("pain.noPain")]),
      el("span", {}, [t("pain.worstPain")]),
    ]),
  ]);

  function update(value) {
    level = value ?? null;
    valueOutput.replaceChildren(
      el("strong", {}, [level === null ? "—" : String(level)]),
      el("span", {}, ["/10"]),
    );
    for (const [i, button] of faceButtons.entries()) {
      const face = FACE_VALUES[i];
      button.setAttribute("aria-pressed", String(level === face));
      // The nearest face lights up while sliding (7 -> face 6 or 8).
      button.classList.toggle("is-active", level !== null && Math.round(level / 2) * 2 === face);
    }
    slider.classList.toggle("is-unset", level === null);
    slider.setAttribute("aria-valuenow", String(level ?? 0));
    slider.setAttribute("aria-valuetext", level === null ? t("pain.levelNotSet") : `${level}/10`);
    slider.querySelectorAll(".pain-scale-step").forEach((step, i) => {
      step.classList.toggle("is-on", level !== null && i <= level);
    });
    thumb.hidden = level === null;
    thumb.style.gridColumn = String((level ?? 0) + 1);
  }

  update(null);
  return { el: root, update };
}
