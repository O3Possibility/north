/**
 * NORTH AI - Meticulous Refactor
 * Fixes: About toggle logic, Absolute URL targeting, and Error Verbosity
 */

// Use the absolute URL to prevent the 404s seen in browser logs
const BACKEND_URL = "https://north-backend-kdgq.onrender.com/evaluate";

function el(id) { return document.getElementById(id); }

/**
 * UI State Management
 * Ensures centered layout elements are toggled without breaking flow
 */
function setVisible(id, show) { 
    const n = el(id); 
    if(n) {
        if(show) n.classList.remove("hidden");
        else n.classList.add("hidden");
    }
}

/**
 * Main Evaluation Logic
 * Triggers the monochromatic triplet blink and handles the 401/404 responses
 */
async function evaluateGate() {
    const promptField = el("prompt");
    const btn = el("btnEvaluate");
    const outputCard = el("outputCard");
    const output = el("fmo");
    const errorBox = el("errorBox");

    // Prevent empty submissions
    if (!promptField || !promptField.value.trim()) return;

    // 1. Enter Processing State
    btn.disabled = true;
    btn.classList.add("loading"); // Starts the triplet blink in CSS
    setVisible("outputCard", false);
    setVisible("errorBox", false);

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: promptField.value.trim() })
        });

        const data = await response.json();

        if (response.ok) {
            // SUCCESS: Response populated from backend
            output.textContent = data.fused_meaning_object || data.raw_text;
            setVisible("outputCard", true);
        } else {
            // AUTH/API ERROR: Catching the 401 seen in image_28d49c.jpg
            let errorDetail = data.detail || data.raw_text || `Status ${response.status}`;
            
            // Helpful hint for the specific 401 issue
            if (response.status === 401) {
                errorDetail = "Mistral Unauthorized. Check API Key/Billing sync.";
            }

            errorBox.textContent = `Engine: ${errorDetail}`;
            setVisible("errorBox", true);
        }
    } catch (err) {
        // CATCH 404 or Network Failure
        console.error("Connectivity Failure:", err);
        errorBox.textContent = "Connectivity failure. Ensure the Render backend is live.";
        setVisible("errorBox", true);
    } finally {
        // 2. Exit Processing State
        btn.disabled = false;
        btn.classList.remove("loading"); // Stops the triplet blink
    }
}

/**
 * Initializer
 * Sets up the Top-Right "About" toggle and cleans the UI
 */
document.addEventListener("DOMContentLoaded", () => {
    const aboutToggle = el("aboutToggle");
    const aboutContent = el("aboutContent");

    if (aboutToggle && aboutContent) {
        aboutToggle.addEventListener("click", (e) => {
            e.preventDefault();
            // Toggles the hidden state for the centered about info
            aboutContent.classList.toggle("hidden");
        });
    }
});
