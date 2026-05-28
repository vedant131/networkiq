"""Data cleaning — dedup, title sanitisation, company normalisation."""
import re
import pandas as pd

# Remove emojis
_EMOJI_RE = re.compile(
    "[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0\U000024C2-\U0001F251]+",
    flags=re.UNICODE,
)

# Legal entity suffixes to strip from company names
_COMPANY_SUFFIX_RE = re.compile(
    r"\b(Inc\.?|LLC\.?|Ltd\.?|Corp\.?|Co\.?|GmbH|PLC|Pvt\.?|"
    r"Private\s+Limited|Limited)\\b",
    re.IGNORECASE,
)

# Domain-style noise (.com, .io etc)
_DOMAIN_SUFFIX_RE = re.compile(r"\.(com|io|co|org|net|in|ai)\b", re.IGNORECASE)

# Characters to strip after separator tokens
_SEP_RE = re.compile(r"[|•·–—►▶@].*$")

# Collapse whitespace / trailing punctuation
_CLEAN_WS = re.compile(r"\s{2,}")
_TRAIL_PUNCT = re.compile(r"[,.\-_]+$")


def clean_title(raw: str) -> str:
    """Sanitise a job title string."""
    if not raw:
        return ""
    t = _EMOJI_RE.sub("", raw)       # strip emojis
    t = _SEP_RE.sub("", t)           # strip everything after @, |, •, etc.
    t = re.sub(r"[^\w\s,./\-()\']", "", t)  # remove remaining special chars
    t = _CLEAN_WS.sub(" ", t).strip()
    t = _TRAIL_PUNCT.sub("", t).strip()
    return t


def normalize_company(name: str) -> str:
    """Strip legal suffixes and domain noise from company names.
    
    Bug fix: if stripping would produce a blank string, return the original
    cleaned name instead — companies named 'Solutions' or 'Tech' are real.
    """
    if not name:
        return ""
    n = _DOMAIN_SUFFIX_RE.sub("", name)
    n = _COMPANY_SUFFIX_RE.sub("", n)
    n = _CLEAN_WS.sub(" ", n).strip().strip(",").strip()
    # Never return blank — if stripping blanked it out, return original title-cased
    if not n:
        n = _CLEAN_WS.sub(" ", name).strip()
    return n


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Apply all cleaning steps and return a clean DataFrame."""
    df = df.copy()

    df["position_clean"] = df["position"].apply(clean_title)
    df["company_clean"] = df["company"].apply(normalize_company)

    # Deduplicate:
    # 1. Primary key: linkedin_url (most precise — same person on LinkedIn)
    # 2. Fallback: (full_name, company_clean, position_clean) — catches duplicates
    #    without a LinkedIn URL
    # Keep most recently connected row.
    df["_date"] = pd.to_datetime(df["connected_on"], errors="coerce")
    df = df.sort_values("_date", ascending=False)

    # Dedup by LinkedIn URL first (skip blank/nan URLs)
    has_url = df["linkedin_url"].str.strip().str.len() > 0
    deduped_url = df[has_url].drop_duplicates(subset=["linkedin_url"], keep="first")
    no_url = df[~has_url].drop_duplicates(
        subset=["full_name", "company_clean", "position_clean"], keep="first"
    )
    df = pd.concat([deduped_url, no_url]).sort_values("_date", ascending=False)
    df = df.drop(columns=["_date"]).reset_index(drop=True)

    return df
