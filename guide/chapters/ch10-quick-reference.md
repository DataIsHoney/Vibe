# Chapter 10: Quick Reference Card — Last-Minute Review

A compact reference for exam day. One section per major topic.

---

## API Setup Checklist

```
□ Account created at console.anthropic.com
□ API key created and copied
□ API key stored in .env file (NEVER in source code)
□ .env added to .gitignore
□ pip install anthropic python-dotenv
□ Virtual environment activated
□ client = anthropic.Anthropic()  ← reads ANTHROPIC_API_KEY automatically
```

---

## Minimal Working API Call

```python
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",     # which model
    max_tokens=1024,                # output ceiling
    system="You are a helpful assistant.",  # optional but recommended
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(response.content[0].text)    # Claude's response text
print(response.usage.input_tokens) # tokens you sent
print(response.usage.output_tokens)# tokens Claude generated
```

---

## Model Comparison

| Model | Speed | Cost | Best For |
|-------|-------|------|---------|
| `claude-haiku-4-5` | Fastest | Cheapest | Classification, routing, extraction, high-volume |
| `claude-sonnet-4-5` | Fast | Moderate | **Default for most tasks** — writing, coding, analysis |
| `claude-opus-4-5` | Moderate | High | Complex reasoning, highest-quality output |
| `claude-opus-4-6` | Moderate | High | Frontier capability |

**Decision rule**: Try Haiku first → if quality insufficient → Sonnet → if still insufficient → Opus

**All models**: 200K token context window, all support tool use

---

## Key API Parameters

| Parameter | Type | Notes |
|-----------|------|-------|
| `model` | string | Required. Use pinned versions in production. |
| `max_tokens` | int | Required. Caps output length. Set appropriately for task. |
| `system` | string or list | Optional. Sets Claude's persona and rules. |
| `messages` | list | Required. All conversation turns, oldest first. |
| `temperature` | float 0-1 | Optional. 0=deterministic, 1=creative. Default ~1. |
| `tools` | list | Optional. Tool definitions for function calling. |
| `tool_choice` | dict | Optional. `{"type": "auto"}` / `"any"` / `{"type":"tool","name":"X"}` |

---

## Messages Format

```python
messages = [
    {"role": "user",      "content": "User's first message"},
    {"role": "assistant", "content": "Claude's reply"},
    {"role": "user",      "content": "User's follow-up"},
    # always resend the ENTIRE history — Claude has no memory
]
```

---

## Prompt Engineering Rules of Thumb

| Rule | Do | Don't |
|------|----|-------|
| Be specific | "Respond in exactly 3 bullets, max 15 words each" | "Be concise" |
| Use examples | Provide 2-3 input/output pairs for format | Describe format only in words |
| Use system prompt | Persona, rules, format constraints | Leave it empty |
| Use XML tags | `<instructions>`, `<context>`, `<task>` for complex prompts | Mix everything in one block |
| Chain for complexity | Multiple calls for multi-step tasks | One massive prompt |
| Temperature | 0 for classification/extraction; 0.7+ for creative | Leave default for everything |

---

## Tool Use — 6-Step Cycle

```
1. Define tools (JSON schema: name + description + input_schema)
2. Send: messages + tools list to Claude
3. Receive: response with tool_use block (stop_reason == "tool_use")
4. Execute: run your function with tool_use.input arguments
5. Send back: original messages + Claude's response + tool_result message
6. Receive: Claude's final text answer
```

**Tool result message format:**
```python
{
    "role": "user",
    "content": [{
        "type": "tool_result",
        "tool_use_id": "toolu_xxx",   # must match tool_use block's id
        "content": json.dumps(result), # your function's output as string
        "is_error": True              # optional, set if tool failed
    }]
}
```

---

## Safety — Key Facts

| Concept | Key Point |
|---------|-----------|
| Hardcoded | Absolute limits — cannot be overridden by ANY prompt. E.g.: bioweapons, CSAM |
| Softcoded | Adjustable defaults within policy. E.g.: safe messaging, explicit content |
| Trust hierarchy | Anthropic > Operator > User |
| Operator | Developer using the API (you). Controls system prompt. |
| User | Your end users. Can only do what operator allows. |
| Prompt injection | Malicious content in processed data trying to override instructions |
| Mitigation | Validate tool inputs; separate instructions from data; human-in-the-loop for high-stakes actions |

---

## Context Window Quick Facts

| Item | Value |
|------|-------|
| All Claude 3/3.5/4 models | 200K input tokens |
| 1 page (~250 words) | ~330 tokens |
| 200K tokens ≈ | ~500 pages / 150K words / 6K lines of code |
| What counts | System prompt + all messages + tool definitions + tool results |
| Fix for long conversations | Sliding window (last N messages) or summarization |
| Prompt caching min | 1,024 tokens prefix required |
| Prompt caching savings | ~90% on cache reads (cache write: +25%) |
| Cache TTL | 5 minutes (ephemeral) |

---

## Cost Quick Facts

| Item | Value |
|------|-------|
| Input tokens | Cheaper (you send to Claude) |
| Output tokens | ~5-6x more expensive (Claude generates) |
| Batch API discount | 50% off — for async jobs ≤24h turnaround |
| Prompt caching | ~90% savings on cached prefix reads |
| Token counting API | `client.messages.count_tokens(...)` — free to call |
| Usage limits | Set in Anthropic Console → Settings → Limits |

**Cost formula:**
```
cost = (input_tokens / 1M × input_rate) + (output_tokens / 1M × output_rate)
```

---

## Multi-Agent Patterns

| Pattern | When to Use | Key Code |
|---------|------------|---------|
| Sequential pipeline | Steps depend on each other | Output of A → input of B → input of C |
| Parallel fan-out | Independent subtasks | `concurrent.futures.ThreadPoolExecutor` |
| Hierarchical | Complex orchestration needs sub-orchestrators | Nested orchestrator calls |

**Anti-patterns to avoid:**
- No `MAX_ITERATIONS` limit → infinite loops
- Passing full context verbatim → context explosion (summarize before handoff)
- Same model for all agents → wasted cost (use Haiku for simple subtasks)

---

## Error Handling Cheatsheet

| Error | Cause | Fix |
|-------|-------|-----|
| `AuthenticationError` | Wrong or missing API key | Check `ANTHROPIC_API_KEY` env var |
| `RateLimitError` | Too many requests | Retry with exponential backoff |
| `APIStatusError` | Server error | Check status code; retry for 5xx |
| `stop_reason == "max_tokens"` | Response cut off | Increase `max_tokens` |

```python
try:
    response = client.messages.create(...)
except anthropic.AuthenticationError:
    print("Bad API key")
except anthropic.RateLimitError:
    time.sleep(2); # then retry
except anthropic.APIStatusError as e:
    print(f"API error {e.status_code}: {e.message}")
```

---

## Streaming (for Real-Time UX)

```python
with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "Tell me a story."}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```
Note: Streaming costs the SAME as non-streaming.

---

## Vision (Image Input)

```python
# Include image as a content block in messages
messages=[{
    "role": "user",
    "content": [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": base64_encoded_string,
            }
        },
        {"type": "text", "text": "What's in this image?"}
    ]
}]
```
Supported formats: PNG, JPEG, GIF, WebP. Max 5MB per image. Max 20 images per message.

---

## Certification Exam Focus Areas

Based on the guide content, pay special attention to:

1. **Hardcoded vs softcoded** — a common exam topic; know examples of each
2. **Trust hierarchy** — Anthropic → Operator → User; who can override what
3. **Tool use cycle** — all 6 steps, especially the tool_result message format
4. **Context window** — what counts toward it, management strategies
5. **Prompt caching** — when it applies, cost savings, minimum token requirement
6. **Model selection** — Haiku vs Sonnet vs Opus trade-offs
7. **Prompt injection** — definition and why it matters in agentic systems
8. **Batch API** — when to use, discount amount, turnaround time
