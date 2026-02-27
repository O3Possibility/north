/**
 * NORTH Master Controller - Final Hardened Sync
 * Fixed: Endpoint routing, Drawer toggles, and Payload validation.
 */

const API_URL = "https://north-backend-kdgq.onrender.com/evaluate"; 

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

let selectedModel = "mistral"; // Default to mistral to avoid MockAdapter crash

function setStatus(status, ms, modelUsed){
  const row = el("statusRow");
  if(row) { row.classList.remove("hidden"); row.classList.add("flex"); }
  if(el("statusText")) el("statusText").textContent = status || "—";
  if(el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms${modelUsed ? ` · model: ${modelUsed}` : ""}` : "";

  const dot = el("statusDot");
  if(dot) {
    dot.style.backgroundColor = (status === "ADMISSIBLE" ? "#fff" : status === "REFUSAL" ? "#ef4444" : "#52525b");
  }
}

function setGuide(data){
  // Map triadic scores
  const scoreMap = {
    scoreI: data.scores?.I, scoreR: data.scores?.R, scoreSem: data.scores?.Sem,
    scoreL: data.scores?.L, scoreTau: data.scores?.tau, scoreRho: data.scores?.rho,
    scoreRhoCrit: data.scores?.rho_crit
  };
  Object.entries(scoreMap).forEach(([id, val]) => { if(el(id)) el(id).textContent = val ?? "—"; });

  // Diagnostics & Branching
  if(el("eventType")) el("eventType").textContent = data.diagnostics?.event_type ?? "—";
  if(el("nReads")) el("nReads").textContent = data.diagnostics?.reads ?? "—";
  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("parentBranchId")) el("parentBranchId").textContent = data.branch?.parent_branch_id ?? "—";
  if(el("branchDepth")) el("branchDepth").textContent = data.branch?.depth ?? "—";

  // Lineage rendering
  const lineage = el("lineage");
  if(lineage) {
    lineage.innerHTML = "";
    const chord = [data.chord?.tonic, ...(data.chord?.ballasts || [])];
    chord.forEach((item, i) => {
      if(item?.meta) {
        lineage.innerHTML += `
          <div style="background:#0a0a0a; border:1px solid #222; padding:10px; margin-bottom:10px; border-radius:8px;">
            <div style="font-size:9px; color:#444;">${i === 0 ? 'TONIC' : 'BALLAST ' + i}</div>
            <div style="font-size:11px; color:#eee;">${item.meta.Framework_Name || "—"}</div>
            <div style="font-size:9px; color:#666;">${item.meta.Macro_Region || "—"} · ${item.meta.Lineage_Cluster || "—"}</div>
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
    const payload = {
      prompt: prompt,
      model: selectedModel,
      provider: selectedModel === "mistral" ? "mistral" : null,
      model_name: el("mistralModel")?.value?.trim() || "open-mistral-7b",
      api_key: el("mistralKey")?.value?.trim() || null,
      session_id: localStorage.getItem("north_session_id"),
      parent_branch_id: el("linkLineage")?.checked ? localStorage.getItem("north_last_branch_id") : null,
      n_reads: parseInt(el("apertureReads")?.value || "1", 10)
    };

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });

    if(!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Server Gate Failure");
    }

    const data = await res.json();
    const ms = performance.now() - t0;

    if(data.branch?.branch_id) localStorage.setItem("north_last_branch_id", data.branch.branch_id);

    setStatus(data.status, ms, data.model_used);
    if(el("fmo")) el("fmo").textContent = data.fused_meaning_object || data.raw_text || "—";
    setGuide(data);
    setVisible("outputCard", true);

  } catch(e) {
    if(el("errorBox")) {
        el("errorBox").textContent = `AUDIT_FAILED: ${e.message}`;
        setVisible("errorBox", true);
    }
    setStatus("ERROR", 0);
  } finally {
    el("btnEvaluate").disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) {
      localStorage.setItem("north_session_id", crypto.randomUUID());
  }

  // Bind Listeners
  if(el("btnEvaluate")) el("btnEvaluate").addEventListener("click", evaluatePrompt);
  
  // Drawer Toggles
  if(el("aboutToggle")) el("aboutToggle").onclick = () => el("aboutContent").classList.toggle("hidden");
  if(el("pillGuide")) el("pillGuide").onclick = () => el("guideDrawer").classList.toggle("hidden");
  if(el("pillModel")) el("pillModel").onclick = () => setVisible("modelModal", true);
  if(el("closeModelModal")) el("closeModelModal").onclick = () => setVisible("modelModal", false);

  // Model Selector Logic
  document.querySelectorAll("[data-model]").forEach(btn => {
    btn.onclick = () => {
      selectedModel = btn.getAttribute("data-model");
      if(el("modelNamePill")) el("modelNamePill").textContent = selectedModel.toUpperCase();
      
      // Toggle Mistral-specific config visibility
      setVisible("mistralConfig", selectedModel === "mistral");
      
      document.querySelectorAll(".engine-option").forEach(opt => opt.classList.remove("active"));
      btn.classList.add("active");
      setVisible("modelModal", false);
    };
  });
});
