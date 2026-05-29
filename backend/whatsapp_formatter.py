"""
whatsapp_formatter.py — Format NetworkIQ results as WhatsApp-safe messages.

WhatsApp supports basic markdown: *bold*, _italic_, ~strikethrough~
Max message length: 1600 chars. We paginate at 5 results per page.
"""
from typing import Optional

PAGE_SIZE = 5

# Category emoji map
CATEGORY_EMOJI = {
    "Software Engineer":    "💻",
    "Data Scientist":       "📊",
    "Recruiter/HR":         "🤝",
    "Founder/Entrepreneur": "🚀",
    "Student":              "🎓",
    "Marketing/Sales":      "📈",
    "Other":                "👤",
}

SENIORITY_DOT = {
    "Intern":    "⚪",
    "Junior":    "🟡",
    "Mid-level": "🟠",
    "Senior":    "🔵",
    "Lead":      "🟣",
    "Executive": "🔴",
    "Unknown":   "",
}


def format_results_page(results: list[dict], page: int, total_results: int,
                         query_label: str) -> str:
    """
    Format a single page of results (5 per page) as a WhatsApp message.
    Returns the formatted string.
    """
    start = page * PAGE_SIZE
    end = min(start + PAGE_SIZE, len(results))
    page_results = results[start:end]
    total_pages = (len(results) + PAGE_SIZE - 1) // PAGE_SIZE

    lines = []

    # Header
    if total_results == 0:
        return (
            "😕 *No results found*\n\n"
            "Try a different query, e.g.:\n"
            "• 'find recruiters'\n"
            "• 'who works at Google'\n"
            "• 'show senior engineers'\n\n"
            "_Type *help* for all commands_"
        )

    header = f"🔍 *{total_results} result{'s' if total_results != 1 else ''}"
    if query_label:
        header += f" — {query_label}"
    header += f"*"
    if total_pages > 1:
        header += f" _(page {page + 1}/{total_pages})_"
    lines.append(header)
    lines.append("")

    # Each result
    for i, c in enumerate(page_results, start=start + 1):
        name = c.get("full_name", "Unknown")
        title = c.get("job_title_clean") or c.get("job_title_raw") or "—"
        company = c.get("company", "—")
        email = c.get("email", "")
        linkedin = c.get("linkedin_url", "")
        category = c.get("category", "Other")
        seniority = c.get("seniority", "Unknown")
        score = c.get("score", 0)

        emoji = CATEGORY_EMOJI.get(category, "👤")
        dot = SENIORITY_DOT.get(seniority, "")

        # Source badge — warm (own network) vs cold (Vibe Prospecting)
        source = c.get("source", "network")
        if source == "vibe":
            source_badge = "🌐 _New Lead via Vibe Prospecting_"
        else:
            source_badge = "🤝 _Your Connection_"

        # Name + seniority dot
        line = f"{i}. *{name}* {emoji} {dot}".strip()
        lines.append(line)

        # Source badge
        lines.append(f"   {source_badge}")

        # Title & company
        if company and company != "—":
            lines.append(f"   {title} · {company}")
        else:
            lines.append(f"   {title}")

        # Contact info
        contact_parts = []
        if email and email not in ("", "nan", "None"):
            contact_parts.append(f"📧 {email}")
        if linkedin and linkedin not in ("", "nan", "None"):
            # Shorten URL for display
            short = linkedin.replace("https://www.linkedin.com/in/", "")
            short = short.replace("https://linkedin.com/in/", "").strip("/")
            if short:
                contact_parts.append(f"🔗 linkedin.com/in/{short}")

        if contact_parts:
            lines.append(f"   {' | '.join(contact_parts)}")

        # Tip for cold leads
        if source == "vibe":
            lines.append(f"   _Reply: enrich {name.split()[0]} to get email_")

        lines.append("")

    # Footer
    remaining = len(results) - end
    if remaining > 0:
        lines.append(f"_Reply *more* for next {min(remaining, PAGE_SIZE)} results_")
    elif total_pages > 1:
        lines.append("_That's all the results!_")

    return "\n".join(lines).strip()



def format_stats(info: dict, df_summary: dict) -> str:
    """Format network stats as a WhatsApp message."""
    total = info.get("total", 0)
    uploaded = info.get("uploaded_at", "")[:10] if info.get("uploaded_at") else "?"

    lines = [
        f"📊 *Your Network — Quick Stats*",
        f"",
        f"👥 *{total:,}* total connections",
        f"📅 Last updated: {uploaded}",
        f"",
        "*By role:*",
    ]

    by_cat = df_summary.get("by_category", {})
    for cat, count in sorted(by_cat.items(), key=lambda x: -x[1])[:6]:
        emoji = CATEGORY_EMOJI.get(cat, "👤")
        pct = round(count / total * 100) if total else 0
        lines.append(f"  {emoji} {cat}: *{count}* ({pct}%)")

    top_cos = df_summary.get("top_companies", [])[:5]
    if top_cos:
        lines.append("")
        lines.append("*Top companies:*")
        for name, cnt in top_cos:
            lines.append(f"  🏢 {name}: {cnt}")

    lines.append("")
    lines.append("_Ask: 'who works at Google?' to explore_")

    return "\n".join(lines)


def format_top_companies(top_cos: list) -> str:
    lines = ["🏢 *Top Companies in Your Network*", ""]
    for i, (name, count) in enumerate(top_cos[:15], 1):
        bar = "█" * min(count // 2, 20)
        lines.append(f"{i}. *{name}* — {count} connections")
    lines.append("")
    lines.append("_Ask: 'who works at [company]?' to explore_")
    return "\n".join(lines)


def format_help() -> str:
    return (
        "🤖 *NetworkIQ WhatsApp Bot*\n\n"
        "*Query your network:*\n"
        "• `who works at Google`\n"
        "• `find recruiters`\n"
        "• `show senior engineers`\n"
        "• `data scientists at Microsoft`\n"
        "• `find founders`\n\n"
        "*Commands:*\n"
        "• `stats` — your network summary\n"
        "• `top companies` — most connected companies\n"
        "• `more` — next page of results\n"
        "• `reset` — clear your data\n"
        "• `help` — this message\n\n"
        "_Powered by NetworkIQ_ 🔗"
    )


def format_welcome(total: int, df_summary: dict = None) -> str:
    lines = [
        f"✅ *You're connected to NetworkIQ!*\n",
        f"Hello! Your network is loaded. Here is a quick snapshot of your data:\n",
        f"👥 *{total:,}* total connections\n",
        "*By role:*"
    ]

    if df_summary:
        by_cat = df_summary.get("by_category", {})
        for cat, count in sorted(by_cat.items(), key=lambda x: -x[1])[:5]:
            emoji = CATEGORY_EMOJI.get(cat, "👤")
            pct = round(count / total * 100) if total else 0
            lines.append(f"  {emoji} {cat}: *{count}* ({pct}%)")

        top_cos = df_summary.get("top_companies", [])[:3]
        if top_cos:
            lines.append("\n*Top companies:*")
            for name, cnt in top_cos:
                lines.append(f"  🏢 {name}: {cnt}")

    lines.append(f"\n*Try asking:*")
    lines.append(f"• 'who works at Google?'")
    lines.append(f"• 'find recruiters'")
    lines.append(f"• 'get email Raman'\n")
    lines.append(f"_Text *help* for all commands_ 🚀")
    
    return "\n".join(lines)


def format_not_registered(website_url: str = "your NetworkIQ app") -> str:
    return (
        f"👋 *Hi! You're not set up yet.*\n\n"
        f"To get started:\n"
        f"1️⃣ Go to *{website_url}*\n"
        f"2️⃣ Upload your LinkedIn connections\n"
        f"3️⃣ Enter this WhatsApp number\n"
        f"4️⃣ You're done — come back and ask anything!\n\n"
        f"_Takes less than 2 minutes_ ⚡"
    )
