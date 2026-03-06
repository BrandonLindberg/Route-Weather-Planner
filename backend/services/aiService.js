import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import getWeather from './weatherService.js'; 

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const parseCoords = (coordString) => {
    const [lat, lng] = coordString.split(',').map(num => parseFloat(num.trim()));
    return { lat, lng };
};

const formatWeather = (data) => {
    if (data && data.main && data.weather && data.weather[0]) {
        // Added the time to the format helper
        const time = new Date(data.eta_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${data.main.temp}°F, ${data.weather[0].description} (at ${time})`;
    }
    return "Data unavailable";
};

// ADDED: etasArr parameter to match your UI implementation
export const generateSafetyReview = async (startCoordsStr, endCoordsStr, midCoordsArr = [], etasArr = []) => {
    
    const cleanedMidCoords = [...new Set(midCoordsArr)].filter(
        coord => coord !== startCoordsStr && coord !== endCoordsStr
    );

    try {
        const startObj = parseCoords(startCoordsStr);
        const endObj = parseCoords(endCoordsStr);
        const allPoints = [startObj];
        
        // Handle coordinates and ETAs logic
        if (cleanedMidCoords.length > 0) {
            cleanedMidCoords.forEach(c => allPoints.push(parseCoords(c)));
        } else {
            allPoints.push({
                lat: (startObj.lat + endObj.lat) / 2,
                lng: (startObj.lng + endObj.lng) / 2
            });
        }
        allPoints.push(endObj);

        // FALLBACK: If etasArr isn't provided, we create a dummy timeline (Current Time + 2 hours per stop)
        // Ideally, you should pass the real ETAs from your routing engine here.
        let finalEtas = etasArr;
        if (finalEtas.length === 0) {
            const now = Math.floor(Date.now() / 1000);
            finalEtas = allPoints.map((_, i) => now + (i * 7200)); 
        }

        let weatherData = [];
        try {
            // FIXED: Now passing both points and the corresponding ETAs
            weatherData = await getWeather(allPoints, finalEtas);
        } catch (error) {
            console.error("Weather fetch failed:", error);
            weatherData = new Array(allPoints.length).fill(null);
        }

        const startWeatherInfo = formatWeather(weatherData[0]);
        const endWeatherInfo = formatWeather(weatherData[weatherData.length - 1]);
        
        let midpointsPromptText = "";
        for (let i = 1; i < weatherData.length - 1; i++) {
            const weatherInfo = formatWeather(weatherData[i]);
            midpointsPromptText += `* Waypoint ${i} Weather: ${weatherInfo}\n`;
        }

        const prompt = `
            I am planning a road trip. The weather data provided below is PREDICTIVE based on my estimated arrival time (ETA) at each location.
            
            **Trip Timeline & Weather:**
            * Start Location: ${startCoordsStr}
            * Start Weather: ${startWeatherInfo}
            ${midpointsPromptText.trim()}
            * Destination: ${endCoordsStr}
            * Destination Weather: ${endWeatherInfo}
            
            Please provide a short "Safety Review" for this trip. 
            Crucially, analyze how conditions might change over time (e.g., "Starting in clear sun but arriving during a predicted evening thunderstorm").
            
            Include:
            1. Safety concerns based on the ETA-specific weather.
            2. Terrain challenges combined with the forecasted conditions.
            
            Keep it under 100 words.
            Do NOT use bullet points, numbered lists, bold text, italics, or headers.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("AI Service Error:", error);
        throw new Error("Failed to generate AI content");
    }
};