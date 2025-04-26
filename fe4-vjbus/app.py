from flask import Flask, render_template,jsonify,send_file,request
import sqlite3,os

from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
API_KEY = os.getenv("API_KEY")
CLIENT_ID=os.getenv("CLIENT_ID")
ROUTES=os.getenv('ALL_ROUTES')
def get_db_connection():
    # conn = sqlite3.connect("../database.db")
    conn = sqlite3.connect("../../backend/be4-vjbus/database.db")
    conn.row_factory = sqlite3.Row
    return conn

# API for fetching logs
@app.route("/get_logs")
def get_logs():
    conn = get_db_connection()
    logs = conn.execute("SELECT * FROM logs").fetchall()
    conn.close()
    return jsonify([dict(row) for row in logs])

@app.route('/get-tom-tom-api-key', methods=['GET'])
def get_tom_tom_api_key():
    print("API_KEY:", API_KEY)
    return jsonify({"apiKey": API_KEY})

@app.route('/get-google-client-id', methods=['GET'])
def get_google_client_id():
    print("API_KEY:", CLIENT_ID)
    return jsonify({"apiKey": CLIENT_ID})

@app.route('/get-all-routes',methods=['GET'])
def get_all_routes():
    return ROUTES

@app.route('/')
def home():
    return render_template('index.html')  # Serves index.html
 
@app.route('/driver')
def driver():
    return render_template('driver.html')  # Serves driver.html

@app.route('/admin')
def admin():
    return render_template('admin.html')  # Serves admin.html


@app.route('/chat')
def chat():
    return render_template('chat.html')


@app.route('/allBus')
def allBus():
    return render_template('allBus.html')

@app.route('/superAdmin')
def superAdmin():
    return render_template('superAdmin.html')

@app.route('/favicon.png')
def icon():
    return send_file('favicon.png',mimetype='image/png')

@app.route('/bus.png')
def marker():
    return send_file('bus.png',mimetype='image/png')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3104, debug=True)
