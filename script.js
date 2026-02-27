const DEFAULT_API = "https://north-backend-kdgq.onrender.com";

function el(id){ return document.getElementById(id); }
function setVisible(id, show){ const n = el(id); if(n) n.style.display = show ? "block" : "none"; }

document.addEventListener("DOMContentLoaded", () => {
    const apiLabel = el("apiLabel");
    if(apiLabel) apiLabel.textContent = DEFAULT_API;
    const btn = el("btnEvaluate");
    if(btn) btn.addEventListener("click", evaluatePrompt);
    setVisible("errorBox", false);
});

async function evaluatePrompt(){
    const prompt = el("prompt").value.trim();
    if(!prompt) return alert("Enter a prompt.");
    
    setVisible("errorBox", false);
    setVisible("outputCard", false);
    el("btnEvaluate").textContent = "Evaluating...";
    el("btnEvaluate").disabled = true;

    try {
        const res = await fetch(`${DEFAULT_API}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", 
            body: JSON.stringify({ prompt, model: "default", n_reads: 1 })
        });

        const data = await res.json();
        
        if(!res.ok) throw new Error(data.detail || "Engine Error");

        // Fill Main Output
        el("fmo").textContent = data.fused_meaning_object || data.raw_text || "No response";
        
        // Fill Analysis Scores (Restoring the 30 lines we cut earlier)
        const scores = data.scores || {};
        const fields = ['I','R','Sem','L','Tau','Rho','RhoCrit'];
        fields.forEach(f => {
            const span = el(`score${f}`);
            if(span) span.textContent = `${f}: ${scores[f] || '0'}`;
        });

        setVisible("outputCard", true);

    } catch(e) {
        const errBox = el("errorBox");
        errBox.textContent = `Error: ${e.message}`;
        setVisible("errorBox", true);
    } finally {
        el("btnEvaluate").textContent = "Evaluate";
        el("btnEvaluate").disabled = false;
    }
}
