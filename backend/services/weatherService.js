async function getWeather(coords) {
    return Promise.all(coords.map(async (c) => {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${c.lat}&lon=${c.lng}&units=imperial&exclude=minutely&appid=${process.env.OPENWEATHER_API_KEY}`); // Fetch weather
        return response.json();
    }));
}

export default getWeather;