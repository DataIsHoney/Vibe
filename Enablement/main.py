#!/usr/bin/env python3
"""
AI Recruitment Agent — Senior AI Enablement Roles
Orchestrates three focused agents and shows a token usage summary.

Usage:
    python main.py              # run all agents (uses cache if fresh)
    python main.py --refresh    # force re-run, ignore cache
    python main.py --roles      # roles agent only
    python main.py --skills     # skills agent only
    python main.py --companies  # companies agent only
"""
import argparse
import sys
import anthropic

import utils.cache as cache
from agents import roles_agent, skills_agent, companies_agent
from utils.display import (
    console, section, roles_table, skills_table, companies_table, token_summary
)
from config import ANTHROPIC_API_KEY


def get_client() -> anthropic.Anthropic:
    if not ANTHROPIC_API_KEY:
        console.print("[bold red]Error:[/] ANTHROPIC_API_KEY not set. Add it to .env or export it.")
        sys.exit(1)
    return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)


def run_roles(client: anthropic.Anthropic, force: bool) -> tuple[list[dict], dict]:
    cached = cache.get("roles")
    if cached and not force:
        console.print("[dim]  Roles: loaded from cache[/]")
        return cached["data"], cached["usage"]
    console.print("[cyan]  Running Roles Agent...[/]")
    data, usage = roles_agent.run(client)
    cache.set("roles", {"data": data, "usage": usage})
    return data, usage


def run_skills(client: anthropic.Anthropic, roles: list[dict], force: bool) -> tuple[list[dict], dict]:
    cached = cache.get("skills")
    if cached and not force:
        console.print("[dim]  Skills: loaded from cache[/]")
        return cached["data"], cached["usage"]
    console.print("[magenta]  Running Skills Agent...[/]")
    data, usage = skills_agent.run(client, roles)
    cache.set("skills", {"data": data, "usage": usage})
    return data, usage


def run_companies(
    client: anthropic.Anthropic,
    roles: list[dict],
    skills: list[dict],
    force: bool,
) -> tuple[list[dict], dict]:
    cached = cache.get("companies")
    if cached and not force:
        console.print("[dim]  Companies: loaded from cache[/]")
        return cached["data"], cached["usage"]
    console.print("[green]  Running Companies Agent...[/]")
    data, usage = companies_agent.run(client, roles, skills)
    cache.set("companies", {"data": data, "usage": usage})
    return data, usage


def main() -> None:
    parser = argparse.ArgumentParser(description="AI Recruitment Agent")
    parser.add_argument("--refresh", action="store_true", help="Ignore cache, re-run all agents")
    parser.add_argument("--roles", action="store_true", help="Run roles agent only")
    parser.add_argument("--skills", action="store_true", help="Run skills agent only")
    parser.add_argument("--companies", action="store_true", help="Run companies agent only")
    args = parser.parse_args()

    run_all = not (args.roles or args.skills or args.companies)
    client = get_client()
    usage_log: list[dict] = []

    console.rule("[bold]AI Recruitment Agent[/]")
    console.print("[dim]Senior AI Enablement — NYC & Remote[/]\n")

    roles_data: list[dict] = []
    skills_data: list[dict] = []

    # ── Roles ──────────────────────────────────────────────────────────────────
    if run_all or args.roles:
        section("Senior AI Enablement Roles", "cyan")
        roles_data, r_usage = run_roles(client, args.refresh)
        usage_log.append(r_usage)
        roles_table(roles_data)

    # ── Skills ─────────────────────────────────────────────────────────────────
    if run_all or args.skills:
        if not roles_data:
            # Skills needs role context; load from cache or run silently
            cached = cache.get("roles")
            if cached:
                roles_data = cached["data"]
            else:
                console.print("[yellow]Running Roles agent first to build skill context...[/]")
                roles_data, r_usage = run_roles(client, args.refresh)
                usage_log.append(r_usage)

        section("Key Skills to Highlight", "magenta")
        skills_data, s_usage = run_skills(client, roles_data, args.refresh)
        usage_log.append(s_usage)
        skills_table(skills_data)

    # ── Companies ──────────────────────────────────────────────────────────────
    if run_all or args.companies:
        if not roles_data:
            cached = cache.get("roles")
            roles_data = cached["data"] if cached else []
        if not skills_data:
            cached = cache.get("skills")
            skills_data = cached["data"] if cached else []

        section("Target Companies (NYC / Remote)", "green")
        companies_data, c_usage = run_companies(client, roles_data, skills_data, args.refresh)
        usage_log.append(c_usage)
        companies_table(companies_data)

    # ── Token summary ──────────────────────────────────────────────────────────
    if usage_log:
        console.print()
        token_summary(usage_log)

    console.print("\n[dim]Results cached to .recruitment_cache.json (24h TTL)[/]")


if __name__ == "__main__":
    main()
