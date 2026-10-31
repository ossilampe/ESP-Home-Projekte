// Shelly Script (Gen2 Plus 1) mit Plus Add-On
// Logik:
//  - Eingang 100 AN  -> Shelly sofort AUS (hat immer Vorrang)
//  - Eingang 100 AUS -> Shelly AN, wenn Temp 1 >= Grenze 1 UND Temp 2 >= Grenze 2
//  - Faellt eine Temperatur unter ihre Grenze minus Hysterese (oder Fuehler gestoert)
//    und bleibt die Nachlaufzeit lang dort -> Shelly AUS
//  - Steigt sie vor Ablauf wieder darueber, beginnt die Nachlaufzeit von vorn
//
// Grenzwerte:
//  - Werden im internen Speicher des Shelly (KVS) unter "grenze_t1" / "grenze_t2" /
//    "hysterese" (K) / "nachlauf" (min) abgelegt. Dieser Speicher bleibt nach
//    Neustart/Stromausfall erhalten.
//  - Home Assistant schreibt neue Werte per KVS.Set auf den Shelly.
//  - Ist HA nicht erreichbar, regelt der Shelly mit den zuletzt gespeicherten Werten.
//  - Fehlt ein Wert oder ist er ungueltig, gilt der feste Rueckfallwert aus CONFIG.
//  - Nach dem Start wird erst geregelt, wenn beide Grenzwerte einmal gelesen wurden.
//  - Die Speicher-Abfragen laufen nacheinander (nie mehrere gleichzeitig), weil ein
//    Shelly-Skript nur wenige Aufrufe gleichzeitig offen haben darf.

let CONFIG = {
  switchId: 0,          // Schaltkanal des Shelly (switch:0)
  inputId: 100,         // Add-On Eingang "Sensor 100" (input:100)
  temp1Id: 100,         // Add-On Temperatursensor 1 (temperature:100)  -> TO / grenze_t1
  temp2Id: 101,         // Add-On Temperatursensor 2 (temperature:101)  -> TU / grenze_t2

  kvsKey1: "grenze_t1", // KVS-Schluessel fuer Grenze Temp 1
  kvsKey2: "grenze_t2", // KVS-Schluessel fuer Grenze Temp 2
  kvsKeyH: "hysterese", // KVS-Schluessel fuer Hysterese in K
  kvsKeyN: "nachlauf",  // KVS-Schluessel fuer Nachlaufzeit in Minuten

  temp1Fallback: 35,    // Grad C - Rueckfallwert
  temp2Fallback: 30,    // Grad C - Rueckfallwert
  hystFallback: 5,      // K - Rueckfallwert
  nachlaufFallback: 5,  // Minuten - Rueckfallwert

  limitMin: 10,         // gueltiger Bereich fuer eingestellte Grenzwerte
  limitMax: 90,
  hystMin: 1,           // gueltiger Bereich Hysterese
  hystMax: 20,
  nachlaufMin: 0,       // gueltiger Bereich Nachlaufzeit
  nachlaufMax: 60,

  checkIntervalMs: 10000,  // Sicherheits-Timer Regelung
  kvsReloadMs: 15000       // wie oft Grenzwerte zur Sicherheit neu gelesen werden
};

// Aktuell gueltige Grenzwerte (starten mit den Rueckfallwerten)
let limit1 = CONFIG.temp1Fallback;
let limit2 = CONFIG.temp2Fallback;
let hyst = CONFIG.hystFallback;
let nachlauf = CONFIG.nachlaufFallback;

// Betriebszeit in s, seit der eine Temperatur unter der Ausschaltgrenze liegt (-1 = nicht)
let unterSeit = -1;

// Regelung beginnt erst, wenn beide Grenzwerte einmal gelesen wurden
let ready1 = false;
let ready2 = false;

// Steuerung der Speicher-Abfragen
let loading = false;     // gerade laeuft eine Abfragerunde
let reloadAgain = false; // waehrenddessen kam eine weitere Anforderung

// ---------- Grenzwerte aus dem KVS laden ----------
function toLimit(v, fallback, min, max) {
  // mJS (Shelly) kennt kein try/catch: JSON.parse liefert bei Fehlern undefined
  if (typeof v === "string") {
    v = JSON.parse(v);
  }
  if (typeof v !== "number" || v < min || v > max) {
    return fallback;
  }
  return v;
}

function loadLimit(key, fallback, min, max, apply) {
  Shelly.call("KVS.Get", { key: key }, function (res, errCode) {
    let v = fallback;
    if (errCode === 0 && res !== null && res !== undefined) {
      v = toLimit(res.value, fallback, min, max);
    }
    apply(v);
  });
}

function applyLimit1(v) {
  let changed = (v !== limit1);
  let first = !ready1;
  limit1 = v;
  ready1 = true;
  if (changed) {
    print("Grenze T1 neu: " + JSON.stringify(v));
  }
  if (changed || first) {
    evaluate();
  }
}

function applyLimit2(v) {
  let changed = (v !== limit2);
  let first = !ready2;
  limit2 = v;
  ready2 = true;
  if (changed) {
    print("Grenze T2 neu: " + JSON.stringify(v));
  }
  if (changed || first) {
    evaluate();
  }
}

function applyHyst(v) {
  if (v !== hyst) {
    hyst = v;
    print("Hysterese neu: " + JSON.stringify(v));
    evaluate();
  }
}

function applyNachlauf(v) {
  if (v !== nachlauf) {
    nachlauf = v;
    print("Nachlauf neu: " + JSON.stringify(v));
    evaluate();
  }
}

// Alle Werte nacheinander lesen; kommt waehrenddessen eine neue Anforderung,
// wird danach genau eine weitere Runde gestartet.
function reloadLimits() {
  if (loading) {
    reloadAgain = true;
    return;
  }
  loading = true;
  loadLimit(CONFIG.kvsKey1, CONFIG.temp1Fallback, CONFIG.limitMin, CONFIG.limitMax, function (v1) {
    applyLimit1(v1);
    loadLimit(CONFIG.kvsKey2, CONFIG.temp2Fallback, CONFIG.limitMin, CONFIG.limitMax, function (v2) {
      applyLimit2(v2);
      loadLimit(CONFIG.kvsKeyH, CONFIG.hystFallback, CONFIG.hystMin, CONFIG.hystMax, function (vh) {
        applyHyst(vh);
        loadLimit(CONFIG.kvsKeyN, CONFIG.nachlaufFallback, CONFIG.nachlaufMin, CONFIG.nachlaufMax, function (vn) {
          applyNachlauf(vn);
          loading = false;
          if (reloadAgain) {
            reloadAgain = false;
            reloadLimits();
          }
        });
      });
    });
  });
}

// ---------- Regelung ----------
function setSwitch(on) {
  Shelly.call("Switch.Set", { id: CONFIG.switchId, on: on });
}

function evaluate() {
  // Erst regeln, wenn beide Grenzwerte geladen sind
  if (!ready1 || !ready2) return;

  let input = Shelly.getComponentStatus("input:" + JSON.stringify(CONFIG.inputId));
  let sw = Shelly.getComponentStatus("switch:" + JSON.stringify(CONFIG.switchId));
  let t1s = Shelly.getComponentStatus("temperature:" + JSON.stringify(CONFIG.temp1Id));
  let t2s = Shelly.getComponentStatus("temperature:" + JSON.stringify(CONFIG.temp2Id));
  let sys = Shelly.getComponentStatus("sys");

  if (input === null || input === undefined || sw === null || sw === undefined) return;

  let inputOn = input.state === true;
  let t1 = (t1s && typeof t1s.tC === "number") ? t1s.tC : null;
  let t2 = (t2s && typeof t2s.tC === "number") ? t2s.tC : null;

  // 1) Eingang 100 AN -> Shelly AUS
  if (inputOn) {
    unterSeit = -1;
    if (sw.output) {
      print("Eingang 100 AN -> Shelly AUS");
      setSwitch(false);
    }
    return;
  }

  // 2) Pumpe aus -> einschalten, sobald beide Grenzen erreicht sind
  if (!sw.output) {
    unterSeit = -1;
    if (t1 !== null && t1 >= limit1 && t2 !== null && t2 >= limit2) {
      print("Beide Temperaturen erreicht (T1>=" + JSON.stringify(limit1) +
            ", T2>=" + JSON.stringify(limit2) + ") -> Shelly AN");
      setSwitch(true);
    }
    return;
  }

  // 3) Pumpe an -> erst unter Grenze minus Hysterese und nach der Nachlaufzeit ausschalten
  let unter = t1 === null || t2 === null || t1 < limit1 - hyst || t2 < limit2 - hyst;
  if (!unter) {
    unterSeit = -1;
    return;
  }
  if (sys === null || sys === undefined) return;
  if (unterSeit < 0) {
    unterSeit = sys.uptime;
    print("Ausschaltgrenze unterschritten -> Nachlauf " + JSON.stringify(nachlauf) + " min");
  }
  if (sys.uptime - unterSeit >= nachlauf * 60) {
    print("Nachlauf abgelaufen -> Shelly AUS");
    unterSeit = -1;
    setSwitch(false);
  }
}

// Reagiert sofort auf Aenderungen von Speicher, Eingang oder Temperatur
Shelly.addStatusHandler(function (e) {
  // Speicher (KVS) wurde geaendert, z. B. durch Home Assistant -> neu laden
  if (e.component === "sys" && e.delta && e.delta.kvs_rev !== undefined) {
    reloadLimits();
    return;
  }
  if (e.component === "input:" + JSON.stringify(CONFIG.inputId) ||
      e.component === "temperature:" + JSON.stringify(CONFIG.temp1Id) ||
      e.component === "temperature:" + JSON.stringify(CONFIG.temp2Id)) {
    evaluate();
  }
});

// Timer: Regelung absichern und Grenzwerte regelmaessig nachladen
Timer.set(CONFIG.checkIntervalMs, true, evaluate);
Timer.set(CONFIG.kvsReloadMs, true, reloadLimits);

// Start: gespeicherte Grenzwerte laden, danach wird geregelt
print("Skript gestartet");
reloadLimits();
