"""
db.py — Persistent storage layer for NetworkIQ WhatsApp bot.

Automatically uses:
  - PostgreSQL (Supabase) when DATABASE_URL is set  ← Production on Render
  - SQLite                                          ← Local development
"""
import json
import io
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

# ── Backend selection ──────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "")
_USE_PG = bool(DATABASE_URL)

if _USE_PG:
    import psycopg2
    import psycopg2.extras
    print(f"[db] Using PostgreSQL (Supabase)")
else:
    import sqlite3
    _RENDER_DATA = Path("/data")
    DB_PATH = (_RENDER_DATA / "networkiq.db") if _RENDER_DATA.exists() else (Path(__file__).parent / "networkiq.db")
    print(f"[db] Using SQLite at {DB_PATH}")


# ── Connection helpers ─────────────────────────────────────────────────────────

def _pg_conn():
    # Render internal URLs start with "postgresql://...@dpg-" — no SSL needed
    # External URLs (Supabase etc.) need SSL
    needs_ssl = "pooler.supabase.com" in DATABASE_URL or "supabase.co" in DATABASE_URL
    if needs_ssl:
        return psycopg2.connect(DATABASE_URL, sslmode="require")
    return psycopg2.connect(DATABASE_URL)

def _sq_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


# ── Init ───────────────────────────────────────────────────────────────────────

def init_db():
    """Create tables if they don't exist."""
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        phone        TEXT PRIMARY KEY,
                        total        INTEGER DEFAULT 0,
                        uploaded_at  TEXT,
                        data_json    TEXT
                    );
                    CREATE TABLE IF NOT EXISTS user_state (
                        phone       TEXT PRIMARY KEY,
                        state       TEXT DEFAULT 'idle',
                        last_query  TEXT,
                        page        INTEGER DEFAULT 0,
                        result_json TEXT,
                        updated_at  TEXT
                    );
                """)
            conn.commit()
    else:
        with _sq_conn() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    phone        TEXT PRIMARY KEY,
                    total        INTEGER DEFAULT 0,
                    uploaded_at  TEXT,
                    data_json    TEXT
                );
                CREATE TABLE IF NOT EXISTS user_state (
                    phone       TEXT PRIMARY KEY,
                    state       TEXT DEFAULT 'idle',
                    last_query  TEXT,
                    page        INTEGER DEFAULT 0,
                    result_json TEXT,
                    updated_at  TEXT
                );
            """)
            conn.commit()


# ── User data ──────────────────────────────────────────────────────────────────

def user_exists(phone: str) -> bool:
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM users WHERE phone = %s", (phone,))
                return cur.fetchone() is not None
    else:
        with _sq_conn() as conn:
            row = conn.execute("SELECT 1 FROM users WHERE phone = ?", (phone,)).fetchone()
        return row is not None


def save_user_data(phone: str, df: pd.DataFrame):
    """Persist a processed DataFrame for a phone number."""
    data_json = df.to_json(orient="records", date_format="iso")
    now = datetime.utcnow().isoformat()
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO users (phone, total, uploaded_at, data_json)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT(phone) DO UPDATE SET
                        total       = EXCLUDED.total,
                        uploaded_at = EXCLUDED.uploaded_at,
                        data_json   = EXCLUDED.data_json
                """, (phone, len(df), now, data_json))
            conn.commit()
    else:
        with _sq_conn() as conn:
            conn.execute("""
                INSERT INTO users (phone, total, uploaded_at, data_json)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(phone) DO UPDATE SET
                    total       = excluded.total,
                    uploaded_at = excluded.uploaded_at,
                    data_json   = excluded.data_json
            """, (phone, len(df), now, data_json))
            conn.commit()


def load_user_data(phone: str) -> Optional[pd.DataFrame]:
    """Load a user's DataFrame from the database."""
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT data_json FROM users WHERE phone = %s", (phone,))
                row = cur.fetchone()
    else:
        with _sq_conn() as conn:
            row = conn.execute("SELECT data_json FROM users WHERE phone = ?", (phone,)).fetchone()

    if row is None:
        return None
    return pd.read_json(io.StringIO(row[0]), orient="records")


def update_user_connection_email(phone: str, full_name: str, company: str, email: str) -> bool:
    """Updates the email for a specific connection in the user's stored DataFrame."""
    df = load_user_data(phone)
    if df is None:
        return False

    if 'full_name' not in df.columns:
        return False

    mask = (df['full_name'].str.lower() == full_name.lower()) & (
        df['company_clean'].astype(str).str.lower().str.contains(company.lower(), regex=False, na=False)
    )
    if not mask.any():
        mask = (df['full_name'].str.lower() == full_name.lower())

    if not mask.any():
        return False

    if 'Email Address' not in df.columns:
        df['Email Address'] = ""

    df.loc[mask, 'Email Address'] = email
    df.loc[mask, 'email'] = email
    save_user_data(phone, df)
    return True


def get_user_info(phone: str) -> Optional[dict]:
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT phone, total, uploaded_at FROM users WHERE phone = %s", (phone,))
                row = cur.fetchone()
        return dict(row) if row else None
    else:
        with _sq_conn() as conn:
            row = conn.execute(
                "SELECT phone, total, uploaded_at FROM users WHERE phone = ?", (phone,)
            ).fetchone()
        return dict(row) if row else None


def delete_user_data(phone: str):
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM users WHERE phone = %s", (phone,))
                cur.execute("DELETE FROM user_state WHERE phone = %s", (phone,))
            conn.commit()
    else:
        with _sq_conn() as conn:
            conn.execute("DELETE FROM users WHERE phone = ?", (phone,))
            conn.execute("DELETE FROM user_state WHERE phone = ?", (phone,))
            conn.commit()


# ── Pagination state ───────────────────────────────────────────────────────────

def get_user_state(phone: str) -> dict:
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("SELECT * FROM user_state WHERE phone = %s", (phone,))
                row = cur.fetchone()
    else:
        with _sq_conn() as conn:
            row = conn.execute("SELECT * FROM user_state WHERE phone = ?", (phone,)).fetchone()

    if row is None:
        return {"state": "idle", "last_query": None, "page": 0, "result_json": None}
    return dict(row)


def set_user_state(phone: str, state: str = "idle", last_query: str = None,
                   page: int = 0, result_json: str = None):
    now = datetime.utcnow().isoformat()
    if _USE_PG:
        with _pg_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO user_state (phone, state, last_query, page, result_json, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT(phone) DO UPDATE SET
                        state       = EXCLUDED.state,
                        last_query  = EXCLUDED.last_query,
                        page        = EXCLUDED.page,
                        result_json = EXCLUDED.result_json,
                        updated_at  = EXCLUDED.updated_at
                """, (phone, state, last_query, page, result_json, now))
            conn.commit()
    else:
        with _sq_conn() as conn:
            conn.execute("""
                INSERT INTO user_state (phone, state, last_query, page, result_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(phone) DO UPDATE SET
                    state       = excluded.state,
                    last_query  = excluded.last_query,
                    page        = excluded.page,
                    result_json = excluded.result_json,
                    updated_at  = excluded.updated_at
            """, (phone, state, last_query, page, result_json, now))
            conn.commit()
