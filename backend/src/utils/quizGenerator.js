// Using Groq API instead of Hugging Face
const axios = require('axios');
require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function generateQuiz(rawText) {
    try {
        if (!GROQ_API_KEY) {
            throw new Error('GROQ_API_KEY not found in environment variables');
        }

        // Truncate text if too long
        const maxTextLength = 1500;
        const text = rawText.length > maxTextLength ? 
            rawText.substring(0, maxTextLength) + "..." : rawText;

        console.log('Generating quiz with Groq API...');
        console.log('Text length:', text.length);

        const prompt = `Based on the following text, create exactly 5 multiple choice questions in JSON format. Each question should test understanding of the key concepts in the text.

Text: "${text}"

IMPORTANT RULES:
1. The "answer" field MUST be exactly one of the options from the "options" array
2. Each question should have exactly 4 options
3. Make questions specific to the content provided
4. Return ONLY valid JSON, no other text

Example format:
[
  {
    "question": "What is machine learning according to the text?",
    "options": ["A subset of AI", "A type of hardware", "A programming language", "A database system"],
    "answer": "A subset of AI"
  }
]

Generate the JSON now:`;

        const response = await axios.post(GROQ_API_URL, {
            model: "llama3-8b-8192", // Fast Llama model
            messages: [
                {
                    role: "system",
                    content: "You are a quiz generator. Return only valid JSON arrays containing quiz questions. Do not include any explanations or additional text."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 800,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Groq API response received');
        
        const generatedText = response.data.choices[0].message.content.trim();
        console.log('Generated text:', generatedText);

        // Extract JSON from the response
        const jsonMatch = extractJSON(generatedText);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response');
        }

        console.log('Extracted JSON:', jsonMatch);
        
        const quiz = JSON.parse(jsonMatch);
        
        // Validate the quiz
        validateQuiz(quiz);
        
        console.log(`Successfully generated ${quiz.length} questions`);
        return quiz;

    } catch (error) {
        console.error('Quiz generation error:', error.message);
        if (error.response) {
            console.error('API Error:', error.response.data);
        }
        throw new Error(`Failed to generate quiz: ${error.message}`);
    }
}

function extractJSON(text) {
    // Clean the text first
    text = text.trim();
    
    // Remove markdown code blocks if present
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Try to find JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            JSON.parse(arrayMatch[0]);
            return arrayMatch[0];
        } catch (e) {
            console.log('Failed to parse extracted JSON:', e.message);
        }
    }
    
    // If the entire text looks like JSON, try that
    if (text.startsWith('[') && text.endsWith(']')) {
        try {
            JSON.parse(text);
            return text;
        } catch (e) {
            console.log('Failed to parse full text as JSON:', e.message);
        }
    }
    
    return null;
}

function validateQuiz(quiz) {
    if (!Array.isArray(quiz)) {
        throw new Error('Quiz must be an array');
    }
    
    if (quiz.length === 0) {
        throw new Error('Quiz array cannot be empty');
    }
    
    quiz.forEach((question, index) => {
        if (!question.question || typeof question.question !== 'string') {
            throw new Error(`Question ${index + 1}: Missing or invalid question text`);
        }
        
        if (!Array.isArray(question.options) || question.options.length < 2) {
            throw new Error(`Question ${index + 1}: Must have at least 2 options`);
        }
        
        if (!question.answer || typeof question.answer !== 'string') {
            throw new Error(`Question ${index + 1}: Missing or invalid answer`);
        }
        
        // Check if answer exists in options (flexible matching)
        const answerFound = question.options.some(option => 
            option.toLowerCase().trim() === question.answer.toLowerCase().trim() ||
            option.includes(question.answer) ||
            question.answer.includes(option)
        );
        
        if (!answerFound) {
            console.warn(`Question ${index + 1}: Answer "${question.answer}" not found in options:`, question.options);
            // Auto-fix: use the first option as answer
            question.answer = question.options[0];
            console.log(`Auto-fixed: Set answer to "${question.answer}"`);
        }
    });
}

module.exports = { generateQuiz };