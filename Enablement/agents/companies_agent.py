"""
Companies Agent — identifies target companies hiring for AI enablement in NYC or remote.

Token optimizations:
- Uses Haiku (fast, cheap) — company lookup is mostly recall, not deep reasoning
- effort="low" further trims spend
- Receives role/skills context in compact form
- Cached system prompt
- Web search enabled for current hiring signal (filtered dynamically by the model)
"""
import json
import anthropic
from pydantic import BaseModel
from config import MODEL_FAST, EFFORT_COMPANIES, DOMAIN, LOCATIONS


SYSTEM_PROMPT = (
    f"You are a recruiter specialising in {DOMAIN} roles. "
    "Return ONLY valid JSON. List real companies actively investing in AI enablement."
)


AI_MATURITY_LEVELS = ["Pioneer", "Fast-follower", "Investing"]


class Company(BaseModel):
    company: str
    location: str       # NYC / Remote-friendly / Both
    ai_maturity: str    # Pioneer / Fast-follower / Investing
    why_target: str     # one sentence — what makes them a strong target


class CompaniesResult(BaseModel):
    companies: list[Company]


def run(
    client: anthropic.Anthropic,
    roles: list[dict],
    skills: list[dict],
) -> tuple[list[dict], dict]:
    """
    Uses web search to ground results in real, current hiring activity.
    Haiku + effort=low keeps this pass cheap.
    """
    top_roles = ", ".join(r["title"] for r in roles[:5])
    critical_skills = ", ".join(
        s["skill"] for s in skills if s["importance"] == "Critical"
    )

    # Web search enabled so the model can verify current openings
    resp = client.messages.create(
        model=MODEL_FAST,
        max_tokens=2048,
        output_config={"effort": EFFORT_COMPANIES},
        system=[{
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        tools=[{"type": "web_search_20260209", "name": "web_search"}],
        messages=[{
            "role": "user",
            "content": (
                f"Find 20 companies in {' or '.join(LOCATIONS)} actively hiring for "
                f"{DOMAIN} roles like: {top_roles}. "
                f"Companies should value skills like: {critical_skills}. "
                "Include a mix of: Big Tech, AI-native startups, financial services, "
                "consulting firms, and large enterprises with AI programmes. "
                'Return JSON: {"companies": [{"company": str, "location": "NYC|Remote-friendly|Both", '
                f'"ai_maturity": "{"|".join(AI_MATURITY_LEVELS)}", "why_target": str}]}}'
            ),
        }],
    )

    # Collect usage across the agentic loop (web search may add turns)
    total_input = resp.usage.input_tokens
    total_cache_read = getattr(resp.usage, "cache_read_input_tokens", 0)
    total_output = resp.usage.output_tokens

    # Extract the final text block from potentially multi-block response
    text = ""
    for block in resp.content:
        if hasattr(block, "type") and block.type == "text":
            text = block.text.strip()

    if not text:
        return [], {
            "agent": "Companies",
            "input": total_input,
            "cache_read": total_cache_read,
            "output": total_output,
        }

    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    data = json.loads(text)
    result = CompaniesResult(**data)

    usage = {
        "agent": "Companies",
        "input": total_input,
        "cache_read": total_cache_read,
        "output": total_output,
    }
    return [c.model_dump() for c in result.companies], usage
