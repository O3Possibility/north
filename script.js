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

async function evaluateGate() {
    const prompt = document.getElementById("prompt").value;
    const btn = document.getElementById("evaluate-btn");
    const dots = document.getElementById("loading-dots");
    const output = document.getElementById("fmo");

    if (!prompt) return;

    // Start Loading State
    btn.classList.add("loading");
    dots.style.display = "flex";
    btn.firstChild.textContent = ""; // Remove "Evaluate" text
    output.textContent = "";

    try {
        const response = await fetch("https://your-render-url.onrender.com/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json();
        output.textContent = data.fused_meaning_object || data.raw_text;
    } catch (err) {
        output.textContent = "Connection Error. Check backend logs.";
    } finally {
        // End Loading State
        btn.classList.remove("loading");
        dots.style.display = "none";
        btn.firstChild.textContent = "Evaluate";
    }
}
