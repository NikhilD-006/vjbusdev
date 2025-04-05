import requests
import threading
import random
import time

global c
c=0

API_URL = "http://10.45.92.5:6104/receive_location"

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
