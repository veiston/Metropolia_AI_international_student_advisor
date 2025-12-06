import sqlite3
import json

DB_PATH = "app.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS checklists
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)''')
    conn.commit()
    conn.close()

def save_checklist(checklist_data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO checklists (content) VALUES (?)", (json.dumps(checklist_data),))
    checklist_id = c.lastrowid
    conn.commit()
    conn.close()
    return checklist_id

def get_checklist(checklist_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT content FROM checklists WHERE id=?", (checklist_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return None
