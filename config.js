// ===== COST & RANGE CONFIG ONLY =====
window.SONA_DEFAULTS = {
  currency: "GBP",
  powerPct: 0.06,   // Containment & Power as % of other systems (ex VAT)
  apPerSqm: 110,    // m² per Wi-Fi access point
  lowAdjPct: -0.10, // range: -10%
  highAdjPct: 0.15  // range: +15%
};

window.SONA_COST_MODEL = {
  infrastructure: { perSqm: 22 },

  connectivity: { 
    router: 2000, 
    switchSmall: 1000,   // ≤ 10,000 ft²
    switchLarge: 2000,   // > 10,000 ft²
    ap: 400
  },

  access: { audioOnly: 600, audioVideo: 2000 },

  lightingControl: {
    keypadCost: 500,
    keypadRules: {
      baseBySqft: [
        { maxSqft: 10000, qty: 9 },
        { maxSqft: 20000, qty: 15 },
        { maxSqft: Infinity, qty: 22 }
      ],
      perBedroom: 4,  // ENTIRE property scope
      perLeisure: 1
    },
    processor: 3000,
    equipmentBySqft: [
      { maxSqft: 10000, cost: 9000 },
      { maxSqft: 20000, cost: 13000 },
      { maxSqft: Infinity, cost: 18000 }
    ],
    scopeMultiplier: { entire: 1.0, main: 0.55 }
  },

  lightingFittings: { perRoom: 1800 },
  shading: { perBlind: 1500 },

  audio: { standard: 1700, advanced: 3000, invisible: 4000, surround: 4000 },

  video: {
    upTo55: 1500,
    over65: 2500,
    localPerZone: 400,
    centralCore: 6000,
    centralPerZoneAdd: 1500
  },

  cinema: { none:0, entry:25000, mid:70000, high:150000 }
};
