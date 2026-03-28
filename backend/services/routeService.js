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

    const routeResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`); //Route generation

        if (!routeResponse.ok) {
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