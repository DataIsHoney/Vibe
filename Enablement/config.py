import os
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Model routing — use Opus for reasoning-heavy agents, Haiku for fast lookups
MODEL_REASONING = "claude-opus-4-6"
MODEL_FAST = "claude-haiku-4-5"

# Effort levels to control token spend
EFFORT_ROLES = "medium"     # nuanced role classification
EFFORT_SKILLS = "medium"    # skill taxonomy needs care
EFFORT_COMPANIES = "low"    # company lookup is more mechanical

# Cache TTL: results stored locally to avoid redundant API calls
CACHE_FILE = ".recruitment_cache.json"
CACHE_TTL_HOURS = 24

# Search scope
LOCATIONS = ["New York City", "Remote"]
SENIORITY = ["Senior", "Staff", "Principal", "Director", "Head of", "VP"]
DOMAIN = "AI Enablement"
