import eventlet
eventlet.monkey_patch()
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, send
from geopy.distance import geodesic
from datetime import datetime
import sqlite3
import socket
import sys
import requests
import logging
import urllib.parse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

user_count = {"count": 0}
PORT = 6104

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("localhost", port)) == 0

if is_port_in_use(PORT):
    logger.error(f"Port {PORT} is already in use. Exiting.")
    sys.exit(1)

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# Global variables
latest_location = {}
connected_routes = {}
tracking_status = {}
route_subscriptions = {}
all_routes = []

# Initialize all possible routes
# Change the route_names array in init_routes function:
def init_routes():
    global all_routes
    try:
        response = requests.get("https://bus.vnrzone.site/get-all-routes")
        response.raise_for_status()  # Raises error for bad status codes
        route_names = response.json()  # Assuming this returns a list of route names
        all_routes = [
            {
                "route_id": route,
                "status": "stopped",
                "latitude": None,
                "longitude": None,
                "heading": None,
                "socketId": None
            }
            for route in route_names
        ]
    except Exception as e:
        print("Failed to fetch routes:", e)
        all_routes = []  # Fallback to empty list or optionally some default routes

# Database connection
db_conn = sqlite3.connect("database.db", check_same_thread=False)

def init_db():
    cursor = db_conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS logs (
            route_number TEXT, 
            log_date date, 
            log_time time
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_count ( 
            Date date, 
            Users_count integer
        )
    """)
    db_conn.commit()
    init_routes()

init_db()

# App routes
@app.route("/get_all_locations", methods=["GET"])
def get_all_locations():
    return jsonify([route for route in all_routes if route["status"] != "stopped"])

@app.route("/get_all_connections", methods=["GET"])
def get_all_connections():
    connections = [
        {
            "socketId": route["socketId"],
            "route_id": route["route_id"],
            "status": route["status"],
            "latitude": route["latitude"],
            "longitude": route["longitude"]
        } for route in all_routes if route["status"] != "stopped"
    ]
    logger.info(f"Returning connections: {connections}")
    return jsonify(connections)

@app.route("/get_all_routes", methods=["GET"])
def get_all_routes():
    return jsonify([route["route_id"] for route in all_routes])



@app.route("/get_chat/<room>", methods=["GET"])
def get_chat(room):
    conn = sqlite3.connect("database.db", check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("SELECT sender, message, timestamp FROM chat WHERE room = ? ORDER BY timestamp ASC", (room,))
    messages = [{"sender": row[0], "message": row[1], "timestamp": row[2]} for row in cursor.fetchall()]
    conn.close()
    return jsonify(messages)


@app.route("/get_chat", methods=["GET"])
def all_chat():
    conn = sqlite3.connect("database.db", check_same_thread=False)
    cursor = conn.cursor()
    cursor.execute("SELECT sender, message, timestamp FROM chat ORDER BY timestamp ASC")
    messages = [{"sender": row[0], "message": row[1], "timestamp": row[2]} for row in cursor.fetchall()]
    conn.close()
    return jsonify(messages)


# Utility functions
def is_in_college(lon, lat):
    COLLEGE = (17.539873, 78.386514)
    return geodesic(COLLEGE, (lat, lon)).meters <= 1500

def log_data(route_id):
    try:
        cursor = db_conn.cursor()
        current_date = datetime.now().strftime("%Y-%m-%d")
        current_time = datetime.now().strftime("%H:%M:%S")
        cursor.execute("""
            SELECT 1 FROM logs WHERE route_number = ? AND log_date = ?
        """, (route_id, current_date))
        exists = cursor.fetchone()
        if not exists:
            cursor.execute("""
                INSERT INTO logs VALUES (?, ?, ?)
            """, (route_id, current_date, current_time))
            db_conn.commit()
            logger.info(f"Bus {route_id} logged at {current_time}")
            log_user_count()
    except sqlite3.Error as e:
        logger.error(f"Error logging data: {e}")

def log_user_count():
    try:
        cursor = db_conn.cursor()
        current_date = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("""
            SELECT COALESCE(Users_count, 0) FROM user_count WHERE Date = ?
        """, (current_date,))
        result = cursor.fetchone()
        old_count = result[0] if result else 0
        new_count = old_count + user_count["count"]
        if old_count != 0:
            cursor.execute("""
                UPDATE user_count SET Users_count = ? WHERE Date = ?
            """, (new_count, current_date))
        else:
            cursor.execute("""
                INSERT INTO user_count (Date, Users_count) VALUES (?, ?)
            """, (current_date, new_count))
            user_count["count"] = 0
        db_conn.commit()
    except sqlite3.Error as e:
        logger.error(f"Error logging user count: {e}")

def broadcast_connection_status():
    connections = [
        {
            "socketId": route["socketId"],
            "route_id": route["route_id"],
            "status": route["status"],
            "latitude": route["latitude"],
            "longitude": route["longitude"]
        } for route in all_routes
    ]
    socketio.emit("all_connections_update", connections)
    logger.info(f"Broadcasted connection status update to all clients")

# SocketIO event handlers
@socketio.on("connect")
def handle_connect():
    logger.info(f"New connection: SID={request.sid}")
    connected_routes[request.sid] = "Unknown"
    tracking_status[request.sid] = "started"
    user_count["count"] += 1
    broadcast_connection_status()

@socketio.on("register_route")
def handle_register_route(data):
    route_id = data.get("route_id", "").strip()
    formatted_route_id = route_id
    logger.info(f"Client {request.sid} registered route {formatted_route_id}")
    
    connected_routes[request.sid] = formatted_route_id
    if formatted_route_id not in route_subscriptions:
        route_subscriptions[formatted_route_id] = []
    if request.sid not in route_subscriptions[formatted_route_id]:
        route_subscriptions[formatted_route_id].append(request.sid)
    join_room(formatted_route_id)
    socketio.emit("registered", formatted_route_id, room=request.sid)
    broadcast_connection_status()

@socketio.on("subscribe")
def handle_subscribe(route_id):
    formatted_route_id = route_id.strip()
    logger.info(f"Client {request.sid} subscribed to {formatted_route_id}")
    if formatted_route_id not in route_subscriptions:
        route_subscriptions[formatted_route_id] = []
    if request.sid not in route_subscriptions[formatted_route_id]:
        route_subscriptions[formatted_route_id].append(request.sid)
    join_room(formatted_route_id)
    socketio.emit("subscribed", formatted_route_id, room=request.sid)

@socketio.on("unsubscribe")
def handle_unsubscribe(route_id):
    formatted_route_id = route_id
    logger.info(f"Client {request.sid} unsubscribed from {formatted_route_id}")
    if formatted_route_id in route_subscriptions and request.sid in route_subscriptions[formatted_route_id]:
        route_subscriptions[formatted_route_id].remove(request.sid)
        leave_room(formatted_route_id)
    socketio.emit("unsubscribed", formatted_route_id, room=request.sid)

@socketio.on("location_update")
def handle_location_update(data):
    route_id = data.get("route_id", "").strip()
    formatted_route_id = route_id
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    heading = data.get("heading")
    status = data.get("status")
    sid = data.get("socket_id")
    
    logger.info(f"Received location_update: {data}")
    
    existing_route = next((r for r in all_routes if r["route_id"] == formatted_route_id), None)
    if existing_route:
        if status == "stopped":
            existing_route.update({
                "status": "stopped",
                "latitude": None,
                "longitude": None,
                "heading": None,
                "socketId": None
            })
        else:
            existing_route.update({
                "latitude": latitude,
                "longitude": longitude,
                "heading": heading,
                "status": status,
                "socketId": sid
            })
    
    try:
        socketio.emit("location_update", {
            "route_id": formatted_route_id,
            "latitude": latitude,
            "longitude": longitude,
            "heading": heading,
            "status": status
        }, room=formatted_route_id)
        logger.info(f"Broadcasted location_update for {formatted_route_id}")
        broadcast_connection_status()
    except Exception as e:
        logger.error(f"Error broadcasting location_update: {e}")
    
    if status != "stopped" and is_in_college(longitude, latitude):
        logger.info(f"Bus {formatted_route_id} is in college")
        log_data(formatted_route_id)
    
    return {"status": "received"}

@socketio.on("disconnect")
def handle_disconnect():
    session_id = request.sid
    if session_id in connected_routes:
        route_id = connected_routes[session_id]
        formatted_route_id = route_id
        existing_route = next((r for r in all_routes if r["route_id"] == formatted_route_id), None)
        if existing_route:
            existing_route.update({
                "status": "stopped",
                "latitude": None,
                "longitude": None,
                "heading": None,
                "socketId": None
            })
            socketio.emit("location_update", {
                "route_id": formatted_route_id,
                "status": "stopped"
            }, room=formatted_route_id)
        if formatted_route_id in route_subscriptions:
            route_subscriptions[formatted_route_id].remove(session_id)
        del connected_routes[session_id]
        del tracking_status[session_id]
        socketio.emit("server_message", {"message": f"Route {formatted_route_id} disconnected!"}, room=formatted_route_id)
        logger.info(f"Disconnected: SID={session_id}, Route={formatted_route_id}")
        broadcast_connection_status()

@socketio.on("admin_disconnect_socket")
def handle_admin_disconnect_socket(data):
    socket_id = data.get("socket_id")
    if not socket_id:
        response = {"status": "error", "message": "No socket ID provided"}
        socketio.emit("admin_disconnect_response", response, room=request.sid)
        return
    
    logger.info(f"Admin disconnect request for socket: {socket_id}")
    
    temp = [r["socketId"] for r in all_routes if r["socketId"]]
    if socket_id not in temp:
        response = {"status": "error", "message": f"Socket ID {socket_id} not found"}
        socketio.emit("admin_disconnect_response", response, room=request.sid)
        return
    
    route_id = connected_routes.get(socket_id, "Unknown")
    formatted_route_id = route_id
    socketio.emit("force_disconnect", {
        "message": "Disconnected by administrator",
        "socket_id": socket_id,
        "route_id": formatted_route_id
    }, room=socket_id)
    
    if socket_id in tracking_status:
        tracking_status[socket_id] = "stopped"
    
    existing_route = next((r for r in all_routes if r["route_id"] == formatted_route_id), None)
    if existing_route:
        existing_route.update({
            "status": "stopped",
            "latitude": None,
            "longitude": None,
            "heading": None,
            "socketId": None
        })
        socketio.emit("location_update", {
            "route_id": formatted_route_id,
            "status": "stopped"
        }, room=formatted_route_id)
    
    response = {
        "status": "success",
        "message": f"Disconnect signal sent to socket {socket_id} (route {formatted_route_id})"
    }
    socketio.emit("admin_disconnect_response", response, room=request.sid)
    broadcast_connection_status()

@socketio.on("join_room")
def handle_join(data):
    room = data["room"]
    sender = data["sender"]
    join_room(room)
    send({"sender": "System", "message": f"{sender} joined {room}"}, room=room)
    
    cursor = db_conn.cursor()
    cursor.execute("SELECT sender, message, timestamp FROM chat WHERE room = ? ORDER BY timestamp ASC", (room,))
    messages = [{"sender": row[0], "message": row[1], "timestamp": row[2]} for row in cursor.fetchall()]
    socketio.emit("chat_history", {"room": room, "messages": messages}, room=request.sid)

@socketio.on("leave_room")
def handle_leave(data):
    room = data["room"]
    sender = data["sender"]
    leave_room(room)
    send({"sender": "System", "message": f"{sender} left {room}"}, room=room)

@socketio.on("send_message")
def handle_message(data):
    room = data["room"]
    sender = data["sender"]
    message = data["message"]
    
    cursor = db_conn.cursor()
    cursor.execute("INSERT INTO chat (room, sender, message) VALUES (?, ?, ?)", (room, sender, message))
    db_conn.commit()
    
    socketio.emit("chat_message", {
        "sender": sender,
        "message": message,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }, room=room)

if __name__ == "__main__":
    try:
        socketio.run(app, host="0.0.0.0", port=PORT, debug=True)
    finally:
        db_conn.close()