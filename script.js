const DEFAULT_API = "https://north-backend-kdgq.onrender.com";
const DEFAULT_API = ""; // optionally hardcode backend URL

function getApiBase() {
  const url = new URL(window.location.href);
  const api = url.searchParams.get("api") || DEFAULT_API;
  return (api || "").replace(/\/$/, "");
}
function el(id){ return document.getElementById(id); }
function setVisible(id, show){ const n = el(id); if(n) n.classList.toggle("hidden", !show); }

function setStatus(status, ms, modelUsed){
  const row = el("statusRow");
  row.classList.remove("hidden");
  row.classList.add("flex");
  el("statusText").textContent = status || "—";
  el("timingText").textContent = ms ? `· ${Math.round(ms)}ms${modelUsed ? ` · model: ${modelUsed}` : ""}` : "";

  const dot = el("statusDot");
  dot.classList.remove("bg-zinc-600","bg-white","bg-red-500");
  if(status === "ADMISSIBLE") dot.classList.add("bg-white");
  else if(status === "REFUSAL") dot.classList.add("bg-red-500");
  else dot.classList.add("bg-zinc-600");
}

function lineageRow(title, meta){
  const safe = v => (v === undefined || v === null || v === "") ? "—" : String(v);
  return `
    <div class="rounded-xl border border-zinc-900 bg-black/40 p-3">
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
  el("scoreI").textContent = data.scores?.I ?? "—";
  el("scoreR").textContent = data.scores?.R ?? "—";
  el("scoreSem").textContent = data.scores?.Sem ?? "—";
  el("scoreL").textContent = data.scores?.L ?? "—";
  el("scoreTau").textContent = data.scores?.tau ?? "—";
  el("scoreRho").textContent = data.scores?.rho ?? "—";
  el("scoreRhoCrit").textContent = data.scores?.rho_crit ?? "—";

  // Diagnostics
  el("eventType").textContent = data.diagnostics?.event_type ?? data.reads?.[0]?.diagnostics?.event_type ?? "—";
  el("nReads").textContent = data.diagnostics?.reads ?? "—";
  el("deltaL").textContent = (data.diagnostics?.deltaL !== undefined && data.diagnostics?.deltaL !== null) ? data.diagnostics.deltaL : "—";
  el("refusalRate").textContent = (data.diagnostics?.refusal_rate !== undefined && data.diagnostics?.refusal_rate !== null) ? data.diagnostics.refusal_rate : "—";

  // Branch lineage
  el("branchDepth").textContent = data.branch?.depth ?? "—";
  el("branchId").textContent = data.branch?.branch_id ?? "—";
  el("parentBranchId").textContent = data.branch?.parent_branch_id ?? "—";

  const lineage = el("lineage");
  lineage.innerHTML = "";
  if(data.chord?.tonic?.meta) lineage.innerHTML += lineageRow("Tonic", data.chord.tonic.meta);
  if(Array.isArray(data.chord?.ballasts)) {
    data.chord.ballasts.forEach((b,i)=> lineage.innerHTML += lineageRow(`Ballast ${i+1}`, b.meta || {}));
  }
}

function showError(msg){
  el("errorBox").textContent = msg;
  setVisible("errorBox", true);
}
function clearError(){
  setVisible("errorBox", false);
  el("errorBox").textContent = "";
}

let selectedModel = "default";
function setModelPill(label){ el("modelNamePill").textContent = label; }

function getOrCreateSessionId(){
  const k = "north_session_id";
  let v = localStorage.getItem(k);
  if(!v){
    // crypto.randomUUID supported on modern browsers; fallback to timestamp
    v = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(k, v);
  }
  return v;
}

function getLastBranchId(){ return localStorage.getItem("north_last_branch_id") || null; }
function setLastBranchId(id){ if(id) localStorage.setItem("north_last_branch_id", id); }

async function evaluatePrompt(){
  clearError();
  const api = getApiBase();
  el("apiLabel").textContent = api || "(set ?api=...)";
  const prompt = el("prompt").value.trim();
  if(!prompt) return showError("Enter a prompt.");
  if(!api) return showError("API endpoint not set. Add ?api=https://YOUR-BACKEND-URL");

  setVisible("outputCard", false);
  setVisible("modelAnswerWrap", false);
  setVisible("guideDrawer", false);

  let warm2 = setTimeout(()=>{ el("warmNote").textContent = "Still warming… some free-tier hosts sleep. First call can take up to ~60s."; }, 12000);

  const t0 = performance.now();
  try{
    const session_id = getOrCreateSessionId();
    const linkLineage = el("linkLineage") ? el("linkLineage").checked : true;
    const parent_branch_id = linkLineage ? getLastBranchId() : null;
    const n_reads = parseInt(el("apertureReads")?.value || "1", 10) || 1;

    const res = await fetch(`${api}/evaluate`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt,
        model: selectedModel,
        provider: selectedModel === "mistral" ? "mistral" : null,
        model_name: selectedModel === "mistral" ? (el("mistralModel")?.value?.trim() || null) : null,
        api_key: selectedModel === "mistral" ? (el("mistralKey")?.value?.trim() || null) : null,
        session_id,
        parent_branch_id,
        n_reads
      })
    });

    const ms = performance.now() - t0;
    clearTimeout(warm2);
    el("warmNote").textContent = "Free-tier note: first request may take 10–30s on a cold start — consider it “moving up north.”";

    if(!res.ok){
      const txt = await res.text();
      setStatus("ERROR", ms, null);
      return showError(`API error (${res.status}): ${txt}`);
    }
    const data = await res.json();
    if(data.branch?.branch_id) setLastBranchId(data.branch.branch_id);
    setStatus(data.status, ms, data.model_used);
    el("fmo").textContent = data.fused_meaning_object || data.raw_text || "—";
    setGuide(data);
    setVisible("outputCard", true);
  }catch(e){
    clearTimeout(warm2);
    setStatus("ERROR", null, null);
    showError(`Request failed: ${e.message}`);
  }
}

function toggleGuide(){ setVisible("guideDrawer", el("guideDrawer").classList.contains("hidden")); }
function openModal(){ setVisible("modelModal", true); }
function closeModal(){ setVisible("modelModal", false); }

document.addEventListener("DOMContentLoaded", ()=>{
  el("apiLabel").textContent = getApiBase() || "(set ?api=...)";
  el("btnEvaluate").addEventListener("click", evaluatePrompt);
  el("pillGuide").addEventListener("click", toggleGuide);
  el("pillModel").addEventListener("click", openModal);
  el("closeModelModal").addEventListener("click", closeModal);

  document.querySelectorAll("[data-model]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      selectedModel = btn.getAttribute("data-model");
      const label = selectedModel === "default" ? "Default" : (selectedModel === "ollama" ? "Ollama" : (selectedModel === "mistral" ? "Mistral" : "Mock"));
      setModelPill(label);
      closeModal();
    });
  });

  el("modelModal").addEventListener("click", (ev)=>{
    if(ev.target === el("modelModal") || ev.target.classList.contains("bg-black/70")) closeModal();
  });
});
