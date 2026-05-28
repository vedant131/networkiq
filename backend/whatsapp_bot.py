"""
whatsapp_bot.py — Core bot logic for NetworkIQ WhatsApp integration.

Receives a parsed incoming message dict and returns a TwiML XML response string.
All user data is loaded from SQLite by phone number.
"""
import json
from collections import Counter

from db import (
    user_exists, load_user_data, get_user_info,
    delete_user_data, get_user_state, set_user_state,
)
from pipeline.query_engine import process_query
from whatsapp_formatter import (
    format_results_page, format_stats, format_top_companies,
    format_help, format_not_registered, PAGE_SIZE,
)

WEBSITE_URL = "http://localhost:3000"  # Will be overridden by config


def _twiml(message: str) -> str:
    """Wrap a message in a Twilio TwiML Response."""
    # Escape XML special chars
    safe = (
        message
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Message>{safe}</Message></Response>"
    )


def _compute_summary(df) -> dict:
    """Compute lightweight stats from a DataFrame."""
    from collections import Counter
    by_cat = df["category"].value_counts().to_dict() if "category" in df.columns else {}
    top_cos = [
        [k, v] for k, v in
        df["company_clean"].value_counts().head(15).items()
    ] if "company_clean" in df.columns else []
    return {"by_category": by_cat, "top_companies": top_cos}


def _safe_list(val) -> list:
    """Safely coerce a value to a list (handles JSON string from SQLite)."""
    if isinstance(val, list): return val
    if isinstance(val, str) and val.startswith('['):
        import json as _json
        try: return _json.loads(val)
        except Exception: return []
    return []


def handle_message(from_phone: str, body: str, website_url: str = WEBSITE_URL) -> str:
    """
    Main entry point. Takes the sender's phone and message text.
    Returns a TwiML XML string.
    """
    text = body.strip() if body else ""
    text_lower = text.lower().strip()

    # ── Handle "more" (pagination) ─────────────────────────────────────────────
    if text_lower == "more":
        state = get_user_state(from_phone)
        if not state.get("result_json"):
            return _twiml("No previous results to continue. Try a new query!")

        results = json.loads(state["result_json"])
        page = state.get("page", 0) + 1
        label = state.get("last_query", "")
        total = len(results)

        if page * PAGE_SIZE >= total:
            set_user_state(from_phone, page=0)
            return _twiml("✅ You've seen all results!\n\nAsk a new question to search again.")

        reply = format_results_page(results, page, total, label)
        set_user_state(from_phone, last_query=label, page=page,
                       result_json=state["result_json"])
        return _twiml(reply)

    # ── Reset command ──────────────────────────────────────────────────────────
    if text_lower in ("reset", "delete", "clear"):
        delete_user_data(from_phone)
        return _twiml(
            "🗑️ *Data cleared.*\n\n"
            f"Visit {website_url} to upload new LinkedIn connections."
        )

    # ── Help command ──────────────────────────────────────────────────────────
    if text_lower in ("help", "hi", "hello", "hey", "start", "commands", "?"):
        if not user_exists(from_phone):
            return _twiml(format_not_registered(website_url))
        return _twiml(format_help())

    # ── Check registration ─────────────────────────────────────────────────────
    if not user_exists(from_phone):
        return _twiml(format_not_registered(website_url))

    # ── Stats command ──────────────────────────────────────────────────────────
    if text_lower in ("stats", "statistics", "summary", "overview"):
        info = get_user_info(from_phone)
        df = load_user_data(from_phone)
        if df is None:
            return _twiml("⚠️ Could not load your data. Please re-upload via the website.")
        summary = _compute_summary(df)
        return _twiml(format_stats(info, summary))

    # ── Top companies command ──────────────────────────────────────────────────
    if text_lower in ("top companies", "companies", "top", "top company"):
        df = load_user_data(from_phone)
        if df is None:
            return _twiml("⚠️ Could not load your data.")
        if "company_clean" in df.columns:
            top_cos = [
                [k, v] for k, v in
                df["company_clean"].value_counts().head(15).items()
            ]
        else:
            top_cos = []
        return _twiml(format_top_companies(top_cos))

    # ── Enrich Contact Command ─────────────────────────────────────────────────
    import re
    # Match patterns like: "get email for Raman", "i want gmail of Raman", "whats the email of Raman", "enrich Raman"
    email_match = re.search(r'(?:email|gmail|contact info)(?:\s+for|\s+of)?\s+([a-zA-Z\s]+)', text_lower)
    is_enrich_cmd = text_lower.startswith("enrich ")
    
    if email_match or is_enrich_cmd:
        if is_enrich_cmd:
            target_name = text_lower[7:].strip()
        else:
            target_name = email_match.group(1).strip()
            
        # Clean up common filler words at the end
        target_name = re.sub(r'\s+(please|pls|thx|thanks)$', '', target_name).strip()
                
        df = load_user_data(from_phone)
        if df is None:
            return _twiml("⚠️ Could not load your data.")
            
        # Find connection by name
        if 'full_name' in df.columns:
            # Try exact first name match if it's a single word, else substring
            if " " not in target_name:
                # If they just said "Raman", try matching first name specifically or substring
                matches = df[df['full_name'].str.lower().str.contains(r'\b' + re.escape(target_name.lower()) + r'\b', na=False)]
                if matches.empty:
                    matches = df[df['full_name'].str.lower().str.contains(target_name.lower(), na=False)]
            else:
                matches = df[df['full_name'].str.lower().str.contains(target_name.lower(), na=False)]
        else:
            return _twiml("⚠️ Missing name column in database. Please re-upload.")
            
        if matches.empty:
            return _twiml(f"❌ Couldn't find anyone named '{target_name}' in your connections.")
            
        row = matches.iloc[0]
        full_name = str(row.get('full_name', ''))
        company = str(row.get('company_clean', row.get('company', '')))
        existing_email = str(row.get('Email Address', row.get('email', '')))
        
        if existing_email and existing_email.strip() and existing_email.lower() != "nan":
            return _twiml(f"✅ You already have the email for {full_name}:\n\n📧 {existing_email}")
            
        if not company or company.lower() == "nan":
            return _twiml(f"❌ Cannot find email for {full_name} because they don't have a company listed.")
            
        # Call Waterfall API
        import enrichment
        from config import settings
        
        # Normalize name: CSV names may be ALL CAPS — Hunter.io needs proper case
        full_name_normalized = full_name.title()
        first_name = full_name_normalized.split()[0]
        last_name = " ".join(full_name_normalized.split()[1:]) if len(full_name_normalized.split()) > 1 else ""
        
        result = enrichment.find_email_waterfall(first_name, last_name, company, settings)
        
        if result:
            email = result["email"]
            score = result["score"]
            source = result.get("source", "API")

            # Save email to DB
            from db import update_user_connection_email
            update_user_connection_email(from_phone, full_name, company, email)

            # ── Build rich profile message with PDL data ──────────────
            lines = [f"✨ *{full_name}* — Full Profile\n"]
            lines.append(f"📧 *Email:* {email}")
            lines.append(f"   _via {source} · Confidence {score}%_")

            if result.get("pdl_job"):
                lines.append(f"\n💼 *Current Role:* {result['pdl_job']}")

            if result.get("pdl_location"):
                lines.append(f"📍 *Location:* {result['pdl_location']}")

            if result.get("pdl_industry"):
                lines.append(f"🏭 *Industry:* {result['pdl_industry'].title()}")

            # Social profiles
            socials = []
            if result.get("pdl_linkedin"):
                lnk = result["pdl_linkedin"].replace("https://www.linkedin.com/in/", "").strip("/")
                socials.append(f"🔗 LinkedIn: linkedin.com/in/{lnk}")
            if result.get("pdl_twitter"):
                socials.append(f"🐦 Twitter: @{result['pdl_twitter']}")
            if result.get("pdl_github"):
                socials.append(f"💻 GitHub: github.com/{result['pdl_github']}")

            if socials:
                lines.append(f"\n*Social:*")
                lines.extend(socials)

            if result.get("pdl_education"):
                lines.append(f"\n🎓 *Education:*")
                for edu in result["pdl_education"]:
                    lines.append(f"   • {edu}")

            return _twiml("\n".join(lines))
        else:
            return _twiml(f"❌ Sorry, our waterfall engines couldn't find a verified corporate email for {full_name} at {company}.")

    # ── Natural language query ─────────────────────────────────────────────────
    df = load_user_data(from_phone)
    if df is None:
        return _twiml(
            "⚠️ Could not load your data.\n\n"
            f"Please re-upload at {website_url}"
        )

    try:
        results, label = process_query(df, text)
    except Exception as e:
        return _twiml(f"❌ Error processing query: {str(e)[:100]}\n\nTry: 'find recruiters at Google'")

    total = len(results)
    page = 0

    if total == 0:
        # Don't save state for empty results
        return _twiml(format_results_page(results, 0, 0, label))

    # Save pagination state
    set_user_state(
        from_phone,
        last_query=label,
        page=0,
        result_json=json.dumps(results),
    )

    reply = format_results_page(results, page, total, label)
    return _twiml(reply)
