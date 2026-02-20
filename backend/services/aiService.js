import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import getWeather from './weatherService.js'; 

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Helper to convert "lat, lng" string to {lat, lng} object
const parseCoords = (coordString) => {
    const [lat, lng] = coordString.split(',').map(num => parseFloat(num.trim()));
    return { lat, lng };
};

// Helper to format weather data safely
const formatWeather = (data) => {
    if (data && data.main && data.weather && data.weather[0]) {
        return `${data.main.temp}°F, ${data.weather[0].description}`;
    }
    return "Data unavailable";
};

export const generateSafetyReview = async (startCoordsStr, endCoordsStr, midCoordsArr = []) => {
    
    // Clean the midCoords array: remove duplicates and exclude start/end if they somehow got included
    const cleanedMidCoords = [...new Set(midCoordsArr)].filter(
        coord => coord !== startCoordsStr && coord !== endCoordsStr
    );

    try {
        const startObj = parseCoords(startCoordsStr);
        const endObj = parseCoords(endCoordsStr);
        
        let midObjs = [];
        let midCoordsStrings = [];

        if (cleanedMidCoords.length > 0) {
            midObjs = cleanedMidCoords.map(coordStr => parseCoords(coordStr));
            midCoordsStrings = cleanedMidCoords;
        } else {
            // Fallback: mathematical midpoint
            const midObj = {
                lat: (startObj.lat + endObj.lat) / 2,
                lng: (startObj.lng + endObj.lng) / 2
            };
            midObjs = [midObj];
            midCoordsStrings = [`${midObj.lat.toFixed(4)}, ${midObj.lng.toFixed(4)}`];
        }

        // Combine all points into one array for the weather service
        const allPoints = [startObj, ...midObjs, endObj];
        
        let weatherData = [];
        try {
            // Fetch weather for all points at once
            weatherData = await getWeather(allPoints);
        } catch (error) {
            console.error("Weather fetch failed, proceeding with generic AI review:", error);
            weatherData = new Array(allPoints.length).fill(null);
        }

        const startWeatherInfo = formatWeather(weatherData[0]);
        const endWeatherInfo = formatWeather(weatherData[weatherData.length - 1]);
        
        // Dynamically build the midpoint text for the prompt
        let midpointsPromptText = "";
        for (let i = 0; i < midObjs.length; i++) {
            const weatherInfo = formatWeather(weatherData[i + 1]); // +1 because start is index 0
            midpointsPromptText += `* Midpoint ${i + 1} Location: ${midCoordsStrings[i]}\n`;
            midpointsPromptText += `* Midpoint ${i + 1} Weather: ${weatherInfo}\n`;
        }
        console.log("Generating review with:", { startCoordsStr, startWeatherInfo, endCoordsStr, endWeatherInfo, midpointsPromptText });

        // Construct the Context-Aware Prompt
        const prompt = `
            I am planning a road trip.
            
            **Trip Details:**
            * Start Location: ${startCoordsStr}
            * Start Weather: ${startWeatherInfo}
            ${midpointsPromptText.trim()}
            * End Location: ${endCoordsStr}
            * End Weather: ${endWeatherInfo}
            
            Please provide a short "Safety Review" for a trip between these locations, **taking the specific current weather into account**.
            
            Include:
            1. The temperature and weather conditions at the start, end, and any midpoints.
            2. Any weather-related safety concerns for the trip (e.g., "Heavy rain could lead to slippery roads" or "High temperatures may cause overheating").
            3. Any major terrain challenges combined with weather (e.g., "Slippery mountain passes" or "Heat risk in desert").
            
            Keep it under 100 words.
            Do NOT use bullet points, numbered lists, bold text for emphasis, italics, or headers/titles.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("AI Service Error:", error);
        throw new Error("Failed to generate AI content");
    }
};