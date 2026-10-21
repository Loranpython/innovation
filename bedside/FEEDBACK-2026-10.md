# Nurse feedback (meeting notes) → what we do with it

Scope of this folder: the **Translation** feature only. Points about pain, food and toilet belong to the teammates who own those features; they are listed at the bottom so nothing gets lost.

## Implemented now (translation, patient screen)
| Feedback | Change |
|---|---|
| "Push, hold, talk, let go, send — that's good feedback" | Hold-to-talk on the mic. A single tap still works for shaky hands. Release goes to the "Du sa:" check, because accuracy was the nurse's main worry (slurred, drugged Polish patient + Google Translate). |
| Old people, shaky fingers, "make it bigger", "the UI is a bit much" | Mic is now the hero element. One screen, no scrolling. Chat history moved into a small side drawer. Language switch removed from the patient (see setup below). |
| "Verbal feedback if you push on it" | Soft sound cue when listening starts and stops; read-aloud kept on the nurse's reply. |
| "Patient sees at the top that it has been acknowledged, in green" | Green "✓ En person er på vei" banner when the nurse acknowledges "Hent en person". |
| "Short setup with the nurse … language" | Language is set by the nurse on the worker screen (already there: one tap). The patient never has to set anything up. |
| "It needs to be really accurate" | Already in v2: transcript check before sending, back-translation for important messages, visible "not sure" state, call-a-person. |

## Worth doing next (needs a decision or more work)
- **Nurse setup screen** at handover: language (and room/name) chosen once by the nurse before the patient uses the tablet. Language auto-detection is possible with Whisper but unreliable on short or slurred speech: confirm with the nurse rather than trust it.
- **Nurse device**: the worker page already works on a phone-sized screen; the ward's Android IP phones could open it. Needs IT/integration talk, not code.
- **"I need to talk to someone" / anxious**: could replace one quick reply. Ask nurses which 6 matter most.
- **Data protection**: we store nothing (audio in memory only, text in memory only). Before any real use: a DPIA / risk assessment, as the nurse said they had to do for voice and face recording.

## Dropped or parked (and why)
- More languages (Arabic etc.): MVP is Norwegian–English. The pipeline can add languages later; each needs its own glossary and testing.
- Gender in setup: the nurse concluded it is not needed ("I just go in and assess").
- NEWS score: needs vital signs and monitoring equipment; not something a patient screen can measure.
- Eye tracking: interesting for ICU/ALS, but hardware, GDPR and scope are far beyond this project.
- Children: needs a separate design and paediatric pain scales; target group is adults and older patients.

## For the other features (not translation — pass to the owners)
- Pain: keep location + severity (0–10) as the core; hide "what does it feel like" behind an optional dropdown; bigger body figure, bigger Undo/Submit; allow saying the location (voice or spoken labels "kne", "mage") for people who can't point; severity lets nurses prioritise (8/10 abdomen = go now).
- Feeling unwell: simple, obvious icons for nausea, cold/shivering, fever — current icons are not understood without text.
- Food and drink: drop the sub-menu (hospitals have few options, diets are restricted); one "food" request the nurse follows up.
- Toilet/food icons are culture-dependent (knife and fork); test with users from other cultures.
- Priority at the nurse station: requests with type + severity let nurses triage instead of a generic call-cord alarm.
- Testing: geriatric or medical ward (not ICU); the teacher is forwarding a contact (Marion).
