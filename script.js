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
    const btn = document.getElementById("btnEvaluate");
    const btnText = btn.querySelector(".btn-text");
    const dots = document.getElementById("loading-dots");
    const outputCard = document.getElementById("outputCard");
    const output = document.getElementById("fmo");

    if (!prompt) return;

    // Start Loading State
    btn.disabled = true;
    btn.classList.add("loading");
    btnText.style.display = "none";
    dots.style.display = "flex";
    outputCard.classList.add("hidden");

    try {
        const response = await fetch("https://your-backend.onrender.com/evaluate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: prompt })
        });

        const data = await response.json();
        output.textContent = data.fused_meaning_object || data.raw_text;
        outputCard.classList.remove("hidden");
    } catch (err) {
        console.error(err);
        output.textContent = "Evaluation failed. Check connectivity.";
        outputCard.classList.remove("hidden");
    } finally {
        // Reset Button
        btn.disabled = false;
        btn.classList.remove("loading");
        btnText.style.display = "inline";
        dots.style.display = "none";
    }
}
