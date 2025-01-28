import { WordService } from './wordService.js';
import { handleDiceAnimation } from './animations.js';

document.addEventListener('DOMContentLoaded', () => {
    const wordDisplay = document.getElementById("word-display");
    const randomWordButton = document.getElementById("random-word-button");
    
    const wordService = new WordService(wordDisplay);
    
    // Load today's word immediately
    wordService.fetchWord();
    
    // Handle random word button click
    if (randomWordButton) {
        randomWordButton.addEventListener('click', () => {
            handleDiceAnimation(randomWordButton, () => wordService.fetchRandomWord());
        });
    }
});