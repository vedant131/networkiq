import urllib.request
import urllib.error
import urllib.parse
import json
from typing import Optional, Dict

def _fetch_json(url: str, headers: dict = None, data: bytes = None) -> dict:
    try:
        req = urllib.request.Request(url, headers=headers or {}, data=data)
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        # Read the error body — Hunter.io sends JSON with error details even on 4xx
        try:
            body = e.read().decode()
            print(f"[enrichment] HTTP {e.code} error from {url.split('?')[0]}: {body[:300]}")
            return json.loads(body)   # Return the error JSON so callers can inspect it
        except Exception:
            print(f"[enrichment] HTTP {e.code} error (unreadable body) from {url.split('?')[0]}")
            return {"_http_error": e.code}
    except Exception as e:
        print(f"[enrichment] Request failed to {url.split('?')[0]}: {e}")
        return None



# ── Known company → domain mapping (Hunter needs the domain, not company name) ─
_COMPANY_DOMAINS = {
    "google": "google.com",
    "alphabet": "google.com",
    "microsoft": "microsoft.com",
    "amazon": "amazon.com",
    "aws": "amazon.com",
    "meta": "meta.com",
    "facebook": "meta.com",
    "apple": "apple.com",
    "netflix": "netflix.com",
    "uber": "uber.com",
    "airbnb": "airbnb.com",
    "twitter": "twitter.com",
    "linkedin": "linkedin.com",
    "salesforce": "salesforce.com",
    "oracle": "oracle.com",
    "ibm": "ibm.com",
    "intel": "intel.com",
    "nvidia": "nvidia.com",
    "tesla": "tesla.com",
    "spotify": "spotify.com",
    "stripe": "stripe.com",
    "paypal": "paypal.com",
    "goldman sachs": "gs.com",
    "jp morgan": "jpmorgan.com",
    "jpmorgan": "jpmorgan.com",
    "morgan stanley": "morganstanley.com",
    "blackrock": "blackrock.com",
    "black rock": "blackrock.com",
    "mckinsey": "mckinsey.com",
    "deloitte": "deloitte.com",
    "pwc": "pwc.com",
    "kpmg": "kpmg.com",
    "accenture": "accenture.com",
    "infosys": "infosys.com",
    "wipro": "wipro.com",
    "tcs": "tcs.com",
    "tata consultancy": "tcs.com",
    "citi": "citi.com",
    "citibank": "citi.com",
    "hsbc": "hsbc.com",
    "barclays": "barclays.com",
    "turiance": "turiance.com",
    "turiance ai": "turiance.com",
}

def _company_to_domain(company: str) -> str:
    """Convert a company name to its likely email domain."""
    key = company.lower().strip()
    if key in _COMPANY_DOMAINS:
        return _COMPANY_DOMAINS[key]
    # Generic fallback: strip common suffixes and add .com
    clean = key.replace(" inc", "").replace(" ltd", "").replace(" llc", "").replace(" corp", "")
    clean = "".join(c for c in clean if c.isalnum())
    return f"{clean}.com"

def _find_via_hunter(first_name: str, last_name: str, company: str, api_key: str) -> Optional[Dict]:
    if not api_key: return None

    domain = _company_to_domain(company)
    print(f"[enrichment] Hunter.io: {first_name} {last_name} @ {company} → domain={domain}")

    url = "https://api.hunter.io/v2/email-finder?" + urllib.parse.urlencode({
        "first_name": first_name,
        "last_name":  last_name,
        "domain":     domain,
        "api_key":    api_key
    })

    # Hunter.io blocks Python-urllib user-agent — use a browser-like one
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    data = _fetch_json(url, headers=headers)
    print(f"[enrichment] Hunter.io raw response: {json.dumps(data)[:300] if data else 'None'}")

    if data and isinstance(data.get("data"), dict) and data["data"].get("email"):
        return {
            "email":  data["data"]["email"],
            "score":  data["data"].get("score", 0),
            "source": "Hunter.io"
        }

    # Log the actual error so we can see it in Render logs
    if data and data.get("errors"):
        print(f"[enrichment] Hunter.io error details: {data['errors']}")

    return None





def enrich_via_pdl(email: str, api_key: str) -> Optional[Dict]:
    """
    Call People Data Labs Person Enrichment API with a found email.
    Returns a dict with LinkedIn, Twitter, GitHub, location, education, job info.
    Free tier: 1000 calls/month.
    """
    if not api_key or not email:
        return None

    print(f"[enrichment] PDL enrichment for {email}...")
    url = "https://api.peopledatalabs.com/v2/person/enrich?" + urllib.parse.urlencode({
        "email": email,
        "pretty": "false"
    })

    headers = {
        "X-Api-Key": api_key,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }
    data = _fetch_json(url, headers)
    print(f"[enrichment] PDL raw response status: {data.get('status') if data else 'None'}")

    if not data or data.get("status") != 200:
        print(f"[enrichment] PDL: no match or error — {data.get('status') if data else 'no response'} | {str(data)[:200]}")
        return None


    p = data.get("data", {})

    # ── Extract clean fields ──────────────────────────────────────────
    # LinkedIn
    linkedin_url = None
    for profile in p.get("profiles", []):
        if profile.get("network") == "linkedin":
            linkedin_url = profile.get("url")
            break

    # Twitter
    twitter_handle = None
    for profile in p.get("profiles", []):
        if profile.get("network") == "twitter":
            twitter_handle = profile.get("username") or profile.get("url", "").split("/")[-1]
            break

    # GitHub
    github_handle = None
    for profile in p.get("profiles", []):
        if profile.get("network") == "github":
            github_handle = profile.get("username") or profile.get("url", "").split("/")[-1]
            break

    # Location
    loc = p.get("location_name") or p.get("city") or ""

    # Education
    education = []
    for edu in p.get("education", [])[:2]:
        school = edu.get("school", {}).get("name", "")
        degree = edu.get("degrees", [None])[0] or ""
        if school:
            education.append(f"{degree} @ {school}".strip(" @"))

    # Current job
    current_job = None
    for exp in p.get("experience", []):
        if exp.get("is_primary"):
            title = exp.get("title", {}).get("name", "")
            company = exp.get("company", {}).get("name", "")
            current_job = f"{title} at {company}".strip(" at")
            break

    result = {
        "pdl_linkedin":  linkedin_url,
        "pdl_twitter":   twitter_handle,
        "pdl_github":    github_handle,
        "pdl_location":  loc,
        "pdl_education": education,
        "pdl_job":       current_job,
        "pdl_full_name": p.get("full_name", ""),
        "pdl_industry":  p.get("industry", ""),
    }

    print(f"[enrichment] PDL success: {result}")
    return result


def find_email_waterfall(first_name: str, last_name: str, company: str, settings) -> Optional[Dict]:
    """
    Finds email via Hunter.io, then auto-enriches with People Data Labs.
    Returns combined result with email + social profile data.
    """
    # 1. Hunter.io — find the email
    res = _find_via_hunter(first_name, last_name, company, settings.hunter_api_key)
    if not res:
        print(f"[enrichment] Hunter exhausted. No email found for {first_name} {last_name}.")
        return None

    # 2. PDL — enrich with social profiles (auto, no user interaction needed)
    pdl_key = getattr(settings, "pdl_api_key", None) or __import__("os").getenv("PDL_API_KEY", "")
    if pdl_key and res.get("email"):
        pdl_data = enrich_via_pdl(res["email"], pdl_key)
        if pdl_data:
            res.update(pdl_data)

    return res


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
    Attempts to find an email. Currently simplified to use ONLY Hunter.io.
    """
    # 1. Hunter.io
    res = _find_via_hunter(first_name, last_name, company, settings.hunter_api_key)
    if res: return res
    
    print(f"[enrichment] Hunter exhausted. No email found for {first_name} {last_name}.")
    return None
