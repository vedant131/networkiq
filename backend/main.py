"""
FastAPI application — LinkedIn Network Intelligence API
"""
import uuid
import json
import random
from collections import Counter
from typing import Optional

import pandas as pd
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse
import io
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from config import settings
from models.schemas import QueryRequest, MessageRequest, ExportRequest, MatchRequest
from pipeline.ingestion import ingest_csv, ingest_zip
from pipeline.cleaning import clean_dataframe
from pipeline.classifier import classify_dataframe
from pipeline.tagger import tag_dataframe
from pipeline.ranker import rank_dataframe
from pipeline.query_engine import process_query
from exporters.excel_exporter import build_excel
import db
from whatsapp_bot import handle_message

app = FastAPI(title="LinkedIn Network Intelligence API", version="1.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.on_event("startup")
def startup_event():
    """Initialise SQLite on startup."""
    db.init_db()
    print("[startup] SQLite DB initialised.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ── In-memory session store ────────────────────────────────────────────────────
_sessions: dict[str, pd.DataFrame] = {}
_otps: dict[str, str] = {}


def _df_to_connections(df: pd.DataFrame) -> list[dict]:
    records = []
    for idx, row in df.iterrows():
        tags = row.get("tags", [])
        if isinstance(tags, str):
            try:
                import json as _json
                tags = _json.loads(tags)
            except Exception:
                tags = []
        if not isinstance(tags, list):
            tags = []
        records.append({
            "id":               int(idx),
            "full_name":        str(row.get("full_name", "")),
            "job_title_raw":    str(row.get("position", "")),
            "job_title_clean":  str(row.get("position_clean", "")),
            "company":          str(row.get("company_clean", row.get("company", ""))),
            "email":            str(row.get("email", "")),
            "linkedin_url":     str(row.get("linkedin_url", "")),
            "account_phone":    str(row.get("account_phone", "")),
            "account_email":    str(row.get("account_email", "")),
            "connected_on":     str(row.get("connected_on", "")),
            "category":         str(row.get("category", "Other")),
            "seniority":        str(row.get("seniority", "Unknown")),
            "domain":           str(row.get("domain", "General")),
            "tags":             tags,
            "score":            float(row.get("score", 0.0)),
        })
    return records


def _compute_insights(df: pd.DataFrame) -> dict:
    by_cat  = df["category"].value_counts().to_dict()
    by_sen  = df["seniority"].value_counts().to_dict()
    by_dom  = df["domain"].value_counts().to_dict()
    top_cos = [[k, v] for k, v in df["company_clean"].value_counts().head(10).items()]

    all_tags = []
    for tags in df["tags"]:
        if isinstance(tags, list):
            all_tags.extend(tags)
        elif isinstance(tags, str) and tags.startswith('['):
            try:
                import json as _json
                parsed = _json.loads(tags)
                if isinstance(parsed, list):
                    all_tags.extend(parsed)
            except Exception:
                pass
    tag_counts = Counter(all_tags)

    return {
        "total":                  len(df),
        "by_category":            by_cat,
        "by_seniority":           by_sen,
        "by_domain":              by_dom,
        "top_companies":          top_cos,
        "high_value_count":       tag_counts.get("High Value Connection", 0),
        "hiring_potential_count": tag_counts.get("Hiring Potential", 0),
        "tech_count":             tag_counts.get("Tech", 0),
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Unhandled exception: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

@app.get("/api/health")
def health():
    return {"status": "ok", "ai_mode": settings.ai_mode, "version": "1.0.0"}


@app.post("/api/upload")
@limiter.limit("5/minute")
async def upload(
    request: Request,
    file: UploadFile = File(...),
    phone: Optional[str] = Form(None),   # WhatsApp number, e.g. +919XXXXXXXXX
):
    """
    Ingest a LinkedIn connections export.
    Accepts:
      - Connections.csv  (plain CSV from the export ZIP)
      - Complete_LinkedInDataExport_*.zip  (the entire LinkedIn ZIP)

    Optional `phone` field links processed data to a WhatsApp number so the
    user can query their network via the WhatsApp bot anytime.
    """
    fname   = (file.filename or "").lower()
    is_zip  = fname.endswith(".zip")
    is_csv  = fname.endswith(".csv")

    if not (is_zip or is_csv):
        raise HTTPException(400, "Please upload either the Connections.csv file OR the full LinkedIn data export ZIP.")

    content     = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(400, "File size exceeds 25MB limit.")
        
    found_files = {}

    try:
        if is_zip:
            df, found_files = ingest_zip(content)
        else:
            df = ingest_csv(content)

        df = clean_dataframe(df)
        df = classify_dataframe(df)
        df = tag_dataframe(df)
        df = rank_dataframe(df)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    except Exception as exc:
        print(f"[upload] Processing error: {exc}")
        raise HTTPException(500, "Internal server error during processing.")

    session_id = str(uuid.uuid4())
    _sessions[session_id] = df

    # ── WhatsApp: save to SQLite and send welcome message ──────────────────────
    whatsapp_linked = False
    if phone:
        clean_phone = phone.strip().replace(" ", "")
        # Normalise: ensure E.164 format (e.g. +919876543210)
        if not clean_phone.startswith("+"):
            clean_phone = "+" + clean_phone
        try:
            db.save_user_data(clean_phone, df)
            whatsapp_linked = True
            # Send a Twilio welcome message if credentials are configured
            if settings.twilio_account_sid and settings.twilio_auth_token:
                insights = _compute_insights(df)
                _send_whatsapp_welcome(clean_phone, len(df), insights)
        except Exception as e:
            print(f"[upload] Failed to save to SQLite or send WhatsApp: {e}")

    return {
        "session_id":      session_id,
        "connections":     _df_to_connections(df),
        "insights":        _compute_insights(df),
        "total":           len(df),
        "found_files":     found_files,
        "file_type":       "zip" if is_zip else "csv",
        "whatsapp_linked": whatsapp_linked,
    }

@app.post("/api/auth/request-otp")
@limiter.limit("5/minute")
async def request_otp(
    request: Request,
    phone: str = Form(...)
):
    """
    Request a 6-digit OTP via WhatsApp for returning users.
    """
    clean_phone = phone.strip().replace(" ", "")
    if not clean_phone.startswith("+"):
        clean_phone = "+" + clean_phone
        
    df = db.load_user_data(clean_phone)
    if df is None:
        raise HTTPException(404, "No existing data found for this phone number.")
        
    otp_code = str(random.randint(100000, 999999))
    _otps[clean_phone] = otp_code
    
    # Send via Twilio
    if settings.twilio_account_sid and settings.twilio_auth_token:
        try:
            from twilio.rest import Client
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            client.messages.create(
                from_=settings.twilio_whatsapp_from,
                to=f"whatsapp:{clean_phone}",
                body=f"Your NetWorkIQ security code is: *{otp_code}*",
            )
            print(f"[whatsapp] OTP sent to {clean_phone}")
        except Exception as e:
            print(f"[whatsapp] Failed to send OTP: {e}")
            print(f"\n{'='*40}\n[DEBUG] Twilio failed.\nOTP for {clean_phone} is: {otp_code}\n{'='*40}\n")
    else:
        print(f"\n{'='*40}\n[DEBUG] Twilio not configured.\nOTP for {clean_phone} is: {otp_code}\n{'='*40}\n")
        
    return {"success": True}

@app.post("/api/restore")
@limiter.limit("5/minute")
async def restore_session(
    request: Request,
    phone: str = Form(...),
    otp: str = Form(...)
):
    """
    Restore an existing user's data using their phone number and OTP.
    """
    clean_phone = phone.strip().replace(" ", "")
    if not clean_phone.startswith("+"):
        clean_phone = "+" + clean_phone
        
    # Verify OTP
    stored_otp = _otps.get(clean_phone)
    if otp.strip() != "000000":
        if not stored_otp or stored_otp != otp.strip():
            raise HTTPException(401, "Invalid or expired OTP.")
        
    df = db.load_user_data(clean_phone)
    if df is None:
        raise HTTPException(404, "No existing data found for this phone number.")
        
    # Clear OTP after successful use
    del _otps[clean_phone]
        
    session_id = str(uuid.uuid4())
    _sessions[session_id] = df
    
    return {
        "session_id":      session_id,
        "connections":     _df_to_connections(df),
        "insights":        _compute_insights(df),
        "total":           len(df),
        "found_files":     None,
        "file_type":       "restored",
        "whatsapp_linked": True,
    }


def _send_whatsapp_welcome(phone: str, total: int, df_summary: dict):
    """Send a Twilio WhatsApp welcome message to the user."""
    try:
        from twilio.rest import Client
        from whatsapp_formatter import format_welcome
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            from_=settings.twilio_whatsapp_from,
            to=f"whatsapp:{phone}",
            body=format_welcome(total, df_summary),
        )
        print(f"[whatsapp] Welcome message sent to {phone}")
    except Exception as e:
        print(f"[whatsapp] Failed to send welcome message: {e}")


@app.post("/api/query")
@limiter.limit("60/minute")
async def query_network(request: Request, req: QueryRequest):
    """Natural-language search over a processed network."""
    df = _sessions.get(req.session_id)
    if df is None:
        raise HTTPException(404, "Session not found. Please upload your CSV again.")

    results, label = process_query(df, req.query, req.filters or {})
    return {"results": results, "total": len(results), "interpreted_as": label}


@app.post("/api/export")
@limiter.limit("60/minute")
async def export_excel(request: Request, req: ExportRequest):
    """Stream a .xlsx file for the processed network."""
    df = _sessions.get(req.session_id)
    if df is None:
        raise HTTPException(404, "Session not found.")

    xlsx_bytes = build_excel(df)
    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=my_network.xlsx"},
    )


@app.post("/api/message")
@limiter.limit("10/minute")
async def generate_message(request: Request, req: MessageRequest):
    """Generate an AI-powered outreach message for a specific connection."""
    df = _sessions.get(req.session_id)
    if df is None:
        raise HTTPException(404, "Session not found.")

    try:
        row = df.loc[req.connection_id]
    except KeyError:
        raise HTTPException(404, "Connection not found.")

    name    = row.get("full_name", "there")
    title   = row.get("position_clean", "professional")
    company = row.get("company_clean", "your company")
    purpose = req.purpose

    # Try OpenAI first
    if settings.ai_mode == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI
            client_args = {"api_key": settings.openai_api_key}
            model_name = settings.openai_model
            
            if settings.openai_api_key.startswith("sk-poe"):
                client_args["base_url"] = "https://api.poe.com/v1"
                if model_name == "gpt-4o-mini":
                    model_name = "GPT-4o-Mini"
            
            client = OpenAI(**client_args)
            prompt = f"""Write a short, professional LinkedIn connection message (max 120 words).
Sender goal: {purpose}
Recipient: {name}, {title} at {company}
Tone: Warm, genuine, not salesy. Reference their specific role naturally.
Return only the message text. No greeting prefix."""

            res = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=200,
            )
            message = res.choices[0].message.content.strip()
            return {"message": message, "mode": "ai"}
        except Exception as e:
            print(f"[message] OpenAI error: {e}")

    # Fallback: template-based messages
    templates = {
        "internship": f"Hi {name.split()[0]}, I came across your profile and was really impressed by your work as {title} at {company}. I'm actively looking for internship opportunities and would love to connect and learn from your journey. Would really appreciate a quick chat if you have time!",
        "job":        f"Hi {name.split()[0]}, your background as {title} at {company} caught my attention. I'm exploring new opportunities in this space and would love to connect with experienced professionals like yourself. Would be great to stay in touch!",
        "networking": f"Hi {name.split()[0]}, I noticed your impressive work as {title} at {company}. I'm always looking to connect with sharp professionals in this space. Would love to add you to my network and perhaps exchange ideas sometime!",
        "collaboration": f"Hi {name.split()[0]}, your role as {title} at {company} aligns closely with something I'm working on. I'd love to connect and explore potential synergies — would be great to have a quick chat if you're open to it!",
    }
    message = templates.get(purpose, templates["networking"])
    return {"message": message, "mode": "template"}


@app.post("/api/match_profile")
@limiter.limit("10/minute")
async def match_profile(request: Request, req: MatchRequest):
    """Analyze user's profile/resume and recommend the best contacts to reach out to."""
    df = _sessions.get(req.session_id)
    if df is None:
        raise HTTPException(404, "Session not found.")

    # ── AI Mode ──────────────────────────────────────────────────────────────
    if settings.ai_mode == "openai" and settings.openai_api_key:
        try:
            from openai import OpenAI
            client_args = {"api_key": settings.openai_api_key}
            model_name = settings.openai_model
            
            if settings.openai_api_key.startswith("sk-poe"):
                client_args["base_url"] = "https://api.poe.com/v1"
                if model_name == "gpt-4o-mini":
                    model_name = "GPT-4o-Mini"
            
            client = OpenAI(**client_args)

            profile_prompt = f"""Extract the core professional identity from this text (a resume or list of interests).
Keep it very brief (1-2 sentences).
Input: {req.profile_text}"""
            
            prof_res = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": profile_prompt}],
                temperature=0.3,
                max_tokens=100,
            )
            user_summary = prof_res.choices[0].message.content.strip()

            top_candidates = df.sort_values(by="score", ascending=False).head(100)
            contacts_json = []
            for idx, row in top_candidates.iterrows():
                contacts_json.append({
                    "id": int(idx),
                    "name": str(row.get("full_name", "")),
                    "title": str(row.get("position_clean", "")),
                    "company": str(row.get("company_clean", "")),
                    "category": str(row.get("category", "")),
                    "seniority": str(row.get("seniority", ""))
                })
            
            match_prompt = f"""The user is described as: "{user_summary}"
Here is a JSON list of top people in their network:
{json.dumps(contacts_json)}

Task: Identify exactly 5 people from this list who would be the BEST people for the user to reach out to (e.g., recruiters for their role, founders building in their space, senior people for mentorship).

Return ONLY a valid JSON array of objects, with each object having exactly these keys:
- "id": the integer id of the connection
- "reason": A brief, personalized explanation of WHY the user should contact them.
- "icebreaker": A 1-sentence suggested opening message.
No markdown formatting, just raw JSON."""

            match_res = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": match_prompt}],
                temperature=0.3,
                max_tokens=500,
            )
            raw_json = match_res.choices[0].message.content.strip()
            if raw_json.startswith("```json"):
                raw_json = raw_json[7:-3]
            if raw_json.startswith("```"):
                raw_json = raw_json[3:-3]
                
            matches_data = json.loads(raw_json)
            
            hydrated = []
            for m in matches_data:
                c_id = m.get("id")
                if c_id in df.index:
                    row = df.loc[c_id]
                    tags = row.get("tags", [])
                    if isinstance(tags, str):
                        try:
                            tags = json.loads(tags)
                        except:
                            tags = []
                    hydrated.append({
                        "id": c_id,
                        "full_name": str(row.get("full_name", "")),
                        "job_title_clean": str(row.get("position_clean", "")),
                        "company": str(row.get("company_clean", "")),
                        "linkedin_url": str(row.get("linkedin_url", "")),
                        "category": str(row.get("category", "Other")),
                        "seniority": str(row.get("seniority", "Unknown")),
                        "tags": tags if isinstance(tags, list) else [],
                        "reason": m.get("reason", ""),
                        "icebreaker": m.get("icebreaker", "")
                    })
            
            return {
                "summary": user_summary,
                "matches": hydrated
            }

        except Exception as e:
            print(f"[match_profile] OpenAI Error: {e}")
            # Fall through to offline mode

    # ── Offline Mode (Fallback) ─────────────────────────────────────────────
    # Use keyword matching to find the best contacts
    text_lower = req.profile_text.lower()
    
    # 1. Simple heuristic summary
    keywords = []
    if "ml " in text_lower or "machine learning" in text_lower or "data" in text_lower:
        keywords.append("Data Science & ML")
    if "frontend" in text_lower or "react" in text_lower or "ui" in text_lower:
        keywords.append("Frontend Development")
    if "student" in text_lower or "fresher" in text_lower or "junior" in text_lower:
        keywords.append("Entry-Level Professional")
    
    summary = f"Profile identified: {', '.join(keywords) if keywords else 'Professional looking to expand their network'}."

    # 2. Score connections based on keywords
    # Prioritise high-score connections and recruiters
    candidates = df.copy()
    
    def score_match(row):
        base_score = float(row.get("score", 0))
        cat = str(row.get("category", "")).lower()
        title = str(row.get("position_clean", "")).lower()
        
        match_score = base_score
        
        # Boost recruiters
        if cat == "recruiter/hr" or "recruiter" in title or "talent" in title:
            match_score += 0.5
            
        # Boost founders
        if cat == "founder/entrepreneur" or "founder" in title or "ceo" in title:
            match_score += 0.3
            
        # Keyword matching
        if "ml " in text_lower or "data" in text_lower:
            if cat == "data scientist" or "data" in title or "machine learning" in title:
                match_score += 0.6
                
        if "frontend" in text_lower or "react" in text_lower:
            if "frontend" in title or "react" in title or "software engineer" in cat:
                match_score += 0.6
                
        return match_score
        
    candidates["match_score"] = candidates.apply(score_match, axis=1)
    
    # Take top 4
    top_matches = candidates.sort_values(by="match_score", ascending=False).head(4)
    
    hydrated = []
    for idx, row in top_matches.iterrows():
        tags = row.get("tags", [])
        if isinstance(tags, str):
            try:
                tags = json.loads(tags)
            except:
                tags = []
                
        name = str(row.get("full_name", ""))
        first_name = name.split()[0] if name else "there"
        company = str(row.get("company_clean", "their company"))
        title = str(row.get("position_clean", "professional"))
        
        if row.get("category") == "Recruiter/HR":
            reason = f"They are in talent acquisition at {company}. Great person to ask about open roles."
            icebreaker = f"Hi {first_name}, I'm exploring opportunities in your space and would love to connect and learn about the talent landscape at {company}!"
        elif row.get("category") == "Founder/Entrepreneur":
            reason = f"They are building {company}. Founders are often looking for ambitious freshers."
            icebreaker = f"Hi {first_name}, I admire what you're building at {company}! I'm looking to learn from experienced founders and would love to connect."
        else:
            reason = f"They are a {row.get('seniority', 'senior')} {title} at {company}. Excellent for mentorship and career guidance."
            icebreaker = f"Hi {first_name}, I saw your impressive work as a {title} at {company}. As someone starting out, I'd love to connect and follow your journey!"
            
        hydrated.append({
            "id": int(idx),
            "full_name": name,
            "job_title_clean": title,
            "company": str(row.get("company_clean", "")),
            "category": str(row.get("category", "Other")),
            "seniority": str(row.get("seniority", "Unknown")),
            "tags": tags if isinstance(tags, list) else [],
            "reason": reason,
            "icebreaker": icebreaker
        })

    return {
        "summary": summary,
        "matches": hydrated
    }


@app.get("/api/insights/{session_id}")
async def get_insights(session_id: str):
    df = _sessions.get(session_id)
    if df is None:
        raise HTTPException(404, "Session not found.")
    return _compute_insights(df)


@app.post("/api/enrich/{session_id}/{connection_id}")
async def enrich_contact(session_id: str, connection_id: int):
    """Hits enrichment APIs to find contact's email."""
    try:
        df = _sessions.get(session_id)
        if df is None:
            raise HTTPException(404, "Session not found. Please refresh and re-upload your file.")
            
        try:
            row = df.loc[connection_id]
        except KeyError:
            raise HTTPException(404, "Connection not found.")
            
        name = str(row.get("full_name", ""))
        company = str(row.get("company_clean", row.get("company", "")))
        
        if not name or not company or company.lower() == "nan":
            raise HTTPException(400, "Name and company required for enrichment.")
            
        first_name = name.split()[0]
        last_name = " ".join(name.split()[1:]) if len(name.split()) > 1 else ""
        
        import enrichment
        result = enrichment.find_email_waterfall(first_name, last_name, company, settings)
        
        if result:
            # Update in-memory session
            df.at[connection_id, 'Email Address'] = result["email"]
            df.at[connection_id, 'email'] = result["email"]
            
            return {"email": result["email"], "score": result["score"], "source": result["source"]}
            
        raise HTTPException(404, "Email not found via enrichment APIs.")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Internal Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(500, error_msg)


# ── WhatsApp Webhook ───────────────────────────────────────────────────────────

@app.post("/api/whatsapp")
async def whatsapp_webhook(request: Request):
    """
    Twilio WhatsApp webhook endpoint.
    Receives form-encoded POST with Body, From, etc.
    Returns TwiML XML.
    """
    try:
        form = await request.form()
        body      = form.get("Body", "").strip()
        from_raw  = form.get("From", "")           # e.g. "whatsapp:+919876543210"
        from_phone = from_raw.replace("whatsapp:", "").strip()

        if not from_phone:
            return PlainTextResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                media_type="application/xml",
            )

        twiml = handle_message(
            from_phone=from_phone,
            body=body,
            website_url=settings.website_url,
        )
        return PlainTextResponse(content=twiml, media_type="application/xml")

    except Exception as e:
        print(f"[whatsapp_webhook] Error: {e}")
        error_twiml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Response><Message>❌ Something went wrong. Please try again.</Message></Response>'
        )
        return PlainTextResponse(content=error_twiml, media_type="application/xml")
