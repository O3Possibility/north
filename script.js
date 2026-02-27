/**
 * NORTH AI - UTCP MASTER CONTROL
 * Synchronizes: Physical I/R/Sem Scores + 5-Framework Prosaic Audit
 * version: 0.5.1-pressure-sync
 */

// 1. Configuration & Global State
const BACKEND_URL = "https://north-backend-kdgq.onrender.com"; 
let activeModel = "open-mistral-7b";

// Helper for DOM access
const el = (id) => document.getElementById(id);

/**
 * Initialization: Setup UI Listeners
 */
document.addEventListener("DOMContentLoaded", () => {
    // Engine Selector: Logic for switching between Mistral, GPT, and Claude
    const options = document.querySelectorAll('.engine-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const modelKey = option.getAttribute('data-model');
            if (!modelKey) return;

            // UI Update: Toggle active state on buttons
            document.querySelectorAll('.engine-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // State Update
            activeModel = modelKey;
            console.log(`NORTH: System routing updated to ${activeModel}`);
        });
    });

    // About/System Info Toggle
    const aboutToggle = el("aboutToggle");
    const aboutContent = el("aboutContent");
    if (aboutToggle && aboutContent) {
        aboutToggle.addEventListener("click", (e) => {
            e.preventDefault();
            aboutContent.classList.toggle("hidden");
        });
    }
});

/**
 * Main Evaluation Engine
 * Communicates with the FastAPI backend, parses the dual-channel response (JSON + Text),
 * and renders the hardware-style diagnostic dashboard.
 */
async function evaluateGate() {
    const promptField = el("prompt");
    const btn = el("btnEvaluate");
    const outputCard = el("outputCard");
    const output = el("fmo");
    const errorBox = el("errorBox");

    const userPrompt = promptField.value.trim();
    if (!userPrompt) return;

    // 1. Enter Loading State
    btn.disabled = true;
    btn.classList.add("loading");
    outputCard.classList.add("hidden");
    errorBox.classList.add("hidden");

    try {
        // 2. Transmit to Multi-Router Backend
        const response = await fetch(`${BACKEND_URL}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: userPrompt,
                model: activeModel 
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 3. Extract Real Math from JSON (Provided by backend regex parser)
            const iScore = data.scores?.I ?? "0.00";
            const rScore = data.scores?.R ?? "0.00";
            const semScore = data.scores?.Sem ?? "0.00";
            const torsion = data.scores?.rho ?? 0;

            // 4. Construct the Dashboard Header (Numeric Channel)
            const scoreHeader = `
                <div class="score-readout">
                    <div class="score-metric">
                        <span class="score-label">INDICATIVE</span>
                        <span class="score-value">${iScore}</span>
                    </div>
                    <div class="score-metric">
                        <span class="score-label">RELATIONAL</span>
                        <span class="score-value">${rScore}</span>
                    </div>
                    <div class="score-metric">
                        <span class="score-label">SEMANTIC</span>
                        <span class="score-value">${semScore}</span>
                    </div>
                    <div class="score-metric torsion">
                        <span class="score-label">TORSION (ρ)</span>
                        <span class="score-value">${(torsion * 100).toFixed(1)}%</span>
                    </div>
                </div>
            `;

            // 5. Format the Prosaic Audit (Textual Channel)
            const rawContent = data.fused_meaning_object || data.raw_text || "";
            const formattedAudit = rawContent
                // Map Phase Headers to custom CSS labels
                .replace(/### 1\. AUDITED FRAMEWORKS/g, '<div class="diagnostic-label">Phase 1: Framework Audit</div>')
                .replace(/### 2\. CORE TRIAD MAPPING/g, '<div class="diagnostic-label">Phase 2: Triadic Mapping</div>')
                .replace(/### 3\. TORSION SCORE/g, '<div class="diagnostic-label">Phase 3: Torsion Rating</div>')
                .replace(/### 4\. DIAGNOSTIC SUMMARY/g, '<div class="diagnostic-label">Phase 4: Diagnostic Summary</div>')
                // Cleanup Markdown
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            // 6. Injection
            output.innerHTML = scoreHeader + formattedAudit;
            outputCard.classList.remove("hidden");

        } else {
            // Handle Backend Logic Errors
            errorBox.textContent = `Engine Refusal: ${data.detail || "Validation failed"}`;
            errorBox.classList.remove("hidden");
        }
    } catch (err) {
        // Handle Connectivity/Server Sleep Errors
        console.error("NORTH System Error:", err);
        errorBox.textContent = "Connectivity failure: Backend instance may be waking up. Retry in 30s.";
        errorBox.classList.remove("hidden");
    } finally {
        // 7. Exit Loading State
        btn.disabled = false;
        btn.classList.remove("loading");
    }
}
