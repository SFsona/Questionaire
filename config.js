/* ==============================================
   SONA Home Technology Budget Calculator
   Configuration & Cost Model
   ============================================== */

window.SONA_DEFAULTS = {
  currency: "GBP",
  apPerSqm: 110,          // Wi-Fi access point density (m² per AP)
  powerPct: 0.06,         // 6% containment & power management
  lowAdjPct: 0.0,         // Low estimate adjustment (relative to base)
  highAdjPct: 0.10        // High estimate adjustment (+10%)
};

/* ----------------------------------------------
   SYSTEM COST MODEL
   ---------------------------------------------- */
window.SONA_COST_MODEL = {
  /* Infrastructure */
  infrastructure: {
    perSqm: 22
  },

  /* Connectivity */
  connectivity: {
    router: 2000,
    switchSmall: 2000,   // ≤ 10,000 ft²
    switchLarge: 4000,   // > 10,000 ft²
    ap: 400,             // allowance for AP (per unit)
    "ap-hidden": 350     // allowance for AP housing (per unit)
  },

  /* Access & Intercom */
  access: {
    audioOnly: 600,
    audioVideo: 2000
  },

  /* Lighting Control */
  lightingControl: {
    keypadCost: 500,
    keypadRules: {
      baseBySqft: [
        { maxSqft: 9000, qty: 9 },
        { maxSqft: 15000, qty: 15 },
        { maxSqft: 999999, qty: 22 }
      ],
      perBedroom: 4,   // per bedroom set (ENTIRE scope)
      perLeisure: 1    // per leisure/entertaining room
    },
    equipmentBySqft: [
      { maxSqft: 9000, cost: 9000 },
      { maxSqft: 15000, cost: 13000 },
      { maxSqft: 999999, cost: 18000 }
    ],
    processor: 3000,
    scopeMultiplier: {
      entire: 1.0,
      main: 0.7
    }
  },

  /* High Quality Architectural Lighting */
  lightingFittings: {
    perRoom: 1800
  },

  /* Shading */
  shading: {
    perBlind: 1520
  },

  /* Audio */
  audio: {
    standard: 1700,
    advanced: 3000,
    invisible: 4000,
    surround: 5700
  },

  /* Video */
  video: {
    upTo55: 1800,
    over65: 3000,
    localPerZone: 400,
    centralCore: 6000,
    centralPerZoneAdd: 1700
  },

  /* Cinema / Media */
  cinema: {
    entry: 25400,
    mid: 75300,
    high: 102400
  }
};
