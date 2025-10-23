/* ===========================================================
   SONA Home Technology Budget Calculator – Core Logic
   =========================================================== */
document.addEventListener("DOMContentLoaded", function () {

  // --- Welcome cross-fade transition ---
  const btnStart = document.getElementById("btnStart");
  if (btnStart) {
    btnStart.addEventListener("click", function () {
      const welcome = document.getElementById("welcome");
      const wizard  = document.getElementById("wizard");
      if (!welcome || !wizard) return;
      welcome.classList.add("is-hidden");
      wizard.classList.remove("is-hidden");
    });
  }

  // --- Load configuration ---
  const DEFAULTS = window.SONA_DEFAULTS || {};
  const COSTS    = window.SONA_COST_MODEL || {};

  // --- Helpers ---
  const qs  = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  const valNum = (id, fallback = 0) => {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const num = parseFloat(el.value.replace(/[^0-9.]/g, ""));
    return isFinite(num) ? Math.max(0, num) : fallback;
  };
  const radioVal = (name) => {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  };
  const m2FromInput = () => {
    const val = valNum("sizeValue", 0);
    const unit = (qs("#sizeUnit")?.value) || "sqm";
    return unit === "sqft" ? val / 10.7639 : val;
  };
  const fmtGBP = (v) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

  // --- Step navigation ---
  const steps = qsa(".step");
  let stepIndex = 0;

  const showStep = (i) => {
    steps.forEach((s, idx) => s.classList.toggle("active", idx === i));
    qs("#btnBack").disabled = i === 0;
    qs("#btnNext").textContent = i === steps.length - 1 ? "See Estimate" : "Next";
    qs("#stepBadge").textContent = `STEP ${i + 1} / ${steps.length}`;
    qs("#bartext").textContent = `STEP ${i + 1} / ${steps.length}`;
  };
  showStep(stepIndex);

  const validateStep = () => {
    if (stepIndex === 0 && m2FromInput() < 20) return "Please enter property size (≥ 20 m²).";
    if (stepIndex === 1 && valNum("bedrooms", 0) < 1) return "Please enter the number of bedrooms.";
    return null;
  };

  qs("#btnNext").addEventListener("click", () => {
    const err = validateStep();
    if (err) { alert(err); return; }
    if (stepIndex < steps.length - 1) {
      stepIndex++;
      showStep(stepIndex);
    } else {
      showSummary();
    }
  });
  qs("#btnBack").addEventListener("click", () => {
    if (stepIndex > 0) stepIndex--;
    showStep(stepIndex);
  });

  // --- Core estimate calculation ---
  function estimate() {
    const m2      = m2FromInput();
    const sqft    = m2 * 10.7639;
    const beds    = valNum("bedrooms", 0);
    const leisure = valNum("leisure", 0);

    const entryAudio = valNum("entryAudio", 0);
    const entryAV    = valNum("entryAV", 0);

    const lightingScope = radioVal("lightingScope") || "entire";
    const archAll   = qs("#archAll")?.checked || false;
    const archRooms = archAll ? Math.max(1, beds + leisure + 4) : valNum("archFittingsRooms", 0);

    const shades = valNum("shades", 0);

    const audioStd = valNum("audioStd", 0);
    const audioAdv = valNum("audioAdv", 0);
    const audioInv = valNum("audioInv", 0);
    const audioSur = valNum("audioSur", 0);

    const video55  = valNum("video55", 0);
    const video65  = valNum("video65", 0);
    const videoDist = radioVal("videoDist") || "local";
    const cinemaLevel = radioVal("cinemaLevel") || "none";

    // Infrastructure
    const infra = Math.round(m2 * (COSTS.infrastructure.perSqm || 0));

    // Connectivity
    const aps = Math.max(1, Math.ceil(m2 / (DEFAULTS.apPerSqm || 110)));
    const switchCost = sqft <= 10000 ? COSTS.connectivity.switchSmall : COSTS.connectivity.switchLarge;
    const conn = Math.round(COSTS.connectivity.router + switchCost + aps * COSTS.connectivity.ap);

    // Access
    const access = Math.round(entryAudio * COSTS.access.audioOnly + entryAV * COSTS.access.audioVideo);

    // Lighting control
    const baseBySqft = COSTS.lightingControl.keypadRules.baseBySqft;
    const baseQty = baseBySqft.find(b => sqft <= b.maxSqft)?.qty || baseBySqft[baseBySqft.length - 1].qty;
    const perBed = COSTS.lightingControl.keypadRules.perBedroom;
    const perLeisure = COSTS.lightingControl.keypadRules.perLeisure;
    const bedSets = lightingScope === "main" ? (beds > 0 ? 1 : 0) : beds;
    const keypads = baseQty + bedSets * perBed + leisure * perLeisure;
    const keypadCost = keypads * COSTS.lightingControl.keypadCost;

    const equip = COSTS.lightingControl.equipmentBySqft.find(b => sqft <= b.maxSqft)?.cost || 0;
    const scopeMult = COSTS.lightingControl.scopeMultiplier[lightingScope] || 1;
    const lightEquip = Math.round(equip * scopeMult);
    const lightingCtl = keypadCost + lightEquip + COSTS.lightingControl.processor;

    // Architectural lighting
    const lightFit = archRooms * COSTS.lightingFittings.perRoom;

    // Shading
    const shading = shades * COSTS.shading.perBlind;

    // Audio
    const audio = audioStd * COSTS.audio.standard +
                  audioAdv * COSTS.audio.advanced +
                  audioInv * COSTS.audio.invisible +
                  audioSur * COSTS.audio.surround;

    // Video
    let video = video55 * COSTS.video.upTo55 + video65 * COSTS.video.over65;
    const zones = video55 + video65;
    if (zones > 0) {
      if (videoDist === "central") {
        video += COSTS.video.centralCore + zones * COSTS.video.centralPerZoneAdd;
      } else {
        video += zones * COSTS.video.localPerZone;
      }
    }

    // Cinema
    const cinema = COSTS.cinema[cinemaLevel] || 0;

    // Power management
    const subtotal = infra + conn + access + lightingCtl + lightFit + shading + audio + video + cinema;
    const power = subtotal * (DEFAULTS.powerPct || 0.06);

    // Totals
    const base = subtotal + power;
    const low  = Math.round(base * (1 + (DEFAULTS.lowAdjPct || 0)));
    const high = Math.round(base * (1 + (DEFAULTS.highAdjPct || 0.10)));

    return {
      systems: [
        { label: "Infrastructure", cost: infra },
        { label: "Connectivity", cost: conn },
        { label: "Access & Intercom", cost: access },
        { label: "Lighting Control", cost: lightingCtl },
        { label: "High Quality Architectural Lighting", cost: lightFit },
        { label: "Shading", cost: shading },
        { label: "Audio", cost: audio },
        { label: "Video", cost: video },
        { label: "Home Cinema / Media", cost: cinema },
        { label: "Containment & Power Management", cost: power }
      ],
      base, low, high
    };
  }

  // --- Summary ---
  function showSummary() {
    const r = estimate();
    qs("#wizard").style.display = "none";
    const summary = qs("#summary");
    summary.style.display = "block";

    qs("#kpiLow").textContent  = fmtGBP(r.low);
    qs("#kpiHigh").textContent = fmtGBP(r.high);

    const tbody = qs("#tbodySys");
    tbody.innerHTML = "";
    r.systems.forEach(sys => {
      const tr = document.createElement("tr");
      const td1 = document.createElement("td");
      const td2 = document.createElement("td");
      td1.textContent = sys.label;
      td2.textContent = fmtGBP(sys.cost);
      tr.appendChild(td1);
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });

    qs("#btnExport").onclick = () => exportCSV(r);
    qs("#btnPrint").onclick  = () => window.print();
    qs("#btnRestart").onclick = () => window.location.reload();
  }

  // --- CSV Export ---
  function exportCSV(r) {
    const rows = [["System","Estimate (ex VAT)"]];
    r.systems.forEach(s => rows.push([s.label, s.cost]));
    rows.push(["Base", r.base]);
    rows.push(["Low estimate", r.low]);
    rows.push(["High estimate", r.high]);

    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sona-budget-estimate.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

});
