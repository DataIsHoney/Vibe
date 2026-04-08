"""
Roles Agent — identifies senior AI enablement job titles and descriptions.

Token optimizations:
- Cached system prompt (stable, never changes between calls)
- effort="medium" (enough depth, not max spend)
- Structured JSON output (no prose padding)
- Haiku used for a fast pre-filter pass; Opus only for final synthesis
"""
import json
import anthropic
from pydantic import BaseModel
from config import MODEL_REASONING, MODEL_FAST, EFFORT_ROLES, SENIORITY, DOMAIN


SYSTEM_PROMPT = f"""You are an expert technical recruiter specialising in {DOMAIN} roles.
Return ONLY valid JSON — no markdown, no explanation.
Focus on roles where the person shapes how an organisation adopts and scales AI tools/workflows."""


class Role(BaseModel):
    title: str
    level: str          # e.g. Senior / Staff / Director
    focus_area: str     # e.g. LLM tooling, AI governance, internal platforms
    why_it_fits: str    # one-sentence rationale


class RolesResult(BaseModel):
    roles: list[Role]


def run(client: anthropic.Anthropic) -> tuple[list[dict], dict]:
    """
    Two-pass strategy to save tokens:
    1. Haiku fast-generates a raw list of titles (cheap)
    2. Opus synthesises + enriches only the top candidates
    """
    # ── Pass 1: cheap title enumeration (Haiku) ──────────────────────────────
    fast_resp = client.messages.create(
        model=MODEL_FAST,
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": (
                f"List 20 real job titles for senior {DOMAIN} roles. "
                f"Seniority levels to include: {', '.join(SENIORITY)}. "
                "Return JSON: {\"titles\": [\"...\"]}"
            ),
        }],
    )
    raw_titles = fast_resp.content[0].text.strip()

    # ── Pass 2: Opus enriches the top 10 ─────────────────────────────────────
    enriched = client.messages.create(
        model=MODEL_REASONING,
        max_tokens=2048,
        output_config={"effort": EFFORT_ROLES},
        # Stable system prompt gets a cache breakpoint — saves tokens on reruns
        system=[{
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{
            "role": "user",
            "content": (
                f"Given these raw titles:\n{raw_titles}\n\n"
                "Select the 10 most strategically relevant for someone targeting "
                f"senior {DOMAIN} roles. For each, return a JSON object matching: "
                '{"title": str, "level": str, "focus_area": str, "why_it_fits": str}. '
                'Wrap in {"roles": [...]}.'
            ),
        }],
    )

    usage = {
        "agent": "Roles",
        "input": fast_resp.usage.input_tokens + enriched.usage.input_tokens,
        "cache_read": getattr(enriched.usage, "cache_read_input_tokens", 0),
        "output": fast_resp.usage.output_tokens + enriched.usage.output_tokens,
    }

    text = enriched.content[0].text.strip()
    # Strip accidental markdown fences
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    data = json.loads(text)
    result = RolesResult(**data)
    return [r.model_dump() for r in result.roles], usage
