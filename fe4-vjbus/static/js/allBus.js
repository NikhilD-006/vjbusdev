
// Global variables
let map;
let markers = {};
// Match the WebSocket URL with your simulator and server
const socket = io("wss://bus.vnrzone.site", {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});
const fixedLatLng = [17.539896, 78.386511];

// Custom bus icon
const busIcon = L.divIcon({
    className: 'bus-marker',
    html: '<div style="font-size: 25px;">🚌</div>',
    iconSize: [50, 50],
    iconAnchor: [25, 25]
});

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    console.log("Initializing all bus tracking map...");
    // Initialize map
    initializeMap();
    
    // Add fixed marker (flag)
    addFixedMarker();
    
    // Initialize socket listeners
    initializeSocketListeners();
    
    // Request to subscribe to all routes
    subscribeToAllRoutes();
});

/**
 * Initialize the map with tile layer
 */
function initializeMap() {
    map = L.map('map', {
        center: fixedLatLng,
        zoom: 13,
        attributionControl: false  // Disable default attribution control
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "",  // Prevent Leaflet from auto-adding OSM attribution
        updateWhenZooming: false,
        updateWhenIdle: true,
        reuseTiles: true
    }).addTo(map);

    // Custom attribution control without "Leaflet" prefix
    L.control.attribution({
        position: 'bottomright',
        prefix: false  // <- this removes "Leaflet"
    }).addTo(map);

    // Add your own attribution text
    map.attributionControl.addAttribution('VJ Bus | Map data © OpenStreetMap contributors');
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
 * Subscribe to all available routes
 */
function subscribeToAllRoutes() {
    fetch("https://bus.vnrzone.site/bus-be/get_all_routes")
        .then(response => response.json())
        .then(routes => {
            console.log("Available routes:", routes);
            routes.forEach(route => {
                socket.emit("subscribe", route);
                console.log(`Subscribed to route: ${route}`);
            });
        })
        .catch(error => {
            console.error("Error fetching routes:", error);
        });
}

/**
 * Initialize socket event listeners
 */
function initializeSocketListeners() {
    // Log connection status
    socket.on("connect", () => {
        console.log("Connected to WebSocket server");
        // Request active connections when connected
        fetchActiveConnections();
    });

    socket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
    });

    socket.on("disconnect", () => {
        console.log("Disconnected from WebSocket server");
    });

    // Listen for location update events
    socket.on("location_update", handleLocationUpdate);
    
    // Handle subscription confirmations
    socket.on("subscribed", (route) => {
        console.log(`Successfully subscribed to ${route}`);
    });
}

/**
 * Fetch current active connections
 */
function fetchActiveConnections() {
    fetch("https://bus.vnrzone.site/bus-be/get_all_locations")
        .then(response => response.json())
        .then(activeRoutes => {
            console.log("Active routes:", activeRoutes);
            activeRoutes.forEach(route => {
                if (route.latitude && route.longitude && route.status === "tracking_active") {
                    updateOrCreateMarker(route.route_id, route.latitude, route.longitude);
                }
            });
        })
        .catch(error => {
            console.error("Error fetching active connections:", error);
        });
}

/**
 * Handle location update from socket
 * @param {Object} data - Location data from socket
 */
function handleLocationUpdate(data) {
    console.log("Received location_update:", data);
    
    const routeId = data.route_id;
    if (!routeId) {
        console.error("Missing route_id in location_update");
        return;
    }
    
    if (data.status === "tracking_active" && data.latitude && data.longitude && 
        !isNaN(data.latitude) && !isNaN(data.longitude)) {
        updateOrCreateMarker(routeId, data.latitude, data.longitude);
    } else if (data.status === "stopped") {
        removeMarker(routeId);
    } else {
        console.warn(`Invalid or incomplete data for ${routeId}:`, data);
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
        // Create new marker with bus icon and permanent tooltip
        markers[routeId] = L.marker(coordinates, { icon: busIcon })
            .addTo(map)
            .bindTooltip(routeLabel, { 
                permanent: true, 
                direction: 'top',
                className: 'route-tooltip'
            });
        console.log(`Created marker for ${routeId} at [${latitude}, ${longitude}]`);
    } else {
        // Update existing marker position
        markers[routeId].setLatLng(coordinates);
        console.log(`Updated marker for ${routeId} to [${latitude}, ${longitude}]`);
    }
}

/**
 * Remove marker from map
 * @param {string} routeId - Route identifier
 */
function removeMarker(routeId) {
    if (markers[routeId]) {
        map.removeLayer(markers[routeId]);
        delete markers[routeId];
        console.log(`Removed marker for ${routeId}`);
    }
}