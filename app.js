document.addEventListener("DOMContentLoaded", () => {
  const DEFAULTS = window.SONA_DEFAULTS;
  const COST_MODEL = window.SONA_COST_MODEL;

  const fmt = new Intl.NumberFormat("en-GB", { style:"currency", currency: DEFAULTS.currency, maximumFractionDigits:0 });
  const qs  = s => document.querySelector(s);
  const qsa = s => Array.from(document.querySelectorAll(s));

  function valNum(id, fallback=0){
    const el = document.getElementById(id);
    if (!el) return fallback;
    const cleaned = String(el.value || "").replace(/[^0-9.]/g, "");
    const v = parseFloat(cleaned);
    return Number.isFinite(v) ? Math.max(0, v) : fallback;
  }
  function radioVal(name){
    const el = document.querySelector(input[name="${name}"]:checked);
    return el ? el.value : null;
  }
  function m2FromInput(){
    const val = valNum("sizeValue", 0);
    const unitEl = document.getElementById("sizeUnit");
    const unit = unitEl ? unitEl.value : "sqm";
    if (!val) return 0;
    return unit === "sqft" ? val / 10.7639 : val; // ft² → m²
  }

  // Wizard state
  const steps = qsa(".step");
  let idx = 0;

  function setBadge(){
    const badge = STEP ${idx+1} / ${steps.length};
    const sb = qs("#stepBadge"); if (sb) sb.textContent = badge;
    const bt = qs("#bartext");  if (bt) bt.textContent = badge;
  }
  function showStep(i){
    steps.forEach((s,j)=>s.classList.toggle("active", j===i));
    qs("#btnBack").disabled = (i===0);
    qs("#btnNext").textContent = (i === steps.length - 1) ? "See estimate" : "Next";
    setBadge();
  }
  showStep(idx);

  function validateCurrent(){
    if (idx===0){
      const size = m2FromInput();
      if (size < 20) return { ok:false, msg:"Please enter property size (≥ 20 m² or equivalent ft²)." };
    }
    if (idx===1){
      const beds = valNum("bedrooms",0);
      if (beds < 1) return { ok:false, msg:"Please enter bedrooms (≥ 1)." };
    }
    return { ok:true };
  }

  qs("#btnBack").addEventListener("click", ()=>{ if(idx>0){ idx--; showStep(idx); }});
  qs("#btnNext").addEventListener("click", ()=>{
    const v = validateCurrent();
    if(!v.ok){ alert(v.msg); return; }
    if(idx === steps.length - 1){ showSummary(); } else { idx++; showStep(idx); }
  });

  // Enter to advance, Shift+Enter back
  document.addEventListener("keydown", (e)=>{
    const isInput = /^(INPUT|SELECT)$/.test(e.target.tagName);
    if (e.key === "Enter" && isInput){
      e.preventDefault();
      const v = validateCurrent();
      if (!v.ok){ alert(v.msg); return; }
      if (idx === steps.length - 1){ showSummary(); } else { idx++; showStep(idx); }
    }
    if (e.key === "Enter" && e.shiftKey){
      e.preventDefault();
      if (idx>0){ idx--; showStep(idx); }
    }
  });

  // Estimate engine
  function estimate(){
    const m2 = m2FromInput();
    const sqft = m2 * 10.7639;
    const beds = valNum("bedrooms",0);
    const leisure = valNum("leisure",0);

    const entryAudio = valNum("entryAudio",0);
    const entryAV    = valNum("entryAV",0);

    const lightingScope = radioVal("lightingScope") || "entire";

    const archAll = qs("#archAll")?.checked;
    let archRooms = valNum("archFittingsRooms",0);
    if (archAll){ archRooms = Math.max(1, Math.round(beds + leisure + 4)); }

    const shades   = valNum("shades",0);

    const audioStd = valNum("audioStd",0);
    const audioAdv = valNum("audioAdv",0);
    const audioInv = valNum("audioInv",0);
    const audioSur = valNum("audioSur",0);

    const video55  = valNum("video55",0);
    const video65  = valNum("video65",0);
    const videoDist = radioVal("videoDist") || "local";

    const cinemaLevel = radioVal("cinemaLevel") || "none";

    const aps = Math.max(1, Math.ceil(m2 / DEFAULTS.apPerSqm));

    const lines = [];

    // Infrastructure
    const infra = Math.round(m2 * COST_MODEL.infrastructure.perSqm);
    lines.push({key:"infrastructure", label:"Infrastructure", cost:infra, notes:${Math.round(m2)} m² @ £${COST_MODEL.infrastructure.perSqm}/m²});

    // Connectivity (router + switch band + APs)
    const switchCost = sqft <= 10000 ? COST_MODEL.connectivity.switchSmall : COST_MODEL.connectivity.switchLarge;
    const conn = Math.round(COST_MODEL.connectivity.router + switchCost + aps * COST_MODEL.connectivity.ap);
    lines.push({key:"connectivity", label:"Connectivity", cost:conn, notes:router + ${sqft<=10000?'small':'large'} switch + ${aps} APs});

    // Access & Intercom
    const access = Math.round(entryAudio * COST_MODEL.access.audioOnly + entryAV * COST_MODEL.access.audioVideo);
    if (access>0) lines.push({key:"access", label:"Access & Intercom", cost:access, notes:${entryAudio} audio, ${entryAV} A/V});

    // Lighting Control (keypads + equipment (scoped) + processor)
    function baseKeypadsBySqft(ft2){
      const bands = COST_MODEL.lightingControl.keypadRules.baseBySqft;
      for (const b of bands){ if (ft2 <= b.maxSqft) return b.qty; }
      return bands[bands.length - 1].qty;
    }
    const baseKeypads = baseKeypadsBySqft(sqft);

    // Bedrooms logic:
    // ENTIRE: 4 per bedroom
    // MAIN: master only → one set of 4 if any bedrooms exist
    const perBedroomSet = COST_MODEL.lightingControl.keypadRules.perBedroom; // 4
    const bedroomSets = (lightingScope === "main") ? (beds > 0 ? 1 : 0) : beds;
    const keypadBedrooms = bedroomSets * perBedroomSet;
    const keypadLeisure  = leisure * COST_MODEL.lightingControl.keypadRules.perLeisure;
    const keypadQty  = baseKeypads + keypadBedrooms + keypadLeisure;
    const keypadCost = keypadQty * COST_MODEL.lightingControl.keypadCost;

    function equipmentBySqft(ft2){
      const bands = COST_MODEL.lightingControl.equipmentBySqft;
      for (const b of bands){ if (ft2 <= b.maxSqft) return b.cost; }
      return bands[bands.length - 1].cost;
    }
    const scopeMult = COST_MODEL.lightingControl.scopeMultiplier[lightingScope] || 1.0;
    const equipmentCost = Math.round(equipmentBySqft(sqft) * scopeMult);
    const processorCost = COST_MODEL.lightingControl.processor;

    const lightingCtl = Math.round(keypadCost + equipmentCost + processorCost);
    if (lightingCtl > 0) {
      lines.push({
        key:"lightingControl",
        label:"Lighting Control",
        cost:lightingCtl,
        notes:${keypadQty} keypads (£${COST_MODEL.lightingControl.keypadCost} ea), ${lightingScope} scope equipment + processor
      });
    }

    // High Quality Architectural Lighting
    const lightFit = Math.round(archRooms * COST_MODEL.lightingFittings.perRoom);
    if (lightFit>0) lines.push({key:"lightingFittings", label:"High Quality Architectural Lighting", cost:lightFit, notes:${archRooms} rooms});

    // Shading
    const shading = Math.round(shades * COST_MODEL.shading.perBlind);
    if (shading>0) lines.push({key:"shading", label:"Shading (Motorised)", cost:shading, notes:${shades} shades @ £${COST_MODEL.shading.perBlind}});

    // Audio
    const audioCost =
      audioStd * COST_MODEL.audio.standard +
      audioAdv * COST_MODEL.audio.advanced +
      audioInv * COST_MODEL.audio.invisible +
      audioSur * COST_MODEL.audio.surround;
    if (audioCost>0) lines.push({key:"audio", label:"Audio (multi-room)", cost:Math.round(audioCost),
      notes:std ${audioStd}, adv ${audioAdv}, inv ${audioInv}, surround ${audioSur}});

    // Video
    const zones = video55 + video65;
    let videoCost = video55 * COST_MODEL.video.upTo55 + video65 * COST_MODEL.video.over65;
    if (videoDist === "central" && zones>0){
      videoCost += COST_MODEL.video.centralCore + zones * COST_MODEL.video.centralPerZoneAdd;
    } else if (zones>0) {
      videoCost += zones * COST_MODEL.video.localPerZone;
    }
    if (videoCost>0) lines.push({key:"video", label:"Video (distribution)", cost:Math.round(videoCost),
      notes:${video55} ≤55", ${video65} ≥65" ${videoDist==="central"?" / centralised":"/ local"}});

    // Cinema / Media
    const cinema = COST_MODEL.cinema[cinemaLevel] || 0;
    if (cinema>0) lines.push({key:"cinema", label:"Home Cinema / Media", cost:cinema, notes:${cinemaLevel} level});

    // Containment & Power Mgmt — % of other systems
    const subBeforePower = lines.reduce((a,b)=>a+b.cost,0);
    const power = Math.round(subBeforePower * DEFAULTS.powerPct);
    lines.push({key:"power", label:"Containment & Power Mgmt", cost:power, notes:${Math.round(DEFAULTS.powerPct*100)}% allowance});

    // Base + Low/High
    const base = lines.reduce((a,b)=>a+b.cost,0);
    const low = Math.round(base * (1 + DEFAULTS.lowAdjPct));
    const high = Math.round(base * (1 + DEFAULTS.highAdjPct));

    return { lines, base, low, high };
  }

  // Summary
  function showSummary(){
    const r = estimate();
    qs("#wizard").style.display = "none";
    qs("#summary").style.display = "block";

    qs("#kpiLow").textContent  = fmt.format(r.low);
    qs("#kpiHigh").textContent = fmt.format(r.high);

    // Per-system totals (no sub-allowances on screen)
    const tbody = qs("#tbodySys");
    tbody.innerHTML = "";
    r.lines.forEach(line => {
      const tr = document.createElement("tr");
      tr.innerHTML = <td>${line.label}</td><td>${fmt.format(line.cost)}</td>;
      tbody.appendChild(tr);
    });

    qs("#btnExport").onclick = ()=>exportCSV(r);
    qs("#btnPrint").onclick  = ()=>window.print();
    qs("#btnRestart").onclick= ()=>window.location.reload();
  }

  function exportCSV(r){
    // CSV includes internal notes and base for your team
    const rows = [
      ["System","Estimate (ex VAT)","Notes"],
      ...r.lines.map(l=>[l.label,l.cost,l.notes]),
      ["Base estimate (ex VAT)", r.base, ""],
      ["Low estimate (ex VAT)", r.low, ""],
      ["High estimate (ex VAT)", r.high, ""],
    ];
    const csv = rows.map(row => row.map(v => "${String(v).replace(/"/g,'""')}").join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sona-budget-estimate.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
});
