async function geocodeName(name) {
    const query = `${name || ''}`.trim();

    if (!query) {
        const err = new Error("Location name is required for geocoding.");
        err.status = 400;
        throw err;
    }

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
        {
            headers: {
                'User-Agent': 'SkyRoute/1.0 (Route Weather Planner)',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        }
    ); //Geocoding

    if (!response.ok) {
        const err = new Error(`Could not geocode location: ${query}`);
        err.status = 502;
        throw err;
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
        const err = new Error(`No geocoding results found for: ${query}`);
        err.status = 400;
        throw err;
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const err = new Error(`Invalid geocoding result for: ${query}`);
        err.status = 502;
        throw err;
    }

    return {
        lat,
        lng
    };
}

export default geocodeName;