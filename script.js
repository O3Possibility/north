const DEFAULT_API = "https://north-backend-kdgq.onrender.com";

function el(id){ return document.getElementById(id); }

function setVisible(id, show){ 
    const n = el(id); 
    if(n) n.style.display = show ? "block" : "none"; 
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("NORTH Initialized");
    const apiLabel = el("apiLabel");
    if(apiLabel) apiLabel.textContent = DEFAULT_API;

    const btn = el("btnEvaluate");
    if(btn) {
        btn.addEventListener("click", evaluatePrompt);
    }
    
    // Start with the error box physically removed
    setVisible("errorBox", false);
});

async function evaluatePrompt(){
    const prompt = el("prompt").value.trim();
    if(!prompt) return alert("Enter a prompt.");
    
    setVisible("errorBox", false);
    setVisible("outputCard", false);
    
    const btn = el("btnEvaluate");
    btn.textContent = "Evaluating...";
    btn.disabled = true;

    try {
        const res = await fetch(`${DEFAULT_API}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", 
            body: JSON.stringify({ prompt, model: "default", n_reads: 1 })
        });

        if(!res.ok) {
            const errData = await res.json().catch(() => ({ detail: "Server Error" }));
            throw new Error(errData.detail || `Error ${res.status}`);
        }

        const data = await res.json();
        const outputField = el("fmo");
        if(outputField) {
            outputField.textContent = data.fused_meaning_object || data.raw_text || "No response";
        }
        setVisible("outputCard", true);

    } catch(e) {
        console.error("Connection Error:", e);
        const errBox = el("errorBox");
        if(errBox) {
            errBox.textContent = e.message === "Failed to fetch" 
                ? "Error: Could not connect to engine. Check Render logs." 
                : `Error: ${e.message}`;
            setVisible("errorBox", true);
        }
    } finally {
        btn.textContent = "Evaluate";
        btn.disabled = false;
    }
}
