import { API_BASE_URL } from './config.js';

class WordService {
    constructor(wordDisplay) {
        this.wordDisplay = wordDisplay;
    }

    async fetchWord() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/word/today`);
            if (!response.ok) throw new Error('Could not fetch word');
            const data = await response.json();
            this.wordDisplay.textContent = data.word;
        } catch (error) {
            console.error('Error:', error);
            this.wordDisplay.textContent = 'Kunne ikke laste ordet';
        }
    }

    async fetchRandomWord() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/word/random`);
            if (!response.ok) throw new Error('Could not fetch random word');
            const data = await response.json();
            this.wordDisplay.textContent = data.word;
        } catch (error) {
            console.error('Error:', error);
            this.wordDisplay.textContent = 'Kunne ikke laste ordet';
        }
    }
}

export { WordService };
