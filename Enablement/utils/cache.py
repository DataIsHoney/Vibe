"""Local JSON cache to avoid re-running agents on unchanged queries."""
import json
import time
from pathlib import Path
from config import CACHE_FILE, CACHE_TTL_HOURS


def _load() -> dict:
    p = Path(CACHE_FILE)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def _save(data: dict) -> None:
    Path(CACHE_FILE).write_text(json.dumps(data, indent=2))


def get(key: str) -> dict | None:
    store = _load()
    entry = store.get(key)
    if entry is None:
        return None
    age_hours = (time.time() - entry["ts"]) / 3600
    if age_hours > CACHE_TTL_HOURS:
        return None
    return entry["value"]


def set(key: str, value: dict) -> None:
    store = _load()
    store[key] = {"ts": time.time(), "value": value}
    _save(store)


def clear() -> None:
    Path(CACHE_FILE).unlink(missing_ok=True)
