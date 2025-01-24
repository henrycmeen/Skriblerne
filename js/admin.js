document.addEventListener('DOMContentLoaded', () => {
    loadWords();
    
    // Add Enter key support
    document.getElementById('newWord').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addWord();
        }
    });
});

function createWordElement(word, date) {
    const wordElement = document.createElement('div');
    wordElement.className = 'word-item';
    const dateStr = new Date(date).toLocaleDateString('no-NO');
    wordElement.textContent = `${dateStr}: ${word}`;
    
    // Add click handler for editing
    wordElement.addEventListener('click', () => {
        const newWord = prompt('Endre ord:', word);
        if (newWord && newWord.trim() !== word) {
            updateWord(word, newWord.trim().toUpperCase());
        }
    });
    
    return wordElement;
}

async function updateWord(oldWord, newWord) {
    try {
        const response = await fetch('/api/word/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                oldWord: oldWord,
                newWord: newWord 
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Could not update word');
        }

        await loadWords(); // Refresh the list
    } catch (error) {
        console.error('Error updating word:', error);
        alert('Kunne ikke oppdatere ordet: ' + error.message);
    }
}

// Update loadWords function to use createWordElement
async function loadWords() {
    try {
        const response = await fetch('/api/words');
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
        const response = await fetch('/api/word', {
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
        
        const result = await response.json();
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