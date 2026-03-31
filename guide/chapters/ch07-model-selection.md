# Chapter 7: Model Selection — Choosing the Right Claude for the Job

## Why Model Selection Matters

Anthropic offers several Claude models, each with different trade-offs between **speed**, **capability**, and **cost**. Choosing the wrong model means either:

- Paying 10x more than necessary (using a powerful model for a simple task)
- Getting poor results (using a lightweight model for complex reasoning)

Model selection is one of the highest-leverage cost and quality decisions you'll make in your application architecture.

---

## The Claude Model Families

### How Claude Models Are Named

Claude models follow a naming pattern:
```
claude-[family]-[version]-[date]

Examples:
claude-haiku-4-5-20251001   → Haiku family, version 4.5, released Oct 2025
claude-sonnet-4-5-20250514  → Sonnet family, version 4.5, released May 2025
claude-opus-4-6             → Opus family, version 4.6
```

You can use **versioned IDs** (pinned, always the exact same model) or **shorthand aliases** (may point to newer versions over time).

---

### Model Tiers Explained

#### Haiku — Fast, Affordable, High Volume

Haiku is Claude's lightweight model tier, optimized for speed and cost.

**Best for:**
- Classification tasks ("Is this email spam or not-spam?")
- Simple information extraction from structured text
- Routing decisions in agent pipelines ("Which department should handle this?")
- High-volume batch processing where cost matters
- Simple, factual Q&A with short responses
- Summarizing short documents

**Trade-off**: Less capable at complex reasoning, nuanced writing, or tasks requiring deep understanding.

#### Sonnet — The Workhorse (Best Default Choice)

Sonnet is the recommended default model for most production applications. It offers an excellent balance of capability and cost.

**Best for:**
- General-purpose writing and editing
- Code generation and debugging
- Analysis and research tasks
- Customer support and conversational AI
- Most tool use and agentic tasks
- The final "user-facing" step in multi-agent pipelines

**Trade-off**: More expensive than Haiku; slower than Haiku; may not match Opus on extremely complex reasoning tasks.

#### Opus — Maximum Capability

Opus is Claude's most powerful model, designed for tasks that require the deepest reasoning and understanding.

**Best for:**
- Complex multi-step reasoning
- Difficult coding challenges (e.g., debugging complex algorithms)
- Research synthesis across many sources
- Tasks where quality is worth the cost premium
- Evaluating and judging other model outputs

**Trade-off**: Significantly more expensive and slower than Sonnet. Use only when Sonnet's output quality is insufficient.

---

## Model Comparison Table

| Model | Speed | Cost | Context | Best For |
|-------|-------|------|---------|---------|
| claude-haiku-4-5 | Fastest | Cheapest | 200K | Classification, routing, extraction, high-volume tasks |
| claude-sonnet-4-5 | Fast | Moderate | 200K | General purpose — the right default for most apps |
| claude-opus-4-5 | Moderate | High | 200K | Complex reasoning, highest-quality outputs |
| claude-opus-4-6 | Moderate | High | 200K | Frontier capability, latest improvements |

> **Note**: Exact pricing changes over time. Always check [console.anthropic.com](https://console.anthropic.com) for current pricing.

---

## Vision Capabilities: Processing Images

Several Claude models can analyze images. To include an image in an API call, you add an image content block to your message:

**What is base64?** Images are binary files (sequences of bytes). The API communicates in text (JSON). **Base64** is a standard encoding that converts binary data into a string of plain text characters — it's how you include a binary file inside a JSON message. Python's built-in `base64` library handles this conversion automatically.

```python
# vision_example.py
import anthropic
import base64
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Option 1: Send image as base64-encoded data
with open("chart.png", "rb") as image_file:
    image_data = base64.standard_b64encode(image_file.read()).decode("utf-8")

response = client.messages.create(
    model="claude-sonnet-4-5",  # vision-capable model
    max_tokens=512,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_data,
                    }
                },
                {
                    "type": "text",
                    "text": "Describe what you see in this chart and identify the main trend."
                }
            ]
        }
    ]
)
print(response.content[0].text)

# Option 2: Send image via URL (must be publicly accessible)
response_url = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": "https://example.com/my-image.jpg",
                    }
                },
                {
                    "type": "text",
                    "text": "What is shown in this image?"
                }
            ]
        }
    ]
)
print(response_url.content[0].text)
```

Supported image formats: PNG, JPEG, GIF, WebP. Maximum image size: 5MB. You can include up to 20 images in a single message.

---

## Context Window Across Models

All current Claude 3, 3.5, and 4 family models support a **200,000 token input context window**. This is not a differentiator between models — they all support the same large context.

The **output** context (max tokens you can request back) is separate from the input context and has its own limits:
- Claude 3 Haiku: up to 4,096 output tokens (~3,000 words)
- Claude 3.5 and 4 models: up to 8,192 output tokens (~6,000 words)

This means even though the model can *read* 200K tokens of input, it can only *generate* up to 8K tokens per response. If you need longer outputs, you'll need to use multiple calls (prompt chaining).

---

## Latency Considerations

If your application needs to respond quickly (real-time chatbots, interactive tools):

| Model | Typical Time-to-First-Token | Best for Real-Time? |
|-------|----------------------------|---------------------|
| claude-haiku-4-5 | Very fast (~0.5s) | Yes — ideal for real-time |
| claude-sonnet-4-5 | Fast (~1s) | Yes — good for most real-time use |
| claude-opus-4-5/4-6 | Slower (~2-3s) | Use streaming to improve perceived performance |

**Streaming** helps with perceived performance — show characters as they're generated rather than waiting for the full response:

```python
# streaming_example.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Stream the response token by token
with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "Write a haiku about programming."}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)  # print each token as it arrives
print()  # newline at the end
```

---

## Model Selection Decision Tree

Use this decision framework when choosing a model:

```
Is this a high-volume, simple task?
(classification, routing, extraction from short structured text)
    │
    YES ──► claude-haiku-4-5

    NO
    │
    ▼
Does it require complex multi-step reasoning,
difficult coding, or highest-quality output?
    │
    YES ──► claude-opus-4-5 or claude-opus-4-6
            (only use if Sonnet quality is insufficient)

    NO
    │
    ▼
    claude-sonnet-4-5  ◄── Default choice for most tasks
```

---

## Pinned Versions vs Aliases

You have two ways to specify a model:

### Pinned Versions (Recommended for Production)
```python
model="claude-sonnet-4-5-20250514"  # exact model, never changes
```
- **Pros**: Reproducible — the exact same model runs every time, forever
- **Cons**: You must manually update when you want a newer model
- **Use when**: You need consistent, predictable outputs; you're running a regulated system; you've done extensive testing on this specific version

### Aliases (Convenient for Development)
```python
model="claude-sonnet-4-5"  # may point to a newer version over time
```
- **Pros**: Automatically gets improvements when Anthropic releases minor updates
- **Cons**: Your application's behavior could change without you changing code
- **Use when**: You're prototyping; you want automatic minor improvements; you test regularly

**Best practice for production**: Pin your model versions. Review Anthropic's release notes periodically. Test on the new pinned version before migrating.

---

## Strategy: Test Down, Deploy Up

Before committing to an expensive model, test with cheaper ones:

```python
# model_testing_strategy.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def test_on_all_models(prompt: str):
    """Test your prompt on multiple models and compare quality vs cost."""
    models = [
        ("claude-haiku-4-5", "Cheapest"),
        ("claude-sonnet-4-5", "Middle tier"),
        ("claude-opus-4-5", "Most capable"),
    ]

    for model_id, label in models:
        response = client.messages.create(
            model=model_id,
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )
        print(f"\n=== {label}: {model_id} ===")
        print(response.content[0].text)
        print(f"Tokens used: {response.usage.input_tokens} in / {response.usage.output_tokens} out")

# Test your actual task
test_on_all_models("Classify this customer support ticket as: Billing, Technical, or General.\n\nTicket: 'I was charged twice for my subscription this month.'")
```

If Haiku's output is acceptable, use Haiku. Don't pay for Sonnet or Opus when Haiku gets the job done.

---

## Updating Code for New Model Versions

When Anthropic releases new models, you'll want to migrate. Here's a clean way to manage model configuration:

```python
# model_config.py
# Centralize model configuration so you only change one place

MODEL_CONFIG = {
    # Use these throughout your application
    "fast_cheap": "claude-haiku-4-5-20251001",      # for simple/high-volume tasks
    "default": "claude-sonnet-4-5-20250514",          # for most tasks
    "best": "claude-opus-4-6",                        # for complex tasks
}

# In your application code, reference the config, not hardcoded strings:
# response = client.messages.create(model=MODEL_CONFIG["default"], ...)
#
# When it's time to update, change MODEL_CONFIG in one place and it
# propagates everywhere automatically.
```

---

## Key Takeaways

- **Haiku**: Use for high-volume, simple tasks — classification, routing, extraction. It's the fastest and cheapest.
- **Sonnet**: Use for most applications — the best default for quality and cost balance.
- **Opus**: Use only when Sonnet isn't good enough — it's the most capable but also most expensive and slowest.
- All Claude 3/3.5/4 models support a 200K token context window
- Vision (image understanding) is available on Sonnet and Opus; check documentation for exact model support
- Use streaming to improve perceived performance for real-time applications
- **Pin model versions in production** for reproducibility; test before migrating to new versions
- Test your prompts on Haiku first — only upgrade to Sonnet/Opus if necessary
- Centralize model configuration so you can update in one place
