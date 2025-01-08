const wordDisplay = document.getElementById("word-display");
const addWordBtn = document.getElementById("add-word-btn");

// Håndter klikk på pluss-tegnet
addWordBtn.addEventListener("click", () => {
    alert("Denne funksjonen kommer snart!");
});

// Eksempel: Oppdater dagens ord
async function fetchWord() {
    const response = await fetch("ordbank.json");
    const words = await response.json();
    const today = new Date().getDate();
    const word = words[today % words.length]; // Velger ord basert på dagens dato
    wordDisplay.textContent = word;
}

// Last dagens ord
fetchWord();