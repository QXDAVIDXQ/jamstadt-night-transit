// ==============================
// JAMSTADT NIGHT TRANSIT – WEB EDITION
// ==============================

// --- DATEN ---
const HALTESTELLEN = [
  "Oberorning, Torstraße",
  "Jamstadt-Orning, Kläranlage",
  "Meinberg-Gymnasium",
  "Autohaus Kramer",
  "Google-Hauptsitz",
  "In der Schneide",
  "Einkaufszentrum",
  "Süßwarenfabrik",
  "Wenningbrück, Grundschule",
  "Schloss Vogelberg",
  "Neubelle, Rathaus",
  "Hustän, Ludwig-Waschmann-Str.",
  "ZOB 1",
  "ZOB 2",
  "Bersdorf, Bürobedarf",
  "Bershofen, Hundertwasserstr.",
  "Herwald, Musikschule",
  "Herwald, Pfarrstadl",
  "Flusing, Campingbedarf",
  "Blönk, Dorfrestaurant",
  "Auring, Decathlon",
  "Auring, Bibliothek",
  "Hierlingfeldsee",
  "Hierlingfeld, Botanischer Garten",
  "Printh, Schrottplatz",
  "Neuhierlingfeld, Legoland"
];

const LINIEN = {
  N1: {
    stops: ["ZOB 1", "Schloss Vogelberg", "Neubelle, Rathaus", "Einkaufszentrum", "Süßwarenfabrik", "Wenningbrück, Grundschule"],
    times: [3, 2, 3, 2, 2],
    color: "#e74c3c"
  },
  N2: {
    stops: ["ZOB 1", "Autohaus Kramer", "Meinberg-Gymnasium", "Jamstadt-Orning, Kläranlage", "Oberorning, Torstraße"],
    times: [2, 3, 2, 3],
    color: "#2ecc71"
  },
  N3: {
    stops: ["ZOB 1", "Auring, Bibliothek", "Hierlingfeldsee", "Hierlingfeld, Botanischer Garten", "Printh, Schrottplatz", "Neuhierlingfeld, Legoland"],
    times: [3, 2, 2, 3, 3],
    color: "#3498db"
  },
  N4: {
    stops: ["ZOB 1", "Auring, Decathlon", "Blönk, Dorfrestaurant", "Flusing, Campingbedarf"],
    times: [3, 3, 4],
    color: "#f39c12"
  },
  N5: {
    stops: ["ZOB 1", "Bersdorf, Bürobedarf", "Bershofen, Hundertwasserstr.", "Herwald, Musikschule", "Herwald, Pfarrstadl"],
    times: [3, 3, 3, 2],
    color: "#9b59b6"
  },
  NS1: {
    stops: ["ZOB 1", "Google-Hauptsitz", "In der Schneide", "Einkaufszentrum"],
    times: [2, 3, 2],
    color: "#f1c40f"
  }
};

const PASSAGIERE = {
  "Einkaufszentrum": 15,
  "Google-Hauptsitz": 12,
  "Neuhierlingfeld, Legoland": 10,
  "Flusing, Campingbedarf": 8,
  "Herwald, Musikschule": 7,
  "Schloss Vogelberg": 6
};

// --- SPIELZUSTAND ---
let gameState = {
  night: 1,
  money: 5000,
  schedule: {
    N1: { freq: 2, active: true },
    N2: { freq: 1, active: true },
    N3: { freq: 1, active: true },
    N4: { freq: 1, active: true },
    N5: { freq: 1, active: true },
    NS1: { freq: 0, active: false }
  },
  buses: [
    { id: "B001", model: "Standard", available: true, assignedLine: null, position: "ZOB 1" },
    { id: "B002", model: "Elektro", available: true, assignedLine: null, position: "ZOB 1" }
  ],
  drivers: [
    { id: "D001", name: "Anna Müller", available: true, assignedBus: null, hours: 0 },
    { id: "D002", name: "Bernd Schmidt", available: true, assignedBus: null, hours: 0 }
  ],
  events: [],
  log: []
};

// --- HELPER ---
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPassengers(stop, multiplier = 1) {
  const base = PASSAGIERE[stop] || 5;
  return Math.max(0, Math.floor(base * (0.8 + Math.random() * 0.4) * multiplier));
}

function getTotalTime(lineId) {
  return LINIEN[lineId].times.reduce((a, b) => a + b, 0);
}

function getTimeToStop(from, to, lineId) {
  const stops = LINIEN[lineId].stops;
  const times = LINIEN[lineId].times;
  let time = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    if (stops[i] === from && stops[i+1] === to) {
      return times[i];
    }
    time += times[i];
  }
  return Infinity; // nicht auf derselben Linie
}

// --- EREIGNISSE ---
function triggerRandomEvent() {
  if (Math.random() < 0.6) {
    const events = [
      { msg: "🚧 Baustelle auf N3! Keine Passagiere.", line: "N3", mult: 0 },
      { msg: "🎉 Party im Einkaufszentrum! 3x Passagiere auf N1!", line: "N1", mult: 3 },
      { msg: "😡 Fahrerstreik! Gehälter +20%.", line: null, mult: 1, strike: true },
      { msg: "🌧️ Regen! +50% Passagiere überall!", line: null, mult: 1.5 }
    ];
    return events[Math.floor(Math.random() * events.length)];
  }
  return null;
}

// --- SIMULATION ---
async function simulateNight() {
  const logEl = document.getElementById("log");
  logEl.innerHTML = "";
  const addToLog = (msg) => {
    logEl.innerHTML += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  // Ereignis auslösen
  const event = triggerRandomEvent();
  let eventMultiplier = {};
  let strike = false;
  if (event) {
    addToLog("❗ " + event.msg);
    if (event.strike) {
      strike = true;
    } else {
      if (event.line) {
        eventMultiplier[event.line] = event.mult;
      } else {
        Object.keys(LINIEN).forEach(l => eventMultiplier[l] = event.mult);
      }
    }
  }

  let totalProfit = 0;
  const simStartTime = 23 * 60; // 23:00 in Minuten
  let currentTime = simStartTime;

  // Fahrer & Busse resetten
  gameState.drivers.forEach(d => {
    d.hours = 0;
    d.available = true;
    d.assignedBus = null;
  });
  gameState.buses.forEach(b => {
    b.available = true;
    b.assignedLine = null;
  });

  // Für jede halbe Stunde (30-Minuten-Intervall) bis 05:00
  const endTime = 5 * 60 + 24 * 60; // 05:00 next day

  while (currentTime < endTime) {
    addToLog(`🕒 Zeit: ${Math.floor(currentTime / 60) % 24}:${String(currentTime % 60).padStart(2, '0')}`);

    // Prüfe, welche Linien jetzt fahren sollen
    for (const [lineId, config] of Object.entries(gameState.schedule)) {
      if (!config.active || config.freq === 0) continue;

      // Fahrten gleichmäßig über die Nacht verteilen
      const interval = (6 * 60) / config.freq; // 6 Stunden = 360 Minuten
      for (let i = 0; i < config.freq; i++) {
        const departureTime = simStartTime + i * interval;
        if (Math.abs(currentTime - departureTime) < 15) { // ±15 Min Toleranz
          // Bus und Fahrer zuweisen
          const bus = gameState.buses.find(b => b.available);
          const driver = gameState.drivers.find(d => d.available && d.hours < 6);

          if (!bus || !driver) {
            addToLog(`⚠️ Kein Bus/Fahrer für ${lineId} um ${Math.floor(currentTime/60)%24}:${String(currentTime%60).padStart(2,'0')}`);
            continue;
          }

          // Fahrer muss ggf. zum Bus fahren (vereinfacht: Bus startet immer am ZOB)
          // In dieser Version: Alle Busse starten am ZOB → keine extra Fahrt nötig
          // (Da alle Linien am ZOB beginnen – realistisch für deinen Plan!)

          bus.available = false;
          bus.assignedLine = lineId;
          driver.available = false;
          driver.assignedBus = bus.id;

          const line = LINIEN[lineId];
          const totalTime = getTotalTime(lineId);
          const mult = eventMultiplier[lineId] || 1;
          let passengers = 0;
          line.stops.forEach(stop => {
            passengers += getPassengers(stop, mult);
          });

          const revenue = passengers * 1;
          const fuelCost = totalTime * (bus.model === "Elektro" ? 0.3 : 0.5);
          const maintenance = (totalTime / 60) * 2;
          const salary = (totalTime / 60) * (strike ? 18 : 15);
          const cost = fuelCost + maintenance + salary;
          const profit = revenue - cost;
          totalProfit += profit;

          driver.hours += totalTime / 60;

          addToLog(`🚌 ${lineId}: ${passengers} Passagiere | Gewinn: ${profit.toFixed(2)}€`);

          // Bus & Fahrer nach Fahrt wieder verfügbar (nach Fahrtzeit)
          setTimeout(() => {
            bus.available = true;
            bus.assignedLine = null;
            driver.available = true;
            driver.assignedBus = null;
          }, totalTime * 10); // Verzögerung nur für UI, nicht für Logik

          break; // Nur eine Fahrt pro Linie pro Intervall
        }
      }
    }

    currentTime += 30; // nächstes 30-Min-Intervall
    await new Promise(r => setTimeout(r, 100)); // kleiner Delay für UI
  }

  gameState.money += totalProfit;
  gameState.night++;
  addToLog(`✅ Nacht beendet! Gewinn: ${totalProfit.toFixed(2)}€ | Neuer Kontostand: ${gameState.money.toFixed(2)}€`);
  updateUI();
}

// --- UI ---
function updateUI()
