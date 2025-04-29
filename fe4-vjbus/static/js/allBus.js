// map-tracking.js - Bus location tracking map module

// Global variables
let map;
let markers = {};
const socket = io("wss://bus.vnrzone.site", { transports: ["websocket"] });
const fixedLatLng = [17.539896, 78.386511];

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Initialize map
    initializeMap();
    
    // Add fixed marker (flag)
    addFixedMarker();
    
    // Initialize socket listeners
    initializeSocketListeners();
});

/**
 * Initialize the map with tile layer
 */
function initializeMap() {
    // Create map centered on VNR
    map = L.map("map").setView([17.540529, 78.387034], 13);
    
    // Add OpenStreetMap tile layer with optimization options
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        updateWhenZooming: false,
        useCache: true,
        updateWhenIdle: true
    }).addTo(map);
}

/**
 * Add fixed marker (flag) to the map
 */
function addFixedMarker() {
    // Create a custom DivIcon with a flag emoji
    const emojiIcon = L.divIcon({
        className: 'emoji-marker',
        html: '<div style="font-size: 25px;">🏁</div>',
        iconSize: [50, 50],
        iconAnchor: [15, 15]
    });
    
    // Add the marker with the emoji flag at fixed location
    L.marker(fixedLatLng, { icon: emojiIcon }).addTo(map);
}

/**
 * Initialize socket event listeners
 */
function initializeSocketListeners() {
    // Listen for location update events
    socket.on("location_update", handleLocationUpdate);
}

/**
 * Handle location update from socket
 * @param {Object} data - Location data from socket
 */
function handleLocationUpdate(data) {
    const routeId = data.route_id;
    
    if (!data.latitude || !data.longitude) {
        return; // Skip if no valid coordinates
    }
    
    if (data.status === "tracking_active") {
        updateOrCreateMarker(routeId, data.latitude, data.longitude);
    } else if (data.status === "stopped") {
        removeMarker(routeId);
    }
}

/**
 * Update existing marker or create a new one
 * @param {string} routeId - Route identifier
 * @param {number} latitude - Marker latitude
 * @param {number} longitude - Marker longitude
 */
function updateOrCreateMarker(routeId, latitude, longitude) {
    const coordinates = [latitude, longitude];
    const routeLabel = routeId.split(" ")[0]; // Extract just the route number
    
    if (!markers[routeId]) {
        // Create new marker with permanent tooltip
        markers[routeId] = L.marker(coordinates)
            .addTo(map)
            .bindTooltip(routeLabel, { 
                permanent: true, 
                direction: 'top' 
            });
    } else {
        // Update existing marker position
        markers[routeId].setLatLng(coordinates);
    }
}

/**
 * Remove marker from map
 * @param {string} routeId - Route identifier
 */
function removeMarker(routeId) {
    if (markers[routeId]) {
        map.removeLayer(markers[routeId]);
        delete markers[routeId]; // Clean up reference
    }
}