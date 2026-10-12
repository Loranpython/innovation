/*
  pain-faces.js — simple line faces for the pain level (0–10).
  Ported from the teammate's prototype (pain-face.tsx).

    0–1  big smile        6–7  frown
    2–3  small smile      8–10 deep frown + squeezed eyes
    4–5  straight mouth   10   + tears

  faceSvg(value) returns an SVG string (40 × 40). Colours come from CSS:
  the face uses currentColor for its lines.
*/

function mouthPath(value) {
  if (value <= 1) return "M12 23q8 9 16 0";
  if (value <= 3) return "M13 25q7 4 14 0";
  if (value <= 5) return "M13 26h14";
  if (value <= 7) return "M13 28q7-6 14 0";
  return "M12 29q8-10 16 0";
}

export function faceSvg(value) {
  const eyes = value >= 8 ? "M11 15l6 3 M29 15l-6 3" : "M14 16v2 M26 16v2";
  const tears = value === 10 ? `<path class="face-tears" d="M8 21q-4 5 0 6q4-1 0-6 M32 21q-4 5 0 6q4-1 0-6"/>` : "";
  return `<svg viewBox="0 0 40 40" class="face-art" aria-hidden="true">` +
    `<circle cx="20" cy="20" r="17"/>` +
    `<path class="face-line" d="${eyes}"/>` +
    `<path class="face-line" d="${mouthPath(value)}"/>` +
    tears +
    `</svg>`;
}

/** Emoji for the confirmation screen (the "sent" screen shows emoji icons). */
export function faceEmoji(value) {
  if (value === 0) return "🙂";
  if (value <= 3) return "😐";
  if (value <= 6) return "😣";
  if (value <= 8) return "😖";
  return "😭";
}
