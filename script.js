// 1. Your actual backend URL
const BACKEND_URL = "https://north-backend-kdgq.onrender.com/evaluate";

function el(id) { return document.getElementById(id); }

// Toggle visibility using classes to match your minimalist CSS
function setVisible(id, show) { 
    const n = el(id); 
    if(n) {
        if(show) n.classList.remove("hidden");
        else n.classList.add("hidden");
    }
}

async function evaluateGate() {
    const promptField = el("prompt");
    const btn = el("btnEvaluate");
    const outputCard = el("outputCard");
    const output = el("fmo");
    const errorBox = el("errorBox");

    if (!promptField || !promptField.value.trim()) return;

    // Start Loading State (Triplet Blink)
    btn.disabled = true;
    btn.classList.add("loading"); 
    setVisible("outputCard", false);
    setVisible("errorBox", false);

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptField.value })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCCESS: Display the FMO
            output.textContent = data.fused_meaning_object || data.raw_text;
            setVisible("outputCard", true);
        } else {
            // API ERROR (like the 401 you saw)
            const errorMsg = data.detail || data.raw_text || `Error ${response.status}`;
            errorBox.textContent = `Engine: ${errorMsg}`;
            setVisible("errorBox", true);
        }
    } catch (err) {
        console.error(err);
        errorBox.textContent = "Connectivity failure. Check if Render backend is awake.";
        setVisible("errorBox", true);
    } finally {
        // Reset Button & Stop Blink
        btn.disabled = false;
        btn.classList.remove("loading");
    }
}

// Ensure the "About" toggle still works
document.addEventListener("DOMContentLoaded", () => {
    const aboutToggle = el("aboutToggle");
    if(aboutToggle) {
        aboutToggle.addEventListener("click", () => {
            const content = el("aboutContent");
            if(content) content.classList.toggle("hidden");
        });
    }
});
