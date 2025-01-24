export class WordService {
    constructor(displayElement) {
        this.wordDisplay = displayElement;
    }

    async fetchWord() {
        try {
            const response = await fetch('/api/word/today');
            if (!response.ok) throw new Error("Kunne ikke hente ordet");

            const data = await response.json();
            this.wordDisplay.textContent = data.word;
        } catch (error) {
            console.error("Kunne ikke hente dagens ord:", error);
            this.wordDisplay.textContent = "Noe gikk galt.";
        }
    }

    async fetchRandomWord() {
        try {
            const response = await fetch('/api/word/random');
            if (!response.ok) throw new Error("Kunne ikke hente ordet");

            const data = await response.json();
            this.wordDisplay.textContent = data.word;
        } catch (error) {
            console.error("Kunne ikke hente tilfeldig ord:", error);
            this.wordDisplay.textContent = "Noe gikk galt.";
        }
    }
}
