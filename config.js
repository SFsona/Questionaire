/* ==============================================
   SONA Home Technology Budget Calculator
   Configuration & Cost Model
   ============================================== */

window.SONA_DEFAULTS = {
  currency: "GBP",
  apPerSqm: 110,          // Wi-Fi access point density
  powerPct: 0.06,         // 6% containment & power management
  lowAdjPct: 0.0,         // adjustment for low estimate (base)
  highAdjPct: 0.10        // adjustment for high estimate (+10%)
};

/* ----------------------------------------------
   SYSTEM COST MODEL
   ---------------------------------------------- */
window.SONA_COST_MODEL = {

  /* === INFRASTRUCTURE === */
  infrastructure: {
    perSqm: 22            // £22 per m² cabling/infrastructure
  },

  /* === CONNECTIVITY === */
  connectivity: {
    router: 2000,
    switchSmall: 1000,    // under 10,000 ft²
    switchLarge: 2000,    // over 10,000 ft²
    ap: 400               // per Wi-Fi access point
  },

  /* === ACCESS & INTERCOM === */
  access: {
    audioOnly: 600,       // per audio-only entry
    audioVideo: 2000      // per audio+video entry
  },

  /* === LIGHTING CONTROL === */
  lightingControl: {
    // keypads
    keypadCost: 500,
    keypadRules: {
      baseBySqft: [
        { maxSqft: 10000, qty: 9 },
        { maxSqft: 20000, qty: 15 },
        { maxSqft: 999999, qty: 22 }
      ],
      perBedroom: 4,     // per bedroom set
      perLeisure: 1      // per leisure/entertaining room
    },
    // control equipment (based on size)
    equipmentBySqft: [
      { maxSqft: 10000, cost: 9000 },
      { maxSqft: 20000, cost: 13000 },
      { maxSqft: 999999, cost: 18000 }
    ],
    processor: 3000,
    // scope multipliers
    scopeMultiplier: {
      entire: 1.0,
      main: 0.7
    }
  },

  /* === HIGH QUALITY ARCHITECTURAL LIGHTING === */
  lightingFittings: {
    perRoom: 1800         // per room
  },

  /* === SHADING === */
  shading: {
    perBlind: 1500        // per shade / blind / curtain track
  },

  /* === AUDIO === */
  audio: {
    standard: 1700,
    advanced: 3000,
    invisible: 4000,
    surround: 4000
  },

  /* === VIDEO === */
  video: {
    upTo55: 1500,
    over65: 2500,
    localPerZone: 400,
    centralCore: 6000,
    centralPerZoneAdd: 1500
  },

  /* === CINEMA / MEDIA ROOM === */
  cinema: {
    entry: 25000,
    mid: 70000,
    high: 150000
  }
};
