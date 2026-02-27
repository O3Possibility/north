// Hardcoded to eliminate the "Failed to fetch" param error
const DEFAULT_API = "https://north-backend-kdgq.onrender.com"; 

function getApiBase() {
  const url = new URL(window.location.href);
  // Still supports URL param but falls back to your Render URL automatically
  const api = url.searchParams.get("api") || DEFAULT_API;
  return (api || "").replace(/\/$/, "");
}

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

function setStatus(status, ms, modelUsed){
  const row = el("statusRow");
  if(row) { row.classList.remove("hidden"); row.classList.add("flex"); }
  if(el("statusText")) el("statusText").textContent = status || "—";
  if(el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms${modelUsed ? ` · model: ${modelUsed}` : ""}` : "";

  const dot = el("statusDot");
  if(dot) {
    dot.classList.remove("bg-zinc-600","bg-white","bg-red-500");
    if(status === "ADMISSIBLE") dot.classList.add("bg-white");
    else if(status === "REFUSAL") dot.classList.add("bg-red-500");
    else dot.classList.add("bg-zinc-600");
  }
}

function lineageRow(title, meta){
  const safe = v => (v === undefined || v === null || v === "") ? "—" : String(v);
  return `
    <div class="rounded-xl border border-zinc-900 bg-black/40 p-3 mb-2">
      <div class="text-xs text-zinc-400">${title}</div>
      <div class="mt-1 text-sm text-zinc-100">${safe(meta.Framework_Name)}</div>
      <div class="mt-1 text-xs text-zinc-500">
        <span class="text-zinc-400">Regime:</span> ${safe(meta.Regime_Type)} ·
        <span class="text-zinc-400">Region:</span> ${safe(meta.Macro_Region)} ·
        <span class="text-zinc-400">Lineage:</span> ${safe(meta.Lineage_Cluster)}
      </div>
    </div>`;
}

function setGuide(data){
  // Scores
  if(el("scoreI")) el("scoreI").textContent = data.scores?.I ?? "—";
  if(el("scoreR")) el("scoreR").textContent = data.scores?.R ?? "—";
  if(el("scoreSem")) el("scoreSem").textContent = data.scores?.Sem ?? "—";
  if(el("scoreL")) el("scoreL").textContent = data.scores?.L ?? "—";
  if(el("scoreTau")) el("scoreTau").textContent = data.scores?.tau ?? "—";
  if(el("scoreRho")) el("scoreRho").textContent = data.scores?.rho ?? "—";
  if(el("scoreRhoCrit")) el("scoreRhoCrit").textContent = data.scores?.rho_crit ?? "—";

  // Diagnostics
  if(el("eventType")) el("eventType").textContent = data.diagnostics?.event_type ?? "—";
  if(el("nReads")) el("nReads").textContent = data.diagnostics?.reads ?? "—";
  
  // Branch Info
  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("parentBranchId")) el("parentBranchId").textContent = data.branch?.parent_branch_id ?? "—";

  // Chord Lineage
  const lineage = el("lineage");
  if(lineage) {
    lineage.innerHTML = "";
    if(data.chord?.tonic?.meta) lineage.innerHTML += lineageRow("Tonic", data.chord.tonic.meta);
    if(Array.isArray(data.chord?.ballasts)) {
      data.chord.ballasts.forEach((b,i)=> lineage.innerHTML += lineageRow(`Ballast ${i+1}`, b.meta || {}));
    }
  }
}

let selectedModel = "default";

async function evaluatePrompt() {
  const prompt = el("prompt").value.trim();
  if(!prompt) return;

  el("btnEvaluate").disabled = true;
  setVisible("outputCard", false);
  setVisible("errorBox", false);
  setStatus("EVALUATING...", 0);

  try {
    const res = await fetch(`${getApiBase()}/evaluate`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt: prompt,
        model: selectedModel,
        provider: selectedModel === "mistral" ? "mistral" : null,
        session_id: localStorage.getItem("north_session_id"),
        parent_branch_id: localStorage.getItem("north_last_branch_id"),
        n_reads: parseInt(el("apertureReads")?.value || "1", 10)
      })
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.detail || "Server Error");

    if(data.branch?.branch_id) localStorage.setItem("north_last_branch_id", data.branch.branch_id);

    setStatus(data.status, 0, data.model_used);
    if(el("fmo")) el("fmo").textContent = data.fused_meaning_object || data.raw_text || "—";
    
    setGuide(data);
    setVisible("outputCard", true);

  } catch(e) {
    if(el("errorBox")) el("errorBox").textContent = e.message;
    setVisible("errorBox", true);
    setStatus("ERROR", 0);
  } finally {
    el("btnEvaluate").disabled = false;
  }
}

// RESTORING ALL UI LISTENERS FROM INDEX 2.HTML
document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) {
      localStorage.setItem("north_session_id", (crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Date.now()}`);
  }

  // Restore Modal & Drawer Toggles
  if(el("btnEvaluate")) el("btnEvaluate").addEventListener("click", evaluatePrompt);
  if(el("pillGuide")) el("pillGuide").onclick = () => el("guideDrawer").classList.toggle("hidden");
  if(el("pillModel")) el("pillModel").onclick = () => setVisible("modelModal", true);
  if(el("closeModelModal")) el("closeModelModal").onclick = () => setVisible("modelModal", false);

  // Restore Engine Options
  document.querySelectorAll("[data-model]").forEach(btn => {
    btn.onclick = () => {
      selectedModel = btn.getAttribute("data-model");
      if(el("modelNamePill")) el("modelNamePill").textContent = selectedModel.toUpperCase();
      setVisible("modelModal", false);
    };
  });
});
