/**
 * NORTH MASTER CONTROLLER
 * Synchronized with Admissibility Engine HTML
 */

const API_URL = "https://north-backend-kdgq.onrender.com/evaluate/"; 

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

let selectedModel = "mistral"; 

function setStatus(status, ms, modelUsed){
  if(el("statusText")) el("statusText").textContent = status || "—";
  if(el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms · ${modelUsed}` : "";
  const dot = el("statusDot");
  if(dot) dot.style.backgroundColor = (status === "ADMISSIBLE" ? "#fff" : status === "REFUSAL" ? "#ef4444" : "#52525b");
}

function setGuide(data){
  // Map Triadic scores from gate.py
  const s = data.scores || {};
  const mapping = { 
    scoreI: s.I, scoreR: s.R, scoreSem: s.Sem, scoreL: s.L, 
    scoreTau: s.tau, scoreRho: s.rho, scoreRhoCrit: s.rho_crit 
  };
  Object.entries(mapping).forEach(([id, val]) => { if(el(id)) el(id).textContent = val ?? "—"; });

  // Map Lineage/Branching
  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("parentBranchId")) el("parentBranchId").textContent = data.branch?.parent_id ?? "—";
  if(el("branchDepth")) el("branchDepth").textContent = data.branch?.depth ?? "0";

  // Render Framework Chord (Lineage)
  const lineage = el("lineage");
  if(lineage && data.chord) {
    lineage.innerHTML = "";
    const items = [data.chord.tonic, ...(data.chord.ballasts || [])].filter(Boolean);
    items.forEach((item, i) => {
      lineage.innerHTML += `
        <div style="padding:10px; margin-bottom:8px; background:#111; border:1px solid #222; border-radius:4px;">
          <div style="font-size:9px; color:#444; text-transform:uppercase;">${i === 0 ? 'Tonic' : 'Ballast'}</div>
          <div style="font-size:11px; color:#eee;">${item.meta?.Framework_Name || "Unknown"}</div>
        </div>`;
    });
  }
}

async function evaluatePrompt() {
  const prompt = el("prompt")?.value.trim();
  const apiKey = el("mistralKey")?.value?.trim(); 
  
  if(!prompt) return;

  el("btnEvaluate").disabled = true;
  setVisible("outputCard", false);
  setVisible("errorBox", false);
  setStatus("EVALUATING...", 0, "...");

  try {
    const payload = {
      prompt: prompt,
      model: selectedModel,
      model_name: el("mistralModel")?.value?.trim() || "open-mistral-7b",
      api_key: apiKey || null,
      session_id: localStorage.getItem("north_session_id"),
      parent_branch_id: el("linkLineage")?.checked ? localStorage.getItem("north_last_branch_id") : null,
      n_reads: parseInt(el("apertureReads")?.value || "1", 10)
    };

    const t0 = performance.now();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.detail || "Audit Failed");

    localStorage.setItem("north_last_branch_id", data.branch?.branch_id);
    
    setStatus(data.status, performance.now() - t0, data.model_used);
    if(el("fmo")) el("fmo").textContent = data.fused_meaning_object || data.raw_text;
    setGuide(data);
    setVisible("outputCard", true);

  } catch(e) {
    if(el("errorBox")) {
      el("errorBox").textContent = `CONNECTION_FAILED: ${e.message}`;
      setVisible("errorBox", true);
    }
    setStatus("ERROR", 0, "N/A");
  } finally {
    el("btnEvaluate").disabled = false;
  }
}

// UI Setup
document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) {
    localStorage.setItem("north_session_id", crypto.randomUUID());
  }

  el("btnEvaluate")?.addEventListener("click", evaluatePrompt);
  el("pillModel")?.addEventListener("click", () => setVisible("modelModal", true));
  el("closeModelModal")?.addEventListener("click", () => setVisible("modelModal", false));
  el("aboutToggle")?.addEventListener("click", () => el("aboutContent").classList.toggle("hidden"));
  el("pillGuide")?.addEventListener("click", () => el("guideDrawer").classList.toggle("hidden"));

  document.querySelectorAll(".engine-option").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".engine-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedModel = btn.getAttribute("data-model");
      el("modelNamePill").textContent = selectedModel.toUpperCase();
      setVisible("mistralConfig", selectedModel === "mistral");
    };
  });
});
