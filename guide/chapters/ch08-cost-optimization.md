# Chapter 8: Cost Optimization — Building Economically

## How LLM API Billing Works

If you've never used a paid API before, this may be new: **you pay per token**, not per API call or per month.

Recall from Chapter 1 that a **token** is roughly ¾ of a word (~4 characters of English text). Every token you send to Claude (input) and every token Claude generates back (output) has a cost.

**There are two separate costs for every API call:**
1. **Input tokens**: All the text you send — system prompt + conversation history + your message
2. **Output tokens**: All the text Claude generates in its response

Output tokens typically cost significantly more per token than input tokens.

### Tokenizing a Sample Sentence

```
"Hello, how are you today?" → approximately 6 tokens
"The quick brown fox jumps over the lazy dog." → approximately 9 tokens
A typical paragraph (100 words) → approximately 130 tokens
A full page of text (250 words) → approximately 330 tokens
```

---

## Approximate Pricing Reference

> **Important**: Prices change over time. Always check [console.anthropic.com](https://console.anthropic.com) for current pricing. The numbers below are illustrative.

| Model | Input (per million tokens) | Output (per million tokens) |
|-------|--------------------------|---------------------------|
| Claude Haiku | ~$0.25 | ~$1.25 |
| Claude Sonnet | ~$3.00 | ~$15.00 |
| Claude Opus | ~$15.00 | ~$75.00 |

**Key observation**: Output is 5-6x more expensive than input. Keeping your outputs concise has a significant impact on cost.

---

## Estimating Costs Before Running

Always estimate before running expensive pipelines at scale.

### Using the Token Counting API

```python
# count_tokens.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Count tokens WITHOUT making a full API call
# This is cheaper than making a dummy request
token_count = client.messages.count_tokens(
    model="claude-sonnet-4-5",
    system="You are a helpful assistant specialized in Python programming.",
    messages=[
        {"role": "user", "content": "Explain list comprehensions in Python with 3 examples."}
    ]
)

print(f"Input tokens: {token_count.input_tokens}")
```

### Manual Cost Estimation Formula

```python
# cost_estimator.py

PRICING = {
    "haiku":  {"input": 0.25,  "output": 1.25},   # per million tokens
    "sonnet": {"input": 3.00,  "output": 15.00},
    "opus":   {"input": 15.00, "output": 75.00},
}

def estimate_cost(
    model_tier: str,
    input_tokens: int,
    output_tokens: int,
    num_calls: int = 1
) -> float:
    """Estimate cost in USD for a given number of API calls."""
    rates = PRICING[model_tier]
    cost_per_call = (
        (input_tokens / 1_000_000) * rates["input"] +
        (output_tokens / 1_000_000) * rates["output"]
    )
    return cost_per_call * num_calls

# Example: Customer support bot
# - System prompt: ~500 tokens
# - Average conversation: 5 turns × ~150 tokens each = 750 tokens input
# - Average response per turn: ~200 tokens

print("=== Cost Scenarios ===")

# Single conversation estimate
scenario_1 = estimate_cost("sonnet", input_tokens=1250, output_tokens=1000)
print(f"Single conversation (Sonnet): ${scenario_1:.6f}")

# At scale
scenario_scale = estimate_cost("sonnet", input_tokens=1250, output_tokens=1000, num_calls=10_000)
print(f"10,000 conversations (Sonnet): ${scenario_scale:.2f}/month")

# Same task on Haiku
scenario_haiku = estimate_cost("haiku", input_tokens=1250, output_tokens=1000, num_calls=10_000)
print(f"10,000 conversations (Haiku): ${scenario_haiku:.2f}/month")

print(f"Potential savings by using Haiku: ${scenario_scale - scenario_haiku:.2f}/month")
```

---

## Prompt Caching: Your Biggest Savings Lever

**Prompt caching** is the most impactful cost optimization for applications with large, stable prompts.

### How It Works

When you mark a portion of your prompt with `cache_control`, Anthropic stores that content in a cache for 5 minutes. On the next call with the same prefix:
- **Cache creation**: ~25% premium on top of normal input pricing (one-time cost to write the cache)
- **Cache reads**: ~10% of normal input pricing (huge savings on every subsequent call)

### Worked Example

Scenario: A legal analysis tool with a 5,000-token system prompt, used 100 times per hour.

```python
# Cache economics calculation
SYSTEM_PROMPT_TOKENS = 5_000
CALLS_PER_HOUR = 100
SONNET_INPUT_RATE = 3.00  # per million tokens

# WITHOUT caching: pay full price every call
cost_without_cache = (SYSTEM_PROMPT_TOKENS / 1_000_000) * SONNET_INPUT_RATE * CALLS_PER_HOUR
print(f"Without caching (100 calls): ${cost_without_cache:.4f}/hour")

# WITH caching:
# First call: cache creation = 1.25x normal price
# Remaining 99 calls: cache read = 0.10x normal price
cache_creation_cost = (SYSTEM_PROMPT_TOKENS / 1_000_000) * SONNET_INPUT_RATE * 1.25
cache_read_cost = (SYSTEM_PROMPT_TOKENS / 1_000_000) * SONNET_INPUT_RATE * 0.10 * 99
cost_with_cache = cache_creation_cost + cache_read_cost
print(f"With caching (100 calls): ${cost_with_cache:.4f}/hour")

savings = cost_without_cache - cost_with_cache
print(f"Savings: ${savings:.4f}/hour = ${savings * 24 * 30:.2f}/month")
```

### Setting Up Prompt Caching

```python
# enabling_cache.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Large stable system prompt — mark it for caching
large_system_prompt = """You are an expert financial analyst...
[thousands of tokens of domain knowledge, policies, and examples]"""

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    system=[
        {
            "type": "text",
            "text": large_system_prompt,
            "cache_control": {"type": "ephemeral"}  # cache this prefix
        }
    ],
    messages=[
        {"role": "user", "content": "Analyze the revenue trends in the attached report."}
    ]
)

# Check if cache was used
print(f"Cache creation tokens: {response.usage.cache_creation_input_tokens}")
print(f"Cache read tokens: {response.usage.cache_read_input_tokens}")
print(f"Regular input tokens: {response.usage.input_tokens}")
```

**Requirements for caching:**
- The cached prefix must be at least **1,024 tokens** (minimum for caching to be available)
- Cache TTL is 5 minutes (ephemeral); longer TTLs may be available for enterprise
- The prefix must be identical on each call for the cache to hit

---

## Batch API: 50% Off for Non-Real-Time Work

The **Batch API** lets you submit up to 10,000 requests at once and receive results asynchronously (typically within 24 hours). In exchange, you get a **50% discount** on all tokens.

**Use it for:**
- Generating product descriptions for your catalog (can wait overnight)
- Processing customer feedback surveys
- Data labeling and classification at scale
- Generating reports that run once daily

**Not suitable for:**
- Real-time user interactions
- Any task where latency matters

```python
# batch_api_example.py
import anthropic
import json
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Prepare a list of requests
product_names = ["UltraBlend Pro 3000", "SilentStep Yoga Mat", "NovaBrew Coffee Maker"]

requests = [
    {
        "custom_id": f"product-{i}",           # your unique ID for this request
        "params": {
            "model": "claude-haiku-4-5",
            "max_tokens": 150,
            "messages": [{
                "role": "user",
                "content": f"Write a 2-sentence product description for: {name}"
            }]
        }
    }
    for i, name in enumerate(product_names)
]

# Submit the batch
batch = client.messages.batches.create(requests=requests)
print(f"Batch created: {batch.id}")
print(f"Status: {batch.processing_status}")

# In production, you'd poll for completion or use a webhook
# For this example, we'll just show how to retrieve results
# (The batch will complete within 24 hours)

# To check status later:
# batch_status = client.messages.batches.retrieve(batch.id)

# To retrieve results when complete:
# for result in client.messages.batches.results(batch.id):
#     print(f"ID: {result.custom_id}")
#     if result.result.type == "succeeded":
#         print(result.result.message.content[0].text)
```

---

## Model Tiering Strategy

The single most impactful optimization is using the right model for each task:

```python
# model_tiering.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def smart_route_and_process(user_message: str) -> str:
    """Use cheap models where possible, expensive models only when needed."""

    # Step 1: Route with Haiku (cheap)
    routing_response = client.messages.create(
        model="claude-haiku-4-5",   # cheapest
        max_tokens=10,
        system="Classify user intent as exactly one of: SIMPLE_QA, ANALYSIS, CREATIVE. Return only the category.",
        messages=[{"role": "user", "content": user_message}]
    )
    intent = routing_response.content[0].text.strip()

    # Step 2: Handle based on complexity
    if intent == "SIMPLE_QA":
        # Simple questions: still use Haiku
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=256,
            messages=[{"role": "user", "content": user_message}]
        )
    elif intent == "ANALYSIS":
        # Analysis: use Sonnet
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": user_message}]
        )
    else:
        # Creative: use Sonnet (Haiku may not have enough creativity)
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": user_message}]
        )

    return response.content[0].text
```

---

## max_tokens as a Cost Control

`max_tokens` caps the number of tokens Claude can generate. Setting it appropriately prevents unexpectedly long (and expensive) responses:

```python
# Task-appropriate max_tokens settings
TASK_MAX_TOKENS = {
    "sentiment_classification": 10,      # "Positive", "Negative", or "Neutral"
    "yes_no_question": 5,                # "Yes" or "No"
    "one_sentence_summary": 50,          # one sentence
    "short_answer": 150,                 # paragraph response
    "standard_response": 512,            # typical chat response
    "detailed_analysis": 2048,           # long-form content
    "full_document": 4096,               # maximum for most models
}
```

**Important**: If Claude reaches `max_tokens` before finishing, `stop_reason` will be `"max_tokens"` and the response will be cut off. Check this in production:

```python
response = client.messages.create(...)
if response.stop_reason == "max_tokens":
    # Response was cut off — increase max_tokens or handle truncation
    print("Warning: Response was truncated at max_tokens limit")
```

---

## Output Reduction Techniques

Ask Claude to be concise, and it will be:

```python
# output_length_control.py

# Verbose (expensive)
verbose_prompt = "Tell me about Python."
# → May generate 500-1000 tokens

# Concise (cheap)
concise_prompt = "Explain Python in exactly 3 bullet points, max 15 words each."
# → Will generate ~50 tokens

# For JSON extraction, ask for compact format
json_prompt = """Extract: name, age, city. Return compact JSON only, no explanation.
Text: 'John Smith, 34 years old, lives in Austin.'"""
# → {"name":"John Smith","age":34,"city":"Austin"}  (minimal tokens)
```

---

## Streaming: Same Cost, Better UX

Streaming does NOT reduce cost — you pay the same tokens either way. But it dramatically improves user experience by showing characters as they're generated.

**When to stream:**
- Any real-time user-facing interaction
- When responses might be long (> 5 seconds to generate)

**When NOT to stream:**
- Background processing / batch jobs
- When you need the full response before doing anything with it
- Agentic pipelines where you parse the full response

See Chapter 7 for the streaming code example.

---

## Monitoring and Tracking Usage

**Anthropic Console** ([console.anthropic.com](https://console.anthropic.com)):
- View usage by time period, model, and API key
- Set **usage limits** to prevent unexpected charges (under Settings → Limits)
- View real-time usage and invoices

**Track usage in your code:**

```python
# usage_tracking.py
import anthropic
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = anthropic.Anthropic()

# Simple usage logger
usage_log = []

def tracked_call(model, max_tokens, messages, system=None):
    """Wrapper that logs token usage for every API call."""
    kwargs = {"model": model, "max_tokens": max_tokens, "messages": messages}
    if system:
        kwargs["system"] = system

    response = client.messages.create(**kwargs)

    # Log the usage
    usage_log.append({
        "timestamp": datetime.now().isoformat(),
        "model": model,
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
    })

    return response

# Use tracked_call instead of client.messages.create
response = tracked_call(
    model="claude-sonnet-4-5",
    max_tokens=256,
    messages=[{"role": "user", "content": "Hello!"}]
)

# Print usage summary
total_input = sum(u["input_tokens"] for u in usage_log)
total_output = sum(u["output_tokens"] for u in usage_log)
print(f"Session totals: {total_input} input tokens, {total_output} output tokens")
```

---

## Cost Optimization Checklist

Before deploying to production:

- [ ] Am I using the cheapest model that meets quality requirements? (Test Haiku first)
- [ ] Have I enabled prompt caching for stable prompts > 1,024 tokens?
- [ ] Are my `max_tokens` settings appropriate for each task type?
- [ ] Are non-urgent batch tasks using the Batch API (50% discount)?
- [ ] Am I asking Claude to be concise in my prompts when length doesn't matter?
- [ ] Have I set usage limits in the Anthropic Console to prevent surprise bills?
- [ ] Do I have usage logging in my application to track costs per feature?
- [ ] Have I run a cost estimate before launching a high-volume pipeline?

---

## Key Takeaways

- You pay per token: both input (what you send) and output (what Claude generates)
- Output tokens typically cost 5-6x more than input tokens — keep outputs concise
- Use the **token counting API** to estimate costs before running at scale
- **Prompt caching** is the highest-impact optimization: ~90% savings on cached content (requires 1,024+ token stable prefix)
- The **Batch API** gives 50% off for async work that can wait up to 24 hours
- Use **Haiku** for simple, high-volume tasks; **Sonnet** for most things; **Opus** only when quality demands it
- Set appropriate `max_tokens` limits — don't let Claude generate 2,000 tokens when you need 50
- Streaming costs the same as non-streaming but dramatically improves UX for real-time interactions
- Set usage limits in the Anthropic Console so you can't accidentally spend more than you intend
