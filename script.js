const DEFAULT_API = "https://north-backend-kdgq.onrender.com";

function el(id){ return document.getElementById(id); }

/**
 * Robust visibility toggle. 
 * Using block/none ensures the red box is physically removed from the layout.
 */
function setVisible(id, show){ 
    const n = el(id); 
    if(n) n.style.display = show ? "block" : "none"; 
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("NORTH Initialized");
    
    // Set the API link text
    const apiLabel = el("apiLabel");
    if(apiLabel) apiLabel.textContent = DEFAULT_API;

    const btn = el("btnEvaluate");
    if(btn) {
        btn.addEventListener("click", evaluatePrompt);
        console.log("Evaluate button linked.");
    } else {
        console.error("Button 'btnEvaluate' not found in HTML.");
    }

    // Ensure errorBox is hidden on initial load
    setVisible("errorBox", false);
});

async function evaluatePrompt(){
    const prompt = el("prompt").value.trim();
    if(!prompt) return alert("Enter a prompt.");
    
    // UI Reset: Hide previous errors and results
    setVisible("errorBox", false);
    setVisible("outputCard", false);
    
    const btn = el("btnEvaluate");
    btn.textContent = "Evaluating...";
    btn.disabled = true;

    try {
        /**
         * The 'credentials: "include"' flag is mandatory because the backend
         * is configured with allow_credentials=True. Without this, the browser
         * blocks the request for security reasons.
         */
        const res = await fetch(`${DEFAULT_API}/evaluate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include", 
            body: JSON.stringify({ 
                prompt, 
                model: "default", 
                n_reads: 1 
            })
        });

        if(!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || `Server Error: ${res.status}`);
        }

        const data = await res.json();
        
        // Display the result
        const outputField = el("fmo");
        if(outputField) {
            outputField.textContent = data.fused_meaning_object || data.raw_text || "No response received.";
        }
        
        setVisible("outputCard", true);

    } catch(e) {
        console.error("Fetch Failure:", e);
        const errBox = el("errorBox");
        if(errBox) {
            errBox.textContent = `Error: ${e.message}`;
            setVisible("errorBox", true);
        }
    } finally {
        btn.textContent = "Evaluate";
        btn.disabled = false;
    }
}
