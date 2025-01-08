const wordDisplay = document.getElementById("word-display");
const addWordBtn = document.getElementById("add-word-btn");

// Håndter klikk på pluss-tegnet
addWordBtn.addEventListener("click", () => {
    alert("Denne funksjonen kommer snart!");
});

// Hent dagens ord basert på dato
async function fetchWord() {
    try {
        const response = await fetch("ordbank.json"); // Hent JSON-filen
        const data = await response.json();
        const today = new Date(); // Hent dagens dato
        const dayOfYear = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(today.getFullYear(), 0, 0)) / 86400000);

        const word = data.days[dayOfYear]; // Hent ord for dagens nummer

        if (word) {
            wordDisplay.textContent = word; // Vis dagens ord
        } else {
            wordDisplay.textContent = "Ingen ord funnet for i dag.";
        }
    } catch (error) {
        console.error("Kunne ikke hente dagens ord:", error);
        wordDisplay.textContent = "Noe gikk galt.";
    }
}

// Last dagens ord
fetchWord();