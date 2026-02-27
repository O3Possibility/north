/**
 * NORTH AI - UTCP MASTER CONTROL
 * Synchronizes: Physical I/R/Sem Scores + 5-Framework Audit + Lineage Braid
 * Version: 0.5.3-unbreakable
 */

// 1. Configuration & Global State
const BACKEND_URL = "https://north-backend-kdgq.onrender.com"; 
let activeModel = "open-mistral-7b"; // Defaulting to Mistral as per screenshots

// Helper for DOM access
const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { const n = el(id); if(n) n.classList.toggle("hidden", !show); };

/**
 * Initialization: Setup UI Listeners & Session Tracking
 */
document.addEventListener("DOMContentLoaded", () => {
    // 1. Session Management (Persistent Braid)
    if (!localStorage.getItem("north_session_id")) {
        const sessId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `sess_${Date.now()}`;
        localStorage.setItem("north_session_id", sessId);
    }

    // 2. Engine Selector: Logic for switching between Mistral, GPT, and Claude
    const options = document.querySelectorAll('.engine-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const modelKey = option.getAttribute('data-model');
            if (!modelKey) return;

            // UI Update: Toggle active state on buttons
            document.querySelectorAll('.engine-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // State Update
            activeModel = modelKey;
            
            // Update Label if Pill exists (index 2.html compat)
            if (el("modelNamePill")) {
                el("modelNamePill").textContent = activeModel.toUpperCase();
            }
            console.log(`NORTH: System routing updated to ${activeModel}`);
        });
    });

    // 3. Toggle Listeners (Support for index.html and index 2.html)
    const aboutToggle = el("aboutToggle") || el("pillGuide");
    const aboutContent = el("aboutContent") || el("guideDrawer");
    
    if (aboutToggle && aboutContent) {
        aboutToggle.addEventListener("click", (e) => {
            e.preventDefault();
            aboutContent.classList.toggle("hidden");
        });
    }

    // Modal close support
    if (el("closeModelModal")) {
        el("closeModelModal").onclick = () => setVisible("modelModal", false);
    }
});

/**
 * Main Evaluation Engine
 * Communicates with the FastAPI backend, parses the dual-channel response (JSON + Text),
 * and renders the hardware-style diagnostic dashboard.
 */
async function evaluateGate() {
    const promptField = el("prompt");
    const btn = el("btnEvaluate");
    const outputCard = el("outputCard");
    const output = el("fmo");
    const errorBox = el("errorBox");

    const userPrompt = promptField.value.trim();
    if (!userPrompt) return;

    // 1. Enter Loading State
    btn.disabled = true;
    btn.classList.add("loading");
    setVisible("outputCard", false);
    setVisible("errorBox", false);

    try {
        // 2. Transmit to Multi-Router Backend (Matches EvaluateRequest in main.py)
        const response = await fetch(`${BACKEND_URL}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: userPrompt,
                model: activeModel,
                session_id: localStorage.getItem("north_session_id"),
                parent_branch_id: localStorage.getItem("north_last_branch_id") || null,
                n_reads: 1
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 3. Update Persistent Lineage
            if (data.branch?.branch_id) {
                localStorage.setItem("north_last_branch_id", data.branch.branch_id);
                if (el("branchId")) el("branchId").textContent = data.branch.branch_id;
            }

            // 4. Extract Real Math from JSON
            const iScore = data.scores?.I ?? "0.00";
            const rScore = data.scores?.R ?? "0.00";
            const semScore = data.scores?.Sem ?? "0.00";
            const torsion = data.scores?.rho ?? 0;

            // 5. Construct the Dashboard Header (Numeric Channel)
            const scoreHeader = `
                <div class="score-readout" style="display: grid; grid-template-cols: repeat(4, 1fr); gap: 1rem; background: #09090b; border: 1px solid #27272a; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 2rem;">
                    <div style="text-align: center;"><div style="font-size: 0.6rem; color: #71717a; text-transform: uppercase; letter-spacing: 0.1rem;">Indicative</div><div style="font-family: monospace; font-size: 1.25rem;">${iScore}</div></div>
                    <div style="text-align: center;"><div style="font-size: 0.6rem; color: #71717a; text-transform: uppercase; letter-spacing: 0.1rem;">Relational</div><div style="font-family: monospace; font-size: 1.25rem;">${rScore}</div></div>
                    <div style="text-align: center;"><div style="font-size: 0.6rem; color: #71717a; text-transform: uppercase; letter-spacing: 0.1rem;">Semantic</div><div style="font-family: monospace; font-size: 1.25rem;">${semScore}</div></div>
                    <div style="text-align: center; color: #ef4444;"><div style="font-size: 0.6rem; color: #71717a; text-transform: uppercase; letter-spacing: 0.1rem;">Torsion</div><div style="font-family: monospace; font-size: 1.25rem;">${(torsion * 100).toFixed(1)}%</div></div>
                </div>
            `;

            // 6. Format the Prosaic Audit (Textual Channel)
            const rawContent = data.fused_meaning_object || data.raw_text || "";
            const formattedAudit = rawContent
                .replace(/### (.*?)\n/g, '<div class="diagnostic-label" style="background: #111; color: #fff; font-size: 0.7rem; padding: 6px 12px; border-left: 2px solid #fff; margin: 35px 0 15px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">$1</div>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            // 7. Legacy ID Sync (Updating index 2.html labels if they exist)
            if (el("scoreI")) el("scoreI").textContent = iScore;
            if (el("scoreR")) el("scoreR").textContent = rScore;
            if (el("scoreSem")) el("scoreSem").textContent = semScore;
            if (el("scoreRho")) el("scoreRho").textContent = (torsion * 100).toFixed(1) + "%";

            // 8. Injection
            output.innerHTML = scoreHeader + formattedAudit;
            setVisible("outputCard", true);

        } else {
            // Handle Backend Logic Errors
            errorBox.textContent = `Engine Refusal: ${data.detail || "Math constraints not met"}`;
            setVisible("errorBox", true);
        }
    } catch (err) {
        // Handle Connectivity/Server Sleep Errors
        console.error("NORTH Connectivity Error:", err);
        errorBox.textContent = "Connectivity failure: Backend instance may be waking up. Retry in 30s.";
        setVisible("errorBox", true);
    } finally {
        btn.disabled = false;
        btn.classList.remove("loading");
    }
}
