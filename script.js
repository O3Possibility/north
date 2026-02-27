const DEFAULT_API = "https://north-backend-kdgq.onrender.com";

function el(id){ return document.getElementById(id); }
function setVisible(id, show){ const n = el(id); if(n) n.style.display = show ? "block" : "none"; }

document.addEventListener("DOMContentLoaded", () => {
    console.log("NORTH Initialized");
    const apiLabel = el("apiLabel");
    if(apiLabel) apiLabel.textContent = DEFAULT_API;

    const btn = el("btnEvaluate");
    if(btn) {
        btn.addEventListener("click", evaluatePrompt);
        console.log("Evaluate button linked.");
    } else {
        console.error("Button 'btnEvaluate' not found in HTML.");
    }
});

async function evaluatePrompt(){
    const prompt = el("prompt").value.trim();
    if(!prompt) return alert("Enter a prompt.");
    
    setVisible("errorBox", false);
    el("btnEvaluate").textContent = "Evaluating...";
    el("btnEvaluate").disabled = true;

    try {
        const res = await fetch(`${DEFAULT_API}/evaluate`, {
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({ prompt, model: "default", n_reads: 1 })
        });

        if(!res.ok) throw new Error(await res.text());

        const data = await res.json();
        el("fmo").textContent = data.fused_meaning_object || data.raw_text || "No response";
        setVisible("outputCard", true);
    } catch(e) {
        el("errorBox").textContent = `Error: ${e.message}`;
        setVisible("errorBox", true);
    } finally {
        el("btnEvaluate").textContent = "Evaluate";
        el("btnEvaluate").disabled = false;
    }
}
