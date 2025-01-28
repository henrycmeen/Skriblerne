import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    loadWords();
    
    // Set up form submission handler
    const form = document.querySelector('.add-word-form');
    const wordInput = document.getElementById('newWord');
    
    if (form && wordInput) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            addWord();
        });
        
        // Handle both Enter key and mobile keyboard's 'done' action
        wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addWord();
            }
        });

        // Handle mobile keyboard's 'done' action through input event
        wordInput.addEventListener('input', (e) => {
            if (e.inputType === 'insertLineBreak') {
                e.preventDefault();
                addWord();
            }
        });

        // Ensure proper appearance on mobile devices
        wordInput.style.appearance = 'none';
        wordInput.style.webkitAppearance = 'none';
        wordInput.style.borderRadius = '4px';
        wordInput.style.fontSize = '16px'; // Prevents iOS zoom on focus
    }
});

async function loadWords() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/words`);
        if (!response.ok) throw new Error('fåkke henta words');
        
        const words = await response.json();
        const container = document.getElementById('words-container');
        container.innerHTML = '';
        
        words.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        words.forEach(word => {
            const wordElement = createWordElement(word.word, word.date);
            container.appendChild(wordElement);
        });
    } catch (error) {
        console.error('Error for loadWords:', error);
    }
}

async function getNextAvailableDate() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/words`);
        if (!response.ok) throw new Error('Could not fetch words');
        
        const words = await response.json();
        if (words.length === 0) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
        }
        
        const dates = words.map(w => new Date(w.date));
        const latestDate = new Date(dates.sort((a, b) => b - a)[0]);
        latestDate.setDate(latestDate.getDate() + 1);
        return latestDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error for å hente dato:', error);
        throw error;
    }
}

async function addWord() {
    const wordInput = document.getElementById('newWord');
    const errorMessage = document.getElementById('errorMessage');
    const word = wordInput.value.trim().toUpperCase();
    
    if (!word) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/words`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Det gikk ikke');
        }
        
        wordInput.value = '';
        errorMessage.textContent = 'Ordet er lagt til!';
        errorMessage.style.color = 'green';
        errorMessage.classList.add('visible');
        await loadWords();
        wordInput.focus();

        setTimeout(() => {
            errorMessage.classList.remove('visible');
        }, 3000);
    } catch (error) {
        console.error('Error gitt:', error);
        errorMessage.textContent = error.message;
        errorMessage.style.color = 'red';
        errorMessage.classList.add('visible');
    }
}

// Make addWord available globally AFTER it's defined
window.addWord = addWord;

function createWordElement(word, date) {
    const wordElement = document.createElement('div');
    wordElement.className = 'word-item';
    const dateStr = new Date(date).toLocaleDateString('no-NO');
    wordElement.textContent = `${dateStr}: ${word}`;
    return wordElement;
}