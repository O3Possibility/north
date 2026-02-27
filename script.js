/**
 * NORTH Master Controller - Full Sync
 * Matched to EvaluateRequest: prompt, model, provider, model_name, api_base, api_key, session_id, parent_branch_id, n_reads.
 */

const DEFAULT_API = "https://north-backend-kdgq.onrender.com"; 

function getApiBase() {
  const url = new URL(window.location.href);
  return (url.searchParams.get("api") || DEFAULT_API).replace(/\/$/, "");
}

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

// --- UI STATE ---
let selectedModel = "default";

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
  // Triadic Scores - Mapping from gate.py 'scores' dict
  const scores = ["scoreI", "scoreR", "scoreSem", "scoreL", "scoreTau", "scoreRho", "scoreRhoCrit"];
  scores.forEach(id => { 
    if(el(id)) {
        // Map UI IDs to Python dict keys (e.g., scoreTau -> data.scores.tau)
        const key = id.replace("score", "").toLowerCase();
        const finalKey = (key === "rhocrit") ? "rho_crit" : key;
        el(id).textContent = data.scores?.[finalKey.charAt(0).toUpperCase() + finalKey.slice(1)] ?? data.scores?.[finalKey] ?? "—"; 
    }
  });

  // Branch & Diagnostics
  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("parentBranchId")) el("parentBranchId").textContent = data.branch?.parent_branch_id ?? "—";
  if(el("branchDepth")) el("branchDepth").textContent = data.branch?.depth ?? "—";
  if(el("nReads")) el("nReads").textContent = data.diagnostics?.reads ?? "—";
  if(el("eventType")) el("eventType").textContent = data.diagnostics?.event_type ?? "—";

  // Lineage - Rendering from gate.py 'chord'
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

// --- CORE ACTION ---

async function evaluatePrompt() {
  const prompt = el("prompt")?.value.trim();
  if(!prompt) return;

  el("btnEvaluate").disabled = true;
  setVisible("outputCard", false);
  setVisible("errorBox", false);
  setStatus("EVALUATING...", 0);

  const t0 = performance.now();
  try {
    const api = getApiBase();
    const payload = {
      prompt: prompt,
      model: selectedModel,
      provider: selectedModel === "mistral" ? "mistral" : null,
      model_name: selectedModel === "mistral" ? (el("mistralModel")?.value?.trim() || null) : null,
      api_key: selectedModel === "mistral" ? (el("mistralKey")?.value?.trim() || null) : null,
      api_base: null, 
      session_id: localStorage.getItem("north_session_id"),
      parent_branch_id: el("linkLineage")?.checked ? localStorage.getItem("north_last_branch_id") : null,
      n_reads: parseInt(el("apertureReads")?.value || "1", 10)
    };

    const res = await fetch(`${api}/evaluate`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const ms = performance.now() - t0;

    if(!res.ok) throw new Error(data.detail || "Gate Error");

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

// --- INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) {
      localStorage.setItem("north_session_id", crypto.randomUUID());
  }

  if(el("btnEvaluate")) el("btnEvaluate").addEventListener("click", evaluatePrompt);
  
  // Drawer Toggles matching your HTML IDs
  if(el("pillGuide")) el("pillGuide").onclick = () => el("guideDrawer").classList.toggle("hidden");
  if(el("aboutToggle")) el("aboutToggle").onclick = () => el("aboutContent").classList.toggle("hidden");
  if(el("pillModel")) el("pillModel").onclick = () => setVisible("modelModal", true);
  if(el("closeModelModal")) el("closeModelModal").onclick = () => setVisible("modelModal", false);

  // Model Selection
  document.querySelectorAll("[data-model]").forEach(btn => {
    btn.onclick = () => {
      selectedModel = btn.getAttribute("data-model");
      if(el("modelNamePill")) el("modelNamePill").textContent = btn.querySelector('.text-zinc-100')?.textContent || "Default";
      setVisible("mistralConfig", selectedModel === "mistral");
      setVisible("modelModal", false);
    };
  });
});
