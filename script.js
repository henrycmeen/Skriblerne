const wordDisplay = document.getElementById("word-display");
const randomWordButton = document.getElementById("random-word-button");

// Hent dagens ord basert på dato
async function fetchWord() {
    try {
        const response = await fetch("ordbank.json"); // Hent JSON-filen
        if (!response.ok) throw new Error("Kunne ikke hente JSON-filen");

        const data = await response.json();
        console.log("Data hentet for dagens ord:", data); // Logg dataene

        const today = new Date(); // Hent dagens dato
        const dayOfYear = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(today.getFullYear(), 0, 0)) / 86400000);

        const word = data.days[dayOfYear]; // Hent ord for dagens nummer
        console.log("Dagens ord:", word); // Logg dagens ord

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

// Funksjon for å hente et tilfeldig ord
async function fetchRandomWord() {
    try {
        const response = await fetch("ordbank.json"); // Hent JSON-filen
        if (!response.ok) throw new Error("Kunne ikke hente JSON-filen");

        const data = await response.json();
        console.log("Data hentet for tilfeldig ord:", data); // Logg dataene

        const words = Object.values(data.days); // Konverter objektet til en liste av verdier
        const randomIndex = Math.floor(Math.random() * words.length);
        const randomWord = words[randomIndex];
        console.log("Tilfeldig ord:", randomWord); // Logg tilfeldig ord

        if (randomWord) {
            wordDisplay.textContent = randomWord; // Vis tilfeldig ord
        } else {
            wordDisplay.textContent = "Ingen ord funnet.";
        }
    } catch (error) {
        console.error("Kunne ikke hente tilfeldig ord:", error);
        wordDisplay.textContent = "Noe gikk galt.";
    }
}

// Last dagens ord
fetchWord();

// Legg til event listener for å hente et tilfeldig ord når knappen klikkes
randomWordButton.addEventListener('click', () => {
    randomWordButton.classList.add('spin'); // Start animasjonen
    setTimeout(async () => {
        await fetchRandomWord();
        randomWordButton.classList.remove('spin'); // Stopp animasjonen
    }, 1000); // Varighet av animasjonen
});