/**
 * NORTH MASTER CONTROLLER
 * TARGET: https://north-backend-kdgq.onrender.com/evaluate/
 */

const API_URL = "https://north-backend-kdgq.onrender.com/evaluate/"; 

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

let selectedModel = "mistral";

function setStatus(status, ms, modelUsed){
  if(el("statusRow")) { el("statusRow").classList.remove("hidden"); el("statusRow").classList.add("flex"); }
  if(el("statusText")) el("statusText").textContent = status || "—";
  if(el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms · ${modelUsed}` : "";
  if(el("statusDot")) {
    el("statusDot").style.backgroundColor = (status === "ADMISSIBLE" ? "#fff" : status === "REFUSAL" ? "#ef4444" : "#52525b");
  }
}

function setGuide(data){
  // Map Triadic Scores (I, R, Sem, L, Tau, Rho, Rho_Crit)
  const s = data.scores || {};
  const mapping = { 
    scoreI: s.I, scoreR: s.R, scoreSem: s.Sem, scoreL: s.L, 
    scoreTau: s.tau, scoreRho: s.rho, scoreRhoCrit: s.rho_crit 
  };
  Object.entries(mapping).forEach(([id, val]) => { if(el(id)) el(id).textContent = val ?? "—"; });

  // Map Framework Chord Lineage
  const lineage = el("lineage");
  if(lineage && data.chord) {
    lineage.innerHTML = "";
    const items = [data.chord.tonic, ...(data.chord.ballasts || [])].filter(Boolean);
    items.forEach((item, i) => {
      lineage.innerHTML += `
        <div class="p-3 mb-2 bg-zinc-900/80 border border-zinc-800 rounded-lg">
          <div class="text-[9px] uppercase text-zinc-500">${i === 0 ? 'Tonic' : 'Ballast'}</div>
          <div class="text-[11px] text-zinc-100 font-medium">${item.meta?.Framework_Name || "—"}</div>
        </div>`;
    });
  }
}

async function evaluatePrompt() {
  const prompt = el("prompt")?.value.trim();
  const apiKey = el("mistralKey")?.value?.trim(); // CRITICAL for 401 Fix
  
  if(!prompt) return;

  el("btnEvaluate").disabled = true;
  setVisible("outputCard", false);
  setVisible("errorBox", false);
  setStatus("EVALUATING...", 0, "...");

  try {
    const payload = {
      prompt: prompt,
      model: selectedModel,
      provider: selectedModel === "mistral" ? "mistral" : null,
      model_name: el("mistralModel")?.value?.trim() || "open-mistral-7b",
      api_key: apiKey || null,
      session_id: localStorage.getItem("north_session_id"),
      parent_branch_id: el("linkLineage")?.checked ? localStorage.getItem("north_last_branch_id") : null,
      n_reads: 1
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
        el("errorBox").textContent = `AUDIT_FAILED: ${e.message}`;
        setVisible("errorBox", true);
    }
    setStatus("ERROR", 0, "N/A");
  } finally {
    el("btnEvaluate").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) localStorage.setItem("north_session_id", crypto.randomUUID());
  if(el("btnEvaluate")) el("btnEvaluate").onclick = evaluatePrompt;
  
  // Bind Drawer Toggles
  if(el("pillGuide")) el("pillGuide").onclick = () => el("guideDrawer").classList.toggle("hidden");
  if(el("pillModel")) el("pillModel").onclick = () => setVisible("modelModal", true);
  if(el("closeModelModal")) el("closeModelModal").onclick = () => setVisible("modelModal", false);
});
