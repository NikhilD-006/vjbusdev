// Global variables
let state = {
    room: "",
    username: ""
};
const socket = io("https://bus.vnrzone.site");

// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", function() {
    // Initialize event listeners
    initializeEventListeners();
    
    // Check for stored user data and prefill form
    setupUserData();
    
    // Initialize socket listeners
    initializeSocketListeners();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Input field event listeners for enter key navigation
    const nameInput = document.getElementById("name");
    if (nameInput) {
        nameInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("route").focus();
            }
        });
    }

    const routeInput = document.getElementById("route");
    if (routeInput) {
        routeInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("join-btn").click();
            }
        });
    }
    
    const messageInput = document.getElementById("message");
    if (messageInput) {
        messageInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    }
    
    // Navigation buttons
    const homeBtn = document.getElementById("homeBtn");
    if (homeBtn) {
        homeBtn.addEventListener("click", function() {
            window.location.href = "https://bus.vnrzone.site";
        });
    }
    
    const chatBtn = document.getElementById("chatBtn");
    if (chatBtn) {
        chatBtn.addEventListener("click", function() {
            window.location.href = "https://bus.vnrzone.site/chat";
        });
    }
    
    // Chat buttons
    const joinBtn = document.getElementById("join-btn");
    if (joinBtn) {
        joinBtn.addEventListener("click", joinRoom);
    }
    
    const leaveBtn = document.getElementById("leave-btn");
    if (leaveBtn) {
        leaveBtn.addEventListener("click", leaveRoom);
    }
    
    const sendBtn = document.getElementById("send-btn");
    if (sendBtn) {
        sendBtn.addEventListener("click", sendMessage);
    }
}

/**
 * Setup user data from cookies and local storage
 */
function setupUserData() {
    // Setup name input from cookie
    const storedName = getCookieValue("user") 
        ? JSON.parse(getCookieValue("user")).family_name 
        : "";
    
    const nameInput = document.getElementById("name");
    if (nameInput) {
        if (storedName) {
            nameInput.value = storedName;
            nameInput.readOnly = true;
        } else {
            nameInput.readOnly = false;
        }
    }
    
    // Setup route input from local storage
    const roomID = localStorage.getItem("busApplicationSelectedRouteByStudent");
    const roomInput = document.getElementById("route");
    if (roomInput && roomID) {
        const routeNumber = roomID.split("Route-")[1]?.split(" ")[0]; // "S-2"
        roomInput.value = routeNumber || "";
        roomInput.readOnly = false;
    }
}

/**
 * Initialize socket event listeners
 */
function initializeSocketListeners() {
    // Listen for chat history events
    socket.on("chat_history", function(data) {
        if (data.room === state.room) {
            const messagesDiv = document.getElementById("messages");
            messagesDiv.innerHTML = "";
            
            data.messages.forEach(msg => {
                addMessage(msg.sender, msg.message, msg.sender === state.username);
            });
            
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    });
    
    // Listen for chat message events
    socket.on("chat_message", function(data) {
        addMessage(data.sender, data.message, data.sender === state.username);
        
        const messagesDiv = document.getElementById("messages");
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

/**
 * Get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} - Cookie value or null if not found
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
 * Handle joining a chat room
 */
function joinRoom() {
    state.username = document.getElementById("name").value.trim();
    state.room = document.getElementById("route").value.trim();
    
    if (!state.username || !state.room) {
        alert("Please enter your name and Room ID.");
        return;
    }

    socket.emit("join_room", { 
        room: state.room, 
        sender: state.username 
    });
    
    // Update UI
    document.getElementById("room-name").innerText = state.room;
    document.getElementById("initial-header").style.display = "none";
    document.getElementById("chat-header").style.display = "block";
    document.getElementById("chat").style.display = "block";
    document.getElementById("join-section").style.display = "none";
    document.getElementById("message").style.display = "block";
    document.getElementById("leave-btn").style.display = "block";
}

/**
 * Handle leaving a chat room
 */
function leaveRoom() {
    socket.emit("leave_room", { 
        room: state.room, 
        sender: state.username 
    });
    
    location.reload();
}

/**
 * Send a message to the current room
 */
function sendMessage() {
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();
    
    if (message) {
        socket.emit("send_message", { 
            room: state.room, 
            sender: state.username, 
            message 
        });
        
        messageInput.value = "";
    }
}

/**
 * Add a message to the chat display
 * @param {string} sender - Message sender
 * @param {string} message - Message content
 * @param {boolean} isCurrentUser - Whether the sender is the current user
 */
function addMessage(sender, message, isCurrentUser) {
    const messagesDiv = document.getElementById("messages");
    const messageElement = document.createElement("div");
    
    messageElement.classList.add("message");
    messageElement.classList.add(isCurrentUser ? "user-message" : "received-message");
    messageElement.innerHTML = `<small class="username">${sender}</small><div>${message}</div>`;
    
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/**
 * Set active navigation item
 * @param {HTMLElement} element - Element to set as active
 */
function setActive(element) {
    document.querySelectorAll(".menu-item").forEach(function(item) {
        item.classList.remove("active");
    });
    
    element.classList.add("active");
}