"""
LinkedIn Data Ingestion — supports:
  1. Raw Connections.csv  (the plain CSV)
  2. The full LinkedIn data export ZIP
     Extracts: Connections, Email Addresses, PhoneNumbers, Positions, Education

LinkedIn ZIP files (Complete_LinkedInDataExport_*.zip) contain CSV files
that use UTF-8-BOM encoding and sometimes have a note row at the top.
"""
import io
import zipfile
import pandas as pd
from typing import Union


# ── Column aliases → normalised names ────────────────────────────────────────
CONN_ALIASES = {
    "first name":   "first_name",
    "last name":    "last_name",
    "url":          "linkedin_url",
    "email address":"email",
    "email":        "email",
    "company":      "company",
    "position":     "position",
    "connected on": "connected_on",
}


def _read_li_csv(data: bytes, aliases: dict) -> pd.DataFrame:
    """
    Read a LinkedIn CSV from raw bytes.
    Handles:
      - UTF-8-BOM encoding
      - Note/metadata rows at top (skips up to 5 rows to find the header)
      - Both \r\n and \n line endings
    """
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        for skip in range(6):        # try skip 0,1,2,3,4,5 header rows
            try:
                buf = io.BytesIO(data)
                df  = pd.read_csv(buf, skiprows=skip, encoding=enc,
                                  on_bad_lines="skip", low_memory=False)
                # A valid LinkedIn CSV has at least 1 row and 2 columns
                if len(df) >= 1 and len(df.columns) >= 2:
                    # Check if the header row looks like real data columns
                    lowered = [c.strip().lower() for c in df.columns]
                    if any(k in lowered for k in aliases.keys()):
                        df.columns = lowered
                        return df  # Bug fix #17: early return stops all 18 combos
            except Exception:
                continue

    raise ValueError("Could not parse LinkedIn CSV — unrecognised format.")


def _normalise(df: pd.DataFrame, aliases: dict) -> pd.DataFrame:
    """Rename columns using alias map and ensure all expected cols exist."""
    rename_map = {col: aliases[col] for col in df.columns if col in aliases}
    df = df.rename(columns=rename_map)
    df = df.fillna("")
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].astype(str).str.strip()
    return df


def _read_connections(data: bytes) -> pd.DataFrame:
    df = _read_li_csv(data, CONN_ALIASES)
    df = _normalise(df, CONN_ALIASES)
    for col in ["first_name", "last_name", "company", "position",
                "connected_on", "email", "linkedin_url"]:
        if col not in df.columns:
            df[col] = ""
    df["full_name"] = (df["first_name"] + " " + df["last_name"]).str.strip()
    df = df[df["full_name"].str.len() > 0].reset_index(drop=True)
    return df


def _read_emails(data: bytes) -> pd.DataFrame:
    """Email Addresses.csv → {email_address}"""
    aliases = {"email address": "email_extra", "email": "email_extra"}
    try:
        df = _read_li_csv(data, aliases)
        df = _normalise(df, aliases)
        # LinkedIn Email Addresses.csv has one row with *all* your emails
        # First email is the primary address
        col = next((c for c in df.columns if "email" in c), None)
        if col:
            df = df.rename(columns={col: "email_extra"})
        return df
    except Exception:
        return pd.DataFrame()


def _read_phone_numbers(data: bytes) -> pd.DataFrame:
    """PhoneNumbers.csv → {phone_number, type}"""
    aliases = {
        "phone number":   "phone",
        "phonenumber":    "phone",
        "phone":          "phone",
        "number":         "phone",
        "type":           "phone_type",
    }
    try:
        df = _read_li_csv(data, aliases)
        df = _normalise(df, aliases)
        if "phone" in df.columns:
            return df[["phone"] + (["phone_type"] if "phone_type" in df.columns else [])]
        return pd.DataFrame()
    except Exception:
        return pd.DataFrame()


def _read_positions(data: bytes) -> pd.DataFrame:
    """Positions.csv — work history enrichment for the *user*, not connections."""
    return pd.DataFrame()   # not needed for connection enrichment right now


# ── Public API ────────────────────────────────────────────────────────────────

def ingest_csv(file_content: bytes) -> pd.DataFrame:
    """Ingest a raw Connections.csv file."""
    return _read_connections(file_content)


def ingest_zip(zip_bytes: bytes) -> tuple[pd.DataFrame, dict]:
    """
    Ingest a LinkedIn Complete Data Export ZIP.

    Returns
    -------
    df       : pd.DataFrame  — enriched connections
    meta     : dict          — summary of which files were found
    """
    found = {}
    connections_data = None
    email_data       = None
    phone_data       = None

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        infos = zf.infolist()
        total_csv_size = 0

        for info in infos:
            name = info.filename
            if not name.lower().endswith(".csv"):
                continue  # Skip all non-CSV files completely (like videos)

            # Protection against zip bombs
            total_csv_size += info.file_size
            if info.file_size > 50 * 1024 * 1024:
                raise ValueError("Security block: A single CSV file exceeds 50MB. Please remove unnecessarily large files.")
            if total_csv_size > 100 * 1024 * 1024:
                raise ValueError("Security block: Uncompressed CSV data exceeds 100MB limit.")

            lower = name.lower().replace(" ", "_")

            if "connection" in lower:
                connections_data = zf.read(name)
                found["connections"] = name
            elif "email" in lower and "address" in lower:
                email_data = zf.read(name)
                found["emails"] = name
            elif "phone" in lower:
                phone_data = zf.read(name)
                found["phones"] = name

        # Fallback: find any CSV with "connect" loosely
        if connections_data is None:
            for info in infos:
                name = info.filename
                if name.lower().endswith(".csv") and "connect" in name.lower():
                    if info.file_size > 50 * 1024 * 1024:
                        raise ValueError("Security block: Connections CSV exceeds 50MB.")
                    connections_data = zf.read(name)
                    found["connections"] = name
                    break

    if connections_data is None:
        raise ValueError(
            "Invalid file format! We could not find Connections.csv inside the upload. "
            "Please upload the direct downloaded ZIP file from LinkedIn."
        )

    df = _read_connections(connections_data)

    # Enrich: if Email Addresses file exists and connections don't have emails
    if email_data is not None:
        try:
            email_df = _read_emails(email_data)
            if "email_extra" in email_df.columns:
                primary = str(email_df["email_extra"].iloc[0]) if len(email_df) > 0 else ""
                # Only fill empty email fields (connections CSV email is per-connection)
                df["account_email"] = primary
                found["emails_enriched"] = True
        except Exception:
            pass

    # Enrich: phone numbers (from user's own profile — one number for all)
    if phone_data is not None:
        try:
            phone_df = _read_phone_numbers(phone_data)
            if "phone" in phone_df.columns and len(phone_df) > 0:
                df["account_phone"] = str(phone_df["phone"].iloc[0])
                found["phones_enriched"] = True
        except Exception:
            pass

    return df, found
