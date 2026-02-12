import geocodeName from "./geocodeService.js";

async function normalizeLocations(locations) {
    return Promise.all(locations.map(async (loc) => {
        if (loc.type === "coords") {
            return { lat: loc.lat, lng: loc.lng };
        }

        if (loc.type === "name") {
            return geocodeName(loc.value);
        };
    }));
}

export default normalizeLocations;