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





def enrich_via_pdl(email: str, api_key: str, name: str = "", company: str = "") -> Optional[Dict]:
    """
    Call People Data Labs Person Enrichment API.
    Pass email + name + company for best match rate.
    Free tier: 1000 calls/month.
    """
    if not api_key or not email:
        return None

    params: dict = {"email": email, "min_likelihood": 2}
    if name:
        params["name"] = name
    if company:
        params["company"] = company

    print(f"[enrichment] PDL POST — email={email}, name={name or 'n/a'}, company={company or 'n/a'}")
    url = "https://api.peopledatalabs.com/v2/person/enrich"

    import json as _json
    body = _json.dumps(params).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "X-Api-Key": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )
    data = None
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = _json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        print(f"[enrichment] PDL HTTP {e.code}: {raw[:400]}")
        try:
            data = _json.loads(raw)
        except Exception:
            data = None
    except Exception as ex:
        print(f"[enrichment] PDL request error: {ex}")
        data = None

    status = data.get("status") if data else "None"
    print(f"[enrichment] PDL status={status} | likelihood={data.get('likelihood','?') if data else '?'}")

    if not data or data.get("status") != 200:
        print(f"[enrichment] PDL: no match — status={status} | {str(data)[:300]}")
        return None



    p = data.get("data", {})

    # ── LinkedIn slug ──────────────────────────────────────────────────
    raw_linkedin = p.get("linkedin_url") or ""
    if raw_linkedin:
        linkedin_slug = raw_linkedin.replace("https://www.linkedin.com/in/", "") \
                                    .replace("https://linkedin.com/in/", "") \
                                    .replace("linkedin.com/in/", "") \
                                    .strip("/")
    else:
        linkedin_slug = None

    # ── Social handles ─────────────────────────────────────────────────
    twitter_handle = p.get("twitter_username") or None
    github_handle  = p.get("github_username")  or None

    # ── Location ───────────────────────────────────────────────────────
    loc = p.get("location_name") or ""

    # ── Current job ────────────────────────────────────────────────────
    job_title   = p.get("job_title", "")
    job_company = p.get("job_company_name", "")
    if job_title and job_company:
        current_job = f"{job_title.title()} at {job_company.title()}"
    elif job_title:
        current_job = job_title.title()
    else:
        current_job = None

    # ── Headline ───────────────────────────────────────────────────────
    headline = p.get("headline") or None

    # ── Years of experience ────────────────────────────────────────────
    years_exp = p.get("inferred_years_experience") or None

    # ── Phone number (pick first mobile/work number) ───────────────────
    phone = None
    phones = p.get("phone_numbers") or []
    if phones:
        phone = phones[0]

    # ── Personal email ─────────────────────────────────────────────────
    personal_email = p.get("recommended_personal_email") or None
    if not personal_email:
        personal_emails = p.get("personal_emails") or []
        if personal_emails:
            personal_email = personal_emails[0]

    # ── LinkedIn connections ───────────────────────────────────────────
    connections = p.get("linkedin_connections") or None

    # ── Career history — last 3 past roles (excluding current) ────────
    past_experience = []
    for exp in p.get("experience", []):
        if exp.get("is_primary"):
            continue
        title   = (exp.get("title") or {}).get("name", "")
        company = (exp.get("company") or {}).get("name", "")
        end     = exp.get("end_date", "")
        if title and company:
            year = end[:4] if end else ""
            label = f"{title.title()} @ {company.title()}"
            if year:
                label += f" (until {year})"
            past_experience.append(label)
        if len(past_experience) >= 3:
            break

    # ── Education — up to 2, deduplicated ─────────────────────────────
    seen_schools = set()
    education = []
    for edu in p.get("education", []):
        school = (edu.get("school") or {}).get("name", "")
        if not school or school in seen_schools:
            continue
        seen_schools.add(school)
        degrees = edu.get("degrees", [])
        degree = degrees[0].title() if degrees else ""
        education.append(f"{degree} @ {school.title()}".strip(" @"))
        if len(education) >= 2:
            break

    # ── Industry ───────────────────────────────────────────────────────
    industry = (p.get("industry") or "").title()

    result = {
        "pdl_linkedin":        linkedin_slug,
        "pdl_twitter":         twitter_handle,
        "pdl_github":          github_handle,
        "pdl_location":        loc.title() if loc else "",
        "pdl_education":       education,
        "pdl_job":             current_job,
        "pdl_full_name":       p.get("full_name", ""),
        "pdl_industry":        industry,
        "pdl_headline":        headline,
        "pdl_years_exp":       years_exp,
        "pdl_phone":           phone,
        "pdl_personal_email":  personal_email,
        "pdl_connections":     connections,
        "pdl_past_experience": past_experience,
    }

    print(f"[enrichment] PDL success for {p.get('full_name','?')}: job={current_job}, phone={'yes' if phone else 'no'}, connections={connections}")
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
