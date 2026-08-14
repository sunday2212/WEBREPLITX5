import { getAPIUrl, getGroqAPIKey } from './config.js';

export async function fetchFromAPI(prompt) {
    const apiUrl = getAPIUrl();
    const apiKey = getGroqAPIKey();
    
    if (!apiKey) {
        throw new Error('Groq API key not found. Please set your API key first.');
    }
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.9,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
