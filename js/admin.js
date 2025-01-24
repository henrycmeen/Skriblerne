import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    loadWords();
    
    document.getElementById('newWord').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addWord();
        }
    });
});

async function loadWords() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/words`);
        if (!response.ok) throw new Error('Could not fetch words');
        
        const words = await response.json();
        const container = document.getElementById('words-container');
        container.innerHTML = '';
        
        words.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        words.forEach(word => {
            const wordElement = createWordElement(word.word, word.date);
            container.appendChild(wordElement);
        });
    } catch (error) {
        console.error('Error in loadWords:', error);
    }
}

async function addWord() {
    const wordInput = document.getElementById('newWord');
    const errorMessage = document.getElementById('errorMessage');
    const word = wordInput.value.trim().toUpperCase();
    
    if (!word) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/word`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Could not add word');
        }
        
        wordInput.value = '';
        errorMessage.textContent = '';
        errorMessage.classList.remove('visible');
        await loadWords();
        wordInput.focus();
    } catch (error) {
        console.error('Error adding word:', error);
        errorMessage.textContent = error.message;
        errorMessage.classList.add('visible');
    }
}

function createWordElement(word, date) {
    const wordElement = document.createElement('div');
    wordElement.className = 'word-item';
    const dateStr = new Date(date).toLocaleDateString('no-NO');
    wordElement.textContent = `${dateStr}: ${word}`;
    return wordElement;
}