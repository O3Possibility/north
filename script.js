const BACKEND_URL = "https://north-backend-kdgq.onrender.com"; 
let activeModel = "open-mistral-7b"; 

const el = (id) => document.getElementById(id);
const setVisible = (id, show) => { if(el(id)) el(id).classList.toggle("hidden", !show); };

document.addEventListener("DOMContentLoaded", () => {
    // Session Persistent Braid
    if (!localStorage.getItem("north_session_id")) {
        localStorage.setItem("north_session_id", crypto.randomUUID() || `sess_${Date.now()}`);
    }

    // Engine Selector Synchronization
    document.querySelectorAll('.engine-option').forEach(opt => {
        opt.onclick = () => {
            document.querySelectorAll('.engine-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            activeModel = opt.getAttribute('data-model');
        };
    });

    // Toggle System Info Drawer
    if(el("aboutToggle")) el("aboutToggle").onclick = () => el("aboutContent").classList.toggle("hidden");
});

async function evaluateGate() {
    const userPrompt = el("prompt").value.trim();
    if (!userPrompt) return;

    // Loading State
    el("btnEvaluate").disabled = true;
    setVisible("outputCard", false);
    setVisible("errorBox", false);

    try {
        const response = await fetch(`${BACKEND_URL}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: userPrompt,
                model: activeModel,
                session_id: localStorage.getItem("north_session_id"),
                parent_branch_id: localStorage.getItem("north_last_branch_id")
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Gate Error");

        // Update Lineage
        if (data.branch?.branch_id) {
            localStorage.setItem("north_last_branch_id", data.branch.branch_id);
            if(el("branchId")) el("branchId").textContent = data.branch.branch_id;
        }

        // Dashboard Rendering
        const s = data.scores;
        const scoreHeader = `
            <div class="score-readout" style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; background:#000; border:1px solid #333; padding:20px; border-radius:8px; margin-bottom:20px; font-family:monospace; text-align:center;">
                <div><span style="color:#666; font-size:10px;">I</span><br><b>${s.I}</b></div>
                <div><span style="color:#666; font-size:10px;">R</span><br><b>${s.R}</b></div>
                <div><span style="color:#666; font-size:10px;">SEM</span><br><b>${s.Sem}</b></div>
                <div style="color:#f44;"><span style="color:#666; font-size:10px;">ρ</span><br><b>${(s.rho * 100).toFixed(1)}%</b></div>
            </div>`;

        // Audit Content with Framework Highlighting
        const body = data.fused_meaning_object
            .replace(/### (.*?)\n/g, '<div style="color:#0f0; border-bottom:1px solid #222; margin:25px 0 10px; padding-bottom:5px; font-size:11px; font-weight:bold; letter-spacing:2px;">$1</div>')
            .replace(/\*\*(.*?)\*\*/g, '<b style="color:#fff;">$1</b>')
            .replace(/\n/g, '<br>');

        el("fmo").innerHTML = scoreHeader + body;
        setVisible("outputCard", true);

    } catch (err) {
        el("errorBox").textContent = err.message;
        setVisible("errorBox", true);
    } finally {
        el("btnEvaluate").disabled = false;
    }
}
