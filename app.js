/* ===========================================================
   SONA Home Technology Budget Calculator – Core Logic
   =========================================================== */
document.addEventListener("DOMContentLoaded", function () {

  // Welcome cross-fade
  var btnStart = document.getElementById("btnStart");
  if (btnStart) {
    btnStart.addEventListener("click", function () {
      var welcome = document.getElementById("welcome");
      var wizard  = document.getElementById("wizard");
      if (!welcome || !wizard) return;
      if (welcome.classList) welcome.classList.add("is-hidden");
      if (wizard.classList)  wizard.classList.remove("is-hidden");
    });
  }

  // Config
  var DEFAULTS = window.SONA_DEFAULTS || {};
  var COSTS    = window.SONA_COST_MODEL || {};

  // Helpers
  function qs(s){ return document.querySelector(s); }
  function qsa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function fmtGBP(v){
    try {
      return new Intl.NumberFormat("en-GB", { style: "currency", currency: DEFAULTS.currency || "GBP", maximumFractionDigits: 0 }).format(v);
    } catch(e){
      return "£" + Math.round(v).toLocaleString("en-GB");
    }
  }
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
    var unit = (qs("#sizeUnit") && qs("#sizeUnit").value) || "sqm";
    if (!val) return 0;
    return unit === "sqft" ? (val / 10.7639) : val;
  }

  // Steps nav
  var steps = qsa(".step");
  var stepIndex = 0;

  function setStepBadge(){
    var txt = "STEP " + (stepIndex + 1) + " / " + steps.length;
    var sb = qs("#stepBadge"); if (sb) sb.textContent = txt;
    var bt = qs("#bartext");  if (bt) bt.textContent = txt;
  }
  function showStep(i){
    for (var j=0;j<steps.length;j++){
      if (steps[j].classList) steps[j].classList.toggle("active", j===i);
    }
    var back = qs("#btnBack"); var next = qs("#btnNext");
    if (back) back.disabled = (i===0);
    if (next) next.textContent = (i === steps.length - 1) ? "See Estimate" : "Next";
    setStepBadge();
  }
  showStep(stepIndex);

  function validateStep(){
    if (stepIndex === 0 && m2FromInput() < 20) return "Please enter property size (≥ 20 m²).";
    if (stepIndex === 1 && valNum("bedrooms", 0) < 1) return "Please enter the number of bedrooms.";
    return null;
    }

  var btnBack = qs("#btnBack");
  var btnNext = qs("#btnNext");
  if (btnBack) btnBack.type = "button";
  if (btnNext) btnNext.type = "button";

  if (btnBack) btnBack.addEventListener("click", function(){
    if (stepIndex > 0) { stepIndex -= 1; showStep(stepIndex); }
  });
  if (btnNext) btnNext.addEventListener("click", function(){
    var err = validateStep();
    if (err){ alert(err); return; }
    if (stepIndex < steps.length - 1) { stepIndex += 1; showStep(stepIndex); }
    else { showSummary(); }
  });

  // Enter to advance, Shift+Enter back
  document.addEventListener("keydown", function(e){
    var t = e.target || {};
    var isInput = t.tagName === "INPUT" || t.tagName === "SELECT";
    if (e.key === "Enter" && isInput){
      e.preventDefault();
      var err = validateStep();
      if (err){ alert(err); return; }
      if (stepIndex < steps.length - 1) { stepIndex += 1; showStep(stepIndex); } else { showSummary(); }
    }
    if (e.key === "Enter" && e.shiftKey){
      e.preventDefault();
      if (stepIndex > 0) { stepIndex -= 1; showStep(stepIndex); }
    }
  });

  // Estimate engine
  function estimate(){
    var m2      = m2FromInput();
    var sqft    = m2 * 10.7639;
    var beds    = valNum("bedrooms", 0);
    var leisure = valNum("leisure", 0);

    var entryAudio = valNum("entryAudio", 0);
    var entryAV    = valNum("entryAV", 0);

    var lightingScope = radioVal("lightingScope") || "entire";

    var archAll = (qs("#archAll") && qs("#archAll").checked) || false;
    var archRooms = archAll ? Math.max(1, beds + leisure + 4) : valNum("archFittingsRooms", 0);

    var shades   = valNum("shades", 0);

    var audioStd = valNum("audioStd", 0);
    var audioAdv = valNum("audioAdv", 0);
    var audioInv = valNum("audioInv", 0);
    var audioSur = valNum("audioSur", 0);

    var video55  = valNum("video55", 0);
    var video65  = valNum("video65", 0);
    var videoDist= radioVal("videoDist") || "local";

    var cinemaLevel = radioVal("cinemaLevel") || "none";

    // Infrastructure
    var infra = Math.round(m2 * (COSTS.infrastructure.perSqm || 0));

    // Connectivity
    var aps = Math.max(1, Math.ceil(m2 / (DEFAULTS.apPerSqm || 110)));
    var switchCost = sqft <= 10000 ? COSTS.connectivity.switchSmall : COSTS.connectivity.switchLarge;
    var conn = Math.round((COSTS.connectivity.router || 0) + switchCost + aps * (COSTS.connectivity.ap || 0));

    // Access & Intercom
    var access = Math.round(entryAudio * (COSTS.access.audioOnly || 0) + entryAV * (COSTS.access.audioVideo || 0));

    // Lighting control (keypads + equipment + processor)
    var lightingCtl = 0;

    if (lightingScope !== "none") {
     function baseKeypadsBySqft(ft2){
       var bands = (COSTS.lightingControl.keypadRules && COSTS.lightingControl.keypadRules.baseBySqft) || [];
       for (var i=0;i<bands.length;i++){ if (ft2 <= bands[i].maxSqft) return bands[i].qty; }
       return bands.length ? bands[bands.length - 1].qty : 0;
     }
       var baseQty = baseKeypadsBySqft(sqft);
       var perBed = (COSTS.lightingControl.keypadRules && COSTS.lightingControl.keypadRules.perBedroom) || 0;
       var perLeisure = (COSTS.lightingControl.keypadRules && COSTS.lightingControl.keypadRules.perLeisure) || 0;
       var bedSets = (lightingScope === "main") ? (beds > 0 ? 1 : 0) : beds;
       var keypads = baseQty + bedSets * perBed + leisure * perLeisure;
       var keypadCost = keypads * (COSTS.lightingControl.keypadCost || 0);
       
      function equipCostBySqft(ft2){
         var bands = (COSTS.lightingControl && COSTS.lightingControl.equipmentBySqft) || [];
         for (var i=0;i<bands.length;i++){ if (ft2 <= bands[i].maxSqft) return bands[i].cost; }
         return bands.length ? bands[bands.length - 1].cost : 0;
      }
   var scopeMult = (COSTS.lightingControl.scopeMultiplier && COSTS.lightingControl.scopeMultiplier[lightingScope]) || 1.0;
       var lightEquip = Math.round(equipCostBySqft(sqft) * scopeMult);
       lightingCtl = Math.round(keypadCost + lightEquip + (COSTS.lightingControl.processor || 0));
    }

    // High Quality Architectural Lighting
    var lightFit = Math.round(archRooms * (COSTS.lightingFittings.perRoom || 0));

    // Shading
    var shading = Math.round(shades * (COSTS.shading.perBlind || 0));

    // Audio
    var audio = Math.round(
      audioStd * (COSTS.audio.standard || 0) +
      audioAdv * (COSTS.audio.advanced || 0) +
      audioInv * (COSTS.audio.invisible || 0) +
      audioSur * (COSTS.audio.surround || 0)
    );

    // Video
    var zones = video55 + video65;
    var video = Math.round(video55 * (COSTS.video.upTo55 || 0) + video65 * (COSTS.video.over65 || 0));
    if (zones > 0){
      if (videoDist === "central"){
        video += (COSTS.video.centralCore || 0) + zones * (COSTS.video.centralPerZoneAdd || 0);
      } else {
        video += zones * (COSTS.video.localPerZone || 0);
      }
    }

    // Cinema
    var cinema = (COSTS.cinema && COSTS.cinema[cinemaLevel]) || 0;

    // Containment & Power Mgmt
    var subtotal = infra + conn + access + lightingCtl + lightFit + shading + audio + video + cinema;
    var power = Math.round(subtotal * (DEFAULTS.powerPct || 0.06));

    // Totals
    var base = subtotal + power;
    var low  = Math.round(base * (1 + (DEFAULTS.lowAdjPct || 0)));
    var high = Math.round(base * (1 + (DEFAULTS.highAdjPct || 0.10)));

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
      base: base, low: low, high: high
    };
  }

  // Summary
  function showSummary(){
    var r = estimate();
    var wiz = qs("#wizard"); if (wiz) wiz.style.display = "none";
    var sum = qs("#summary"); if (sum) sum.style.display = "block";

    var lowEl = qs("#kpiLow");  if (lowEl)  lowEl.textContent  = fmtGBP(r.low);
    var highEl= qs("#kpiHigh"); if (highEl) highEl.textContent = fmtGBP(r.high);

    var tbody = qs("#tbodySys");
    if (tbody){
      tbody.innerHTML = "";
      for (var i=0;i<r.systems.length;i++){
        var s = r.systems[i];
        var tr = document.createElement("tr");
        var td1 = document.createElement("td");
        var td2 = document.createElement("td");
        td1.textContent = s.label;
        td2.textContent = fmtGBP(s.cost);
        tr.appendChild(td1); tr.appendChild(td2);
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

  // CSV export
  function exportCSV(r){
    var rows = [["System","Estimate (ex VAT)"]];
    for (var i=0;i<r.systems.length;i++){
      rows.push([r.systems[i].label, r.systems[i].cost]);
    }
    rows.push(["Base", r.base]);
    rows.push(["Low estimate", r.low]);
    rows.push(["High estimate", r.high]);

    var csv = "";
    for (var rix=0; rix<rows.length; rix++){
      var row = rows[rix];
      for (var c=0;c<row.length;c++){
        var cell = String(row[c]).replace(/"/g,'""');
        row[c] = '"' + cell + '"';
      }
      csv += row.join(",") + "\n";
    }
    var blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "sona-budget-estimate.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
});
