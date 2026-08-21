import { fetchFromAPI } from './api.js';

const MAX_ATTEMPTS = 3;

export async function generateQuestion(subject, difficulty, topic = '', askedQuestions = []) {
    const difficultyContext = getDifficultyContext(difficulty);
    const topicContext = topic ? ` specifically about ${topic}` : '';

    let askedQuestionsContext = '';
    if (askedQuestions.length > 0) {
        askedQuestionsContext = ` Avoid generating questions about the following topics or questions similar to these:\n${askedQuestions.map(q => `- ${q}`).join('\n')}`;
    }

    const prompt = `Generate a ${difficulty.toLowerCase()} level multiple choice question about ${subject}${topicContext}. ${difficultyContext}${askedQuestionsContext}
        Respond with ONLY a single valid JSON object and nothing else. Do not add explanations, markdown, code fences or any text before or after the JSON.
        The JSON must match exactly this shape:
        {
            "question": "The question text here",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correctIndex": 0
        }
        where "correctIndex" is the 0-based index of the correct option.`;

    let lastErrorMessage = 'Unknown error.';
    let lastRaw = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await fetchFromAPI(prompt);

            // Check if response contains an error property
            if (response && typeof response === 'object' && response.error) {
                throw new Error(`API Error: ${JSON.stringify(response.error)}`);
            }

            const raw = typeof response === 'string' ? response : JSON.stringify(response ?? '');
            lastRaw = raw;

            const questionData = extractQuestionJSON(raw);
            if (questionData) {
                return questionData;
            }

            lastErrorMessage = raw && raw.trim()
                ? 'Could not find valid JSON in API response.'
                : 'The AI returned an empty response.';
            console.warn(`Question Generation attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastErrorMessage}`, raw);
        } catch (error) {
            lastErrorMessage = error && error.message ? error.message : String(error);
            console.warn(`Question Generation attempt ${attempt}/${MAX_ATTEMPTS} error:`, lastErrorMessage);

            // Don't waste retries on auth / key / quota problems – they won't fix themselves.
            if (/api key|no .* key is saved|401|403|invalid[_\s-]?api|unauthor|quota|billing|credit/i.test(lastErrorMessage)) {
                break;
            }
        }

        // Give the model a moment and try again (simple linear backoff).
        if (attempt < MAX_ATTEMPTS) {
            await sleep(700 * attempt);
        }
    }

    // Surface the real error so it can actually be debugged from the quiz screen.
    const rawSnippet = lastRaw && lastRaw.trim()
        ? ` | Response received: ${truncate(lastRaw.trim(), 300)}`
        : '';
    console.error('Question Generation Error (all attempts failed):', lastErrorMessage, lastRaw);
    return {
        question: `Failed to load question after ${MAX_ATTEMPTS} attempts. ${lastErrorMessage}${rawSnippet}`,
        options: ['Error', 'Error', 'Error', 'Error'],
        correctIndex: 0
    };
}

// Robustly pull a valid question object out of any AI text response.
// Handles markdown code fences, reasoning preambles and multiple JSON blocks.
function extractQuestionJSON(text) {
    if (!text || typeof text !== 'string') return null;

    let cleaned = text.trim();
    // Strip markdown code fences like ```json ... ``` while keeping the inner text.
    cleaned = cleaned.replace(/```json/gi, '```').split('```').join('').trim();

    const candidates = [];
    candidates.push(cleaned); // whole thing might already be pure JSON

    // Collect every balanced { ... } block so we can ignore reasoning noise.
    for (let i = 0; i < cleaned.length; i++) {
        if (cleaned[i] !== '{') continue;
        let depth = 0;
        for (let j = i; j < cleaned.length; j++) {
            if (cleaned[j] === '{') depth++;
            else if (cleaned[j] === '}') {
                depth--;
                if (depth === 0) {
                    candidates.push(cleaned.substring(i, j + 1));
                    break;
                }
            }
        }
    }

    for (const candidate of candidates) {
        const obj = tryParse(candidate);
        if (obj && typeof obj.question === 'string' && obj.question.trim()
            && Array.isArray(obj.options) && obj.options.length >= 2) {
            const options = obj.options.slice(0, 4).map(o => String(o));
            let correctIndex = Number(obj.correctIndex);
            if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
                correctIndex = 0;
            }
            return { question: obj.question.trim(), options, correctIndex };
        }
    }
    return null;
}

function tryParse(str) {
    try {
        return JSON.parse(str);
    } catch (_) {
        return null;
    }
}

function truncate(str, max) {
    return str.length > max ? `${str.slice(0, max)}…` : str;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getDifficultyContext(difficulty) {
    switch (difficulty) {
        case 'Easy':
            return 'Diverse non-clinical NEET PG questions ranging from simple recall, definitions, and surface-level facts to slightly deeper concepts, ensuring variety (non-repetitive) while testing broad coverage of fundamentals';
        case 'Medium':
            return 'Diverse NEET PG level questions covering both clinical and non-clinical topics, ensuring variety (non-repetitive) with a balance of case-based, applied, and concept-testing questions across multiple subjects for broad coverage';
        case 'Hard':
            return 'Diverse advanced NEET PG and INICET level clinical questions, ensuring variety (non-repetitive) with challenging, case-based, integrative, and multi-step reasoning questions that cover broad and complex topics across specialties';
        default:
            return '';
    }
}
