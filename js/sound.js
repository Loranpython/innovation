/*
  sound.js — a short "ding", generated in code with WebAudio (no audio file).

  Browsers only allow sound after the user has tapped/clicked the page once.
  Call unlockAudio() from inside a tap/click handler; after that playDing()
  works. Before that, playDing() silently does nothing.
*/

let audioContext = null;

/** Create / resume the audio context. Call from a user gesture. */
export function unlockAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    audioContext ??= new AudioContextClass();
    if (audioContext.state === "suspended") audioContext.resume();
    return true;
  } catch (error) {
    console.warn("[sound] could not unlock audio", error);
    return false;
  }
}

export function isAudioUnlocked() {
  return audioContext !== null && audioContext.state !== "closed";
}

/**
 * Play a short ding: one soft sine tone per frequency in `notes`.
 *   playDing()                                   nurse: two notes, clear
 *   playDing({ volume: 0.12, notes: [660] })     patient: one soft note
 */
export function playDing({ volume = 0.3, notes = [880, 1320] } = {}) {
  if (!isAudioUnlocked()) return;
  try {
    const start = audioContext.currentTime + 0.01;
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const noteStart = start + index * 0.18;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.7);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.75);
    });
  } catch (error) {
    console.warn("[sound] could not play", error);
  }
}
