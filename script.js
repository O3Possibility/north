const DEFAULT_API = "https://north-backend-kdgq.onrender.com"; 

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

let selectedModel = "mistral"; 

function setStatus(status, ms, modelUsed){
  if(el("statusRow")) { el("statusRow").classList.remove("hidden"); el("statusRow").classList.add("flex"); }
  if(el("statusText")) el("statusText").textContent = status || "—";
  if(el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms${modelUsed ? ` · ${modelUsed}` : ""}` : "";
  if(el("statusDot")) el("statusDot").className = "h-2 w-2 rounded-full " + (status === "ADMISSIBLE" ? "bg-white" : "bg-red-500");
}

function setGuide(data){
  // Map scores from gate.py output
  const mapping = { scoreI:"I", scoreR:"R", scoreSem:"Sem", scoreL:"L", scoreTau:"tau", scoreRho:"rho", scoreRhoCrit:"rho_crit" };
  Object.entries(mapping).forEach(([id, key]) => { if(el(id)) el(id).textContent = data.scores?.[key] ?? "—"; });

  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("nReads")) el("nReads").textContent = data.diagnostics?.reads ?? "1";

  // Render Lineage
  const lineage = el("lineage");
  if(lineage) {
    lineage.innerHTML = "";
    const items = [data.chord?.tonic, ...(data.chord?.ballasts || [])].filter(Boolean);
    items.forEach((item, i) => {
      lineage.innerHTML += `<div class="p-3 mb-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
        <div class="text-[9px] uppercase text-zinc-500">${i === 0 ? 'Tonic' : 'Ballast'}</div>
        <div class="text-sm text-zinc-200">${item.meta?.Framework_Name || "—"}</div>
      </div>`;
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

  try {
    const payload = {
      prompt: prompt,
      model: selectedModel,
      provider: selectedModel === "mistral" ? "mistral" : null,
      model_name: el("mistralModel")?.value?.trim() || "open-mistral-7b",
      api_key: el("mistralKey")?.value?.trim() || null,
      session_id: localStorage.getItem("north_session_id"),
      parent_branch_id: el("linkLineage")?.checked ? localStorage.getItem("north_last_branch_id") : null,
      n_reads: parseInt(el("apertureReads")?.value || "1")
    };

    const t0 = performance.now();
    // Force trailing slash to match Python's stricter path
    const res = await fetch(`${DEFAULT_API}/evaluate/`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if(!res.ok) throw new Error(data.detail || "Server Error");

    localStorage.setItem("north_last_branch_id", data.branch?.branch_id);
    setStatus(data.status, performance.now() - t0, data.model_used);
    if(el("fmo")) el("fmo").textContent = data.fused_meaning_object || data.raw_text;
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
  if(!localStorage.getItem("north_session_id")) localStorage.setItem("north_session_id", crypto.randomUUID());
  el("btnEvaluate")?.addEventListener("click", evaluatePrompt);
  
  // Toggles
  el("pillGuide").onclick = () => el("guideDrawer").classList.toggle("hidden");
  el("pillModel").onclick = () => setVisible("modelModal", true);
  el("closeModelModal").onclick = () => setVisible("modelModal", false);

  document.querySelectorAll("[data-model]").forEach(btn => {
    btn.onclick = () => {
      selectedModel = btn.getAttribute("data-model");
      if(el("modelNamePill")) el("modelNamePill").textContent = selectedModel.toUpperCase();
      setVisible("modelModal", false);
    };
  });
});
