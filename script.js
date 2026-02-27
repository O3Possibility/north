/**
 * NORTH AI - UTCP MASTER CONTROL
 * Synchronized with main.py (0.5.0-pressure-web) and index 2.html
 * Fixes: Backend Handshake, Status Row, Guide Drawer, and Chord Lineage
 */

const BACKEND_URL = "https://north-backend-kdgq.onrender.com"; 
let activeModel = "open-mistral-7b"; 

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

/**
 * Status and Timing Handler: Updates the Hardware-style Status Row
 */
function setStatus(status, ms, modelUsed) {
    const row = el("statusRow");
    if (row) {
        row.classList.remove("hidden");
        row.classList.add("flex");
    }
    if (el("statusText")) el("statusText").textContent = status || "—";
    if (el("timingText")) el("timingText").textContent = ms ? `· ${Math.round(ms)}ms${modelUsed ? ` · model: ${modelUsed}` : ""}` : "";

    const dot = el("statusDot");
    if (dot) {
        dot.classList.remove("bg-zinc-600", "bg-white", "bg-red-500");
        if (status === "ADMISSIBLE") dot.classList.add("bg-white");
        else if (status === "REFUSAL") dot.classList.add("bg-red-500");
        else dot.classList.add("bg-zinc-600");
    }
}

/**
 * Lineage Card Generator: Populates the Chord Lineage Drawer
 */
function lineageRow(title, meta) {
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

/**
 * Initialize System Listeners
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Session Persistent Braid
    if (!localStorage.getItem("north_session_id")) {
        localStorage.setItem("north_session_id", (crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Date.now()}`);
    }

    // 2. Engine Selector Synchronization (Modal + Inline buttons)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-model]');
        if (btn) {
            activeModel = btn.getAttribute('data-model');
            const label = btn.querySelector('.text-sm')?.textContent || btn.textContent;
            if (el("modelNamePill")) el("modelNamePill").textContent = label.toUpperCase().trim();
            
            // Visual Toggle for button states
            document.querySelectorAll('[data-model]').forEach(o => o.classList.remove('active'));
            btn.classList.add('active');
            
            if (el("modelModal")) setVisible("modelModal", false);
        }
    });

    // 3. UI Toggle Listeners for Guide and Modal
    if (el("aboutToggle")) el("aboutToggle").onclick = () => el("aboutContent").classList.toggle("hidden");
    if (el("pillGuide")) el("pillGuide").onclick = () => el("guideDrawer").classList.toggle("hidden");
    if (el("pillModel")) el("pillModel").onclick = () => setVisible("modelModal", true);
    if (el("closeModelModal")) el("closeModelModal").onclick = () => setVisible("modelModal", false);

    // 4. Attach Main Trigger
    if (el("btnEvaluate")) el("btnEvaluate").addEventListener("click", evaluateGate);
});

/**
 * Main Evaluation Gate: Handshakes with FastAPI /evaluate
 */
async function evaluateGate() {
    const promptArea = el("prompt");
    const userPrompt = promptArea ? promptArea.value.trim() : "";
    if (!userPrompt) return;

    // Loading State
    const btn = el("btnEvaluate");
    if (btn) {
        btn.disabled = true;
        btn.textContent = "AUDITING...";
    }
    
    setVisible("outputCard", false);
    setVisible("errorBox", false);
    setStatus("EVALUATING...", 0, activeModel);

    const t0 = performance.now();

    try {
        const response = await fetch(`${BACKEND_URL}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: userPrompt,
                model: activeModel,
                session_id: localStorage.getItem("north_session_id"),
                parent_branch_id: localStorage.getItem("north_last_branch_id"),
                n_reads: 1
            })
        });

        const data = await response.json();
        const ms = performance.now() - t0;

        if (!response.ok) throw new Error(data.detail || "Gate Error");

        // 1. Update Persistent Lineage (The Braid)
        if (data.branch?.branch_id) {
            localStorage.setItem("north_last_branch_id", data.branch.branch_id);
            if (el("branchId")) el("branchId").textContent = data.branch.branch_id;
            if (el("parentBranchId")) el("parentBranchId").textContent = data.branch.parent_branch_id || "—";
            if (el("branchDepth")) el("branchDepth").textContent = data.branch.depth || "—";
        }

        // 2. Status & Timing Readout
        setStatus(data.status, ms, data.model_used || activeModel);

        // 3. Dashboard Score Rendering (Top of Output Card)
        const s = data.scores || {};
        const scoreHeader = `
            <div class="score-readout" style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; background:#000; border:1px solid #333; padding:20px; border-radius:8px; margin-bottom:20px; font-family:monospace; text-align:center;">
                <div><span style="color:#666; font-size:10px;">I</span><br><b>${s.I ?? "0.0"}</b></div>
                <div><span style="color:#666; font-size:10px;">R</span><br><b>${s.R ?? "0.0"}</b></div>
                <div><span style="color:#666; font-size:10px;">SEM</span><br><b>${s.Sem ?? "0.0"}</b></div>
                <div style="color:#f44;"><span style="color:#666; font-size:10px;">ρ</span><br><b>${s.rho ? (s.rho * 100).toFixed(1) : "0.0"}%</b></div>
            </div>`;

        // 4. Update Guide Drawer Spans (Detailed Metrics)
        const updateText = (id, val) => { if (el(id)) el(id).textContent = val ?? "—"; };
        updateText("scoreI", s.I);
        updateText("scoreR", s.R);
        updateText("scoreSem", s.Sem);
        updateText("scoreL", s.L);
        updateText("scoreTau", s.tau);
        updateText("scoreRho", s.rho);
        updateText("scoreRhoCrit", s.rho_crit);
        updateText("eventType", data.diagnostics?.event_type);
        updateText("nReads", data.diagnostics?.reads);
        updateText("deltaL", data.diagnostics?.deltaL);
        updateText("refusalRate", data.diagnostics?.refusal_rate);

        // 5. Audit Content Injection
        const auditText = data.fused_meaning_object || data.raw_text || "";
        const body = auditText
            .replace(/### (.*?)\n/g, '<div style="color:#0f0; border-bottom:1px solid #222; margin:25px 0 10px; padding-bottom:5px; font-size:11px; font-weight:bold; letter-spacing:2px;">$1</div>')
            .replace(/\*\*(.*?)\*\*/g, '<b style="color:#fff;">$1</b>')
            .replace(/\n/g, '<br>');

        if (el("fmo")) el("fmo").innerHTML = scoreHeader + body;
        
        // 6. Chord Lineage Injection (Ballast Metadata)
        const lineageCont = el("lineage");
        if (lineageCont) {
            lineageCont.innerHTML = "";
            if (data.chord?.tonic?.meta) lineageCont.innerHTML += lineageRow("Tonic", data.chord.tonic.meta);
            if (Array.isArray(data.chord?.ballasts)) {
                data.chord.ballasts.forEach((b, i) => lineageCont.innerHTML += lineageRow(`Ballast ${i + 1}`, b.meta || {}));
            }
        }

        setVisible("outputCard", true);

    } catch (err) {
        console.error("NORTH Error:", err);
        setStatus("ERROR", 0, null);
        if (el("errorBox")) el("errorBox").textContent = `CONNECTION FAILED: ${err.message}`;
        setVisible("errorBox", true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "EVALUATE";
        }
    }
}
