// app.js — robust, no template strings, no arrow functions, no trailing commas
document.addEventListener("DOMContentLoaded", function () {
  // Boot marker (optional health check)
  window.SONA_BOOTSTRAPPED = true;
  console.log("SONA app booted");

  // ---- Welcome cross-fade ----
  var btnStart = document.getElementById("btnStart");
  if (btnStart) {
    btnStart.addEventListener("click", function () {
      var welcome = document.getElementById("welcome");
      var wizard  = document.getElementById("wizard");
      if (!welcome || !wizard) return;
      // Use class toggles; CSS handles the fade
      if (welcome.classList) { welcome.classList.add("is-hidden"); }
      if (wizard.classList)  { wizard.classList.remove("is-hidden"); }
    });
  }

  // ---- Config from config.js ----
  var DEFAULTS   = window.SONA_DEFAULTS || {};
  var COST_MODEL = window.SONA_COST_MODEL || {};

  // ---- Helpers ----
  function fmtGBP(v){
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: DEFAULTS.currency || "GBP", maximumFractionDigits: 0 }).format(v);
    } catch (e) {
      var n = Math.round(v);
      return "£" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  }
  function qs(sel){ return document.querySelector(sel); }
  function qsa(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function valNum(id, fallback){
    if (fallback === undefined) fallback = 0;
    var el = document.getElementById(id);
    if (!el) return fallback;
    var cleaned = String(el.value || "").replace(/[^0-9.]/g, "");
    var v = parseFloat(cleaned);
    return isFinite(v) ? Math.max(0, v) : fallback;
  }
  function radioVal(name){
    var el = document.querySelector('input[name="'+name+'"]:checked');
    return el ? el.value : null;
  }
  function m2FromInput(){
    var val = valNum("sizeValue", 0);
    var unitEl = document.getElementById("sizeUnit");
    var unit = unitEl ? unitEl.value : "sqm";
    if (!val) return 0;
    return unit === "sqft" ? (val / 10.7639) : val;
  }

  // ---- Wizard nav ----
  var steps = qsa(".step");
  if (!steps.length) {
    console.error("No .step elements found.");
    return;
  }
  var idx = 0;

  function setBadge(){
    var text = "STEP " + (idx + 1) + " / " + steps.length;
    var sb = qs("#stepBadge"); if (sb) sb.textContent = text;
    var bt = qs("#bartext");  if (bt) bt.textContent = text;
  }
  function showStep(i){
    for (var j = 0; j < steps.length; j++) {
      var active = (j === i);
      if (steps[j].classList) { steps[j].classList.toggle("active", active); }
    }
    var back = qs("#btnBack");
    var next = qs("#btnNext");
    if (back) back.disabled = (i === 0);
    if (next) next.textContent = (i === steps.length - 1) ? "See estimate" : "Next";
    setBadge();
  }
  showStep(idx);

  function validateCurrent(){
    if (idx === 0) {
      var size = m2FromInput();
      if (size < 20) return { ok: false, msg: "Please enter property size (≥ 20 m² or equivalent ft²)." };
    }
    if (idx === 1) {
      var beds = valNum("bedrooms", 0);
      if (beds < 1) return { ok: false, msg: "Please enter bedrooms (≥ 1)." };
    }
    return { ok: true };
  }

  var btnBack = qs("#btnBack");
  var btnNext = qs("#btnNext");
  if (!btnBack || !btnNext) {
    console.error("Buttons #btnBack/#btnNext not found.");
    return;
  }
  btnBack.type = "button";
  btnNext.type = "button";

  btnBack.addEventListener("click", function(){
    if (idx > 0) { idx -= 1; showStep(idx); }
  });
  btnNext.addEventListener("click", function(){
    var v = validateCurrent();
    if (!v.ok) { alert(v.msg); return; }
    if (idx < steps.length - 1) { idx += 1; showStep(idx); }
    else { showSummary(); }
  });

  // Enter advances, Shift+Enter back
  document.addEventListener("keydown", function(e){
    var t = e.target || {};
    var isInput = t.tagName === "INPUT" || t.tagName === "SELECT";
    if (e.key === "Enter" && isInput) {
      e.preventDefault();
      var v2 = validateCurrent();
      if (!v2.ok) { alert(v2.msg); return; }
      if (idx < steps.length - 1) { idx += 1; showStep(idx); } else { showSummary(); }
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      if (idx > 0) { idx -= 1; showStep(idx); }
    }
  });

  // ---- Estimate engine ----
  function estimate(){
    var m2     = m2FromInput();
    var sqft   = m2 * 10.7639;
    var beds   = valNum("bedrooms", 0);
    var leisure= valNum("leisure", 0);

    var entryAudio = valNum("entryAudio", 0);
    var entryAV    = valNum("entryAV", 0);

    var lightingScope = radioVal("lightingScope") || "entire";

    var archAllEl = qs("#archAll");
    var archAll = !!(archAllEl && archAllEl.checked);
    var archRooms = valNum("archFittingsRooms", 0);
    if (archAll) { archRooms = Math.max(1, Math.round(beds + leisure + 4)); }

    var shades   = valNum("shades", 0);

    var audioStd = valNum("audioStd", 0);
    var audioAdv = valNum("audioAdv", 0);
    var audioInv = valNum("audioInv", 0);
    var audioSur = valNum("audioSur", 0);

    var video55  = valNum("video55", 0);
    var video65  = valNum("video65", 0);
    var videoDist= radioVal("videoDist") || "local";

    var cinemaLevel = radioVal("cinemaLevel") || "none";

    var apPerSqm = DEFAULTS.apPerSqm || 110;
    var aps = Math.max(1, Math.ceil(m2 / apPerSqm));

    var lines = [];

    // Infrastructure
    var infraRate = (COST_MODEL.infrastructure && COST_MODEL.infrastructure.perSqm) ? COST_MODEL.infrastructure.perSqm : 0;
    var infra = Math.round(m2 * infraRate);
    lines.push({ key: "infrastructure", label: "Infrastructure", cost: infra, notes: Math.round(m2) + " m² @ £" + infraRate + "/m²" });

    // Connectivity
    var c = COST_MODEL.connectivity || {};
    var switchCost = (sqft <= 10000) ? (c.switchSmall || 0) : (c.switchLarge || 0);
    var conn = Math.round((c.router || 0) + switchCost + aps * (c.ap || 0));
    lines.push({ key: "connectivity", label: "Connectivity", cost: conn, notes: "router + " + (sqft<=10000?"small":"large") + " switch + " + aps + " APs" });

    // Access & Intercom
    var a = COST_MODEL.access || {};
    var access = Math.round(entryAudio * (a.audioOnly || 0) + entryAV * (a.audioVideo || 0));
    if (access > 0) lines.push({ key: "access", label: "Access & Intercom", cost: access, notes: entryAudio + " audio, " + entryAV + " A/V" });

    // Lighting Control (keypads + equipment + processor)
    function baseKeypadsBySqft(ft2){
      var bands = (COST_MODEL.lightingControl && COST_MODEL.lightingControl.keypadRules && COST_MODEL.lightingControl.keypadRules.baseBySqft) ? COST_MODEL.lightingControl.keypadRules.baseBySqft : [];
      for (var i = 0; i < bands.length; i++) { if (ft2 <= bands[i].maxSqft) return bands[i].qty; }
      return bands.length ? bands[bands.length - 1].qty : 0;
    }
    var baseKeypads = baseKeypadsBySqft(sqft);
    var lc = COST_MODEL.lightingControl || {};
    var rules = lc.keypadRules || {};
    var perBedroomSet = rules.perBedroom || 0;
    var perLeisure    = rules.perLeisure || 0;
    var bedroomSets   = (lightingScope === "main") ? (beds > 0 ? 1 : 0) : beds;
    var keypadBedrooms= bedroomSets * perBedroomSet;
    var keypadLeisure = leisure * perLeisure;
    var keypadQty     = baseKeypads + keypadBedrooms + keypadLeisure;
    var keypadCost    = keypadQty * (lc.keypadCost || 0);

    function equipmentBySqft(ft2){
      var bands = lc.equipmentBySqft || [];
      for (var i = 0; i < bands.length; i++) { if (ft2 <= bands[i].maxSqft) return bands[i].cost; }
      return bands.length ? bands[bands.length - 1].cost : 0;
    }
    var scopeMult = (lc.scopeMultiplier && lc.scopeMultiplier[lightingScope]) ? lc.scopeMultiplier[lightingScope] : 1.0;
    var equipmentCost = Math.round(equipmentBySqft(sqft) * scopeMult);
    var processorCost = lc.processor || 0;

    var lightingCtl = Math.round(keypadCost + equipmentCost + processorCost);
    if (lightingCtl > 0) {
      lines.push({ key: "lightingControl", label: "Lighting Control", cost: lightingCtl, notes: keypadQty + " keypads (@" + (lc.keypadCost || 0) + "), scope " + lightingScope + " + processor" });
    }

    // High Quality Architectural Lighting
    var fitRate = (COST_MODEL.lightingFittings && COST_MODEL.lightingFittings.perRoom) ? COST_MODEL.lightingFittings.perRoom : 0;
    var lightFit = Math.round(archRooms * fitRate);
    if (lightFit > 0) lines.push({ key: "lightingFittings", label: "High Quality Architectural Lighting", cost: lightFit, notes: archRooms + " rooms" });

    // Shading
    var shadeRate = (COST_MODEL.shading && COST_MODEL.shading.perBlind) ? COST_MODEL.shading.perBlind : 0;
    var shading = Math.round(shades * shadeRate);
    if (shading > 0) lines.push({ key: "shading", label: "Shading (Motorised)", cost: shading, notes: shades + " shades @ £" + shadeRate });

    // Audio
    var au = COST_MODEL.audio || {};
    var audioCost = audioStd * (au.standard || 0) + audioAdv * (au.advanced || 0) + audioInv * (au.invisible || 0) + audioSur * (au.surround || 0);
    if (audioCost > 0) lines.push({ key: "audio", label: "Audio (multi-room)", cost: Math.round(audioCost), notes: "std " + audioStd + ", adv " + audioAdv + ", inv " + audioInv + ", surround " + audioSur });

    // Video
    var vi = COST_MODEL.video || {};
    var zones = video55 + video65;
    var videoCost = video55 * (vi.upTo55 || 0) + video65 * (vi.over65 || 0);
    if (zones > 0) {
      if (videoDist === "central") {
        videoCost += (vi.centralCore || 0) + zones * (vi.centralPerZoneAdd || 0);
      } else {
        videoCost += zones * (vi.localPerZone || 0);
      }
    }
    if (videoCost > 0) lines.push({ key: "video", label: "Video (distribution)", cost: Math.round(videoCost), notes: video55 + " ≤55\", " + video65 + " ≥65\" " + (videoDist === "central" ? "/ centralised" : "/ local") });

    // Cinema
    var ci = COST_MODEL.cinema || {};
    var cinema = ci[cinemaLevel] || 0;
    if (cinema > 0) lines.push({ key: "cinema", label: "Home Cinema / Media", cost: cinema, notes: cinemaLevel + " level" });

    // Containment & Power
    var subBeforePower = 0;
    for (var k = 0; k < lines.length; k++) subBeforePower += lines[k].cost;
    var powerPct = DEFAULTS.powerPct || 0;
    var power = Math.round(subBeforePower * powerPct);
    lines.push({ key: "power", label: "Containment & Power Mgmt", cost: power, notes: Math.round(powerPct * 100) + "% allowance" });

    var base = 0;
    for (var m = 0; m < lines.length; m++) base += lines[m].cost;
    var low  = Math.round(base * (1 + (DEFAULTS.lowAdjPct || 0)));
    var high = Math.round(base * (1 + (DEFAULTS.highAdjPct || 0)));

    return { lines: lines, base: base, low: low, high: high };
  }

  // ---- Summary ----
  function showSummary(){
    var r = estimate();
    var wiz = qs("#wizard");
    var sum = qs("#summary");
    if (wiz) wiz.style.display = "none";
    if (sum) sum.style.display = "block";

    var lowEl  = qs("#kpiLow");
    var highEl = qs("#kpiHigh");
    if (lowEl)  lowEl.textContent  = fmtGBP(r.low);
    if (highEl) highEl.textContent = fmtGBP(r.high);

    var tbody = qs("#tbodySys");
    if (tbody) {
      tbody.innerHTML = "";
      for (var i = 0; i < r.lines.length; i++) {
        var line = r.lines[i];
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
        td1.textContent = line.label;
        td2.textContent = fmtGBP(line.cost);
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
      }
    }

    var be = qs("#btnExport");
    var bp = qs("#btnPrint");
    var br = qs("#btnRestart");
    if (be) be.onclick = function(){ exportCSV(r); };
    if (bp) bp.onclick = function(){ window.print(); };
    if (br) br.onclick = function(){ window.location.reload(); };
  }

  function exportCSV(r){
    var rows = [["System","Estimate (ex VAT)","Notes"]];
    for (var i = 0; i < r.lines.length; i++) {
      var L = r.lines[i];
      rows.push([L.label, L.cost, L.notes]);
    }
    rows.push(["Base estimate (ex VAT)", r.base, ""]);
    rows.push(["Low estimate (ex VAT)", r.low, ""]);
    rows.push(["High estimate (ex VAT)", r.high, ""]);

    var csv = "";
    for (var rix = 0; rix < rows.length; rix++) {
      var row = rows[rix];
      for (var c = 0; c < row.length; c++) {
        var cell = String(row[c]).replace(/"/g, '""');
        row[c] = '"' + cell + '"';
      }
      csv += row.join(",") + "\n";
    }
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "sona-budget-estimate.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
});
