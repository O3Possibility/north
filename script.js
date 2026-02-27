// Hardcoded to eliminate the "Failed to fetch" param error
const DEFAULT_API = "https://north-backend-kdgq.onrender.com";
function getApiBase() {
  const url = new URL(window.location.href);
  const api = url.searchParams.get("api") || DEFAULT_API;
  return (api || "").replace(/\/$/, "");
}
const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };
// Status row synchronization
function setStatus(status, ms, modelUsed){
  const row = el("statusRow");
  if(row) {
    row.classList.remove("hidden");
    row.classList.add("flex");
  }
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
// Lineage rendering for the Guide drawer
function lineageRow(title, meta){
  const safe = v => (v === undefined || v === null || v === "") ? "—" : String(v);
  return `
    <div style="border:1px solid #333; background:#111; padding:10px; margin-bottom:10px; border-radius:8px;">
      <div style="font-size:10px; color:#666;">${title}</div>
      <div style="margin-top:5px; font-size:12px; color:#eee;">${safe(meta.Framework_Name)}</div>
      <div style="margin-top:5px; font-size:10px; color:#444;">
        <span style="color:#666;">Regime:</span> ${safe(meta.Regime_Type)} ·
        <span style="color:#666;">Region:</span> ${safe(meta.Macro_Region)} ·
        <span style="color:#666;">Lineage:</span> ${safe(meta.Lineage_Cluster)}
      </div>
    </div>`;
}
// Data mapping for all HTML spans
function setGuide(data){
  if(el("scoreI")) el("scoreI").textContent = data.scores?.I ?? "—";
  if(el("scoreR")) el("scoreR").textContent = data.scores?.R ?? "—";
  if(el("scoreSem")) el("scoreSem").textContent = data.scores?.Sem ?? "—";
  if(el("scoreL")) el("scoreL").textContent = data.scores?.L ?? "—";
  if(el("scoreTau")) el("scoreTau").textContent = data.scores?.tau ?? "—";
  if(el("scoreRho")) el("scoreRho").textContent = data.scores?.rho ?? "—";
  if(el("scoreRhoCrit")) el("scoreRhoCrit").textContent = data.scores?.rho_crit ?? "—";
  if(el("eventType")) el("eventType").textContent = data.diagnostics?.event_type ?? data.reads?.[0]?.diagnostics?.event_type ?? "—";
  if(el("nReads")) el("nReads").textContent = data.diagnostics?.reads ?? "—";
  if(el("deltaL")) el("deltaL").textContent = (data.diagnostics?.deltaL !== undefined && data.diagnostics?.deltaL !== null) ? data.diagnostics.deltaL : "—";
  if(el("refusalRate")) el("refusalRate").textContent = (data.diagnostics?.refusal_rate !== undefined && data.diagnostics?.refusal_rate !== null) ? data.diagnostics.refusal_rate : "—";
  if(el("branchDepth")) el("branchDepth").textContent = data.branch?.depth ?? "—";
  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("parentBranchId")) el("parentBranchId").textContent = data.branch?.parent_branch_id ?? "—";
  const lineage = el("lineage");
  if(lineage) {
    lineage.innerHTML = "";
    if(data.chord?.tonic?.meta) lineage.innerHTML += lineageRow("Tonic", data.chord.tonic.meta);
    if(Array.isArray(data.chord?.ballasts)) {
      data.chord.ballasts.forEach((b,i)=> lineage.innerHTML += lineageRow(`Ballast ${i+1}`, b.meta || {}));
    }
  }
}
function showError(msg){
  if(el("errorBox")) {
    el("errorBox").textContent = msg;
    setVisible("errorBox", true);
  }
}
function clearError(){
  setVisible("errorBox", false);
  if(el("errorBox")) el("errorBox").textContent = "";
}
async function evaluateGate() {
  clearError();
  const prompt = el("prompt").value.trim();
  if(!prompt) return showError("Enter a prompt.");
  el("btnEvaluate").disabled = true;
  setVisible("outputCard", false);
  setVisible("guideDrawer", false);
  setStatus("EVALUATING...", 0);
  const t0 = performance.now();
  try {
    const session_id = getOrCreateSessionId();
    const parent_branch_id = getLastBranchId();
    const n_reads = 1; // Add UI for this if needed
    const res = await fetch(`${getApiBase()}/evaluate`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt,
        model: selectedModel || "open-mistral-7b",
        session_id,
        parent_branch_id,
        n_reads
      })
    });
    const ms = performance.now() - t0;
    if(!res.ok){
      const txt = await res.text();
      setStatus("ERROR", ms);
      return showError(`API error (${res.status}): ${txt}`);
    }
    const data = await res.json();
    setLastBranchId(data.branch?.branch_id);
    setStatus(data.status, ms, data.model_used);
    el("fmo").textContent = data.fused_meaning_object || data.raw_text || "—";
    setGuide(data);
    setVisible("outputCard", true);
    setVisible("guideDrawer", true); // Auto-show guide for mandatory
  } catch(e) {
    setStatus("ERROR", 0);
    showError(`Request failed: ${e.message}`);
  } finally {
    el("btnEvaluate").disabled = false;
  }
}
function getOrCreateSessionId(){
  const k = "north_session_id";
  let v = localStorage.getItem(k);
  if(!v){
    v = crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(k, v);
  }
  return v;
}
function getLastBranchId(){ return localStorage.getItem("north_last_branch_id") || null; }
function setLastBranchId(id){ if(id) localStorage.setItem("north_last_branch_id", id); }
let selectedModel = "open-mistral-7b"; // Default, add modal if needed
document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) localStorage.setItem("north_session_id", crypto.randomUUID());
  el("btnEvaluate").addEventListener("click", evaluateGate);
  if(el("pillGuide")) el("pillGuide").onclick = () => setVisible("guideDrawer", el("guideDrawer").classList.contains("hidden"));
  if(el("aboutToggle")) el("aboutToggle").onclick = () => setVisible("aboutContent", el("aboutContent").classList.contains("hidden"));
});
