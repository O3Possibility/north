/**
 * NORTH AI - Meticulous Multi-Engine Refactor
 * Synchronizes: Swappable AI (Mistral, GPT, Claude) & Structured Diagnostic Readout
 */

const BACKEND_URL = "https://north-backend-kdgq.onrender.com/evaluate";

// Global state for the active engine
let activeModel = "open-mistral-7b";

document.addEventListener("DOMContentLoaded", () => {
    /**
     * Engine Selector Logic
     * Maps frontend spans to the backend model-routing keys
     */
    const options = document.querySelectorAll('.engine-option');
    
    options.forEach(option => {
        option.addEventListener('click', () => {
            // Updated: Removed the (LOCKED) check to allow swappability
            const modelKey = option.getAttribute('data-model');
            if (!modelKey) return;

            // UI feedback for selection
            document.querySelector('.engine-option.active').classList.remove('active');
            option.classList.add('active');

            // Update state
            activeModel = modelKey;
            console.log(`NORTH: Routing to ${activeModel}`);
        });
    });

    /**
     * About Section Toggle
     */
    const aboutToggle = document.getElementById("aboutToggle");
    const aboutContent = document.getElementById("aboutContent");
    if (aboutToggle && aboutContent) {
        aboutToggle.addEventListener("click", (e) => {
            e.preventDefault();
            aboutContent.classList.toggle("hidden");
        });
    }
});

/**
 * Main Evaluation Engine
 * Processes the prompt through the selected router and formats the 4-Phase Audit
 */
async function evaluateGate() {
    const promptField = document.getElementById("prompt");
    const btn = document.getElementById("btnEvaluate");
    const outputCard = document.getElementById("outputCard");
    const output = document.getElementById("fmo");
    const errorBox = document.getElementById("errorBox");

    // Block empty intents
    const userPrompt = promptField.value.trim();
    if (!userPrompt) return;

    // 1. Enter Loading State
    btn.disabled = true;
    btn.classList.add("loading");
    outputCard.classList.add("hidden");
    errorBox.classList.add("hidden");

    try {
        // 2. Transmit to Multi-Router Backend
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: userPrompt,
                model: activeModel 
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 3. Structured Formatting for Phase Audit
            const rawContent = data.fused_meaning_object || data.raw_text;
            
            // This regex-chain converts the backend structure into the Module Design
            output.innerHTML = rawContent
                // Phase 1: Frameworks
                .replace(/### 1\. AUDITED FRAMEWORKS/g, '<div class="diagnostic-label">Phase 1: Framework Audit</div>')
                // Phase 2: Triadic Mapping
                .replace(/### 2\. CORE TRIAD MAPPING \(I\/R\/Sem\)/g, '<div class="diagnostic-label">Phase 2: Triadic Mapping</div>')
                // Phase 3: Torsion Rating
                .replace(/### 3\. TORSION SCORE/g, '<div class="diagnostic-label">Phase 3: Torsion Rating</div>')
                // Phase 4: Diagnostic Summary
                .replace(/### 4\. DIAGNOSTIC SUMMARY/g, '<div class="diagnostic-label">Phase 4: FMO Output</div>')
                // Standard markdown cleanup
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            outputCard.classList.remove("hidden");
        } else {
            // Handle HTTP errors or Backend Key failures
            errorBox.textContent = `Engine Error: ${data.detail || "Verification sequence failed"}`;
            errorBox.classList.remove("hidden");
        }
    } catch (err) {
        console.error("NORTH System Failure:", err);
        errorBox.textContent = "Connectivity failure: Verify Render Backend Status.";
        errorBox.classList.remove("hidden");
    } finally {
        // 4. Exit Loading State
        btn.disabled = false;
        btn.classList.remove("loading");
    }
}
