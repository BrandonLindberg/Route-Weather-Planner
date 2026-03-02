async function getRoute(coords) {
    const coordString = coords.map(c => `${c.lng},${c.lat}`).join(';');

    const routeResponse = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`); //Route generation

        if (!routeResponse.ok) {
            const text = await routeResponse.text();
            console.error('OSRM error:', text);

            throw new Error(`Routing failed: ${text}`); 
        }

    const routeData = await routeResponse.json();

    return routeData.routes[0]
}

export default getRoute;