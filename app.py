from io import StringIO, BytesIO # अब दोनों को एक साथ इम्पोर्ट करें
from flask import Flask, request, jsonify, send_file
import os
import sqlite3
import csv
from io import StringIO
from flask_cors import CORS 

# Initialize Flask app
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) for front-end communication
CORS(app) 

# Database configuration
DATABASE = 'student_records.db'
PASSING_MARKS = 33 # This can be changed

# --- Database Setup Functions ---

# Function to get a database connection
def get_db():
    conn = sqlite3.connect(DATABASE)
    # Set row_factory to sqlite3.Row so results can be accessed like dictionaries
    conn.row_factory = sqlite3.Row 
    return conn

# Function to initialize the database (create table if it doesn't exist)
def init_db():
    with app.app_context():
        db = get_db()
        # Create the 'students' table
        db.execute('''
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                marks INTEGER NOT NULL
            );
        ''')
        db.commit()

# Initialize the database when the server starts
init_db()

# --- API Endpoints ---

# 1. Add Student (POST request to /students)
@app.route('/students', methods=['POST'])
def add_student():
    data = request.json
    name = data.get('name')
    marks = data.get('marks')
    
    # Basic validation
    if not name or marks is None:
        return jsonify({"error": "Name and marks are required"}), 400

    conn = get_db()
    conn.execute('INSERT INTO students (name, marks) VALUES (?, ?)', (name, marks))
    conn.commit()
    return jsonify({"message": "Student added successfully"}), 201

# 2. Get All Records (GET request to /students)
@app.route('/students', methods=['GET'])
def get_all_students():
    conn = get_db()
    students = conn.execute('SELECT * FROM students').fetchall()
    # Convert SQLite Row objects to a list of dictionaries
    students_list = [dict(row) for row in students]
    return jsonify(students_list)

# 3. Get Statistics (GET request to /stats)
@app.route('/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    # Fetch only marks for statistics calculation
    students = conn.execute('SELECT marks FROM students').fetchall()
    marks = [row['marks'] for row in students]
    
    total_students = len(marks)
    
    # Handle case with no records
    if not marks:
        return jsonify({
            "total": 0, "pass": 0, "fail": 0,
            "highest": "N/A", "lowest": "N/A"
        })

    # Statistics calculation
    pass_count = sum(1 for m in marks if m >= PASSING_MARKS)
    fail_count = total_students - pass_count
    highest = max(marks)
    lowest = min(marks)

    return jsonify({
        "total": total_students,
        "pass": pass_count,
        "fail": fail_count,
        "highest": highest,
        "lowest": lowest
    })
# app.py में download_csv() फ़ंक्शन को इससे बदलें:

# 4. Download CSV (GET request to /download)
@app.route('/download', methods=['GET'])
def download_csv():
    conn = get_db()
    # Fetch data, ordered by marks descending for the CSV output
    students = conn.execute('SELECT name, marks FROM students ORDER BY marks DESC').fetchall()
    
    si = StringIO() # अभी भी टेक्स्ट CSV बनाने के लिए StringIO का उपयोग करें
    cw = csv.writer(si)
    
    # Write Header
    cw.writerow(['Name', 'Marks'])
    # Write Data Rows
    cw.writerows(students)

    output = si.getvalue()
    
    # --- महत्वपूर्ण बदलाव यहाँ है: डेटा को बाइनरी (bytes) में एन्कोड करना ---
    bio = BytesIO()
    bio.write(output.encode('utf-8')) # स्ट्रिंग को बाइट्स में एन्कोड करें
    bio.seek(0) # स्ट्रीम की शुरुआत में वापस जाएँ
    
    # send_file को बाइनरी स्ट्रीम (BytesIO) भेजें
    return send_file(
        bio,
        mimetype='text/csv',
        download_name='student_records.csv',
        as_attachment=True
    )


# --- नई कार्यक्षमता: UPDATE और DELETE ---

# 5. Update Student Record (PUT request to /students/<id>)
@app.route('/students/<int:student_id>', methods=['PUT'])
def update_student(student_id):
    data = request.json
    name = data.get('name')
    marks = data.get('marks')
    
    if not name or marks is None:
        return jsonify({"error": "Name and marks are required for update"}), 400

    conn = get_db()
    # Execute SQL UPDATE command
    cursor = conn.execute(
        'UPDATE students SET name = ?, marks = ? WHERE id = ?',
        (name, marks, student_id)
    )
    conn.commit()
    
    if cursor.rowcount == 0:
        return jsonify({"error": f"Student with ID {student_id} not found"}), 404
        
    return jsonify({"message": f"Student ID {student_id} updated successfully"}), 200

# 6. Delete Student Record (DELETE request to /students/<id>)
@app.route('/students/<int:student_id>', methods=['DELETE'])
def delete_student(student_id):
    conn = get_db()
    # Execute SQL DELETE command
    cursor = conn.execute('DELETE FROM students WHERE id = ?', (student_id,))
    conn.commit()
    
    if cursor.rowcount == 0:
        return jsonify({"error": f"Student with ID {student_id} not found"}), 404
        
    return jsonify({"message": f"Student ID {student_id} deleted successfully"}), 200

# Run the application
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000)) 
    app.run(debug=False, host='0.0.0.0', port=port)
    # Run the server on default port 5000 in debug mode
    app.run(debug=True)