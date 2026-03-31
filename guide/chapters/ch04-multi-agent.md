# Chapter 4: Multi-Agent Systems — Building AI Pipelines

## What Is a Multi-Agent System?

A **multi-agent system** is an architecture where multiple AI model calls work together, each handling a specific piece of a larger problem. Instead of one massive prompt trying to do everything at once, you break the work into specialized subtasks and have dedicated agents handle each one.

**Analogy**: Think of it like a company. You don't have one employee who does all the sales, development, accounting, and legal work. You have specialists. A multi-agent system is the same idea — specialized AI agents, each with a focused job, collaborating to complete complex work.

---

## Single Call vs Multi-Agent: When to Use Which

| Use a single call when... | Use multi-agent when... |
|--------------------------|------------------------|
| The task is self-contained and fits in one prompt | The task is too complex for one prompt |
| No intermediate verification needed | You need to verify or review intermediate results |
| Speed and simplicity are priorities | Parts of the task can run in parallel |
| The task is straightforward Q&A, summarization, classification | The task requires different expertise at different stages |

**Example**: "Summarize this article" → single call. "Research a topic, write an article, have it fact-checked, then rewrite for a specific audience" → multi-agent pipeline.

---

## Core Roles: Orchestrator and Subagent

Every multi-agent system has these roles:

### Orchestrator
The agent that **plans, delegates, and coordinates**. It:
- Understands the overall goal
- Decides which subagents to call and in what order
- Passes outputs from one agent as inputs to another
- Synthesizes the final result

### Subagent
An agent that **executes a specific task** given to it by the orchestrator. It:
- Has a focused, specialized purpose
- Receives a well-defined input
- Returns a well-defined output
- Doesn't need to know about the overall goal

---

## Building a Sequential Pipeline

The simplest multi-agent pattern: Agent A → Agent B → Agent C. Each step's output feeds the next.

```python
# sequential_pipeline.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def call_agent(system_prompt: str, user_input: str, model: str = "claude-sonnet-4-5") -> str:
    """Helper to call Claude as a specialized agent."""
    response = client.messages.create(
        model=model,
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_input}]
    )
    return response.content[0].text

# ─── Define specialized agents ───────────────────────────────────────────────

RESEARCHER_PROMPT = """You are a research agent. Given a topic, produce:
1. A brief background (2-3 sentences)
2. 5 key facts
3. 3 important questions that remain unanswered
Be factual and concise."""

WRITER_PROMPT = """You are a blog writing agent. Given research notes,
write a 300-word engaging blog post for a general audience.
Use a catchy opening, clear structure, and end with a call to action."""

EDITOR_PROMPT = """You are an editing agent. Given a blog post draft:
1. Fix any grammatical errors
2. Improve clarity and flow
3. Ensure the opening hook is compelling
4. Return ONLY the edited post, no commentary."""

# ─── Run the pipeline ─────────────────────────────────────────────────────────

topic = "the impact of microplastics on ocean ecosystems"

print("=== Step 1: Research Agent ===")
research = call_agent(RESEARCHER_PROMPT, f"Research this topic: {topic}")
print(research)

print("\n=== Step 2: Writing Agent ===")
draft = call_agent(WRITER_PROMPT, f"Write a blog post using this research:\n\n{research}")
print(draft)

print("\n=== Step 3: Editing Agent ===")
final = call_agent(EDITOR_PROMPT, f"Edit this blog post:\n\n{draft}")
print(final)
```

---

## Building a Parallel Fan-Out Pattern

When subtasks are **independent** (don't depend on each other), run them simultaneously to save time.

**What is `concurrent.futures`?** Python normally runs code one line at a time (sequentially). `concurrent.futures` is a built-in Python library that lets you run multiple functions at the same time (in parallel). `ThreadPoolExecutor` manages a pool of threads — think of threads as workers that can each independently make an API call simultaneously. This is an intermediate Python concept; if it looks complex, know that the sequential version (just running agents one after another with a loop) works fine — parallelism is purely a speed optimization.

```python
# parallel_fan_out.py
import anthropic
import concurrent.futures
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def analyze_aspect(aspect: str, product_description: str) -> tuple[str, str]:
    """Analyze one aspect of a product description."""
    prompts = {
        "sentiment": "Analyze the emotional tone of this product description. Is it positive, neutral, or negative? Explain in 2 sentences.",
        "target_audience": "Identify the target demographic for this product based on the description. Be specific.",
        "key_features": "List the 3 most prominent product features mentioned.",
        "missing_info": "What important product information is missing from this description?"
    }

    system = prompts.get(aspect, "Analyze the provided text.")
    response = client.messages.create(
        model="claude-haiku-4-5",   # Use fast/cheap model for parallel subtasks
        max_tokens=256,
        system=system,
        messages=[{"role": "user", "content": product_description}]
    )
    return aspect, response.content[0].text

# Product to analyze
product_desc = """
The UltraBlend Pro is a high-performance personal blender with a 900W motor.
Perfect for smoothies, protein shakes, and crushing ice. BPA-free 24oz travel cup
included. Dishwasher safe. Available in 3 colors.
"""

# Run all 4 analysis agents in parallel using a thread pool
aspects = ["sentiment", "target_audience", "key_features", "missing_info"]

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(analyze_aspect, aspect, product_desc) for aspect in aspects]
    results = dict(f.result() for f in concurrent.futures.as_completed(futures))

# ─── Orchestrator synthesizes results ─────────────────────────────────────────
synthesis_input = "\n\n".join([f"**{k.upper()}**:\n{v}" for k, v in results.items()])

orchestrator_response = client.messages.create(
    model="claude-sonnet-4-5",    # Use stronger model for the synthesis step
    max_tokens=512,
    system="You are a product marketing director. Given analysis from your team, write a concise 100-word recommendation for improving the product listing.",
    messages=[{"role": "user", "content": f"Team analysis:\n\n{synthesis_input}"}]
)

print("=== Parallel Analysis Results ===")
for aspect, result in results.items():
    print(f"\n{aspect.upper()}:\n{result}")

print("\n=== Orchestrator Synthesis ===")
print(orchestrator_response.content[0].text)
```

---

## Passing Context Between Agents

Each agent call is stateless — it only knows what you give it. Design your pipelines carefully:

**What is a `dataclass`?** A dataclass is a Python feature (available since Python 3.7) that lets you define a simple class just for storing data — without writing a lot of boilerplate `__init__` code. `@dataclass` is a decorator (a modifier you put above a class definition) that automatically generates the setup code for you. You can think of it as a structured Python dictionary with named fields and optional default values. If you haven't used dataclasses, you can replace `PipelineState` with a plain dictionary — the concept is the same.

```python
# context_passing.py
import anthropic
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

@dataclass
class PipelineState:
    """Tracks the state of the entire pipeline."""
    original_request: str
    research: Optional[str] = None
    outline: Optional[str] = None
    draft: Optional[str] = None
    final: Optional[str] = None
    errors: list = field(default_factory=list)

def run_with_state(state: PipelineState) -> PipelineState:
    """Run the pipeline, threading state through each step."""

    def call(system: str, content: str) -> str:
        resp = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            system=system,
            messages=[{"role": "user", "content": content}]
        )
        return resp.content[0].text

    # Step 1: Research — only needs the original request
    state.research = call(
        "You are a research agent. Provide key facts and context.",
        state.original_request
    )

    # Step 2: Outline — needs original request AND research
    state.outline = call(
        "You are an outline writer. Create a clear structure.",
        f"Original request: {state.original_request}\n\nResearch:\n{state.research}"
    )

    # Step 3: Draft — needs outline (summarize research to save tokens)
    state.draft = call(
        "You are a writer. Write the full content following the outline.",
        f"Outline:\n{state.outline}"
        # Note: we don't pass the raw research again — the outline captures the key points
    )

    return state

state = PipelineState(original_request="Explain how GPS satellites work for a 10-year-old")
state = run_with_state(state)
print(state.draft)
```

**Key principle**: Pass only what each agent needs. Avoid passing everything to every agent — it wastes tokens and can confuse the model with irrelevant context.

---

## Common Pitfalls

### 1. Infinite Loops
If Agent A calls Agent B which calls Agent A again, you have an infinite loop. Always set a maximum iteration count.

```python
# safe_agent_loop.py
MAX_ITERATIONS = 10  # safety limit

for iteration in range(MAX_ITERATIONS):
    response = call_agent(...)
    if is_task_complete(response):
        break  # exit when done
else:
    # Loop completed without breaking — something went wrong
    raise RuntimeError(f"Agent loop did not complete within {MAX_ITERATIONS} iterations")
```

### 2. Context Explosion
**"Context explosion"** means the context window fills up because too much text is being passed between agents. Recall from Chapter 6 that every API call includes the full conversation — including everything passed to that agent. If Agent A produces 5,000 tokens and passes it all to Agent B, Agent B's input is already 5,000 tokens before it even starts working. Chain several agents like this and you can easily hit the 200K token limit or generate enormous costs.

Solution: Summarize intermediate results before passing them downstream.

```python
# context_summarizer.py
def summarize_for_handoff(long_content: str, what_matters: str) -> str:
    """Compress content before passing to the next agent."""
    resp = client.messages.create(
        model="claude-haiku-4-5",   # cheap model for summarization
        max_tokens=512,
        messages=[{"role": "user", "content": f"""Summarize the following for a downstream agent.
Keep only information relevant to: {what_matters}
Be concise. Max 200 words.

Content to summarize:
{long_content}"""}]
    )
    return resp.content[0].text
```

### 3. Cost Multiplication
Every agent call costs tokens. A pipeline with 5 agents × 1,000 tokens each = 5,000 tokens minimum, before any actual work. Estimate costs before running large pipelines.

```python
# cost_estimation.py
# Rough calculation before running a pipeline
HAIKU_INPUT_PER_MTok = 0.25    # $0.25 per million input tokens
HAIKU_OUTPUT_PER_MTok = 1.25   # $1.25 per million output tokens
SONNET_INPUT_PER_MTok = 3.00
SONNET_OUTPUT_PER_MTok = 15.00

agents = [
    {"model": "haiku", "input_tokens": 500, "output_tokens": 200},   # researcher
    {"model": "sonnet", "input_tokens": 800, "output_tokens": 500},  # writer
    {"model": "haiku", "input_tokens": 1000, "output_tokens": 300},  # editor
]

total_cost = 0
for agent in agents:
    rate_in = HAIKU_INPUT_PER_MTok if agent["model"] == "haiku" else SONNET_INPUT_PER_MTok
    rate_out = HAIKU_OUTPUT_PER_MTok if agent["model"] == "haiku" else SONNET_OUTPUT_PER_MTok
    cost = (agent["input_tokens"] * rate_in + agent["output_tokens"] * rate_out) / 1_000_000
    total_cost += cost

print(f"Estimated pipeline cost: ${total_cost:.6f} per run")
print(f"Estimated cost for 1,000 runs: ${total_cost * 1000:.4f}")
```

### 4. Agents Contradicting Each Other
If a writer agent says X and an editor agent says not-X, the output will be incoherent. Solutions:
- Give each agent a consistent style guide in its system prompt
- Have a final synthesis agent resolve contradictions explicitly

---

## Model Selection for Multi-Agent Systems

Not every agent needs the most powerful model. Use the right model for each job:

| Agent Role | Recommended Model | Why |
|-----------|------------------|-----|
| Simple classification/routing | `claude-haiku-4-5` | Fast, cheap, handles simple tasks |
| Summarization | `claude-haiku-4-5` | Haiku is excellent at summarization |
| Analysis and writing | `claude-sonnet-4-5` | Best quality/cost balance |
| Complex reasoning, synthesis | `claude-opus-4-5` | Use only when necessary |
| Final user-facing output | `claude-sonnet-4-5` | Quality matters for what users see |

---

## Key Takeaways

- Multi-agent systems break complex tasks into specialized subtasks, each handled by a focused agent
- **Orchestrators** coordinate and delegate; **subagents** execute specific tasks
- Use **sequential pipelines** when steps depend on each other
- Use **parallel fan-out** when subtasks are independent — it dramatically reduces total time
- Pass only relevant context between agents — summarize before handoff
- Always set **iteration limits** to prevent infinite loops
- Multi-agent systems multiply costs — estimate before running at scale
- Use cheaper models (Haiku) for simple subtasks; reserve Sonnet/Opus for complex synthesis steps
