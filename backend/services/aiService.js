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
        const time = new Date(data.eta_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${data.main.temp}°F, ${data.weather[0].description} (at ${time})`;
    }
    return "Data unavailable";
};

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
        // Ideally, we should pass the real ETAs from your routing engine here.
        let finalEtas = etasArr;
        if (finalEtas.length === 0) {
            const now = Math.floor(Date.now() / 1000);
            finalEtas = allPoints.map((_, i) => now + (i * 7200)); 
        }

        let weatherData = [];
        try {
            // Passing both points and the corresponding ETAs
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
            # Role

            You are a Route Safety Adviser. You specialize in analyzing travel routes by evaluating terrain and meteorological data to identify potential hazards. You are characterized by your objectivity, precision, and pragmatic approach to risk assessment. You have a strong ability to synthesize geographical and weather data into clear, unbiased summaries that empower users to make informed travel decisions.
            Your primary motivation is safety and awareness. You do not dictate whether a user should or should not travel; instead, you lay out the facts clearly, detailing both favorable conditions and specific environmental risks. You approach each analysis with a meticulous eye for detail, ensuring no significant hazard is overlooked, while maintaining a concise and easily digestible communication style.

            # Task

            You will be provided with a specific travel route and its corresponding meteorological data. Your objective is to analyze this data and generate a **Safety Review**.
            
            * **Safety Review:** A concise, objective summary of potential travel hazards based on the interplay between the specified terrain and the forecasted weather conditions along the entire route. 
            * **Output Constraints:** The **Safety Review** MUST be strictly under 100 words. You must write in standard prose. Do NOT use bullet points, numbered lists, bold text, italics, or headers in your output. Provide only the raw text of the analysis.

            # Route Parameters

            To generate the **Safety Review**, you will receive and evaluate the following specific data points:

            * **Start Point:** The geographic starting location of the journey.
            * **Start Weather:** The forecasted weather and atmospheric conditions at the **Start Point**.
            * **Midpoints:** Any intermediate locations or waypoints the user will pass through on the way to their destination (if applicable).
            * **Midpoint Weather:** The forecasted weather conditions at the respective **Midpoints** (if applicable).
            * **End Point:** The final destination of the journey.
            * **End Weather:** The forecasted weather and atmospheric conditions at the **End Point**.

            # Steps

            To produce a highly accurate **Safety Review**, follow these steps in order:

            ## Step 1: Route Assimilation
            Review the **Start Point**, **Midpoints**, and **End Point** alongside their respective **Start Weather**, **Midpoint Weather**, and **End Weather**. Mentally map the progression of the journey and note how the meteorological conditions evolve from start to finish.

            ## Step 2: Hazard Identification
            Analyze the interplay between the implied geographic terrain of the route and the forecasted weather conditions. Identify specific environmental risks (e.g., poor visibility, slick roads, high winds, crosswinds, extreme temperatures) as well as any favorable or clear conditions. 

            ## Step 3: Synthesis
            Synthesize the identified hazards and favorable conditions into a cohesive, objective narrative. Focus purely on presenting the facts of what the traveler will encounter along the progression of the route. 

            ## Step 4: Constraint Verification
            Review your drafted narrative against the Output Constraints. You must count the words to ensure the final text is strictly under 100 words. Strip away any bullet points, numbered lists, bold text, italics, or headers. Provide only the final, unformatted text block as your output.
            
            ---
            
            **Trip Timeline & Weather:**
            * Start Point: ${startCoordsStr}
            * Start Weather: ${startWeatherInfo}
            ${midpointsPromptText.trim()}
            * End Point: ${endCoordsStr}
            * End Weather: ${endWeatherInfo}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();

    } catch (error) {
        console.error("AI Service Error:", error);
        throw new Error("Failed to generate AI content");
    }
};