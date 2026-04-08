"""
Skills Agent — identifies key skills for senior AI enablement roles.

Token optimizations:
- Receives role context from roles_agent (no redundant lookup)
- Cached system prompt breakpoint
- effort="medium" on Opus
- Structured output keeps response dense, no filler prose
"""
import json
import anthropic
from pydantic import BaseModel
from config import MODEL_REASONING, EFFORT_SKILLS, DOMAIN


SYSTEM_PROMPT = f"""You are an expert in AI talent strategy and {DOMAIN} competency frameworks.
Return ONLY valid JSON. Be specific: name concrete tools, frameworks, or certifications."""


CATEGORIES = [
    "Technical / Engineering",
    "AI / ML Knowledge",
    "Product & Strategy",
    "Change Management",
    "Soft Skills / Leadership",
]


class Skill(BaseModel):
    skill: str
    category: str
    importance: str     # Critical / High / Medium
    notes: str          # brief context (tools, certs, why employers value it)


class SkillsResult(BaseModel):
    skills: list[Skill]


def run(client: anthropic.Anthropic, roles: list[dict]) -> tuple[list[dict], dict]:
    """
    Derives the skill taxonomy from the already-identified roles list,
    avoiding a second raw brainstorm pass and saving tokens.
    """
    # Compress role titles to a compact string (cheaper than passing full objects)
    role_titles = ", ".join(r["title"] for r in roles)

    resp = client.messages.create(
        model=MODEL_REASONING,
        max_tokens=2500,
        output_config={"effort": EFFORT_SKILLS},
        system=[{
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }],
        messages=[{
            "role": "user",
            "content": (
                f"Target roles: {role_titles}\n\n"
                f"Identify the 20 most important skills for these {DOMAIN} roles. "
                f"Cover all these categories: {', '.join(CATEGORIES)}. "
                "Prioritise skills that appear frequently in job postings and drive hiring decisions. "
                'Return JSON: {"skills": [{"skill": str, "category": str, '
                '"importance": "Critical|High|Medium", "notes": str}]}'
            ),
        }],
    )

    usage = {
        "agent": "Skills",
        "input": resp.usage.input_tokens,
        "cache_read": getattr(resp.usage, "cache_read_input_tokens", 0),
        "output": resp.usage.output_tokens,
    }

    text = resp.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    data = json.loads(text)
    result = SkillsResult(**data)
    return [s.model_dump() for s in result.skills], usage
