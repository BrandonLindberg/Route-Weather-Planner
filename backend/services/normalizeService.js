import geocodeName from "./geocodeService.js";

async function normalizeLocations(locations) {
    return Promise.all(locations.map(async (loc) => {
        if (loc.type === "coords") {
            if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
                const err = new Error("Invalid coordinate values in locations array.");
                err.status = 400;
                throw err;
            }

            return { lat: loc.lat, lng: loc.lng };
        }

        if (loc.type === "name") {
            return geocodeName(loc.value);
        }

        const err = new Error("Invalid location type. Expected 'coords' or 'name'.");
        err.status = 400;
        throw err;
    }));
}

export default normalizeLocations;