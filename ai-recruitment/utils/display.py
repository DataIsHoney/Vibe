"""Rich-based terminal display helpers."""
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich import box

console = Console()


def section(title: str, color: str = "cyan") -> None:
    console.print(Panel(f"[bold {color}]{title}[/]", box=box.ROUNDED))


def roles_table(roles: list[dict]) -> None:
    t = Table(title="Senior AI Enablement Roles", box=box.SIMPLE_HEAVY, show_lines=True)
    t.add_column("Title", style="bold cyan", no_wrap=True)
    t.add_column("Level", style="yellow")
    t.add_column("Focus Area", style="green")
    t.add_column("Why It Fits", style="white")
    for r in roles:
        t.add_row(r["title"], r["level"], r["focus_area"], r["why_it_fits"])
    console.print(t)


def skills_table(skills: list[dict]) -> None:
    t = Table(title="Key Skills to Target", box=box.SIMPLE_HEAVY, show_lines=True)
    t.add_column("Skill", style="bold magenta", no_wrap=True)
    t.add_column("Category", style="cyan")
    t.add_column("Importance", style="yellow")
    t.add_column("Notes", style="white")
    for s in skills:
        t.add_row(s["skill"], s["category"], s["importance"], s["notes"])
    console.print(t)


def companies_table(companies: list[dict]) -> None:
    t = Table(title="Target Companies (NYC / Remote)", box=box.SIMPLE_HEAVY, show_lines=True)
    t.add_column("Company", style="bold green", no_wrap=True)
    t.add_column("Location", style="cyan")
    t.add_column("AI Maturity", style="yellow")
    t.add_column("Why Target", style="white")
    for c in companies:
        t.add_row(c["company"], c["location"], c["ai_maturity"], c["why_target"])
    console.print(t)


def token_summary(usage_log: list[dict]) -> None:
    t = Table(title="Token Usage", box=box.MINIMAL_DOUBLE_HEAD)
    t.add_column("Agent", style="bold")
    t.add_column("Input", justify="right", style="yellow")
    t.add_column("Cache Read", justify="right", style="green")
    t.add_column("Output", justify="right", style="cyan")
    t.add_column("Saved %", justify="right", style="bright_green")
    for entry in usage_log:
        total_in = entry["input"] + entry["cache_read"]
        pct = f"{entry['cache_read'] / total_in * 100:.0f}%" if total_in else "0%"
        t.add_row(
            entry["agent"],
            str(entry["input"]),
            str(entry["cache_read"]),
            str(entry["output"]),
            pct,
        )
    console.print(t)
