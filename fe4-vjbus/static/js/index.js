// ===== CONFIGURATION CONSTANTS =====
const API_URL = "https://auth.vnrzone.site";
const socket = io("wss://bus.vnrzone.site", { transports: ["websocket"] });

// ===== GLOBAL VARIABLES =====
let GOOGLE_CLIENT_ID=null;
let selectedRoute = "";
let latestBusLocation = null;
let markers = {};
let firstRecenter = {}; // Track first recenter per route
sleep(10000); // Initial sleep to ensure DOM is ready
getGoogleClientId(); // Fetch Google Client ID
sleep(100);

// UI Elements
let trackBtn, homeBtn, chatBtn;
let trackingCard, routeSelect, findDistanceBtn, recenterBtn;
let connectionStatus, statusText, distanceTimeText, lastUpdatedText;



// Custom bus icon for map
const busIcon = L.divIcon({
    className: 'bus-marker',
    html: '<div style="font-size: 25px;">🚌</div>',
    iconSize: [50, 50],
    iconAnchor: [15, 15]
});
// map.js - Simple map initialization module

// Global variables
let map;
const fixedLatLng = [17.539896, 78.386511];

const routes = ["Route-1 (Patancheru)","Route-2 (LB Nagar)","Route-2A (Nagole)","Route-3 (Yusufguda)","Route-4A (ECIL)","Route-4B (ECIL)","Route-5 (Attapur)","Route-6 (VST)","Route-7 (Kukatpally)","Route-8 (Old Alwal)","Route-9 (KPHB via Nizampet)","Route-10 (Manikonda)","Route-11 (HCU)","Route-S-1 (Patancheru)","Route-S-2/1 (LB Nagar)","Route-S-2/2 (LB Nagar)","Route-S-3/1 (Nagole via Begumpet)","Route-S-3/2 (Nagole via taduband)","Route-S-4 (Yusufguda)","Route-S-5 (Attapur)","Route-S-6 (VST)","Route-S-7 (Kukatpally)","Route-S-8 (KPHB via Nizampet)","Route-S-9 (Manikonda)","Route-S-10 (HCU)","Route-41 (ECIL)","Route-42 (ECIL)","Route-43 (ECIL)","Route-44 (ECIL)"]; // 🌍 Global variable

document.addEventListener("DOMContentLoaded", async function () {
    initializeMap();
    addFixedMarker();

    // await getRoutes(); // No need to assign, it sets the global `routes`
    // console.log("Routes in DOMContentLoaded:", routes);
});

// async function getRoutes() {
//     try {
//         console.log("Fetching routes...");
//         const res = await fetch("/get-all-routes");
//         const text = await res.text();
//         routes = JSON.parse(text); // 🌍 Assign to global `routes`
//         console.log("Routes fetched:", routes);
//     } catch (err) {
//         console.error("Error fetching routes:", err);
//         routes = ["hello"]; // fallback to empty array
//     }
// }



/**
 * Initialize the map with tile layer
 */
function initializeMap() {
    // Create map centered on fixed location
    map = L.map('map').setView(fixedLatLng, 13);
    
    // Add OpenStreetMap tile layer with optimization options
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        updateWhenZooming: false,
        updateWhenIdle: true,
        reuseTiles: true
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
// ===== UTILITY FUNCTIONS =====

async function getGoogleClientId() {
    try {
        const res = await fetch('/get-google-client-id');
        const data = await res.json();
        GOOGLE_CLIENT_ID = data.apiKey;
    } catch (error) {
        console.error("Error fetching Google Client ID", error);
    }
}

/**
 * Load JavaScript scripts asynchronously
 */
function loadScript(src, isAsync = true, isDefer = true) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        if (isAsync) script.async = true;
        if (isDefer) script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

/**
 * Load CSS files
 */
function loadCSS(href) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        document.head.appendChild(link);
    });
}

/**
 * Load all required scripts and CSS
 */
async function loadAllScripts() {
    try {
        await loadCSS("https://unpkg.com/leaflet/dist/leaflet.css");
        await loadCSS("../static/css/index-styles.css");
        await loadScript("https://accounts.google.com/gsi/client");
        await loadScript("https://unpkg.com/leaflet/dist/leaflet.js", false, false);
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.4/socket.io.js");
    } catch (error) {
        console.error("Something went wrong loading scripts", error);
    }
}

/**
 * Get cookie value by name
 */
function getCookieValue(name) {
    const cookieString = document.cookie;
    const cookies = cookieString.split('; ');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].split('=');
        if (cookie[0] === name) {
            return decodeURIComponent(cookie[1]);
        }
    }
    return null;
}

/**
 * Decode JWT token
 */
function decodeJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
}

/**
 * Sleep function for delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Set active menu item
 */
function setActive(element) {
    document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
    element.classList.add("active");
}

// ===== AUTH FUNCTIONS =====

/**
 * Update login/logout button based on auth state
 */
function updateLoginButton() {
    const btn = document.getElementById("login-logout");
    if (getCookieValue("user") !== null) {
        // console.log(getCookieValue("user"));
        btn.innerHTML = "LogOut";
        btn.style.background = "red";
    } else {
        btn.innerHTML = "Login";
        btn.style.background = "green";
    }
}

/**
 * Handle login/logout button click
 */
function login_logout(event) {
    event.preventDefault();
    let loginBtn = document.getElementById("login-logout");
    if (!loginBtn) return;

    if (getCookieValue("user") !== null) {
        logout(event);
    } else {
        openModal();
        document.getElementById("rollLoginForm").style.display = "none";
        document.getElementById("loginChoice").style.display = "block";
    }
}

/**
 * Handle Google OAuth response
 */
function handleCredentialResponse(response) {
    const token = response.credential;

    // Send to auth server and let it set cookies
    fetch(`${API_URL}/auth/google`, {
        method: "POST",
        credentials: "include", 
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
        if (data.user) {
            fill_tracking_info();
            updateLoginButton();
            closeModal();
        } else {
            alert("❌ Login failed!", data);
        }
    });
}

/**
 * Handle user logout
 */
async function logout(event) {
    event.preventDefault();
    const confirmLogout = confirm("Are you sure you want to log out..!!");
    if (!confirmLogout) return;    
    try {
        await fetch(`${API_URL}/logout`, {
            method: "POST",
            credentials: "include"
        });
    } catch (error) {
        alert("Error logging out", error);
    }
    await sleep(1);
    updateLoginButton();
    fill_tracking_info();
}

// ===== LOGIN MODAL FUNCTIONS =====

/**
 * Open login modal
 */
function openModal() {
    let modal = document.getElementById("loginModal");
    if (modal) modal.style.display = "block";
}

/**
 * Close login modal
 */
function closeModal() {
    let modal = document.getElementById("loginModal");
    if (modal) modal.style.display = "none";
}

/**
 * Show roll number login form
 */
function showRollLogin() {
    document.getElementById("loginChoice").style.display = "none";
    document.getElementById("rollLoginForm").style.display = "block";
}

/**
 * Submit roll number login
 */
function submitLogin(event) {
    event?.preventDefault();
    let rollNo = document.getElementById("rollNo").value;
    let password = document.getElementById("password").value;

    if (!rollNo || !password) {
        alert("⚠️ Enter Roll No and Password!");
        return;
    }

    let loginData = { roll_no: rollNo, password: password };
    socket.emit("login", loginData);
}

/**
 * Start Google login flow
 */
function startGoogleLogin() {
    google.accounts.id.prompt(); // Triggers popup
    document.getElementById("loginChoice").style.display = "none";
    document.getElementById("googleLoginForm").style.display = "block";
    google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
    );
}

// ===== TRACKING FUNCTIONS =====

/**
 * Update tracking info display
 */
function fill_tracking_info() {    
    // Safely get user name from cookie or localStorage
    let userName = "";
    const userCookie = getCookieValue("user");
    let isLogged = false;
    
    if (userCookie) {
        isLogged = true;
        try {
            userName = JSON.parse(userCookie).family_name;
        } catch (e) {
            console.log("Error parsing user cookie", e);
        }
    }
    
    const sRoute = localStorage.getItem("busApplicationSelectedRouteByStudent") ? 
                  localStorage.getItem("busApplicationSelectedRouteByStudent").split(" ")[0] : "";
    let routeInfo = document.querySelector(".route_info");
    let chatBtn = document.getElementById("chatBtn");

    if (!routeInfo) return;

    if (sRoute !== "") {
        routeInfo.innerHTML = `Hello ${userName}👋 <br> Tracking ${sRoute} 🔴`;
    } else {
        routeInfo.innerHTML = `Hello ${userName}👋 <br>No Route Being Tracked 🔴`;
    }
    
    if (isLogged) {
        chatBtn.style.display = "block";
    } else {
        chatBtn.style.display = "none";
    }
}

/**
 * Get user location
 */
function getUserLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                callback(`${lon},${lat}`);
            },
            (error) => {
                console.error("Error fetching user location", error);
                callback(null);
            }
        );
    } else {
        console.error("Geolocation is not supported by this browser.");
        callback(null);
    }
}

/**
 * Calculate distance and ETA between user and bus
 */
async function getDistanceTime(origin, destination) {
    const response = await fetch('/get-tom-tom-api-key'); 
    const data = await response.json();
    const apiKey = data.apiKey;


    // Ensure origin and destination are correctly formatted
    if (typeof origin !== "string" || !origin.includes(",")) {
        console.error("Invalid origin format. Expected 'latitude,longitude'");
        return;
    }

    if (typeof destination !== "string" || !destination.includes(",")) {
        console.error("Invalid destination format. Expected 'latitude,longitude'");
        return;
    }

    // Convert from "longitude,latitude" to "latitude,longitude"
    const [originLng, originLat] = origin.split(",");
    const [destinationLng, destinationLat] = destination.split(",");

    const correctedOrigin = `${originLat},${originLng}`;
    const correctedDestination = `${destinationLat},${destinationLng}`;

    // Correct URL format using ":" instead of "/"
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${correctedOrigin}:${correctedDestination}/json?key=${apiKey}&traffic=true&routeType=fastest`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const route = data.routes[0].summary;

            const distance = (route.lengthInMeters / 1000).toFixed(2) + " km"; // Convert meters to km

            const minutes = Math.floor(route.travelTimeInSeconds / 60);
            const seconds = route.travelTimeInSeconds % 60;
            const duration = `${minutes} min ${seconds} sec`; 

            if (typeof distanceTimeText !== "undefined" && distanceTimeText) {
                distanceTimeText.innerText = `📏 Distance: ${distance} | ⏳ ETA: ${duration}`;
                distanceTimeText.style.display = "block"; 
            }

            if (typeof lastUpdatedText !== "undefined" && lastUpdatedText) {
                lastUpdatedText.innerText = `Last updated: ${new Date().toLocaleTimeString()}`;
                lastUpdatedText.style.display = "block"; 
            }
        } else {
            console.warn("No route found!");
        }
    } catch (error) {
        console.error("❌ Error fetching TomTom Traffic API data:", error);
    }
}

/**
 * Update Find Distance button visibility based on bus location
 */
function updateFindDistanceVisibility() {
    if (!findDistanceBtn || !recenterBtn) return;

    if (latestBusLocation) {
        findDistanceBtn.style.display = "block";
        recenterBtn.style.display = "block"; 
    } else {
        findDistanceBtn.style.display = "none";
        recenterBtn.style.display = "none"; 
    }
}

// ===== EVENT LISTENERS =====

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    // Assign DOM elements
    trackBtn = document.getElementById("trackBtn");
    homeBtn = document.getElementById("homeBtn");
    chatBtn = document.getElementById("chatBtn");
    trackingCard = document.getElementById("trackingCard");
    routeSelect = document.getElementById("routeSelect");
    findDistanceBtn = document.getElementById("find-distance");
    recenterBtn = document.getElementById("recenter");
    connectionStatus = document.getElementById("connection");
    statusText = document.getElementById("status");
    distanceTimeText = document.getElementById("distance-time");
    lastUpdatedText = document.getElementById("last-updated");
    
    // Hide optional elements initially
    if (distanceTimeText) distanceTimeText.style.display = "none";
    if (lastUpdatedText) lastUpdatedText.style.display = "none";
    console.log("Routes in :", routes);
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
    
    // Route select change handler
    routeSelect.addEventListener("change", function () {
        if (selectedRoute) {
            socket.emit("unsubscribe", selectedRoute);
        }
        selectedRoute = this.value;
        
        // Save to localStorage
        if (selectedRoute) {
            localStorage.setItem("busApplicationSelectedRouteByStudent", selectedRoute);
        } else {
            localStorage.removeItem("busApplicationSelectedRouteByStudent");
        }
        fill_tracking_info();
        
        if (statusText) statusText.innerText = selectedRoute ? 
            `Tracking ${selectedRoute}` : "Select a route to start tracking";

        // Hide elements initially
        findDistanceBtn.style.display = "none";
        recenterBtn.style.display = "none";
        distanceTimeText.style.display = "none";
        lastUpdatedText.style.display = "none";

        // Remove previous markers
        for (const route in markers) {
            if (markers[route]._map) {
                markers[route].remove();
            }
        }

        if (selectedRoute) {
            socket.emit("subscribe", selectedRoute);
        }
    });
    
    // Menu button clicks
    trackBtn.addEventListener("click", function () {
        trackingCard.style.display = "block";
        setActive(this);
    });
    
    homeBtn.addEventListener("click", function () {
        trackingCard.style.display = "none";
        setActive(this);
    });
    
    chatBtn.addEventListener("click", function () {
        setActive(this);
        window.location.href = "https://bus.vnrzone.site/chat";
    });
    
    // Find distance button click
    findDistanceBtn.addEventListener("click", function () {
        if (!latestBusLocation) return;

        getUserLocation((userLocation) => {
            if (userLocation) {
                getDistanceTime(userLocation, latestBusLocation);
            }
        });
    });
    
    // Recenter button click
    recenterBtn.addEventListener("click", function () {
        if (selectedRoute && markers[selectedRoute]) {
            let markerPosition = markers[selectedRoute].getLatLng();
            let offsetLat = -0.008; // Adjust to move map slightly upwards
            map.setView([markerPosition.lat + offsetLat, markerPosition.lng], 13);
        }
    });
    
    // Modal click outside close
    window.onclick = function (event) {
        let modal = document.getElementById("loginModal");
        if (event.target === modal) closeModal();
    };
});

// Initialize on window load
window.onload = function () {
    updateLoginButton();
    fill_tracking_info();

    // Initialize Google login
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        hosted_domain: "vnrvjiet.in",
        ux_mode: "popup"
    });

    // Render hidden button (optional)
    google.accounts.id.renderButton(
        document.getElementById("g_id_signin"),
        { theme: "outline", size: "large" }
    );
    
    // Ensure dropdown refreshes properly
    setTimeout(() => {
        if (routeSelect) routeSelect.dispatchEvent(new Event("change"));
    }, 100);
};

// ===== SOCKET EVENTS =====

// Socket location update event handler
socket.on("location_update", function (data) {
    if (!data.route_id) return;

    let routeOption = document.querySelector(`#routeSelect option[value='${data.route_id}']`);
    if (!routeOption) return;

    // Save the current selected index to restore later
    const selectedIndex = routeSelect.selectedIndex;

    // Only update textContent if the status has changed
    if (data.status === "tracking_active" && !routeOption.textContent.includes("🟢")) {
        routeOption.textContent = `${data.route_id}🟢`;
    } else if (data.status === "stopped" && routeOption.textContent.includes("🟢")) {
        routeOption.textContent = `${data.route_id}`;
    }

    if (data.route_id !== selectedRoute) return;

    if (data.latitude && data.longitude && data.status === "tracking_active") {
        console.log("Broadcasted Data for Selected Route:", data);
        let userName = getCookieValue("user") ? JSON.parse(getCookieValue("user")).family_name : "";
        document.querySelector(".route_info").innerHTML = `Hello ${userName}👋 <br> Tracking ${selectedRoute.split(" ")[0]}   🟢 `;                
        latestBusLocation = `${data.longitude},${data.latitude}`;
        updateFindDistanceVisibility();
        
        // Add to map and recenter
        if (!markers[selectedRoute]) {
            markers[selectedRoute] = L.marker([data.latitude, data.longitude], { icon: busIcon }).addTo(map);
        } else {
            if (!markers[selectedRoute]._map) {
                markers[selectedRoute].addTo(map);
            }
            markers[selectedRoute].setLatLng([data.latitude, data.longitude]);
        }   

        // Automatically center map on first update
        if (!firstRecenter[selectedRoute]) {
            firstRecenter[selectedRoute] = true; // Mark as recentered
            map.setView([data.latitude, data.longitude], 13);
        }
    } else if (data.status === "stopped") {
        console.log("Received Broadcast Data:", data);
        const userName = getCookieValue("user") ? JSON.parse(getCookieValue("user")).family_name : "";
        if (markers[selectedRoute] && markers[selectedRoute]._map) {
            markers[selectedRoute].remove();
            document.querySelector(".route_info").innerHTML = `Hello ${userName}👋 <br> Tracking ${selectedRoute.split(" ")[0]} 🔴 `;
        }
        firstRecenter[selectedRoute] = false; // Reset first recenter flag
        latestBusLocation = null;
        updateFindDistanceVisibility();
    }

    // Restore the selected index of the dropdown
    setTimeout(() => {
        routeSelect.selectedIndex = selectedIndex;
    }, 10);
});

// Initialize application
loadAllScripts();
