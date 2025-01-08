const wordDisplay = document.getElementById("word-display");
const addWordBtn = document.getElementById("add-word-btn");

// Håndter klikk på pluss-knappen
addWordBtn.addEventListener("click", () => {
    alert("Denne funksjonen kommer snart!");
});

// Eksempel på oppdatering av dagens ord
async function fetchWord() {
    const response = await fetch("ordbank.json");
    const words = await response.json();
    const today = new Date().getDate();
    const word = words[today % words.length]; // Velg ord basert på dato
    wordDisplay.textContent = word;
}

// Last dagens ord
fetchWord();