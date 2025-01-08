const wordDisplay = document.getElementById('word-display');
const suggestForm = document.getElementById('suggest-form');
const suggestButton = document.getElementById('suggest-word-btn');
const suggestedWordInput = document.getElementById('suggested-word');

// Fetch dagens ord
async function fetchWord() {
    const response = await fetch('ordbank.json');
    const words = await response.json();
    const today = new Date().getDate();
    const word = words[today % words.length]; // Velger ord basert på dagens dato
    wordDisplay.textContent = word;
}

// Håndter forslag
suggestButton.addEventListener('click', () => {
    suggestForm.classList.toggle('hidden');
});

suggestForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newWord = suggestedWordInput.value.trim();
    if (newWord) {
        alert(`Takk for forslaget: "${newWord}"!`);
        suggestForm.reset();
        suggestForm.classList.add('hidden');
    }
});

// Last dagens ord
fetchWord();