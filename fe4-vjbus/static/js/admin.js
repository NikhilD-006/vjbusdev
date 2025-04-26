// Global variables
let currentSortField = '';
let currentSortOrder = 'asc';
let allLogs = [];
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "vnradmin@123";

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize event listeners
    initializeEventListeners();
    
    // Check login status and initialize
    if (localStorage.getItem("isLoggedIn") === "true") {
        document.getElementById("login-container").classList.add("hidden");
        document.getElementById("admin-panel").classList.remove("hidden");
        fetchLogs();
    }
    
    // Set default date to today
    let today = new Date().toISOString().split('T')[0];
    document.getElementById("dateFilter").value = today;
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Login input field event listeners
    const usernameInput = document.getElementById("username");
    if (usernameInput) {
        usernameInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("password").focus();
            }
        });
    }

    const passwordInput = document.getElementById("password");
    if (passwordInput) {
        passwordInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("lgn-btn").click();
            }
        });
    }
    
    // Add event listeners for filter elements if they exist
    const routeFilter = document.getElementById("routeFilter");
    if (routeFilter) {
        routeFilter.addEventListener("change", applyFilters);
    }
    
    const dateFilter = document.getElementById("dateFilter");
    if (dateFilter) {
        dateFilter.addEventListener("change", applyFilters);
    }
    
    // Add listeners for table headers to enable sorting
    const tableHeaders = document.querySelectorAll("th[data-sort]");
    tableHeaders.forEach(header => {
        header.addEventListener("click", function() {
            sortLogs(this.getAttribute("data-sort"));
        });
    });
    
    // Add listeners for action buttons
    const loginButton = document.getElementById("lgn-btn");
    if (loginButton) {
        loginButton.addEventListener("click", login);
    }
    
    const logoutButton = document.getElementById("logout-btn");
    if (logoutButton) {
        logoutButton.addEventListener("click", logout);
    }
    
    const liveLocationButton = document.getElementById("live-location-btn");
    if (liveLocationButton) {
        liveLocationButton.addEventListener("click", redirectToLiveLocation);
    }
    
    const downloadButton = document.getElementById("download-pdf");
    if (downloadButton) {
        downloadButton.addEventListener("click", downloadPDF);
    }
}

/**
 * Handle login authentication
 */
function login() {
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        localStorage.setItem("isLoggedIn", "true");
        document.getElementById("login-container").classList.add("hidden");
        document.getElementById("admin-panel").classList.remove("hidden");
        fetchLogs();
    } else {
        alert("Invalid login credentials");
    }
}

/**
 * Handle logout
 */
function logout() {
    localStorage.removeItem("isLoggedIn");
    location.reload();
}

/**
 * Fetch logs from server
 */
function fetchLogs() {
    fetch("/get_logs")
        .then(response => response.json())
        .then(data => {
            allLogs = data;
            populateRouteDropdown();
            applyFilters();
        })
        .catch(error => console.error("Error fetching data:", error));
}

/**
 * Populate route dropdown with unique routes
 */
function populateRouteDropdown() {
    const routeFilter = document.getElementById("routeFilter");
    if (!routeFilter) return;
    
    routeFilter.innerHTML = '<option value="">All Routes</option>';
    const uniqueRoutes = [...new Set(allLogs.map(log => log.route_number))];
    uniqueRoutes.forEach(route => {
        let option = document.createElement("option");
        option.value = route;
        option.textContent = route;
        routeFilter.appendChild(option);
    });
}

/**
 * Apply filters and sorting to logs
 */
function applyFilters() {
    let selectedRoute = document.getElementById("routeFilter").value;
    let selectedDate = document.getElementById("dateFilter").value;

    let filteredLogs = allLogs.filter(log => {
        return (!selectedRoute || log.route_number === selectedRoute) &&
            (!selectedDate || log.log_date === selectedDate);
    });

    // Apply sorting on filtered logs
    if (currentSortField) {
        filteredLogs.sort((a, b) => {
            let valA = a[currentSortField];
            let valB = b[currentSortField];

            if (currentSortField === 'log_time') {
                valA = convertToMinutes(valA);
                valB = convertToMinutes(valB);
            }

            if (currentSortField === 'route_number') {
                valA = isNaN(valA) ? valA : parseInt(valA);
                valB = isNaN(valB) ? valB : parseInt(valB);
            }

            if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    displayLogs(filteredLogs);
}

/**
 * Sort logs by a specific field
 * @param {string} field - Field to sort by
 */
function sortLogs(field) {
    if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortOrder = 'asc';
    }

    // Update sort indicators in the UI
    updateSortIndicators(field);
    
    applyFilters(); // Apply filter again, now with sorting
}

/**
 * Update sort indicators in the table headers
 * @param {string} activeField - Currently active sort field
 */
function updateSortIndicators(field) {
    const headers = document.querySelectorAll('th.header_pointer');
    headers.forEach(th => {
        th.textContent = th.textContent.replace(/ 🔽| 🔼/, '');
    });

    const icon = currentSortOrder === 'asc' ? ' 🔼' : ' 🔽';
    const selectedHeader = document.querySelector(`th[onclick="sortLogs('${field}')"]`);
    if (selectedHeader) {
        selectedHeader.textContent += icon;
    }
}


/**
 * Convert time string to minutes for sorting
 * @param {string} timeStr - Time string in HH:MM format
 * @returns {number} - Total minutes
 */
function convertToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [hh, mm] = timeStr.split(":").map(Number);
    return hh * 60 + mm;
}

/**
 * Display logs in the table
 * @param {Array} logs - Logs to display
 */
function displayLogs(logs) {
    let tableBody = document.getElementById("log-table");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    if (logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3">No matching data</td></tr>';
        return;
    }
    
    logs.forEach(row => {
        let tr = document.createElement('tr');
        
        let tdRoute = document.createElement('td');
        tdRoute.textContent = row.route_number;
        
        let tdDate = document.createElement('td');
        tdDate.textContent = row.log_date;
        
        let tdTime = document.createElement('td');
        tdTime.textContent = row.log_time;
        
        tr.appendChild(tdRoute);
        tr.appendChild(tdDate);
        tr.appendChild(tdTime);
        
        tableBody.appendChild(tr);
    });
}

/**
 * Redirect to live location page
 */
function redirectToLiveLocation() {
    window.location.href = "/allBus";
}

/**
 * Generate and download logs as PDF
 */
async function downloadPDF() {
    // Ensure jsPDF is loaded
    if (!window.jspdf || !window.jspdf.jsPDF) {
        console.error("jsPDF library not loaded");
        alert("PDF generation library not loaded. Please try again later.");
        return;
    }

    const { jsPDF } = window.jspdf;

    const tableRows = document.querySelectorAll("#log-table tr");
    if (tableRows.length <= 1) {
        alert("No data to download.");
        return;
    }

    const pdf = new jsPDF('p', 'pt', 'a4');
    pdf.setFontSize(18);
    pdf.text("Admin Log Report", 40, 40);

    const tableData = [];
    tableRows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length) {
            tableData.push([
                cols[0].innerText.trim(),
                cols[1].innerText.trim(),
                cols[2].innerText.trim()
            ]);
        }
    });

    pdf.autoTable({
        head: [['Route Number', 'Log Date', 'In Time']],
        body: tableData,
        startY: 60,
        margin: { left: 40, right: 40 },
        styles: {
            fontSize: 10,
            cellPadding: 8,
            lineWidth: 0.2,
            lineColor: [0, 0, 0], // Black border
            textColor: [0, 0, 0]
        },
        headStyles: {
            fillColor: [0, 123, 255],
            textColor: 255,
            lineWidth: 0.5,
            lineColor: [0, 0, 0]
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`Admin_Logs_${timestamp}.pdf`);
}