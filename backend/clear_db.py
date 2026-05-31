import os
import psycopg2
import sqlite3

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    print(f"Connecting to PostgreSQL on Render...")
    try:
        # Handle internal Render URLs
        needs_ssl = "pooler.supabase.com" in DATABASE_URL or "supabase.co" in DATABASE_URL
        conn = psycopg2.connect(DATABASE_URL, sslmode="require") if needs_ssl else psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("DELETE FROM users;")
        cur.execute("DELETE FROM user_state;")
        conn.commit()
        print("✅ PostgreSQL database successfully cleared!")
    except Exception as e:
        print(f"❌ Error clearing PostgreSQL database: {e}")
else:
    print("No DATABASE_URL found. Checking for SQLite...")
    DB_PATH = "/data/networkiq.db" if os.path.exists("/data") else "networkiq.db"
    if os.path.exists(DB_PATH):
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.execute("DELETE FROM users;")
            conn.execute("DELETE FROM user_state;")
            conn.commit()
            print(f"✅ SQLite database ({DB_PATH}) successfully cleared!")
        except Exception as e:
            print(f"❌ Error clearing SQLite database: {e}")
    else:
        print(f"❌ No database found at {DB_PATH}")
