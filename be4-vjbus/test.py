<<<<<<< HEAD
import requests
<<<<<<< HEAD

# Replace with your actual TomTom API key
TOMTOM_API_KEY = "pCHW0kIg3AOAN475zzPLjq4WNJLWdXMz"

def get_eta_distance(start_lat, start_lon, end_lat, end_lon):
    url = f"https://api.tomtom.com/routing/1/calculateRoute/{start_lat},{start_lon}:{end_lat},{end_lon}/json"
    
    params = {
        "key": TOMTOM_API_KEY,
        "routeType": "fastest",  # fastest, shortest, eco
        "traffic": "true",       # Enable real-time traffic
        "travelMode": "car",     # Options: car, truck, taxi, bus, motorcycle, bicycle, pedestrian
        "computeTravelTimeFor": "all",
        "avoid": "unpavedRoads",
        "departAt": "now"        # Use 'now' for live traffic or provide ISO timestamp
    }

    response = requests.get(url, params=params)
    
    if response.status_code == 200:
        data = response.json()
        if "routes" in data and len(data["routes"]) > 0:
            route = data["routes"][0]
            eta_seconds = route["summary"]["travelTimeInSeconds"]
            distance_meters = route["summary"]["lengthInMeters"]

            eta_minutes = eta_seconds / 60
            distance_km = distance_meters / 1000

            return {
                "ETA (minutes)": round(eta_minutes, 2),
                "Distance (km)": round(distance_km, 2)
            }
        else:
            return {"error": "No route found."}
    else:
        return {"error": f"API request failed with status code {response.status_code}"}

# Example Usage
start_lat, start_lon = 17.3850, 78.4867  # New York City
end_lat, end_lon = 17.4399, 78.4983      # Los Angeles

result = get_eta_distance(start_lat, start_lon, end_lat, end_lon)
print(result)
=======
import threading
import random
import time
=======
#sqlite3 login
@socketio.on("login")
def handle_login(data):
    session_id = request.sid
    roll_no = data.get("roll_no").upper()
    password = data.get("password")
    print("Got from frontend",roll_no,password)
    res,flag=check_credentials(roll_no, password)
    print("Result from function call",res,flag)
    if flag:
        socketio.emit("login_response", {"success": True, "roll_no": res[1], "name":res[0]}, room=session_id)
    else:
        socketio.emit("login_response", {"success": False}, room=session_id)
>>>>>>> dcd9eac3b97b82acb807531a6a7967bcf5b5d5d3



<<<<<<< HEAD
routes = ["Route-1", "Route-2", "Route-3", "Route-4A", "Route-4B", "Route-5", "Route-6", "Route-7"]

def send_location_update():
    while True:  # Continuously send updates
        data = {
            "route_id": random.choice(routes),
            "latitude": c,  # Random latitude
            "longitude": c,  # Random longitude
        }
        try:
            response = requests.post(API_URL, json=data)
            print(f"Sent: {data} | Response: {response.status_code} - {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
        time.sleep(5)  # Wait for 5 seconds before the next update

# Running 30 threads to simulate 30 concurrent users
threads = []

for _ in range(30):  # 30 users
    t = threading.Thread(target=send_location_update)
    c+=1
    threads.append(t)
    t.start()

# Wait for all threads to complete (though they run indefinitely in this example)
for t in threads:
    t.join()
>>>>>>> d87c6074cee37a3b1f441f4a95d1c7c425ed965b
=======
def check_credentials(roll_no, password):
    conn = sqlite3.connect("database.db", check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_data WHERE roll_no = ?", (roll_no,))
    result = cursor.fetchone()
    print("Result from DB to check",result)
    conn.close()
    if not result or result[2] != password:
        return None ,False
    return result, result[2] == password
>>>>>>> dcd9eac3b97b82acb807531a6a7967bcf5b5d5d3
