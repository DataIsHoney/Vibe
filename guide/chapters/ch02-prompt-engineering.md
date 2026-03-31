# Chapter 2: Prompt Engineering — Getting the Best Results from Claude

## What Is Prompt Engineering?

**Prompt engineering** is the practice of crafting your inputs to an AI model to reliably get the outputs you want. The same question phrased differently can produce wildly different results. Prompt engineering is the skill of phrasing questions and instructions precisely.

Think of it like giving instructions to a very capable new employee: if you're vague, you'll get vague results. If you're specific, clear, and give examples, you'll get exactly what you need.

---

## System Prompts vs User Messages

Before we cover techniques, you need to understand the two main places where you give Claude instructions:

| | System Prompt | User Message |
|-|--------------|-------------|
| **What it is** | Background context and instructions set by you (the developer) | The actual input from the end user |
| **When Claude sees it** | Before any user messages, every turn | As part of the conversation |
| **Use it for** | Persona, rules, output format requirements, constraints | The specific task or question |
| **Who sets it** | The developer/operator | The user |

```python
# system_vs_user.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    system="You are a concise technical writer. Always respond in bullet points. Never use more than 5 bullets.",
    messages=[
        {"role": "user", "content": "What are the benefits of using Python for data science?"}
    ]
)
print(response.content[0].text)
```

---

## Technique 1: Zero-Shot Prompting

**Zero-shot prompting** means asking Claude to do something directly, without any examples. This works well for tasks Claude knows how to do from training.

```python
# zero_shot.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=256,
    messages=[{
        "role": "user",
        "content": "Classify the sentiment of this review as Positive, Negative, or Neutral:\n\n'The product arrived on time but the packaging was damaged.'"
    }]
)
print(response.content[0].text)  # "Neutral" or similar
```

**When to use**: Simple, well-defined tasks where the expected output is clear.

---

## Technique 2: Few-Shot Prompting

**Few-shot prompting** means providing examples of the input/output pattern you want before asking your actual question. Claude learns the pattern from the examples and applies it to new inputs.

```python
# few_shot.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

few_shot_prompt = """Classify the sentiment of product reviews as Positive, Negative, or Neutral.

Review: "Absolutely love this! Best purchase I've made this year."
Sentiment: Positive

Review: "Broke after two days. Complete waste of money."
Sentiment: Negative

Review: "It works as described. Nothing special."
Sentiment: Neutral

Review: "The color is different from the photos but the quality is good."
Sentiment:"""

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=10,
    messages=[{"role": "user", "content": few_shot_prompt}]
)
print(response.content[0].text)  # "Positive" or "Neutral"
```

**When to use**: When you need a specific output format or style that's hard to describe but easy to demonstrate.

---

## Technique 3: Chain-of-Thought Prompting

**Chain-of-thought prompting** asks Claude to reason through a problem step by step before giving an answer. This dramatically improves accuracy on complex problems — math, logic, multi-step reasoning.

**Without chain-of-thought (can fail on complex problems):**

```python
# no_cot.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=64,
    messages=[{
        "role": "user",
        "content": "If a train travels 120 miles in 2 hours, then slows to half speed for the next 90 minutes, how far does it travel in total?"
    }]
)
print(response.content[0].text)
```

**With chain-of-thought (more reliable):**

```python
# with_cot.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{
        "role": "user",
        "content": """If a train travels 120 miles in 2 hours, then slows to half speed for the next 90 minutes, how far does it travel in total?

Think through this step by step before giving your final answer."""
    }]
)
print(response.content[0].text)
# Claude will now show its reasoning: speed = 60mph, half speed = 30mph,
# 30mph × 1.5hrs = 45 miles, 120 + 45 = 165 miles total
```

**When to use**: Math problems, logic puzzles, multi-step decisions, anything where getting the reasoning right matters.

---

## Technique 4: Role Assignment in System Prompts

Telling Claude to play a specific role shapes its tone, vocabulary, and level of detail.

```python
# role_assignment.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    system="""You are a senior software engineer specializing in Python performance optimization.
You give practical, specific advice with code examples.
You do not give vague or generic answers.
When you don't know something, you say so.""",
    messages=[{
        "role": "user",
        "content": "My Python script that processes a list of 1 million items is too slow. How do I speed it up?"
    }]
)
print(response.content[0].text)
```

**Why it works**: Role assignment activates relevant knowledge and sets appropriate expectations for response depth and tone.

---

## Technique 5: Specificity and Constraints

The more specific your instructions, the more predictable the output.

**Weak prompt (vague):**
> "Write an email about the project."

**Strong prompt (specific):**
> "Write a professional email to a client notifying them that their software project will be delayed by 2 weeks due to unexpected technical issues. Keep it under 150 words, apologize once, provide a new delivery date of March 15th, and offer a 10% discount on the final invoice."

```python
# specificity_example.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

weak = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=256,
    messages=[{"role": "user", "content": "Write an email about the project delay."}]
)

strong = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=256,
    messages=[{"role": "user", "content": """Write a professional email to a client (Jane Smith at Acme Corp)
notifying them of a 2-week delay to their CRM project.
Requirements:
- Under 150 words
- Professional but warm tone
- Apologize once
- New delivery date: March 15th
- Offer a 10% discount
- Sign off as "Alex, Project Manager" """}]
)

print("=== Weak prompt result ===")
print(weak.content[0].text)
print("\n=== Strong prompt result ===")
print(strong.content[0].text)
```

---

## Technique 6: Output Format Instructions

Tell Claude exactly what format you want the response in.

```python
# output_formatting.py
import anthropic
import json
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Request JSON output
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{
        "role": "user",
        "content": """Extract the following information from this job posting and return it as JSON.

Job posting: "Senior Python Developer at TechCorp in Austin, TX.
5+ years experience required. Salary: $120,000-$150,000.
Remote work available 3 days per week."

Return JSON with these exact keys: title, company, location, years_experience,
salary_min, salary_max, remote_days_per_week"""
    }]
)

# Parse the JSON from Claude's response
result = json.loads(response.content[0].text)
print(result["company"])   # "TechCorp"
print(result["salary_min"])  # 120000
```

---

## Technique 7: XML Tags for Structured Prompts

For complex prompts, XML tags help Claude parse the different parts of your instructions clearly. Claude is specifically trained to understand `<tag>` structure.

```python
# xml_tags.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

prompt = """<instructions>
You are a code reviewer. Review the code provided in <code> tags.
Identify bugs, style issues, and improvements.
Format your response as a numbered list.
</instructions>

<code language="python">
def calculate_average(numbers):
    total = 0
    for n in numbers:
        total = total + n
    return total / len(numbers)
</code>

<task>Review this code and suggest improvements.</task>"""

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": prompt}]
)
print(response.content[0].text)
```

Useful XML tags: `<instructions>`, `<context>`, `<examples>`, `<code>`, `<document>`, `<task>`, `<output_format>`

---

## Technique 8: Prompt Chaining

For complex tasks, break the work into multiple sequential API calls where each call's output feeds into the next.

```python
# prompt_chaining.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def call(prompt, system=None):
    """Helper to make a single API call."""
    kwargs = {
        "model": "claude-sonnet-4-5",
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": prompt}]
    }
    if system:
        kwargs["system"] = system
    return client.messages.create(**kwargs).content[0].text

# Step 1: Research phase
topic = "quantum computing"
outline = call(f"Create a 5-point outline for a beginner's blog post about {topic}.")
print("=== Outline ===\n", outline)

# Step 2: Writing phase — pass the outline as input
draft = call(f"""Write a 300-word blog post for beginners using this outline:

{outline}

Write in a friendly, conversational tone. Avoid jargon.""")
print("\n=== Draft ===\n", draft)

# Step 3: Editing phase — pass the draft as input
edited = call(f"""Edit this blog post for clarity and engagement:

{draft}

Focus on: removing passive voice, adding a compelling hook, and ensuring the conclusion has a call to action.""")
print("\n=== Final ===\n", edited)
```

**When to use**: When a task is too complex for a single prompt, or when you want to verify/edit intermediate results.

---

## The Temperature Parameter

**Temperature** controls how random (creative) vs deterministic (predictable) Claude's responses are. It ranges from 0 to 1.

| Temperature | Behavior | Best for |
|------------|---------|---------|
| `0` | Completely deterministic, picks the most likely next token every time | Classification, data extraction, factual Q&A |
| `0.3` | Mostly consistent with slight variation | Summarization, editing, analysis |
| `0.7` (default) | Balanced creativity and coherence | General-purpose writing |
| `1.0` | Maximum creativity and variety | Brainstorming, creative writing, generating options |

```python
# temperature_example.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Deterministic: same answer every time
factual = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=64,
    temperature=0,  # always picks the most likely answer
    messages=[{"role": "user", "content": "What is the capital of France?"}]
)

# Creative: different each time
creative = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=128,
    temperature=1.0,  # maximum variety
    messages=[{"role": "user", "content": "Give me a unique product name for a smart water bottle."}]
)

print("Factual:", factual.content[0].text)
print("Creative:", creative.content[0].text)
```

---

## Common Anti-Patterns

Avoid these prompt mistakes:

| Anti-Pattern | Example | Problem | Fix |
|-------------|---------|---------|-----|
| **Vague instructions** | "Make it better" | Claude doesn't know what "better" means | "Make the tone more formal and reduce length by 30%" |
| **Conflicting constraints** | "Be concise. Include all details." | Impossible to satisfy both | Pick one priority |
| **Over-stuffed prompt** | Instructions + examples + 5 documents | Claude loses focus | Use prompt chaining instead |
| **Assuming knowledge** | "Fix the bug" (no code provided) | Claude can't see your files | Always include the relevant code |
| **Prompt injection risk** | Putting raw user input directly into system prompt | User can override your instructions | Keep user input in `messages`, not `system` |

---

## Before/After Comparison Table

| Use Case | Weak Prompt | Strong Prompt |
|---------|------------|--------------|
| Summarization | "Summarize this" | "Summarize this article in exactly 3 bullet points. Each bullet should be under 20 words." |
| Code generation | "Write code to sort a list" | "Write a Python function `sort_by_date(records)` that sorts a list of dicts by the 'date' key (ISO 8601 strings) in ascending order. Include a docstring and one usage example." |
| Classification | "Categorize this email" | "Categorize this email as exactly one of: [Sales, Support, Billing, Spam]. Return only the category word, nothing else." |
| Translation | "Translate this" | "Translate the following English text to French. Preserve formatting (bold, bullets). Do not add any commentary." |
| Brainstorming | "Give me ideas" | "Generate 10 distinct product name ideas for an AI-powered recipe app targeting busy parents. Each name should be 1-2 words, memorable, and hint at speed or convenience." |

---

## Evaluating Your Prompts

Before deploying a prompt, test it systematically:

1. **Run it 5+ times** at `temperature > 0` — are results consistently acceptable?
2. **Test edge cases** — what happens with an empty input? An unusually long input? Input in a different language?
3. **Adversarial testing** — what if a user tries to get Claude to ignore your instructions?
4. **Measure against your criteria** — define what "good output" means before testing

---

## Key Takeaways

- The system prompt sets Claude's persona and rules; user messages contain the task
- **Zero-shot** works for simple tasks; **few-shot** is powerful when you can show examples
- Add "think step by step" to prompts for complex reasoning tasks (chain-of-thought)
- Be specific: vague instructions produce vague results
- Use XML tags (`<instructions>`, `<task>`) to structure complex prompts clearly
- Use `temperature=0` for deterministic tasks (classification, extraction); higher for creative tasks
- Break complex tasks into **prompt chains** rather than cramming everything into one prompt
- Never embed raw user input in the system prompt — that's a prompt injection risk
