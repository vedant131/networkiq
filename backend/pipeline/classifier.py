"""
AI/NLP Classifier — two modes:
  Mode A (openai): GPT-4o-mini batched classification
  Mode B (offline): keyword-scoring rules
"""
import json
import re
import pandas as pd
from config import settings

# ── Keyword rule tables ────────────────────────────────────────────────────────

CATEGORY_RULES: dict[str, list[str]] = {
    "Software Engineer": [
        "engineer", "developer", "programmer", "sde", "swe", "coder",
        "software", "backend", "frontend", "fullstack", "full stack",
        "devops", "cloud", "platform", "infrastructure", "web dev",
        "mobile dev", "ios", "android", "architect", "tech lead", "engineering",
    ],
    "Data Scientist": [
        "data scientist", "ml engineer", "machine learning", "deep learning",
        "data analyst", "data engineer", "analytics", "ai researcher",
        "research scientist", "nlp", "computer vision", "statistician",
        "data science", "bi analyst", "business intelligence", "llm",
    ],
    "Recruiter/HR": [
        "recruiter", "recruiting", "talent", "hr", "human resources",
        "hrbp", "staffing", "hiring", "people operations", "people ops",
        "talent acquisition", "sourcer", "headhunter", "campus recruiter",
    ],
    "Founder/Entrepreneur": [
        "founder", "co-founder", "cofounder", "ceo", "chief executive",
        "entrepreneur", "managing director", "owner", "proprietor",
    ],
    "Student": [
        "student", "intern", "undergraduate", "graduate", "fresher",
        "bootcamp", "trainee", "apprentice", "b.tech", "m.tech",
        "pursuing", "final year", "campus ambassador", "scholar",
    ],
    "Marketing/Sales": [
        "marketing", "sales", "growth", "seo", "sem", "content",
        "brand", "digital marketing", "social media", "account manager",
        "business development", "bdr", "sdr", "product marketing",
        "demand generation", "account executive",
    ],
}

SENIORITY_RULES: dict[str, list[str]] = {
    "Intern":     ["intern", "trainee", "apprentice", "fresher", "entry level", "campus ambassador"],
    "Junior":     ["junior", "jr.", "jr ", "associate ", "entry "],
    "Mid-level":  [" ii ", "sde ii", " l4 ", " l5 ", "mid-level", "mid level"],
    "Senior":     ["senior", "sr.", "sr ", "principal", "staff engineer", "sde iii", "iii "],
    "Lead":       ["lead", "head of", "manager", "tech lead", "engineering lead", "director"],
    "Executive":  ["vp", "vice president", "cto", "coo", "cpo", "chief ", "president", "partner"],
}

DOMAIN_RULES: dict[str, list[str]] = {
    "AI/ML":           ["ai", "ml", "machine learning", "deep learning", "llm", "nlp", "computer vision", "research scientist"],
    "Backend":         ["backend", "server", "api", "database", "java", "python dev", "node", "golang"],
    "Frontend":        ["frontend", "react", "vue", "angular", "ui dev", "web dev"],
    "Full Stack":      ["full stack", "fullstack", "mern", "mean", "full-stack"],
    "DevOps/Cloud":    ["devops", "cloud", "aws", "azure", "gcp", "kubernetes", "docker", "sre", "infrastructure"],
    "Data Engineering":["data engineer", "etl", "pipeline", "spark", "hadoop", "databricks"],
    "Finance":         ["finance", "fintech", "banking", "investment", "trading", "quant"],
    "Healthcare":      ["health", "medical", "biotech", "pharma", "clinical"],
    "Product":         ["product manager", " pm", "pm ", "product lead", "product owner"],
    "Design":          ["design", "ux", "ui/ux", "figma", "graphic"],
}


def _best_match(text: str, rules: dict[str, list[str]]) -> str:
    """Return the key whose keywords appear most in text."""
    t = text.lower()
    scores = {k: sum(1 for kw in kws if kw in t) for k, kws in rules.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "Other"


def _classify_one_offline(title: str, company: str) -> dict:
    combined = f"{title} {company}"
    category = _best_match(combined, CATEGORY_RULES)
    seniority = _best_match(title, SENIORITY_RULES)
    domain    = _best_match(combined, DOMAIN_RULES)
    return {
        "category": category if category != "Other" else "Other",
        "seniority": seniority if seniority != "Other" else "Mid-level",
        "domain":    domain    if domain    != "Other" else "General",
    }


# ── OpenAI batched classification ─────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert LinkedIn network analyst. Classify each connection.
Return ONLY a JSON array (same order as input) where each element has:
  "category": one of ["Software Engineer","Data Scientist","Recruiter/HR",
    "Founder/Entrepreneur","Student","Marketing/Sales","Other"]
  "seniority": one of ["Intern","Junior","Mid-level","Senior","Lead","Executive","Unknown"]
  "domain": string (e.g. "AI/ML","Backend","Frontend","DevOps/Cloud","Finance","General")
No explanation, no markdown, just the JSON array."""


def _classify_batch_openai(batch: list[dict]) -> list[dict]:
    """Classify a batch of connections via GPT-4o-mini. Falls back to offline on error."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)

        user_content = json.dumps([
            {"title": row["position_clean"], "company": row["company_clean"]}
            for row in batch
        ])

        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
        )
        results = json.loads(response.choices[0].message.content)
        if isinstance(results, list) and len(results) == len(batch):
            return results
    except Exception as e:
        print(f"[classifier] OpenAI error — falling back to offline: {e}")

    # Fallback
    return [_classify_one_offline(r["position_clean"], r["company_clean"]) for r in batch]


# ── Public API ────────────────────────────────────────────────────────────────

def classify_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Add category, seniority, domain columns to dataframe."""
    df = df.copy()
    records = df[["position_clean", "company_clean"]].to_dict("records")

    if settings.ai_mode == "openai" and settings.openai_api_key:
        # Batched OpenAI calls
        results: list[dict] = []
        for i in range(0, len(records), settings.batch_size):
            batch = records[i: i + settings.batch_size]
            results.extend(_classify_batch_openai(batch))
    else:
        results = [_classify_one_offline(r["position_clean"], r["company_clean"]) for r in records]

    df["category"] = [r.get("category", "Other") for r in results]
    df["seniority"] = [r.get("seniority", "Mid-level") for r in results]
    df["domain"]    = [r.get("domain", "General") for r in results]
    return df
