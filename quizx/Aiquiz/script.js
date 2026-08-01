import { QuizUI } from './js/ui.js';
import { updateAPIKey, getGroqAPIKey } from './js/config.js';

// Utility function for custom popup
function showPopup(message) {
    const popup = document.getElementById('custom-popup');
    const popupMessage = document.getElementById('popup-message');
    popupMessage.textContent = message;
    popup.classList.remove('hidden');

    const closeBtn = document.getElementById('popup-close');
    closeBtn.onclick = () => {
        popup.classList.add('hidden');
    };
}

// Initialize the quiz application
document.addEventListener('DOMContentLoaded', () => {
    const quizUI = new QuizUI();

    // Handle API key setup
    const saveApiKeysBtn = document.getElementById('save-api-keys');
    const groqApiKeyInput = document.getElementById('groq-api-key');

    // Load saved API key on page load
    const savedGroqKey = getGroqAPIKey();
    if (groqApiKeyInput && savedGroqKey) {
        groqApiKeyInput.value = savedGroqKey;
    }

    if (saveApiKeysBtn) {
        saveApiKeysBtn.addEventListener('click', () => {
            const groqKey = groqApiKeyInput.value.trim();

            if (groqKey) {
                updateAPIKey(groqKey);
                showPopup('Groq API key saved successfully!');
            } else {
                showPopup('Please enter your Groq API key.');
            }
        });
    }
});
