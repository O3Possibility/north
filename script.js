/**
 * NORTH AI - UTCP SYNCHRONIZED CONTROL
 * Version: 0.5.2-lineage-sync
 * Links Physical I/R/Sem Scores with the chord-based lineage backend.
 */

// 1. Configuration & Global State
const BACKEND_URL = "https://north-backend-kdgq.onrender.com"; 
let selectedModel = "default";

// Helper for DOM access
const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { const n = el(id); if(n) n.classList.toggle("hidden", !show); };

/**
 * Initialization: Setup UI Listeners & Session Tracking
 */
document.addEventListener("DOMContentLoaded", () => {
    // Session Management
    if (!localStorage.getItem("north_session_id")) {
        const sessId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Date.now()}`;
        localStorage.setItem("north_session_id", sessId);
    }

    // Engine Selection Logic (Modal System from index 2.html)
    document.querySelectorAll("[data-model]").forEach(btn => {
        btn.addEventListener("click", () => {
            selectedModel = btn.getAttribute("data-model");
            const label = selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1);
            if (el("modelNamePill")) el("modelNamePill").textContent = label;
            setVisible("modelModal", false);
        });
    });

    // Toggle Listeners
    if (el("pillGuide")) el("pillGuide").addEventListener("click", () => setVisible("guideDrawer", el("guideDrawer").classList.contains("hidden")));
    if (el("pillModel")) el("pillModel").addEventListener("click", () => setVisible("modelModal", true));
    if (el("closeModelModal")) el("closeModelModal").addEventListener("click", () => setVisible("modelModal", false));
});

/**
 * Main Evaluation Engine
 * Maps response data to the complex "Guide" drawer and the Fused Meaning Object.
 */
async function evaluateGate() {
    const prompt = el("prompt").value.trim();
    if (!prompt) return;

    // UI Reset
    setVisible("outputCard", false);
    setVisible("errorBox", false);
    el("btnEvaluate").classList.add("loading");
    el("btnEvaluate").disabled = true;

    try {
        const response = await fetch(`${BACKEND_URL}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: prompt,
                model: selectedModel,
                session_id: localStorage.getItem("north_session_id"),
                parent_branch_id: localStorage.getItem("north_last_branch_id"),
                n_reads: parseInt(el("apertureReads")?.value || "1")
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 1. Update Persistent Lineage
            if (data.branch?.branch_id) localStorage.setItem("north_last_branch_id", data.branch.branch_id);

            // 2. Inject I/R/Sem Dashboard (Top Level)
            const scoreHeader = `
                <div class="grid grid-cols-4 gap-4 mb-6 bg-black/40 p-4 rounded-xl border border-zinc-900">
                    <div class="text-center"><div class="text-[10px] text-zinc-500 uppercase">Indicative</div><div class="text-lg font-mono">${data.scores?.I ?? "—"}</div></div>
                    <div class="text-center"><div class="text-[10px] text-zinc-500 uppercase">Relational</div><div class="text-lg font-mono">${data.scores?.R ?? "—"}</div></div>
                    <div class="text-center"><div class="text-[10px] text-zinc-500 uppercase">Semantic</div><div class="text-lg font-mono">${data.scores?.Sem ?? "—"}</div></div>
                    <div class="text-center text-red-500"><div class="text-[10px] text-zinc-400 uppercase">Torsion</div><div class="text-lg font-mono">${(data.scores?.rho * 100 || 0).toFixed(1)}%</div></div>
                </div>`;

            // 3. Format Audit Text
            const body = (data.fused_meaning_object || data.raw_text || "")
                .replace(/### (.*?)\n/g, '<div class="text-xs font-bold text-white uppercase mt-4 mb-2 tracking-widest border-l-2 border-white pl-2">$1</div>')
                .replace(/\n/g, '<br>');

            el("fmo").innerHTML = scoreHeader + body;

            // 4. Populate Hidden Guide Drawer (Legacy Metadata Sync)
            if (el("scoreI")) {
                el("scoreI").textContent = data.scores?.I ?? "—";
                el("scoreR").textContent = data.scores?.R ?? "—";
                el("scoreSem").textContent = data.scores?.Sem ?? "—";
                el("scoreRho").textContent = data.scores?.rho ?? "—";
                el("branchId").textContent = data.branch?.branch_id ?? "—";
            }

            setVisible("outputCard", true);
        } else {
            throw new Error(data.detail || "Engine Refusal");
        }
    } catch (err) {
        el("errorBox").textContent = `System Error: ${err.message}`;
        setVisible("errorBox", true);
    } finally {
        el("btnEvaluate").classList.remove("loading");
        el("btnEvaluate").disabled = false;
    }
}
