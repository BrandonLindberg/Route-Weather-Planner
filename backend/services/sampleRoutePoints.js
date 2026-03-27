/**
 * Samples N evenly-spaced points from a GeoJSON LineString coordinate array.
 * Also interpolates an ETA for each sampled point based on its position
 * along the route as a fraction of total points.
 *
 * @param {Array} coordinates - Array of [lng, lat] from OSRM GeoJSON
 * @param {number[]} etas - Array of ETA timestamps for each user waypoint
 * @param {number} numSamples - How many points to sample (including start/end)
 * @returns {{ coords: {lat, lng}[], etas: number[] }}
 */
function sampleRoutePoints(coordinates, etas, numSamples) {
    const total = coordinates.length;
    if (total === 0) return { coords: [], etas: [] };

    if (numSamples <= 0) return { coords: [], etas: [] };

    const sampledCoords = [];
    const sampledEtas = [];

    const startEta = etas[0];
    const endEta = etas[etas.length - 1];

    if (numSamples === 1) {
        const [lng, lat] = coordinates[0];
        return {
            coords: [{ lat, lng }],
            etas: [startEta]
        };
    }

    const lastCoordinateIndex = total - 1;

    for (let i = 0; i < numSamples; i++) {
        const fraction = i / (numSamples - 1);

        let index;
        if (i === 0) {
            index = 0;
        } else if (i === numSamples - 1) {
            index = lastCoordinateIndex;
        } else {
            index = Math.round(fraction * lastCoordinateIndex);
        }

        const [lng, lat] = coordinates[index];

        sampledCoords.push({ lat, lng });

        const interpolatedEta = Math.round(startEta + fraction * (endEta - startEta));
        sampledEtas.push(interpolatedEta);
    }

    return { coords: sampledCoords, etas: sampledEtas };
}

export default sampleRoutePoints;