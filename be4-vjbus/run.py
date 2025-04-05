import sqlite3
import pandas as pd

# Connect to SQLite database
conn = sqlite3.connect("/home/campus/vj-servers/backend/be4-vjbus/database.db")
cursor = conn.cursor()

# Create user_data table (if it doesn't exist)
cursor.execute("""
CREATE TABLE IF NOT EXISTS user_data (
    name TEXT NOT NULL,
    roll_no TEXT PRIMARY KEY,
    password TEXT NOT NULL
);
""")


# Load data from Excel file
file_path = '/home/campus/Downloads/3.xlsx'  # Replace with the actual file path
df = pd.read_excel(file_path)

# Extract Names and Roll Numbers
names = df['Name of the Student'].tolist()
roll_numbers = df['H. T. No.'].tolist()

# Insert data into user_data table
for name, roll_no in zip(names, roll_numbers):
    try:
        cursor.execute("INSERT INTO user_data (name, roll_no, password) VALUES (?, ?, ?)", 
                       (name, roll_no, roll_no))  # Password is same as roll_no
    except sqlite3.IntegrityError:
        print(f"Skipping duplicate entry for roll_no: {roll_no}")

# Commit changes and close connection
conn.commit()
conn.close()

print("User data inserted successfully!")
