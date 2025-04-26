// ===== CONFIGURATION CONSTANTS =====
const SOCKET_URL = "wss://bus.vnrzone.site";
const TRACKING_INTERVAL = 5000; // 5 seconds

// ===== GLOBAL VARIABLES =====
let isTracking = false;
let selectedRouteId = "";
let trackingTimer;
let socket;

// ===== DYNAMIC BUS ROUTES =====
let routes = [];
async function getRoutes() {
    try {
        console.log("Fetching routes...");
        const res = await fetch("/get-all-routes");
        const text = await res.text();
        routes = JSON.parse(text); // 🌍 Assign to global `routes`
    } catch (err) {
        console.error("Error fetching routes:", err);
        routes = []; // fallback to empty array
    }
}
document.addEventListener("DOMContentLoaded", async function () {
    await getRoutes(); // Uncomment this line to fetch routes from API
    getRoutes().then(() => {
        // Populate route dropdown
        routeSelect.innerHTML = '<option value="">-- Select Route --</option>';
        routes.forEach((route) => {
            let option = document.createElement("option");
            option.value = route.trim();
            option.textContent = route.trim();
            routeSelect.appendChild(option);
        });
        
        // Load saved route from localStorage
        const savedRoute = localStorage.getItem("busApplicationSelectedRouteByStudent");
        if (savedRoute && routes.includes(savedRoute)) {
            routeSelect.value = savedRoute;
            selectedRoute = savedRoute;
            routeSelect.dispatchEvent(new Event("change")); // Trigger event to start tracking
        }
    });
});

// ===== UI ELEMENTS =====
let connectionStatus, trackingStatus, toggleButton, routeSelect;

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", function() {
    // Initialize UI elements
    connectionStatus = document.getElementById('connectionStatus');
    trackingStatus = document.getElementById('trackingStatus');
    toggleButton = document.getElementById('toggleButton');
    routeSelect = document.getElementById('routeSelect');
    
    // Initialize socket connection
    initSocket();
    
    // Populate route dropdown
    populateRouteDropdown();
    
    // Setup event listeners
    setupEventListeners();
});

/**
 * Initialize Socket.io connection
 */
function initSocket() {
    socket = io(SOCKET_URL, { 
        transports: ['websocket'], 
        autoConnect: false 
    });
    
    socket.connect();
    
    // Socket event handlers
    socket.on('connect', () => {
        connectionStatus.textContent = "⚫⚫🟢";
    });

    socket.on('disconnect', () => {
        connectionStatus.textContent = "🔴⚫⚫";
    });
}


/**
 * Setup event listeners for UI elements
 */
function setupEventListeners() {
    routeSelect.addEventListener('change', (event) => {
        if (isTracking) toggleTracking();
        selectedRouteId = event.target.value;
    });

    toggleButton.addEventListener('click', toggleTracking);
}

/**
 * Toggle tracking status on/off
 */
function toggleTracking() {
    if (!selectedRouteId) {
        alert("Please select a Route first!");
        return;
    }

    if (isTracking) {
        // Stop tracking
        sendFinalBroadcast(selectedRouteId);
        setTimeout(() => {
            clearInterval(trackingTimer);
            updateUIForStoppedTracking();
            isTracking = false;
        }, 1000);
    } else {
        // Start tracking
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(() => {
                updateUIForActiveTracking();
                isTracking = true;
                startTracking();
            }, handleGeolocationError);
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    }
}

/**
 * Update UI elements for active tracking
 */
function updateUIForActiveTracking() {
    toggleButton.classList.remove('go');
    toggleButton.classList.add('stop');
    toggleButton.textContent = 'STOP';
    trackingStatus.textContent = `📡 Tracking ON for ${selectedRouteId}`;
}

/**
 * Update UI elements for stopped tracking
 */
function updateUIForStoppedTracking() {
    toggleButton.classList.remove('stop');
    toggleButton.classList.add('go');
    toggleButton.textContent = 'GO';
    trackingStatus.textContent = `❌ Tracking OFF`;
}

/**
 * Handle geolocation errors
 */
function handleGeolocationError(error) {
    console.error("Geolocation error:", error);
    alert(`Unable to get location: ${error.message}`);
}

/**
 * Start location tracking and broadcasting
 */
function startTracking() {
    trackingTimer = setInterval(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            let heading = position.coords.heading ?? 0; // Get the heading or default to 0
            
            let trackingData = {
                route_id: selectedRouteId,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                heading: heading,
                status: 'tracking_active'
            };

            console.log(`📢 Location Update - Route: ${selectedRouteId}, Data:`, trackingData);
            socket.emit('location_update', trackingData);
        }, handleGeolocationError);
    }, TRACKING_INTERVAL);
}

/**
 * Send final broadcast when tracking is stopped
 */
function sendFinalBroadcast(routeId) {
    navigator.geolocation.getCurrentPosition((position) => {
        let heading = position.coords.heading ?? 0; // Get heading or default to 0

        let finalBroadcast = {
            route_id: routeId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            heading: heading,
            status: 'stopped'
        };

        console.log(`📢 Final Broadcast - Route: ${routeId}, Data:`, finalBroadcast);
        socket.emit('location_update', finalBroadcast);
    }, handleGeolocationError);
}