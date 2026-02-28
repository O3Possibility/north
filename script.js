/**
 * NORTH MASTER CONTROLLER
 * Permanent Audit Display Mode
 */

const API_URL = "https://north-backend-kdgq.onrender.com/evaluate/"; 

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

let selectedModel = "mistral"; 

function formatMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/^### (.*$)/gim, '<h3 style="margin-top:16px; margin-bottom:8px; color:#fff; border-bottom:1px solid #333; padding-bottom:4px; font-size:14px;">$1</h3>') 
    .replace(/^## (.*$)/gim, '<h2 style="margin-top:20px; margin-bottom:10px; color:#fff; font-size:16px; text-transform:uppercase; letter-spacing:1px;">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>') 
    .replace(/\n/g, '<br>'); 
}

function setStatus(status, ms, modelUsed){
  if(el("statusText")) el("statusText").textContent = status || "—";
  if(el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms · ${modelUsed}` : "";
  const dot = el("statusDot");
  if(dot) dot.style.backgroundColor = (status === "ADMISSIBLE" ? "#fff" : status === "REFUSAL" ? "#ef4444" : "#52525b");
}

function setGuide(data){
  const s = data.scores || {};
  const mapping = { 
    scoreI: s.I, scoreR: s.R, scoreSem: s.Sem, scoreL: s.L, 
    scoreTau: s.tau, scoreRho: s.rho, scoreRhoCrit: s.rho_crit 
  };
  
  Object.entries(mapping).forEach(([id, val]) => { 
    if(el(id)) {
        el(id).textContent = (typeof val === 'number') ? val.toFixed(3) : (val ?? "—");
    }
  });

  if(el("branchId")) el("branchId").textContent = data.branch?.branch_id ?? "—";
  if(el("parentBranchId")) el("parentBranchId").textContent = data.branch?.parent_id ?? "—";
  if(el("branchDepth")) el("branchDepth").textContent = data.branch?.depth ?? "0";

  const lineage = el("lineage");
  if(lineage && data.chord) {
    lineage.innerHTML = "";
    const items = [data.chord.tonic, ...(data.chord.ballasts || [])].filter(Boolean);
    
    items.forEach((item, i) => {
      const frameName = item.name || item.meta?.name || item.meta?.Framework_Name || "Unknown Framework";
      const frameId = item.id || "N/A";

      lineage.innerHTML += `
        <div style="padding:12px; margin-bottom:10px; background:#000; border:1px solid #222; border-radius:4px; border-left: 3px solid ${i === 0 ? '#fff' : '#444'};">
          <div style="font-size:9px; color:#444; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">${i === 0 ? 'Tonic' : 'Ballast'}</div>
          <div style="font-size:12px; color:#eee; font-weight:500;">${frameName}</div>
          <div style="font-size:9px; color:#333; margin-top:4px;">ID: ${frameId}</div>
        </div>`;
    });
  }
}

async function evaluatePrompt() {
  const prompt = el("prompt")?.value.trim();
  const btn = el("btnEvaluate");
  if(!prompt || !btn) return;

  btn.disabled = true;
  btn.classList.add("processing-pulse");
  btn.textContent = "AUDITING...";

  setVisible("outputCard", false);
  setVisible("errorBox", false);
  setStatus("EVALUATING...", 0, "...");

  try {
    const payload = {
      prompt: prompt,
      model: selectedModel,
      model_name: el("mistralModel")?.value?.trim() || "open-mistral-7b",
      api_key: el("mistralKey")?.value?.trim() || null,
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

    if(el("fmo")) {
        const content = data.fused_meaning_object || data.raw_text;
        el("fmo").innerHTML = formatMarkdown(content);
    }

    setGuide(data);
    setVisible("outputCard", true);

  } catch(e) {
    if(el("errorBox")) {
      el("errorBox").textContent = `CONNECTION_FAILED: ${e.message}`;
      setVisible("errorBox", true);
    }
    setStatus("ERROR", 0, "N/A");
  } finally {
    btn.disabled = false;
    btn.classList.remove("processing-pulse");
    btn.textContent = "INITIATE AUDIT";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if(!localStorage.getItem("north_session_id")) {
    localStorage.setItem("north_session_id", crypto.randomUUID());
  }
  el("btnEvaluate")?.addEventListener("click", evaluatePrompt);
  
  // Cleaned up unused toggles to keep it "Permanent"
  el("aboutToggle")?.addEventListener("click", () => el("aboutContent").classList.toggle("hidden"));

  document.querySelectorAll(".engine-option").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".engine-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedModel = btn.getAttribute("data-model");
      el("modelNamePill").textContent = selectedModel.toUpperCase();
    };
  });
});
