import { API_BASE_URL } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    loadWords();
    
    // Set up event listeners
    const addButton = document.getElementById('addWordButton');
    if (addButton) {
        addButton.addEventListener('click', addWord);
    }
    
    const wordInput = document.getElementById('newWord');
    if (wordInput) {
        wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addWord();
            }
        });
    }
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
        
        const latestDate = new Date(Math.max(...words.map(w => new Date(w.date))));
        latestDate.setDate(latestDate.getDate() + 1);
        return latestDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error getting next date:', error);
        throw error;
    }
}

async function addWord() {
    const wordInput = document.getElementById('newWord');
    const errorMessage = document.getElementById('errorMessage');
    const word = wordInput.value.trim().toUpperCase();
    
    if (!word) return;

    try {
        const nextDate = await getNextAvailableDate();
        const response = await fetch(`${API_BASE_URL}/api/words`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                word: word,
                date: nextDate
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Could not add word');
        }
        
        wordInput.value = '';
        errorMessage.textContent = 'Word added successfully!';
        errorMessage.style.color = 'green';
        errorMessage.classList.add('visible');
        await loadWords();
        wordInput.focus();

        setTimeout(() => {
            errorMessage.classList.remove('visible');
        }, 3000);
    } catch (error) {
        console.error('Error adding word:', error);
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