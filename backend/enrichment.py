import urllib.request
import urllib.parse
import json
from typing import Optional, Dict

def _fetch_json(url: str, headers: dict = None, data: bytes = None) -> dict:
    try:
        req = urllib.request.Request(url, headers=headers or {}, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"[enrichment] API request failed to {url}: {e}")
        return None

def _find_via_hunter(first_name: str, last_name: str, company: str, api_key: str) -> Optional[Dict]:
    if not api_key: return None
    print(f"[enrichment] Trying Hunter.io for {first_name} {last_name} @ {company}...")
    
    url = "https://api.hunter.io/v2/email-finder?" + urllib.parse.urlencode({
        "first_name": first_name,
        "last_name": last_name,
        "company": company,
        "api_key": api_key
    })
    
    data = _fetch_json(url)
    if data and isinstance(data.get("data"), dict) and data["data"].get("email"):
        return {
            "email": data["data"]["email"],
            "score": data["data"].get("score", 0),
            "source": "Hunter.io"
        }
    return None

def _find_via_apollo(first_name: str, last_name: str, company: str, api_key: str) -> Optional[Dict]:
    if not api_key: return None
    print(f"[enrichment] Trying Apollo.io for {first_name} {last_name} @ {company}...")
    
    url = "https://api.apollo.io/v1/people/match"
    payload = json.dumps({
        "first_name": first_name,
        "last_name": last_name,
        "organization_name": company
    }).encode("utf-8")
    
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": api_key
    }
    
    data = _fetch_json(url, headers, payload)
    if data and isinstance(data.get("person"), dict) and data["person"].get("email"):
        return {
            "email": data["person"]["email"],
            "score": 95, # Apollo returns verified mostly
            "source": "Apollo.io"
        }
    return None

def _find_via_snov(first_name: str, last_name: str, company: str, client_id: str, client_secret: str) -> Optional[Dict]:
    if not client_id or not client_secret: return None
    print(f"[enrichment] Trying Snov.io for {first_name} {last_name} @ {company}...")
    
    # 1. Get access token
    token_url = "https://api.snov.io/v1/oauth/access_token"
    token_payload = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }).encode("utf-8")
    
    token_data = _fetch_json(token_url, {"Content-Type": "application/x-www-form-urlencoded"}, token_payload)
    if not token_data or "access_token" not in token_data:
        return None
        
    access_token = token_data["access_token"]
    
    domain = company.lower().replace(" ", "") + ".com"
    
    url = "https://api.snov.io/v1/get-emails-from-names"
    payload = json.dumps({
        "firstName": first_name,
        "lastName": last_name,
        "domain": domain
    }).encode("utf-8")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    
    data = _fetch_json(url, headers, payload)
    if data and isinstance(data.get("data"), list) and len(data["data"]) > 0:
        first_match = data["data"][0]
        if isinstance(first_match, dict) and isinstance(first_match.get("emails"), list) and len(first_match["emails"]) > 0:
            best_email = first_match["emails"][0]
            if isinstance(best_email, dict) and best_email.get("email"):
                return {
                    "email": best_email["email"],
                    "score": best_email.get("probability", 80),
                    "source": "Snov.io"
                }
    return None

def _find_via_skrapp(first_name: str, last_name: str, company: str, api_key: str) -> Optional[Dict]:
    if not api_key: return None
    print(f"[enrichment] Trying Skrapp.io for {first_name} {last_name} @ {company}...")
    
    url = "https://api.skrapp.io/api/v2/find?" + urllib.parse.urlencode({
        "firstName": first_name,
        "lastName": last_name,
        "company": company
    })
    
    headers = {
        "X-Access-Key": api_key,
        "Content-Type": "application/json"
    }
    
    data = _fetch_json(url, headers)
    if data and isinstance(data, dict) and data.get("email"):
        return {
            "email": data["email"],
            "score": data.get("accuracy", 80),
            "source": "Skrapp.io"
        }
    return None


def find_email_waterfall(first_name: str, last_name: str, company: str, settings) -> Optional[Dict]:
    """
    Attempts to find an email by hitting multiple APIs in sequence.
    Returns the first successful result to conserve credits.
    """
    
    # 1. Hunter.io
    res = _find_via_hunter(first_name, last_name, company, settings.hunter_api_key)
    if res: return res
    
    # 2. Apollo.io
    res = _find_via_apollo(first_name, last_name, company, settings.apollo_api_key)
    if res: return res
    
    # 3. Snov.io
    res = _find_via_snov(first_name, last_name, company, settings.snov_client_id, settings.snov_client_secret)
    if res: return res
    
    # 4. Skrapp.io
    res = _find_via_skrapp(first_name, last_name, company, settings.skrapp_api_key)
    if res: return res
    
    print(f"[enrichment] Waterfall exhausted. No email found for {first_name} {last_name}.")
    return None
