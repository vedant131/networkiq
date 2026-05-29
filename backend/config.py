"""Application configuration — reads from .env file."""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")


class Settings:
    ai_mode: str = os.getenv("AI_MODE", "offline")          # "openai" | "offline"
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = "gpt-4o-mini"
    company_tier_scoring: bool = os.getenv("COMPANY_TIER_SCORING", "true").lower() == "true"
    batch_size: int = 50  # connections per OpenAI call

    # ── Twilio WhatsApp ────────────────────────────────────────────────────────
    twilio_account_sid:    str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token:     str = os.getenv("TWILIO_AUTH_TOKEN", "")
    # Sandbox number: whatsapp:+14155238886
    # Production:     whatsapp:+1XXXXXXXXXX (your bought number)
    twilio_whatsapp_from:  str = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")
    website_url:           str = os.getenv("WEBSITE_URL", "http://localhost:3000")

    # ── Contact Enrichment (Waterfall) ─────────────────────────────────────────
    hunter_api_key:        str = os.getenv("HUNTER_API_KEY", "")
    apollo_api_key:         str = os.getenv("APOLLO_API_KEY", "")
    pdl_api_key:            str = os.getenv("PDL_API_KEY", "")
    snov_client_id:         str = os.getenv("SNOV_CLIENT_ID", "")
    snov_client_secret:     str = os.getenv("SNOV_CLIENT_SECRET", "")
    skrapp_api_key:         str = os.getenv("SKRAPP_API_KEY", "")

    # ── Vibe Prospecting (Explorium) ────────────────────────────────────────────
    # Sign up at https://app.vibeprospecting.ai → get API key from admin.explorium.ai
    vibeprospecting_api_key: str = os.getenv("VIBEPROSPECTING_API_KEY", "")


    # Tier-1 company list for prestige scoring
    TIER_1_COMPANIES: set = {
        "google", "meta", "amazon", "apple", "microsoft", "netflix",
        "openai", "anthropic", "deepmind", "nvidia", "salesforce",
        "stripe", "airbnb", "uber", "lyft", "twitter", "linkedin",
        "spotify", "adobe", "oracle", "ibm", "intel", "qualcomm",
        "y combinator", "sequoia", "a16z", "andreessen horowitz",
        "tesla", "spacex", "databricks", "snowflake", "figma", "canva",
        "flipkart", "infosys", "tcs", "wipro", "accenture", "deloitte",
    }

    TIER_2_COMPANIES: set = {
        "hubspot", "shopify", "atlassian", "twilio", "datadog",
        "elastic", "hashicorp", "mongodb", "redis", "confluent",
        "kpmg", "mckinsey", "bcg", "bain",
    }


settings = Settings()
