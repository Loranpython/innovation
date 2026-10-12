/*
  strings.js — ALL user-facing text of the app, in every language.

  How to use in a screen:
      ctx.t("home.toilet")                      -> "Toilet"
      ctx.t("sent.countdown", { s: 5 })         -> "Back to start in 5 s"

  How to add a text:
      1. Add the key to "en" (English is the fallback).
      2. Add the same key to "nl" and "no".
  How to add a language:
      Copy the "en" block, give it a new code (e.g. "ro" for Romanian),
      translate the values. Then open the app with ?lang=ro.

  Keys for food items, drinks and body regions follow a fixed pattern,
  because the nurse page builds them from notification data:
      food.<item id>   drink.<item id>   region.<region id>
*/

export const STRINGS = {
  // ------------------------------------------------------------ English
  en: {
    "app.title": "Patient Communication Screen",
    "header.roomPatient": "Room {room} · {patient}",
    "common.back": "Back",

    "home.toilet": "Toilet",
    "home.foodDrink": "Food & drink",
    "home.pain": "Pain",
    "home.speech": "Speak",

    "foodDrink.title": "Food & drink",
    "foodDrink.food": "Food",
    "drink.water": "Water",

    "food.title": "What would you like to eat?",
    "food.sandwich": "Sandwich",
    "food.yoghurt": "Yoghurt",
    "food.fruit": "Fruit",
    "food.soup": "Soup",
    "food.something": "Something to eat",

    "pain.title": "Where does it hurt?",
    "pain.viewFront": "Front",
    "pain.viewBack": "Back",
    "pain.viewToggle": "Show front or back of the body",
    "pain.sideLeftShort": "L",
    "pain.sideRightShort": "R",
    "pain.sideLeft": "Your left side",
    "pain.sideRight": "Your right side",
    "pain.selected": "Selected",
    "pain.noneSelected": "Tap on the body where it hurts",
    "pain.removeRegion": "Remove {region}",
    "pain.clear": "Clear",
    "pain.clearAria": "Clear all selected body parts",
    "pain.intensity": "How bad is the pain?",
    "pain.intensityAria": "Pain intensity, 0 is no pain, 10 is the worst pain",
    "pain.send": "Send",
    "pain.sendAria": "Send pain report to the nurse",

    "speech.title": "Speak",
    "speech.todo": "TODO: speech & translation module (in development)",

    "sent.notified": "The nurse has been notified",
    "sent.alreadySent": "Already sent, the nurse is on the way",
    "sent.backToStart": "Back to start",
    "sent.countdown": "Back to start in {s} s",

    // Body regions — FRONT view
    "region.head": "Head",
    "region.neck": "Neck",
    "region.chest": "Chest",
    "region.abdomen": "Belly",
    "region.pelvis": "Pelvis",
    "region.left_shoulder": "Left shoulder",
    "region.right_shoulder": "Right shoulder",
    "region.left_upper_arm": "Left upper arm",
    "region.right_upper_arm": "Right upper arm",
    "region.left_forearm": "Left forearm",
    "region.right_forearm": "Right forearm",
    "region.left_hand": "Left hand",
    "region.right_hand": "Right hand",
    "region.left_thigh": "Left thigh",
    "region.right_thigh": "Right thigh",
    "region.left_knee": "Left knee",
    "region.right_knee": "Right knee",
    "region.left_lower_leg": "Left lower leg",
    "region.right_lower_leg": "Right lower leg",
    "region.left_foot": "Left foot",
    "region.right_foot": "Right foot",
    // Body regions — BACK view
    "region.back_of_head": "Back of head",
    "region.back_of_neck": "Back of neck",
    "region.upper_back": "Upper back",
    "region.lower_back": "Lower back",
    "region.buttocks": "Buttocks",
    "region.left_back_thigh": "Back of left thigh",
    "region.right_back_thigh": "Back of right thigh",
    "region.left_back_knee": "Back of left knee",
    "region.right_back_knee": "Back of right knee",
    "region.left_calf": "Left calf",
    "region.right_calf": "Right calf",
    "region.left_heel": "Left heel",
    "region.right_heel": "Right heel",

    // Nurse debug page
    "nurse.title": "Nurse view (debug)",
    "nurse.listening": "Listening for notifications from patient screens in this browser…",
    "nurse.empty": "No notifications yet.",
    "nurse.clear": "Clear",
    "nurse.clearAria": "Clear all notifications",
    "nurse.room": "Room {room}",
    "nurse.viewFront": "front",
    "nurse.viewBack": "back",
    "type.toilet": "Toilet",
    "type.drink": "Drink",
    "type.food": "Food",
    "type.pain": "Pain",
    "type.speech": "Speech",
  },

  // ------------------------------------------------------------ Dutch
  nl: {
    "app.title": "Patiëntcommunicatiescherm",
    "header.roomPatient": "Kamer {room} · {patient}",
    "common.back": "Terug",

    "home.toilet": "Toilet",
    "home.foodDrink": "Eten & drinken",
    "home.pain": "Pijn",
    "home.speech": "Spreken",

    "foodDrink.title": "Eten & drinken",
    "foodDrink.food": "Eten",
    "drink.water": "Water",

    "food.title": "Wat wilt u eten?",
    "food.sandwich": "Boterham",
    "food.yoghurt": "Yoghurt",
    "food.fruit": "Fruit",
    "food.soup": "Soep",
    "food.something": "Iets om te eten",

    "pain.title": "Waar doet het pijn?",
    "pain.viewFront": "Voorkant",
    "pain.viewBack": "Achterkant",
    "pain.viewToggle": "Toon voorkant of achterkant van het lichaam",
    "pain.sideLeftShort": "L",
    "pain.sideRightShort": "R",
    "pain.sideLeft": "Uw linkerkant",
    "pain.sideRight": "Uw rechterkant",
    "pain.selected": "Gekozen",
    "pain.noneSelected": "Tik op het lichaam waar het pijn doet",
    "pain.removeRegion": "{region} verwijderen",
    "pain.clear": "Wissen",
    "pain.clearAria": "Alle gekozen lichaamsdelen wissen",
    "pain.intensity": "Hoeveel pijn heeft u?",
    "pain.intensityAria": "Pijnscore, 0 is geen pijn, 10 is de ergste pijn",
    "pain.send": "Versturen",
    "pain.sendAria": "Pijnmelding naar de verpleegkundige sturen",

    "speech.title": "Spreken",
    "speech.todo": "TODO: spraak- en vertaalmodule (in ontwikkeling)",

    "sent.notified": "De verpleegkundige is verwittigd",
    "sent.alreadySent": "Al verstuurd, de verpleegkundige is onderweg",
    "sent.backToStart": "Terug naar start",
    "sent.countdown": "Terug naar start over {s} s",

    "region.head": "Hoofd",
    "region.neck": "Hals",
    "region.chest": "Borst",
    "region.abdomen": "Buik",
    "region.pelvis": "Bekken",
    "region.left_shoulder": "Linkerschouder",
    "region.right_shoulder": "Rechterschouder",
    "region.left_upper_arm": "Linkerbovenarm",
    "region.right_upper_arm": "Rechterbovenarm",
    "region.left_forearm": "Linkeronderarm",
    "region.right_forearm": "Rechteronderarm",
    "region.left_hand": "Linkerhand",
    "region.right_hand": "Rechterhand",
    "region.left_thigh": "Linkerdij",
    "region.right_thigh": "Rechterdij",
    "region.left_knee": "Linkerknie",
    "region.right_knee": "Rechterknie",
    "region.left_lower_leg": "Linkeronderbeen",
    "region.right_lower_leg": "Rechteronderbeen",
    "region.left_foot": "Linkervoet",
    "region.right_foot": "Rechtervoet",
    "region.back_of_head": "Achterhoofd",
    "region.back_of_neck": "Nek",
    "region.upper_back": "Bovenrug",
    "region.lower_back": "Onderrug",
    "region.buttocks": "Billen",
    "region.left_back_thigh": "Achterkant linkerdij",
    "region.right_back_thigh": "Achterkant rechterdij",
    "region.left_back_knee": "Linkerknieholte",
    "region.right_back_knee": "Rechterknieholte",
    "region.left_calf": "Linkerkuit",
    "region.right_calf": "Rechterkuit",
    "region.left_heel": "Linkerhiel",
    "region.right_heel": "Rechterhiel",

    "nurse.title": "Verpleegkundige (debug)",
    "nurse.listening": "Wacht op meldingen van patiëntschermen in deze browser…",
    "nurse.empty": "Nog geen meldingen.",
    "nurse.clear": "Wissen",
    "nurse.clearAria": "Alle meldingen wissen",
    "nurse.room": "Kamer {room}",
    "nurse.viewFront": "voorkant",
    "nurse.viewBack": "achterkant",
    "type.toilet": "Toilet",
    "type.drink": "Drinken",
    "type.food": "Eten",
    "type.pain": "Pijn",
    "type.speech": "Spraak",
  },

  // ------------------------------------------------------------ Norwegian (Bokmål)
  no: {
    "app.title": "Kommunikasjonsskjerm for pasienter",
    "header.roomPatient": "Rom {room} · {patient}",
    "common.back": "Tilbake",

    "home.toilet": "Toalett",
    "home.foodDrink": "Mat og drikke",
    "home.pain": "Smerte",
    "home.speech": "Snakk",

    "foodDrink.title": "Mat og drikke",
    "foodDrink.food": "Mat",
    "drink.water": "Vann",

    "food.title": "Hva vil du spise?",
    "food.sandwich": "Smørbrød",
    "food.yoghurt": "Yoghurt",
    "food.fruit": "Frukt",
    "food.soup": "Suppe",
    "food.something": "Noe å spise",

    "pain.title": "Hvor gjør det vondt?",
    "pain.viewFront": "Forside",
    "pain.viewBack": "Bakside",
    "pain.viewToggle": "Vis forsiden eller baksiden av kroppen",
    "pain.sideLeftShort": "V",
    "pain.sideRightShort": "H",
    "pain.sideLeft": "Din venstre side",
    "pain.sideRight": "Din høyre side",
    "pain.selected": "Valgt",
    "pain.noneSelected": "Trykk på kroppen der det gjør vondt",
    "pain.removeRegion": "Fjern {region}",
    "pain.clear": "Fjern alt",
    "pain.clearAria": "Fjern alle valgte kroppsdeler",
    "pain.intensity": "Hvor sterke er smertene?",
    "pain.intensityAria": "Smertestyrke, 0 er ingen smerte, 10 er verst tenkelig smerte",
    "pain.send": "Send",
    "pain.sendAria": "Send smertemelding til sykepleieren",

    "speech.title": "Snakk",
    "speech.todo": "TODO: tale- og oversettelsesmodul (under utvikling)",

    "sent.notified": "Sykepleieren har fått beskjed",
    "sent.alreadySent": "Allerede sendt, sykepleieren er på vei",
    "sent.backToStart": "Tilbake til start",
    "sent.countdown": "Tilbake til start om {s} s",

    "region.head": "Hode",
    "region.neck": "Hals",
    "region.chest": "Bryst",
    "region.abdomen": "Mage",
    "region.pelvis": "Bekken",
    "region.left_shoulder": "Venstre skulder",
    "region.right_shoulder": "Høyre skulder",
    "region.left_upper_arm": "Venstre overarm",
    "region.right_upper_arm": "Høyre overarm",
    "region.left_forearm": "Venstre underarm",
    "region.right_forearm": "Høyre underarm",
    "region.left_hand": "Venstre hånd",
    "region.right_hand": "Høyre hånd",
    "region.left_thigh": "Venstre lår",
    "region.right_thigh": "Høyre lår",
    "region.left_knee": "Venstre kne",
    "region.right_knee": "Høyre kne",
    "region.left_lower_leg": "Venstre legg",
    "region.right_lower_leg": "Høyre legg",
    "region.left_foot": "Venstre fot",
    "region.right_foot": "Høyre fot",
    "region.back_of_head": "Bakhodet",
    "region.back_of_neck": "Nakke",
    "region.upper_back": "Øvre del av ryggen",
    "region.lower_back": "Korsrygg",
    "region.buttocks": "Setet",
    "region.left_back_thigh": "Baksiden av venstre lår",
    "region.right_back_thigh": "Baksiden av høyre lår",
    "region.left_back_knee": "Venstre knehase",
    "region.right_back_knee": "Høyre knehase",
    "region.left_calf": "Venstre legg (bak)",
    "region.right_calf": "Høyre legg (bak)",
    "region.left_heel": "Venstre hæl",
    "region.right_heel": "Høyre hæl",

    "nurse.title": "Sykepleiervisning (debug)",
    "nurse.listening": "Venter på meldinger fra pasientskjermer i denne nettleseren…",
    "nurse.empty": "Ingen meldinger ennå.",
    "nurse.clear": "Tøm",
    "nurse.clearAria": "Fjern alle meldinger",
    "nurse.room": "Rom {room}",
    "nurse.viewFront": "forside",
    "nurse.viewBack": "bakside",
    "type.toilet": "Toalett",
    "type.drink": "Drikke",
    "type.food": "Mat",
    "type.pain": "Smerte",
    "type.speech": "Tale",
  },
};

export const DEFAULT_LANG = "en";

let currentLang = DEFAULT_LANG;

/** Choose the language. Unknown codes fall back to English. Returns the code used. */
export function setLanguage(lang) {
  currentLang = STRINGS[lang] ? lang : DEFAULT_LANG;
  return currentLang;
}

/**
 * Translate a key. Looks in the current language, then English,
 * and returns the key itself if it is missing everywhere (easy to spot).
 * {name} placeholders are replaced with values from `vars`.
 */
export function t(key, vars = {}) {
  const text = STRINGS[currentLang][key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  );
}

/** True if a key exists (used by the nurse page to fall back to raw values). */
export function hasString(key) {
  return key in STRINGS[DEFAULT_LANG];
}
