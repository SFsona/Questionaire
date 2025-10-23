// app.js (hotfix minimal nav + boot flag)
document.addEventListener("DOMContentLoaded", () => {
  // mark that app.js loaded so index.html health check can confirm
  window.SONA_BOOTSTRAPPED = true;

  // ----- STEP NAV -----
  const steps = Array.from(document.querySelectorAll(".step"));
  if (!steps.length) {
    console.error("No .step elements found in DOM.");
    return;
  }

  let idx = 0;

  function setBadge() {
    const badge = STEP ${idx + 1} / ${steps.length};
    const sb = document.getElementById("stepBadge");
    const bt = document.getElementById("bartext");
    if (sb) sb.textContent = badge;
    if (bt) bt.textContent = badge;
  }

  function showStep(i) {
    steps.forEach((s, j) => s.classList.toggle("active", j === i));
    const back = document.getElementById("btnBack");
    const next = document.getElementById("btnNext");
    if (back) back.disabled = i === 0;
    if (next) next.textContent = (i === steps.length - 1) ? "See estimate" : "Next";
    setBadge();
  }

  // very light validation for first two questions
  function m2FromInput() {
    const sizeEl = document.getElementById("sizeValue");
    const unitEl = document.getElementById("sizeUnit");
    const raw = (sizeEl?.value || "").replace(/[^0-9.]/g, "");
    const val = parseFloat(raw);
    const unit = unitEl ? unitEl.value : "sqm";
    if (!Number.isFinite(val)) return 0;
    return unit === "sqft" ? val / 10.7639 : val;
  }
  function valNum(id) {
    const el = document.getElementById(id);
    const v = parseFloat((el?.value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(v) ? v : 0;
  }
  function validateCurrent() {
    if (idx === 0) {
      const m2 = m2FromInput();
      if (m2 < 20) return { ok: false, msg: "Please enter property size (≥ 20 m² or equivalent ft²)." };
    }
    if (idx === 1) {
      const beds = valNum("bedrooms");
      if (beds < 1) return { ok: false, msg: "Please enter bedrooms (≥ 1)." };
    }
    return { ok: true };
  }

  // wire buttons
  const btnBack = document.getElementById("btnBack");
  const btnNext = document.getElementById("btnNext");

  if (!btnNext || !btnBack) {
    alert("Buttons not found. Check #btnNext / #btnBack IDs in index.html.");
    return;
  }

  btnBack.type = "button";
  btnNext.type = "button";

  btnBack.addEventListener("click", () => {
    if (idx > 0) { idx--; showStep(idx); }
  });

  btnNext.addEventListener("click", () => {
    const v = validateCurrent();
    if (!v.ok) { alert(v.msg); return; }
    if (idx < steps.length - 1) { idx++; showStep(idx); }
    else { // last step: show summary section
      document.getElementById("wizard").style.display = "none";
      document.getElementById("summary").style.display = "block";
      // set placeholder values so you see it working
      document.getElementById("kpiLow").textContent = "£123,000";
      document.getElementById("kpiHigh").textContent = "£141,000";
    }
  });

  // Enter to advance
  document.addEventListener("keydown", (e) => {
    const isInput = /^(INPUT|SELECT)$/.test(e.target.tagName);
    if (e.key === "Enter" && isInput) {
      e.preventDefault();
      btnNext.click();
    }
  });

  // initial reveal
  showStep(idx);
});
