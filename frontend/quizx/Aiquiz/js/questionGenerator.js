import { fetchFromAPI } from './api.js';

export async function generateQuestion(subject, difficulty, topic = '', askedQuestions = []) {
    const difficultyContext = getDifficultyContext(difficulty);
    const topicContext = topic ? ` specifically about ${topic}` : '';

    let askedQuestionsContext = '';
    if (askedQuestions.length > 0) {
        askedQuestionsContext = ` Avoid generating questions about the following topics or questions similar to these:\n${askedQuestions.map(q => `- ${q}`).join('\n')}`;
    }

    const prompt = `Generate a ${difficulty.toLowerCase()} level multiple choice question about ${subject}${topicContext}. ${difficultyContext}${askedQuestionsContext}
        Format the response exactly as follows:
        {
            "question": "The question text here",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "correctIndex": correct_option_index_here
        }`;

    try {
        const response = await fetchFromAPI(prompt);

        // Check if response contains an error property
        if (response && typeof response === 'object' && response.error) {
            throw new Error(`API Error: ${JSON.stringify(response.error)}`);
        }

        // Attempt to extract the JSON string from the response
        const jsonStartIndex = response.indexOf('{');
        const jsonEndIndex = response.lastIndexOf('}');
        let jsonString = response;
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
            jsonString = response.substring(jsonStartIndex, jsonEndIndex + 1);
        } else {
            throw new Error("Could not find valid JSON in API response.");
        }
        const questionData = JSON.parse(jsonString);
        return questionData;
    } catch (error) {
        console.error('Question Generation Error:', error);
        return {
            question: `Failed to load question. API Error: ${error.message}`,
            options: ['Error', 'Error', 'Error', 'Error'],
            correctIndex: 0
        };
    }
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
