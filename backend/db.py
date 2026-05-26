"""
db.py — SQLite persistence layer for NetworkIQ WhatsApp bot.

Each user is identified by their WhatsApp phone number (E.164 format).
Their processed LinkedIn DataFrame is stored as JSON in a local SQLite file.
"""
import sqlite3
import json
import io
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

import pandas as pd

# On Render: use /data (persistent disk). Locally: use the backend directory.
_RENDER_DATA = Path("/data")
DB_PATH = (_RENDER_DATA / "networkiq.db") if _RENDER_DATA.exists() else (Path(__file__).parent / "networkiq.db")


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create tables if they don't exist. Called on app startup."""
    with _get_conn() as conn:
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
    """Return True if phone has uploaded data."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT 1 FROM users WHERE phone = ?", (phone,)
        ).fetchone()
    return row is not None


def save_user_data(phone: str, df: pd.DataFrame):
    """Persist a processed DataFrame for a phone number."""
    data_json = df.to_json(orient="records", date_format="iso")
    now = datetime.utcnow().isoformat()
    with _get_conn() as conn:
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
    """Load a user's DataFrame from SQLite. Returns None if not found."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT data_json FROM users WHERE phone = ?", (phone,)
        ).fetchone()
    if row is None:
        return None
    return pd.read_json(io.StringIO(row["data_json"]), orient="records")


def update_user_connection_email(phone: str, full_name: str, company: str, email: str) -> bool:
    """
    Updates the email for a specific connection in the user's stored DataFrame.
    Matches primarily by full name and company to ensure accuracy.
    """
    df = load_user_data(phone)
    if df is None:
        return False
        
    if 'full_name' in df.columns:
        mask = (df['full_name'].str.lower() == full_name.lower()) & (df['company_clean'].astype(str).str.lower().str.contains(company.lower(), regex=False, na=False))
        if not mask.any():
            mask = (df['full_name'].str.lower() == full_name.lower())
    else:
        return False
        
    if not mask.any():
        return False
        
    if 'Email Address' not in df.columns:
        df['Email Address'] = ""
        
    df.loc[mask, 'Email Address'] = email
    save_user_data(phone, df)
    return True


def get_user_info(phone: str) -> Optional[dict]:
    """Return user metadata (not the full DataFrame)."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT phone, total, uploaded_at FROM users WHERE phone = ?",
            (phone,)
        ).fetchone()
    return dict(row) if row else None


def delete_user_data(phone: str):
    """Delete all data for a user (reset)."""
    with _get_conn() as conn:
        conn.execute("DELETE FROM users WHERE phone = ?", (phone,))
        conn.execute("DELETE FROM user_state WHERE phone = ?", (phone,))
        conn.commit()


# ── Pagination state ───────────────────────────────────────────────────────────

def get_user_state(phone: str) -> dict:
    """Get pagination/conversation state for a user."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM user_state WHERE phone = ?", (phone,)
        ).fetchone()
    if row is None:
        return {"state": "idle", "last_query": None, "page": 0, "result_json": None}
    return dict(row)


def set_user_state(phone: str, state: str = "idle", last_query: str = None,
                   page: int = 0, result_json: str = None):
    """Upsert conversation state."""
    now = datetime.utcnow().isoformat()
    with _get_conn() as conn:
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
