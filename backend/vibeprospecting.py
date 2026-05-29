"""
vibeprospecting.py — Explorium/Vibe Prospecting API integration.

Enriches NetworkIQ's own LinkedIn network data with cold B2B prospects
from Explorium's 500M+ contact database (the engine behind vibeprospecting.ai).

Correct API endpoints (from official OpenAPI spec):
  Match businesses:  POST /v1/businesses/match
  Fetch prospects:   POST /v1/prospects
  Enrich contacts:   POST /v1/prospects/enrichments/contacts_information (bulk)

Filter format:  {"field": {"values": [...]}}  OR  {"field": {"value": ...}}
"""
import json
import urllib.request
from typing import Optional, List, Dict

EXPLORIUM_BASE = "https://api.explorium.ai"


# ─────────────────────────────────────────────────────────────────────────────
# Internal HTTP helper
# ─────────────────────────────────────────────────────────────────────────────

def _post(path: str, payload: dict, api_key: str, timeout: int = 12) -> Optional[dict]:
    """POST to Explorium REST API. path must start with /v1/..."""
    url = f"{EXPLORIUM_BASE}{path}"
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "api_key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw)
    except Exception as e:
        print(f"[vibeprospecting] Error calling {path}: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Business matching
# ─────────────────────────────────────────────────────────────────────────────

def _match_business_id(company: str, api_key: str) -> Optional[str]:
    """
    Resolve company name → Explorium business_id for accurate prospect filtering.

    Endpoint: POST /v1/businesses/match
    Payload:  {"businesses_to_match": [{"name": "Google"}]}
    Response: {"matched_businesses": [{"business_id": "abc123", ...}]}
    """
    payload = {"businesses_to_match": [{"name": company}]}
    result = _post("/v1/businesses/match", payload, api_key)

    if not result:
        return None

    matched = result.get("matched_businesses", [])
    if matched and isinstance(matched, list):
        bid = matched[0].get("business_id")
        if bid:
            print(f"[vibeprospecting] Resolved '{company}' → business_id={bid}")
            return bid

    print(f"[vibeprospecting] Could not resolve business_id for '{company}', will use name filter")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Prospect search
# ─────────────────────────────────────────────────────────────────────────────

def fetch_prospects(
    company: str,
    job_title: str,
    api_key: str,
    limit: int = 5,
    seniority: Optional[str] = None,
) -> List[Dict]:
    """
    Find B2B prospects at a company matching a job title.

    Endpoint: POST /v1/prospects
    Filter format: {"field": {"values": [...]}}

    Args:
        company:   Target company name (e.g. "Google")
        job_title: Role to search for (e.g. "Recruiter")
        api_key:   Explorium API key
        limit:     Max results (default 5)
        seniority: Optional level hint mapped to job_level filter

    Returns:
        List of normalised prospect dicts tagged source="vibe".
    """
    if not api_key:
        print("[vibeprospecting] No API key configured — skipping search")
        return []

    # ── Build filters ────────────────────────────────────────────────────────
    filters: dict = {
        "job_title": {
            "values": [job_title],
            "include_related_job_titles": True,
        },
        "has_email": {"value": True},       # only return prospects we can contact
    }

    # Try to resolve business_id for precise matching; fall back to company_name
    business_id = _match_business_id(company, api_key)
    if business_id:
        filters["business_id"] = {"values": [business_id]}
    else:
        filters["company_name"] = {"values": [company]}

    # Map our seniority labels to Explorium's job_level taxonomy
    _SENIORITY_MAP = {
        "Intern":    ["junior"],
        "Junior":    ["junior", "non-managerial"],
        "Mid-level": ["senior non-managerial", "non-managerial"],
        "Senior":    ["senior non-managerial", "manager"],
        "Lead":      ["manager", "director"],
        "Executive": ["vp", "c-suite", "cxo", "president", "founder"],
    }
    if seniority and seniority in _SENIORITY_MAP:
        filters["job_level"] = {"values": _SENIORITY_MAP[seniority]}

    payload = {
        "mode": "full",
        "size": limit,
        "page_size": limit,
        "page": 1,
        "filters": filters,
    }

    print(f"[vibeprospecting] Fetching prospects at '{company}' with title='{job_title}'")
    result = _post("/v1/prospects", payload, api_key)

    if not result:
        return []

    raw_prospects = result.get("data", [])
    if not isinstance(raw_prospects, list):
        raw_prospects = []

    print(f"[vibeprospecting] Got {len(raw_prospects)} raw prospects")

    output = []
    for p in raw_prospects:
        if not isinstance(p, dict):
            continue

        first = p.get("first_name", "")
        last  = p.get("last_name", "")
        full  = p.get("full_name") or f"{first} {last}".strip()
        if not full:
            continue

        # Pick best LinkedIn URL from array
        li_array = p.get("linkedin_url_array", [])
        li_clean  = ""
        for li in li_array:
            if li and "ACoA" not in li:   # prefer slug URLs over opaque IDs
                li_clean = li
                break
        if not li_clean and li_array:
            li_clean = li_array[0]

        output.append({
            "full_name":     full,
            "position":      p.get("job_title", job_title),
            "job_title_raw": p.get("job_title", job_title),
            "company":       p.get("company_name", company),
            "company_clean": p.get("company_name", company),
            "linkedin_url":  li_clean,
            "email":         "",           # fetched separately via enrich_prospect_contact
            "source":        "vibe",       # ← marks as Vibe Prospecting cold lead
            "prospect_id":   p.get("prospect_id", ""),
            "connected_on":  "",
            "category":      _guess_category(p.get("job_title", "")),
            "seniority":     _map_seniority(p.get("job_level_main", "")),
            "score":         0,
        })

    return output


# ─────────────────────────────────────────────────────────────────────────────
# Contact enrichment
# ─────────────────────────────────────────────────────────────────────────────

def enrich_prospect_contact(prospect_id: str, api_key: str) -> Optional[Dict]:
    """
    Get verified email + phone for a Vibe Prospecting prospect.

    Endpoint: POST /v1/prospects/enrichments/contacts_information  (bulk array)
    """
    if not prospect_id or not api_key:
        return None

    payload = [{"prospect_id": prospect_id}]
    result  = _post("/v1/prospects/enrichments/contacts_information", payload, api_key)

    if not result:
        return None

    # Response is a list of enriched records
    if isinstance(result, list) and result:
        item = result[0]
    elif isinstance(result, dict):
        # May be wrapped: {"data": [...]}
        data = result.get("data", [])
        item = data[0] if data else {}
    else:
        return None

    email = item.get("work_email") or item.get("email") or ""
    phone = item.get("direct_phone_number") or item.get("phone") or ""
    if email or phone:
        return {"email": email, "phone": phone}
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Hybrid search (main entry point)
# ─────────────────────────────────────────────────────────────────────────────

def hybrid_search(
    user_network: List[Dict],
    company: str,
    job_title: str,
    api_key: str,
    network_limit: int = 3,
    vibe_limit: int = 5,
    seniority: Optional[str] = None,
) -> List[Dict]:
    """
    Merge the user's own network results with Vibe Prospecting cold prospects.

    Warm connections come first. Vibe prospects follow, deduplicated by name.

    Returns list tagged:
      source="network"  → in the user's own LinkedIn network
      source="vibe"     → cold lead from Explorium/Vibe Prospecting
    """
    # ── Warm: own LinkedIn network ────────────────────────────────────────────
    warm = []
    for p in user_network[:network_limit]:
        p_copy = dict(p)
        p_copy.setdefault("source", "network")
        warm.append(p_copy)

    # ── Cold: Explorium / Vibe Prospecting ───────────────────────────────────
    cold_raw = fetch_prospects(company, job_title, api_key,
                               limit=vibe_limit, seniority=seniority)

    # Deduplicate: skip Vibe results whose name already appears in user's network
    network_names = {r.get("full_name", "").lower().strip() for r in user_network}
    cold = [p for p in cold_raw
            if p["full_name"].lower().strip() not in network_names]

    print(f"[vibeprospecting] Hybrid: {len(warm)} warm + {len(cold)} cold")
    return warm + cold


# ─────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────────────────────────────────────

def _guess_category(title: str) -> str:
    t = title.lower()
    if any(w in t for w in ["recruit", "talent", "hr", "human resource", "people"]):
        return "Recruiter/HR"
    if any(w in t for w in ["engineer", "developer", "swe", "software", "backend", "frontend"]):
        return "Software Engineer"
    if any(w in t for w in ["data", "scientist", "analyst", "ml", "ai"]):
        return "Data Scientist"
    if any(w in t for w in ["founder", "ceo", "cto", "cofounder"]):
        return "Founder/Entrepreneur"
    if any(w in t for w in ["market", "growth", "sales", "business dev"]):
        return "Marketing/Sales"
    return "Other"


def _map_seniority(job_level_main: str) -> str:
    m = {
        "junior": "Junior",
        "non-managerial": "Mid-level",
        "senior non-managerial": "Senior",
        "manager": "Lead",
        "director": "Lead",
        "vp": "Executive",
        "c-suite": "Executive",
        "cxo": "Executive",
        "president": "Executive",
        "founder": "Executive",
    }
    return m.get((job_level_main or "").lower(), "Unknown")
