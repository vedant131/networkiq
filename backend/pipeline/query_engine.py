"""
Natural-language query engine.
Parses user queries like "find recruiters at Google" into structured filters,
then filters + re-ranks the dataframe.
"""
import re
import json
import pandas as pd
from pipeline.ranker import rank_dataframe
from config import settings

# ── Intent keyword maps ────────────────────────────────────────────────────────
INTENT_CATEGORY_MAP = {
    "Software Engineer":       ["engineer", "developer", "programmer", "sde", "swe", "coder", "software"],
    "Recruiter/HR":            ["recruiter", "hr", "hiring", "talent", "headhunter", "staffing"],
    "Data Scientist":          ["data scientist", "ml", "machine learning", "ai researcher", "nlp", "data science"],
    "Founder/Entrepreneur":    ["founder", "ceo", "startup", "entrepreneur", "co-founder"],
    "Student":                 ["student", "intern", "fresher", "campus", "internship"],
    "Marketing/Sales":         ["marketing", "sales", "growth hacker", "seo", "brand"],
}

# Seniority signals in query
SENIORITY_MAP = {
    "Senior":    ["senior", "sr", "experienced", "veteran"],
    "Lead":      ["lead", "manager", "head", "director"],
    "Executive": ["executive", "vp", "cto", "ceo", "chief"],
    "Intern":    ["intern", "internship", "fresher", "entry level"],
    "Junior":    ["junior", "jr", "beginner"],
}

# Domain signals
DOMAIN_MAP = {
    "AI/ML":        ["ai", "machine learning", "deep learning", "llm", "nlp"],
    "Backend":      ["backend", "server side", "api"],
    "Frontend":     ["frontend", "ui", "react"],
    "DevOps/Cloud": ["devops", "cloud", "aws", "azure", "kubernetes"],
    "Finance":      ["finance", "fintech", "banking"],
}

# Words that indicate a club / organisation / program — NOT an employer
# Used to exclude false positives like "Google Developer Student Club"
_NON_EMPLOYER_WORDS = {
    "club", "chapter", "student", "society", "bootcamp", "ambassador",
    "volunteer", "community", "fellowship", "academy", "circle", "council",
    "association", "program", "programme", "initiative", "network", "forum",
    "cell", "wing", "committee", "team member", "member",
}


def _normalize(text: str) -> str:
    """Remove spaces and lowercase — so 'black rock' matches 'BlackRock'."""
    return re.sub(r'\s+', '', text.lower())


def _extract_offline(query: str) -> dict:
    """Rule-based intent extraction."""
    # Strip trailing punctuation so "black rock?" and "black rock" both work
    clean_query = re.sub(r'[^\w\s&.]', ' ', query).strip()
    q = clean_query.lower()

    categories = [cat for cat, kws in INTENT_CATEGORY_MAP.items() if any(kw in q for kw in kws)]
    seniorities = [sn for sn, kws in SENIORITY_MAP.items() if any(kw in q for kw in kws)]
    domains = [dm for dm, kws in DOMAIN_MAP.items() if any(kw in q for kw in kws)]

    # Extract company hint (after "at", "in", "from", "@")
    company_match = re.search(r"\b(?:at|in|from|@)\s+([A-Za-z0-9&.\s]+?)(?:\s+who|\s+that|\s*$)", clean_query, re.IGNORECASE)
    company_hint = company_match.group(1).strip() if company_match else None

    # Build keyword list for ranker
    keywords = re.findall(r"\b\w{3,}\b", q)

    return {
        "categories": categories,
        "seniorities": seniorities,
        "domains": domains,
        "company_hint": company_hint,
        "keywords": keywords,
        "label": query,
    }


def _extract_gemini(query: str) -> dict:
    """Gemini-powered intent extraction — free, no key needed via google.generativeai."""
    try:
        import google.generativeai as genai
        gemini_key = settings.__dict__.get('gemini_api_key', '') or __import__('os').getenv('GEMINI_API_KEY', '')
        if not gemini_key:
            return _extract_offline(query)
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""Extract search intent from this LinkedIn network query.
Return ONLY valid JSON with keys: categories (array), seniorities (array), domains (array),
company_hint (string or null), keywords (array of relevant words).

Valid categories: ["Software Engineer","Data Scientist","Recruiter/HR",
  "Founder/Entrepreneur","Student","Marketing/Sales","Other"]
Valid seniorities: ["Intern","Junior","Mid-level","Senior","Lead","Executive"]
Valid domains: ["AI/ML","Backend","Frontend","DevOps/Cloud","Finance","General"]

For company_hint, extract the exact company name as written (e.g. 'black rock' stays 'black rock').

Query: "{query}"
Return only valid JSON, no markdown, no code fences."""
        res = model.generate_content(prompt)
        # Strip any markdown fences Gemini might still add
        text = res.text.strip()
        for fence in ("```json", "```JSON", "```"):
            text = text.replace(fence, "")
        text = text.strip()
        parsed = json.loads(text)
        parsed.setdefault("label", query)
        parsed.setdefault("keywords", re.findall(r"\b\w{3,}\b", query.lower()))
        return parsed
    except Exception as e:
        print(f"[query_engine] Gemini error: {e} — using offline parser")
        return _extract_offline(query)


def _extract_openai(query: str) -> dict:
    """GPT-powered intent extraction with offline fallback."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        prompt = f"""Extract search intent from this LinkedIn network query.
Return JSON with keys: categories (array), seniorities (array), domains (array),
company_hint (string or null), keywords (array of relevant words).

Valid categories: ["Software Engineer","Data Scientist","Recruiter/HR",
  "Founder/Entrepreneur","Student","Marketing/Sales","Other"]

Query: "{query}"
Return only valid JSON."""

        res = client.chat.completions.create(
            model=settings.openai_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
        )
        parsed = json.loads(res.choices[0].message.content)
        parsed.setdefault("label", query)
        parsed.setdefault("keywords", re.findall(r"\b\w{3,}\b", query.lower()))
        return parsed
    except Exception as e:
        print(f"[query_engine] OpenAI error: {e} — using offline parser")
        return _extract_offline(query)


def _is_employer(company_val: str, hint_raw: str, hint_norm: str) -> bool:
    """
    True if company_val is a genuine employer matching the hint.

    Rules:
    1. Exact normalized match → always accept.
    2. Company starts with hint AND has ≤2 extra words AND none of those extra
       words are in _NON_EMPLOYER_WORDS (clubs, student groups, etc.).
    3. Normalized start-match (handles 'BlackRock' vs 'black rock').
    """
    c = str(company_val).lower().strip()
    c_norm = _normalize(c)

    # Exact match
    if c_norm == hint_norm:
        return True

    # Starts-with match
    if c.startswith(hint_raw):
        extra_str = c[len(hint_raw):].strip()
        extra_words = extra_str.split()
        if len(extra_words) <= 2:
            # Reject if any extra word is a non-employer signal
            if any(w in _NON_EMPLOYER_WORDS for w in extra_words):
                return False
            return True
        # More than 2 extra words → almost certainly a club/org
        return False

    # Normalized start-match (e.g. "blackrock" starts with "blackrock" for "black rock")
    if c_norm.startswith(hint_norm):
        return True

    return False


def process_query(df: pd.DataFrame, query: str, extra_filters: dict | None = None) -> tuple[list[dict], str]:
    """
    Parse query, filter df, re-rank, return (list_of_records, interpretation_label).
    """
    # Priority: Gemini (free) → OpenAI → offline rules
    gemini_key = __import__('os').getenv('GEMINI_API_KEY', '')
    if gemini_key:
        intent = _extract_gemini(query)
    elif settings.ai_mode == "openai" and settings.openai_api_key:
        intent = _extract_openai(query)
    else:
        intent = _extract_offline(query)

    filtered = df.copy()

    # Apply category filter
    if intent.get("categories"):
        filtered = filtered[filtered["category"].isin(intent["categories"])]

    # Apply seniority filter
    if intent.get("seniorities"):
        filtered = filtered[filtered["seniority"].isin(intent["seniorities"])]

    # Apply domain filter
    if intent.get("domains"):
        filtered = filtered[filtered["domain"].isin(intent["domains"])]

    # Apply company hint — smart employer matching
    # Excludes club/org/student members even if the company name contains the hint
    if intent.get("company_hint"):
        hint_raw = intent["company_hint"].lower().strip()
        hint_norm = _normalize(hint_raw)

        strict = filtered[
            filtered["company_clean"].apply(
                lambda c: _is_employer(c, hint_raw, hint_norm)
            )
        ]
        if len(strict) > 0:
            filtered = strict
        else:
            # Fallback: plain substring match if strict found nothing
            filtered = filtered[
                filtered["company_clean"].str.lower().str.contains(
                    re.escape(hint_raw), regex=True, na=False
                )
            ]

    # Apply extra UI filters
    if extra_filters:
        for field, values in extra_filters.items():
            if values and field in filtered.columns:
                filtered = filtered[filtered[field].isin(values)]

    had_company_filter = bool(intent.get("company_hint"))

    # If nothing matched AND we had a specific company filter, return empty
    if len(filtered) == 0 and had_company_filter:
        return [], f"No one in your network at {intent['company_hint'].title()}"

    # If nothing matched for any other reason, fall back to full set with keyword ranking
    if len(filtered) == 0:
        filtered = df.copy()

    # Re-rank with query keywords
    ranked = rank_dataframe(filtered, intent.get("keywords", []))

    label = intent.get("label", query)
    if intent.get("categories"):
        label = f"Showing {', '.join(intent['categories'])}"
        if intent.get("seniorities"):
            label += f" · {', '.join(intent['seniorities'])}"
        if intent.get("company_hint"):
            label += f" · at {intent['company_hint']}"
    elif intent.get("company_hint") and not intent.get("categories"):
        label = f"Who works at {intent['company_hint'].title()}"

    return ranked.to_dict("records"), label
