/**
 * NORTH AI - UTCP Integration & Auditability Refactor
 * Synchronizes: Physical I/R/Sem Scores + 5-Framework Prosaic Audit
 */

// 1. Configuration & State
const BACKEND_URL = "https://north-backend-kdgq.onrender.com"; 
let activeModel = "open-mistral-7b";

// Helper for DOM access
const el = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
    // Engine Selection Logic
    const options = document.querySelectorAll('.engine-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            const modelKey = option.getAttribute('data-model');
            if (!modelKey) return;

            document.querySelector('.engine-option.active').classList.remove('active');
            option.classList.add('active');

            activeModel = modelKey;
            console.log(`NORTH: Logic routed to ${activeModel}`);
        });
    });

    // About Toggle
    const aboutToggle = el("aboutToggle");
    const aboutContent = el("aboutContent");
    if (aboutToggle && aboutContent) {
        aboutToggle.addEventListener("click", () => aboutContent.classList.toggle("hidden"));
    }
});

/**
 * Main Evaluation Engine
 * Rips real scores from JSON and formats the 5-Framework Audit
 */
async function evaluateGate() {
    const promptField = el("prompt");
    const btn = el("btnEvaluate");
    const outputCard = el("outputCard");
    const output = el("fmo");
    const errorBox = el("errorBox");

    const userPrompt = promptField.value.trim();
    if (!userPrompt) return;

    // Loading State
    btn.disabled = true;
    btn.classList.add("loading");
    outputCard.classList.add("hidden");
    errorBox.classList.add("hidden");

    try {
        const response = await fetch(`${BACKEND_URL}/evaluate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: userPrompt,
                model: activeModel,
                // Ensure backend knows which provider to use for the math
                provider: activeModel.includes("gpt") ? "openai" : (activeModel.includes("claude") ? "anthropic" : "mistral"),
                model_name: activeModel
            })
        });

        const data = await response.json();

        if (response.ok) {
            // 1. EXTRACT REAL MATH (No fabrication)
            // Backend returns: scores: { I: float, R: float, Sem: float, rho: float }
            const iScore = data.scores?.I ?? "0.00";
            const rScore = data.scores?.R ?? "0.00";
            const semScore = data.scores?.Sem ?? "0.00";
            const torsion = data.scores?.rho ?? "0.00";

            // 2. CONSTRUCT THE ADMISSIBILITY HEADER
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

            // 3. FORMAT PROSAIC AUDIT (Frameworks)
            const rawContent = data.fused_meaning_object || data.raw_text || "";
            const formattedAudit = rawContent
                .replace(/### 1\. AUDITED FRAMEWORKS/g, '<div class="diagnostic-label">Phase 1: Framework Audit</div>')
                .replace(/### 2\. CORE TRIAD MAPPING/g, '<div class="diagnostic-label">Phase 2: Triadic Mapping</div>')
                .replace(/### 3\. TORSION SCORE/g, '<div class="diagnostic-label">Phase 3: Torsion Rating</div>')
                .replace(/### 4\. DIAGNOSTIC SUMMARY/g, '<div class="diagnostic-label">Phase 4: Diagnostic Summary</div>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            // 4. INJECT EVERYTHING
            output.innerHTML = scoreHeader + formattedAudit;
            outputCard.classList.remove("hidden");

        } else {
            errorBox.textContent = `Engine Refusal: ${data.detail || "Math constraints not met"}`;
            errorBox.classList.remove("hidden");
        }
    } catch (err) {
        errorBox.textContent = "Connectivity failure: Backend is likely sleeping.";
        errorBox.classList.remove("hidden");
    } finally {
        btn.disabled = false;
        btn.classList.remove("loading");
    }
}
