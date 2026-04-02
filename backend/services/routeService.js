const EXTERNAL_REQUEST_TIMEOUT_MS = 20000;
const OSRM_BASE_URL = `http://${process.env.OSRM_ROUTER_IP}:5000`;
const MAX_TIMEOUT_RETRIES = 1;

async function fetchWithTimeout(url, options = {}, timeoutMs = EXTERNAL_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } catch (error) {
        if (error?.name === 'AbortError') {
            const timeoutError = new Error('Public OSRM routing service timed out while generating your trip. Please retry in a moment.');
            timeoutError.status = 504;
            throw timeoutError;
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function getRoute(coords) {
    if (!Array.isArray(coords) || coords.length < 2) {
        const err = new Error("At least two valid locations are required to build a route.");
        err.status = 400;
        throw err;
    }

    const hasInvalidCoord = coords.some((c) => !c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng));
    if (hasInvalidCoord) {
        const err = new Error("Invalid coordinates supplied for route generation.");
        err.status = 400;
        throw err;
    }

    const coordString = coords.map(c => `${c.lng},${c.lat}`).join(';');
    const routeUrl = `${OSRM_BASE_URL}/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

    let routeResponse;
    let attempts = 0;

    while (attempts <= MAX_TIMEOUT_RETRIES) {
        try {
            routeResponse = await fetchWithTimeout(routeUrl); //Route generation
            break;
        } catch (error) {
            const isTimeout = Number.isInteger(error?.status) && error.status === 504;
            if (!isTimeout || attempts >= MAX_TIMEOUT_RETRIES) {
                throw error;
            }

            attempts += 1;
            console.warn(`OSRM request timed out. Retrying (${attempts}/${MAX_TIMEOUT_RETRIES})...`);
        }
    }

    if (!routeResponse?.ok) {
        const text = await routeResponse.text();
        console.error('OSRM error:', text);

        const err = new Error(`Routing failed: ${text}`);
        err.status = 502;
        throw err;
    }

    const routeData = await routeResponse.json();

    if (!Array.isArray(routeData?.routes) || routeData.routes.length === 0) {
        const err = new Error("No drivable route found between selected points.");
        err.status = 400;
        throw err;
    }

    return routeData.routes[0]
}

export default getRoute;