"""
vibeprospecting.py — Explorium/Vibe Prospecting API integration.

Enriches NetworkIQ's own LinkedIn network data with cold B2B prospects
from Explorium's 500M+ contact database (the engine behind vibeprospecting.ai).

Flow:
    User asks "find recruiters at Google"
    → Step 1: Search own LinkedIn connections (warm leads)
    → Step 2: Call Explorium API for additional cold prospects
    → Step 3: Merge & return ranked combined list
"""
import json
import urllib.request
import urllib.parse
from typing import Optional, List, Dict

EXPLORIUM_BASE = "https://api.explorium.ai/v1"


def _post(endpoint: str, payload: dict | list, api_key: str, timeout: int = 12) -> Optional[dict | list]:
    """POST to Explorium REST API."""
    url = f"{EXPLORIUM_BASE}{endpoint}"
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
        print(f"[vibeprospecting] Error calling {endpoint}: {e}")
        return None


def _match_business_id(company: str, api_key: str) -> Optional[str]:
    """Resolve company name → Explorium business_id for accurate filtering."""
    payload = [{"name": company}]
    result = _post("/businesses/match", payload, api_key)
    if result and isinstance(result, list) and result[0]:
        bid = result[0].get("business_id")
        if bid:
            print(f"[vibeprospecting] Resolved '{company}' → business_id={bid}")
            return bid
    print(f"[vibeprospecting] Could not resolve business_id for '{company}', will use name filter")
    return None


def fetch_prospects(
    company: str,
    job_title: str,
    api_key: str,
    limit: int = 5,
    seniority: Optional[str] = None,
) -> List[Dict]:
    """
    Find B2B prospects at a company with a matching job title.

    Args:
        company:    Target company name (e.g. "Google")
        job_title:  Role/title to search for (e.g. "Senior Recruiter")
        api_key:    Explorium API key
        limit:      Max results to return (default 5)
        seniority:  Optional seniority level ("Director", "VP", "Manager", etc.)

    Returns:
        List of prospect dicts ready to be merged with LinkedIn network results.
    """
    if not api_key:
        print("[vibeprospecting] No API key configured — skipping Vibe Prospecting search")
        return []

    # Build filter payload
    filters: dict = {"job_title": [job_title]}

    # Try to resolve business_id first for precision
    business_id = _match_business_id(company, api_key)
    if business_id:
        filters["business_ids"] = [business_id]
    else:
        filters["company_name"] = [company]

    if seniority:
        filters["seniority"] = [seniority]

    fetch_payload = {"limit": limit, "filters": filters}
    print(f"[vibeprospecting] Fetching prospects: {fetch_payload}")
    result = _post("/prospects/fetch", fetch_payload, api_key)

    if not result:
        return []

    # Normalise response — Explorium can return {"data": [...]} or {"prospects": [...]} or just a list
    if isinstance(result, list):
        raw_prospects = result
    elif isinstance(result, dict):
        raw_prospects = result.get("data") or result.get("prospects") or []
    else:
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
        output.append({
            "full_name":     full,
            "position":      p.get("job_title", job_title),
            "company":       p.get("company_name", company),
            "company_clean": p.get("company_name", company),
            "linkedin_url":  p.get("linkedin_url", ""),
            "email":         p.get("email", ""),
            "source":        "vibe",          # ← marks it as a Vibe Prospecting result
            "prospect_id":   p.get("prospect_id", ""),
            "connected_on":  "",
            "category":      "",
            "score":         0,
        })

    return output


def enrich_prospect_contact(prospect_id: str, api_key: str) -> Optional[Dict]:
    """
    Get verified email + phone for a Vibe Prospecting prospect.

    Usage:
        contact = enrich_prospect_contact(prospect_id, api_key)
        email = contact.get("email")
        phone = contact.get("phone")
    """
    if not prospect_id or not api_key:
        return None

    payload = [{"prospect_id": prospect_id}]
    result  = _post("/prospects/enrichments/contacts_information", payload, api_key)

    if not result:
        return None
    if isinstance(result, list) and result:
        item = result[0]
    elif isinstance(result, dict):
        item = result
    else:
        return None

    email = item.get("work_email") or item.get("email") or ""
    phone = item.get("direct_phone_number") or item.get("phone") or ""
    if email or phone:
        return {"email": email, "phone": phone}
    return None


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

    Warm connections always come first. Vibe prospects follow, deduplicated by name.

    Returns:
        Combined list with each item tagged:
          source="network"  → in the user's own LinkedIn network
          source="vibe"     → discovered via Vibe Prospecting (cold lead)
    """
    # ── Warm: from user's own LinkedIn network ────────────────────────────────
    warm = []
    for p in user_network[:network_limit]:
        p_copy = dict(p)
        p_copy["source"] = "network"
        warm.append(p_copy)

    # ── Cold: from Explorium / Vibe Prospecting ───────────────────────────────
    cold_raw = fetch_prospects(company, job_title, api_key, limit=vibe_limit, seniority=seniority)

    # Deduplicate: skip Vibe results whose name already appears in user's network
    network_names = {r["full_name"].lower().strip() for r in user_network}
    cold = []
    for p in cold_raw:
        if p["full_name"].lower().strip() not in network_names:
            cold.append(p)

    print(f"[vibeprospecting] Hybrid: {len(warm)} warm + {len(cold)} cold prospects")
    return warm + cold
