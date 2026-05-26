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


def _normalize(text: str) -> str:
    """Remove spaces and lowercase — so 'black rock' matches 'BlackRock'."""
    return re.sub(r'\s+', '', text.lower())


def _extract_offline(query: str) -> dict:
    """Rule-based intent extraction."""
    q = query.lower()

    categories = [cat for cat, kws in INTENT_CATEGORY_MAP.items() if any(kw in q for kw in kws)]
    seniorities = [sn for sn, kws in SENIORITY_MAP.items() if any(kw in q for kw in kws)]
    domains = [dm for dm, kws in DOMAIN_MAP.items() if any(kw in q for kw in kws)]

    # Extract company hint (after "at", "in", "from", "@")
    company_match = re.search(r"\b(?:at|in|from|@)\s+([A-Za-z0-9&.\s]+?)(?:\s+who|\s+that|$)", query, re.IGNORECASE)
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
Return only valid JSON, no markdown."""
        res = model.generate_content(prompt)
        text = res.text.strip().strip('```json').strip('```').strip()
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

    # Apply company hint — normalize spaces so 'black rock' matches 'BlackRock'
    if intent.get("company_hint"):
        hint_norm = _normalize(intent["company_hint"])
        hint_raw = intent["company_hint"].lower()
        filtered = filtered[
            filtered["company_clean"].str.lower().str.contains(hint_raw, regex=False, na=False) |
            filtered["company_clean"].apply(lambda c: hint_norm in _normalize(str(c)))
        ]

    # Apply extra UI filters
    if extra_filters:
        for field, values in extra_filters.items():
            if values and field in filtered.columns:
                filtered = filtered[filtered[field].isin(values)]

    # If nothing matched, fall back to full set with keyword ranking
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

    return ranked.to_dict("records"), label
