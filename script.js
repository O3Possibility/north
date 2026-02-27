/**
 * NORTH AI - Engine Control & Auditability Refactor
 * Implements: Swappable AI, Structured FMO Output, and Name-Sync for Backend
 */

const BACKEND_URL = "https://north-backend-kdgq.onrender.com/evaluate";

// 1. Swappable AI Selection Logic
let activeModel = "open-mistral-7b"; // Default internal name

document.addEventListener("DOMContentLoaded", () => {
    const options = document.querySelectorAll('.engine-option');
    
    options.forEach(option => {
        option.addEventListener('click', () => {
            // Check if model is locked (GPT-4O / CLAUDE-3)
            if (option.textContent.includes("(LOCKED)")) return;

            // Update UI
            document.querySelector('.engine-option.active').classList.remove('active');
            option.classList.add('active');

            // Update model reference for the API call
            activeModel = option.getAttribute('data-model') || "open-mistral-7b";
        });
    });

    // About Toggle Logic
    const aboutToggle = document.getElementById("aboutToggle");
    const aboutContent = document.getElementById("aboutContent");
    if (aboutToggle) {
        aboutToggle.addEventListener("click", () => {
            aboutContent.classList.toggle("hidden");
        });
    }
});

/**
 * Main Evaluation Engine
 * Handles the structured readout of the 5 Frameworks and Triadic Mapping
 */
async function evaluateGate() {
    const promptField = document.getElementById("prompt");
    const btn = document.getElementById("btnEvaluate");
    const outputCard = document.getElementById("outputCard");
    const output = document.getElementById("fmo");
    const errorBox = document.getElementById("errorBox");

    if (!promptField || !promptField.value.trim()) return;

    // Enter Loading State
    btn.disabled = true;
    btn.classList.add("loading");
    outputCard.classList.add("hidden");
    errorBox.classList.add("hidden");

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // Matches the corrected EvaluateRequest model in main.py
            body: JSON.stringify({ 
                prompt: promptField.value.trim(),
                model: activeModel 
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Handle the raw response and convert to structured HTML
            const rawContent = data.fused_meaning_object || data.raw_text;
            
            // Format for Auditability: Bold headers and handle line breaks
            output.innerHTML = rawContent
                .replace(/### (.*)/g, '<h3 class="fmo-header">$1</h3>') // Convert ### to styled headers
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')       // Support standard bolding
                .replace(/\n/g, '<br>');                                // Maintain verticality

            outputCard.classList.remove("hidden");
        } else {
            // Display specific error details relayed from the backend
            errorBox.textContent = `Engine: ${data.detail || "Verification Failed"}`;
            errorBox.classList.remove("hidden");
        }
    } catch (err) {
        console.error("NORTH Connectivity Error:", err);
        errorBox.textContent = "Connectivity failure. Ensure the Render instance is awake.";
        errorBox.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.classList.remove("loading");
    }
}
