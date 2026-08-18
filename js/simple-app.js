import { API_BASE_URL } from './config.js';

const EDIT_CODE_HEADER = 'x-skriblerne-edit-code';
const EDIT_CODE_STORAGE_KEY = 'skriblerne-edit-code';
const elements = {
    addWordForm: document.getElementById('addWordForm'),
    cancelEditCodeButton: document.getElementById('cancelEditCodeButton'),
    editCodeDialog: document.getElementById('editCodeDialog'),
    editCodeForm: document.getElementById('editCodeForm'),
    editCodeInput: document.getElementById('editCodeInput'),
    editCodeMessage: document.getElementById('editCodeMessage'),
    newWord: document.getElementById('newWord'),
    statusMessage: document.getElementById('statusMessage'),
    wordDisplay: document.getElementById('word-display'),
    wordsContainer: document.getElementById('words-container')
};

let pendingWord = '';

async function fetchJson(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        cache: 'no-store',
        ...options
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(payload.error || 'Noe gikk galt.');
        error.status = response.status;
        throw error;
    }

    return payload;
}

function setStatus(message = '', tone = 'neutral') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.dataset.tone = tone;
}

function wordDay(word) {
    return Number(word.dayOfYear) || Number.MAX_SAFE_INTEGER;
}

function renderWords(words) {
    elements.wordsContainer.replaceChildren();

    words
        .filter((word) => word.word?.trim())
        .sort((a, b) => wordDay(a) - wordDay(b))
        .forEach((word) => {
            const item = document.createElement('li');
            const label = document.createElement('span');
            item.dataset.day = String(word.dayOfYear);
            label.textContent = word.word;
            item.appendChild(label);
            elements.wordsContainer.appendChild(item);
        });
}

async function loadPage() {
    const [todayResult, wordsResult] = await Promise.allSettled([
        fetchJson('/api/word/today'),
        fetchJson('/api/words')
    ]);

    elements.wordDisplay.textContent = todayResult.status === 'fulfilled'
        ? todayResult.value.word
        : '—';

    if (wordsResult.status === 'fulfilled') {
        renderWords(wordsResult.value);
    } else {
        setStatus('Kunne ikke hente ordene.', 'error');
    }
}

function openCodeDialog(message = '') {
    elements.editCodeMessage.textContent = message;
    elements.editCodeInput.value = '';
    elements.editCodeDialog.showModal();
    elements.editCodeInput.focus();
}

async function saveWord(word, editCode) {
    try {
        const savedWord = await fetchJson('/api/words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                [EDIT_CODE_HEADER]: editCode
            },
            body: JSON.stringify({ word })
        });

        localStorage.setItem(EDIT_CODE_STORAGE_KEY, editCode);
        elements.newWord.value = '';
        setStatus(`${savedWord.word} er lagt til.`);
        await loadPage();
        elements.newWord.focus();
    } catch (error) {
        if (error.status === 401) {
            localStorage.removeItem(EDIT_CODE_STORAGE_KEY);
            pendingWord = word;
            openCodeDialog('Feil kode.');
            return;
        }

        setStatus(error.message, 'error');
    }
}

elements.addWordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    pendingWord = elements.newWord.value.trim();
    if (!pendingWord) {
        return;
    }

    const editCode = localStorage.getItem(EDIT_CODE_STORAGE_KEY);
    if (!editCode) {
        openCodeDialog();
        return;
    }

    await saveWord(pendingWord, editCode);
});

elements.editCodeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const editCode = elements.editCodeInput.value;
    if (!editCode) {
        return;
    }

    elements.editCodeDialog.close();
    await saveWord(pendingWord, editCode);
});

elements.cancelEditCodeButton.addEventListener('click', () => {
    elements.editCodeDialog.close();
    elements.newWord.focus();
});

loadPage();
