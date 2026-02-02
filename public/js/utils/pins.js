import L from 'https://esm.sh/leaflet@1.9.4';

export function addPin(e, map, markers) {
    // gets lat, lng, and crds from double click.
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    const crds = [lat, lng];

    // creates and adds marker obj to markers array and adds pin to map (up to 5)
    if (markers.length < 5) {
        const markerObj = {};
        const marker = L.marker(crds);
        markerObj.marker = marker;
        markerObj.crds = crds;
        
        markers.push(markerObj);
        markerObj.marker.addTo(map);
    }
}

export function clearAllPins(markers, pointsUI, weatherPoints, map, routePath) {
    markers.forEach(m => m.marker.remove());
    markers = [];
    pointsUI.forEach(p => p.remove());
    pointsUI = [];
    weatherPoints.forEach(w => w.innerText = '');

    if (routePath) {
        map.removeControl(routePath);
        routePath = null;
    }
}