import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Ensure env vars are loaded if this file is imported before config runs elsewhere
dotenv.config(); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const generateSafetyReview = async (startCoords, endCoords) => {
    const prompt = `
        I am planning a road trip.
        Start Coordinates: ${startCoords}
        End Coordinates: ${endCoords}
        
        Please provide a short "Safety Review" for a trip between these two rough locations. 
        Assumption: Assume typical weather for this region.
        Include:
        1. A safety rating (Low/Medium/High Risk).
        2. Any major terrain challenges (mountains, deserts, etc).
        3. A fun fact about the destination area.
        Keep it under 100 words.
        Do NOT use bullet points, numbered lists, bold text for emphasis, italics, or headers/titles (H1, H2, etc.).
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Service Error:", error);
        throw new Error("Failed to generate AI content");
    }
};