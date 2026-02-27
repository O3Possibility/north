/**
 * NORTH Master Controller - Final Hardened Sync
 * Restored: Long-form setGuide, lineage rendering, and status logic.
 */

const DEFAULT_API = "https://north-backend-kdgq.onrender.com"; 

function getApiBase() {
  const url = new URL(window.location.href);
  // Ensure we don't end up with double slashes or missing paths
  let base = (url.searchParams.get("api") || DEFAULT_API).replace(/\/$/, "");
  return base;
}

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

let selectedModel = "mistral"; 

function setStatus(status, ms, modelUsed){
  const row = el("statusRow");
  if(row) { row.classList.remove("hidden"); row.classList.add("flex"); }
  if(el("statusText")) el("statusText").textContent = status || "—";
  if(el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms${modelUsed ? ` · model: ${modelUsed}` : ""}` : "";

  const dot = el("statusDot");
  if(dot) {
    dot.className = "h-2 w-2 rounded-full " + 
      (status === "ADMISSIBLE" ? "bg-white" : status === "REFUSAL" ? "bg-red-500" : "bg-zinc-600");
  }
}

function setGuide(data){
  // Triadic Scores mapping from gate.py output
  const scores = ["scoreI", "scoreR", "scoreSem", "scoreL", "scoreTau", "scoreRho", "scoreRhoCrit"];
  scores.forEach(id => { 
    if(el(id)) {
        const key = id.replace("score", "");
        // Correcting for case sensitivity in Python dictionary keys
        let valKey = key;
        if(key === "Tau") valKey = "tau";
        if(key === "Rho") valKey = "rho";
        if(key === "RhoCrit") valKey = "rho_crit";
        el(id).textContent = data.scores?.[valKey] ?? data.scores?.[key] ?? "—"; 
    }
  });

  // Branch & Diagnostics
  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("parentBranchId")) el("parentBranchId").textContent = data.branch?.parent_branch_id ?? "—";
  if(el("branchDepth")) el("branchDepth").textContent = data.branch?.depth ?? "—";
  if(el("nReads")) el("nReads").textContent = data.diagnostics?.reads ?? "—";
  if(el("eventType")) el("eventType").textContent = data.diagnostics?.event_type ?? "—";

  // Lineage rendering from chord
  const lineage = el("lineage");
  if(lineage) {
    lineage.innerHTML = "";
    const items = [data.chord?.tonic, ...(data.chord?.ballasts || [])].filter(Boolean);
    items.forEach((item, i) => {
      if(item?.meta) {
        lineage.innerHTML += `
          <div class="rounded-xl border border-zinc-900 bg-black/40 p-3 mb-2">
            <div class="text-[10px] uppercase tracking-widest text-zinc-500">${i === 0 ? 'Tonic' : 'Ballast ' + i}</div>
            <div class="mt-1 text-sm text-zinc-100">${item.meta.Framework_Name || "—"}</div>
            <div class="mt-1 text-[10px] text-zinc-600">${item.meta.Macro_Region || "—"} · ${item.meta.Lineage_Cluster || "—"}</div>
          </div>`;
      }
    });
  }
}

async function evaluatePrompt() {
  const prompt = el("prompt")?.value.trim();
  if(!prompt) return;

  el("btnEvaluate").disabled = true;
  setVisible("outputCard", false);
  setVisible("errorBox", false);
  setStatus("EVALUATING...", 0);

  const t0 = performance.now();
  try {
    const apiBase = getApiBase();
    const payload = {
      prompt: prompt,
      model: selectedModel,
      provider: selectedModel === "mistral" ? "mistral" : null,
      model_name: el("mistralModel")?.value?.trim() || "open-mistral-7b",
      api_key: el("mistralKey")?.value?.trim() || null,
      api_base: null, 
      session_id: localStorage.getItem("north_session_id"),
      parent_branch_id: el("linkLineage")?.checked ? localStorage.getItem("north_last_branch_id") : null,
      n_reads: parseInt(el("apertureReads")?.value || "1", 10)
    };

    // Fix for 405 error: Ensure correct path and method
    const res = await fetch(`${apiBase}/evaluate`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const ms = performance.now() - t0;
    const data = await res.json();

    if(!res.ok) throw new Error(data.detail || "Audit Failed");

    if(data.branch?.branch_id) localStorage.setItem("north_last_branch_id", data.branch.branch_id);

    setStatus(data.status, ms, data.model_used);
    if(el("fmo")) el("fmo").textContent = data.fused_meaning_object || data.raw_text || "—";
    setGuide(data);
    setVisible("outputCard", true);

  } catch(e) {
    if(el("errorBox")) el("errorBox").textContent = `CONNECTION FAILED: ${e.message}`;
    setVisible("errorBox", true);
    setStatus("ERROR", 0);
  } finally {
    el("btnEvaluate").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) {
      localStorage.setItem("north_session_id", crypto.randomUUID());
  }

  if(el("btnEvaluate")) el("btnEvaluate").addEventListener("click", evaluatePrompt);
  
  // Binder for Drawers
  if(el("pillGuide")) el("pillGuide").onclick = () => el("guideDrawer").classList.toggle("hidden");
  if(el("aboutToggle")) el("aboutToggle").onclick = () => el("aboutContent").classList.toggle("hidden");
  if(el("pillModel")) el("pillModel").onclick = () => setVisible("modelModal", true);
  if(el("closeModelModal")) el("closeModelModal").onclick = () => setVisible("modelModal", false);

  // Model Selection Buttons
  document.querySelectorAll("[data-model]").forEach(btn => {
    btn.onclick = () => {
      selectedModel = btn.getAttribute("data-model");
      if(el("modelNamePill")) el("modelNamePill").textContent = selectedModel.toUpperCase();
      setVisible("mistralConfig", selectedModel === "mistral");
      setVisible("modelModal", false);
    };
  });
});
