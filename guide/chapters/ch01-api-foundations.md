# Chapter 1: API Foundations — Your First Steps with the Anthropic API

---

## Introduction

This chapter is your starting point. Before you can build anything with Claude, you need to understand the mechanics of how your code communicates with Anthropic's servers — what an API is, how authentication works, what the basic request and response structures look like, and how to handle errors gracefully.

By the end of this chapter, you will be able to:

- Explain what an API, SDK, and token are in concrete terms
- Set up a Python environment and install the Anthropic SDK
- Store and load your API key securely using environment variables
- Write and run your first API call to Claude
- Navigate the response object and extract the text, usage stats, and stop reason
- Build a multi-turn conversation by maintaining a history list
- Handle common errors including authentication failures and rate limits
- Use the async SDK for non-blocking calls

---

## 1.1 Core Concepts

### What Is an API?

**API** stands for **Application Programming Interface**. Think of it as a menu at a restaurant: you (the developer) don't need to know how the kitchen works — you just read the menu, place an order, and receive a meal. The API is the menu and the ordering system. You send a structured request; you receive a structured response.

The **Anthropic API** is the mechanism by which your code communicates with Claude — Anthropic's family of AI models. Instead of typing into a chat window, you send text requests programmatically and receive Claude's responses inside your application.

### What Is Claude? What Is the SDK?

- **Claude**: The AI model itself, trained by Anthropic. It understands and generates text, code, images (on supported models), and more.
- **The API**: The service running on Anthropic's servers that hosts Claude. Your code talks to it over the internet by sending structured text messages (specifically **HTTP requests** — HTTP is the same protocol your browser uses to load web pages).
- **The SDK** (Software Development Kit): A Python or TypeScript library that wraps the raw API so you don't have to manually construct HTTP messages. It handles all the network plumbing — authentication headers, JSON formatting, connection management — for you. You just call Python functions.

**You will almost always use the SDK, not raw HTTP.** Without the SDK, making an API call would require writing ~20 lines of HTTP boilerplate. With the SDK, it's 5 lines of readable Python.

Anthropic offers official SDKs for:
- **Python** — covered throughout this guide (`pip install anthropic`)
- **TypeScript / JavaScript** — same concepts, different syntax (`npm install @anthropic-ai/sdk`)

### What Is a Token?

A **token** is the unit of text that the model processes. It is roughly:
- **¾ of a word** on average
- ~4 characters of English text

Examples:
- `"Hello"` → 1 token
- `"Hello, how are you?"` → 5 tokens
- `"Anthropic"` → 2 tokens (`Anthrop` + `ic`)
- A typical paragraph (100 words) → ~130 tokens
- A full page of text (250 words) → ~330 tokens

Tokens matter for two reasons:
1. **You pay per token** — both the tokens you send (input) and the tokens Claude generates (output)
2. **Context window limits** — there is a maximum number of tokens you can include in a single request (see Chapter 6)

### How Much Will This Cost?

- **You are not charged for creating an API key or an account.** You only pay when you make API calls.
- **You pay per token**. Both what you send and what Claude generates count.
- **The Hello World example below costs approximately $0.0003 (less than a tenth of a cent).** Running it 1,000 times costs ~$0.30.
- **New accounts often receive free credits.** Check the Anthropic Console after signing up.
- **Set a spending limit** in the Console under Settings → Limits before you start — this prevents any surprise charges.

Chapter 8 covers cost optimization in full detail.

---

## 1.2 Getting Your API Key

An **API key** is a secret credential — like a password — that proves to Anthropic's servers that you are authorized to use the API. Without it, every request will be rejected with a 401 Unauthorized error.

**How to get one:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or log in
3. Navigate to **API Keys** in the left sidebar
4. Click **Create Key**, give it a name, and copy the key immediately

> **Warning**: Your API key grants access to your Anthropic account and will be billed to you. Never share it, never commit it to version control (GitHub), and never hardcode it in your source code. If exposed, anyone can use your account at your expense.

### Storing Your API Key Securely

The correct approach is to store your key in an **environment variable** — a value set in your operating system or a local configuration file, not in your code.

**Step 1: Create a `.env` file** in your project directory:

```
# .env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Step 2: Add `.env` to your `.gitignore`** so it's never committed:

```
# .gitignore
.env
*.env
```

**Step 3: Load it in Python** using the `python-dotenv` library:

```python
# load_env_example.py
from dotenv import load_dotenv  # pip install python-dotenv
import os

load_dotenv()  # reads .env file and loads variables into environment

api_key = os.environ.get("ANTHROPIC_API_KEY")
if not api_key:
    raise ValueError("ANTHROPIC_API_KEY not set. Check your .env file.")
print(api_key[:10] + "...")  # print first 10 chars only, never the full key
```

Alternatively, set the variable directly in your shell before running your script:

```bash
# In your terminal (Linux/Mac)
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# In PowerShell (Windows)
$env:ANTHROPIC_API_KEY = "sk-ant-api03-your-key-here"
```

**Why environment variables?** Because code gets shared, committed, and reviewed. An environment variable lives in your OS or a gitignored file — it is never part of what gets pushed to GitHub or shared in a PR.

---

## 1.3 Installing the SDK

A **virtual environment** is an isolated Python environment for your project — it keeps your project's dependencies separate from other projects and the system Python. This is best practice for any Python project.

```bash
# Create a virtual environment named "venv"
python -m venv venv

# Activate it (Linux/Mac)
source venv/bin/activate

# Activate it (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Your prompt will now show (venv) to indicate the environment is active

# Install the Anthropic SDK inside the virtual environment
pip install anthropic

# Also install python-dotenv for loading .env files
pip install python-dotenv
```

Verify the installation:
```bash
pip show anthropic
# Name: anthropic
# Version: 0.x.x
# ...
```

The `anthropic` library depends on `httpx` (for HTTP requests) and `pydantic` (for data validation). These are installed automatically.

---

## 1.4 Hello World — Your First API Call

Here is a complete, runnable Python script that sends a message to Claude and prints the response:

```python
# hello_claude.py

import anthropic          # the Anthropic SDK we just installed
import os                 # built-in module to access environment variables
from dotenv import load_dotenv  # reads our .env file

# Load the .env file so ANTHROPIC_API_KEY is available as an environment variable
load_dotenv()

# Create the Anthropic client. It automatically reads ANTHROPIC_API_KEY
# from the environment — we never pass the key as a string in code.
client = anthropic.Anthropic()

# Send a message to Claude
message = client.messages.create(
    model="claude-sonnet-4-5",      # which Claude model to use
    max_tokens=1024,                 # maximum number of tokens Claude can generate
    messages=[                       # the conversation, as a list of turns
        {
            "role": "user",          # "user" = the person asking
            "content": "Hello! Can you explain what a neural network is in one paragraph?"
        }
    ]
)

# Extract and print Claude's response text
print(message.content[0].text)
```

**Run it:**
```bash
python hello_claude.py
```

You should see Claude's explanation printed to your terminal. That's it — you just made your first API call.

---

## 1.5 Anatomy of a Request

Let's break down every parameter in that API call:

```python
client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Your question here"}
    ]
)
```

### Request Parameters

| Parameter | Type | Required | What it does |
|-----------|------|----------|-------------|
| `model` | string | Yes | Which Claude model to use. See Chapter 7 for the full model list. |
| `max_tokens` | integer | Yes | The maximum number of **tokens** Claude may generate in its response. Acts as a cost ceiling and a safety valve. |
| `messages` | list | Yes | The conversation history. Each item has a `role` and `content`. |
| `system` | string | No | Instructions for Claude that apply for the whole conversation — persona, rules, output format. See Chapter 2. |
| `temperature` | float | No | Controls randomness (0.0–1.0). 0 = deterministic, 1.0 = most creative. See Chapter 2. |
| `top_p` | float | No | Alternative to temperature. Only use one, not both. |
| `stop_sequences` | list | No | List of strings that, if generated, will cause Claude to stop. |
| `stream` | bool | No | If true, returns tokens as they're generated. See Section 1.9. |

### The `messages` List

The `messages` parameter is a list of dictionaries. Each dictionary represents one turn in a conversation:

```python
messages = [
    {"role": "user",      "content": "What is 2 + 2?"},
    {"role": "assistant", "content": "2 + 2 equals 4."},
    {"role": "user",      "content": "And what is 4 + 4?"},
]
```

Rules:
- The list **must start with a user message**
- Roles must alternate: `user`, `assistant`, `user`, `assistant`, ...
- The last message must be a `user` message (Claude will respond to it)

---

## 1.6 Anatomy of a Response

The `client.messages.create()` call returns a `Message` object. Here's how to explore every field:

```python
# anatomy_of_response.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=256,
    messages=[{"role": "user", "content": "Say hello in French."}]
)

# ── The response text ──────────────────────────────────────────────────
print(response.content[0].text)
# Output: "Bonjour !"

# ── Content blocks ─────────────────────────────────────────────────────
# response.content is a list of "blocks".
# For text responses: always a list with one TextBlock.
# For tool use responses: may contain ToolUseBlock(s).
print(type(response.content[0]))
# <class 'anthropic.types.text_block.TextBlock'>
print(len(response.content))
# 1 (for a simple text response)

# ── Token usage — critical for cost tracking ───────────────────────────
print(response.usage.input_tokens)     # tokens in your request
print(response.usage.output_tokens)    # tokens in Claude's response

# ── Unique message identifier ──────────────────────────────────────────
print(response.id)
# "msg_01XFDUDYJgAACzvnptvVoYEL"

# ── The model that actually processed the request ─────────────────────
print(response.model)
# "claude-sonnet-4-5-20250514" (includes the date stamp)

# ── Why Claude stopped generating ─────────────────────────────────────
# "end_turn"      = natural completion — Claude finished its response
# "max_tokens"    = hit your max_tokens limit (response may be truncated!)
# "stop_sequence" = hit one of your custom stop_sequences
print(response.stop_reason)
# "end_turn"

# ── The message type (always "message" for standard calls) ────────────
print(response.type)
# "message"

# ── The role of the response (always "assistant") ─────────────────────
print(response.role)
# "assistant"
```

### Checking for Truncation

Always check `stop_reason` in production. If it's `"max_tokens"`, Claude ran out of budget and the response is incomplete:

```python
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=10,   # deliberately too small
    messages=[{"role": "user", "content": "Write me a short story about a dragon."}]
)

if response.stop_reason == "max_tokens":
    print("WARNING: Response was truncated. Increase max_tokens.")
    print("Partial text:", response.content[0].text)
```

---

## 1.7 Adding a System Prompt

The `system` parameter lets you give Claude standing instructions that apply to the entire conversation — a persona, behavioral rules, or output format requirements:

```python
# with_system_prompt.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    system="You are a concise technical writer. Always respond in exactly 3 bullet points. Each bullet must be under 20 words.",
    messages=[
        {"role": "user", "content": "What are the benefits of Python for data science?"}
    ]
)
print(response.content[0].text)
# • Python has thousands of data science libraries like NumPy, pandas, and scikit-learn.
# • Its readable syntax reduces development time and makes code easier to maintain.
# • Jupyter notebooks enable interactive data exploration and visualization.
```

System prompts are covered extensively in Chapter 2 (Prompt Engineering) and Chapter 6 (Context Windows & System Prompts).

---

## 1.8 Multi-Turn Conversations

Claude has **no memory between separate API calls**. Each call is stateless — Claude only knows what you include in the `messages` list. To have a multi-turn conversation, you must send the entire history each time.

```python
# multi_turn_conversation.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# We maintain conversation history as a list in our application
conversation_history = []

def chat(user_input: str) -> str:
    """Send a message and get a response, maintaining conversation history."""

    # Add the new user message to history
    conversation_history.append({
        "role": "user",
        "content": user_input
    })

    # Send the ENTIRE history to Claude every time
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        messages=conversation_history  # all prior turns included
    )

    # Extract Claude's reply
    assistant_reply = response.content[0].text

    # Add Claude's reply to history so the next call includes it
    conversation_history.append({
        "role": "assistant",
        "content": assistant_reply
    })

    return assistant_reply

# Simulate a conversation
print(chat("My name is Alice. Remember that."))
# "Hello Alice! Nice to meet you. How can I help you today?"

print(chat("What is my name?"))
# "Your name is Alice — you mentioned it in your first message."

print(chat("What programming languages are you familiar with?"))
# "I'm familiar with Python, JavaScript, TypeScript, ... [etc]"
```

**Key insight**: Sending the full history every call means your costs grow as the conversation gets longer. A 10-turn conversation sends 10x more tokens than a 1-turn call. Chapter 6 covers strategies for managing long conversations efficiently.

---

## 1.9 Streaming Responses

By default, the SDK waits for Claude to finish generating its complete response before returning it to you. **Streaming** lets you receive tokens as they are generated — character by character — which dramatically improves the perceived responsiveness of your application.

```python
# streaming_example.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# Use client.messages.stream() as a context manager
with client.messages.stream(
    model="claude-sonnet-4-5",
    max_tokens=512,
    messages=[{"role": "user", "content": "Write a short poem about programming."}]
) as stream:
    # Print each token as it arrives (no newline between tokens)
    for text in stream.text_stream:
        print(text, end="", flush=True)

print()  # final newline

# Get the complete message object after streaming finishes
final_message = stream.get_final_message()
print(f"\nTotal tokens used: {final_message.usage.input_tokens} input, "
      f"{final_message.usage.output_tokens} output")
```

Streaming doesn't change your cost — you pay the same tokens whether you stream or not. It is purely a user experience optimization. Use it whenever a human is waiting for a response.

---

## 1.10 Error Handling

API calls can fail. Always wrap them in error handling for production code:

```python
# error_handling.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

try:
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=256,
        messages=[{"role": "user", "content": "Hello!"}]
    )
    print(response.content[0].text)

except anthropic.AuthenticationError:
    # Wrong or missing API key (HTTP 401)
    print("ERROR: Invalid API key. Check your ANTHROPIC_API_KEY environment variable.")

except anthropic.PermissionDeniedError:
    # Valid key but not authorized for this operation (HTTP 403)
    print("ERROR: Your API key doesn't have permission for this operation.")

except anthropic.RateLimitError:
    # Too many requests too quickly (HTTP 429)
    print("ERROR: Rate limit hit. Implement retry logic with exponential backoff.")

except anthropic.BadRequestError as e:
    # Invalid request (HTTP 400) — e.g. bad model name, messages format error
    print(f"ERROR: Bad request: {e.message}")

except anthropic.APIStatusError as e:
    # Any other non-2xx API error
    print(f"ERROR: API returned status {e.status_code}: {e.message}")

except anthropic.APIConnectionError:
    # Network error — couldn't reach the API at all
    print("ERROR: Could not connect to the Anthropic API. Check your internet connection.")

except anthropic.APITimeoutError:
    # Request timed out
    print("ERROR: Request timed out. The API may be overloaded.")
```

---

## 1.11 Rate Limits and Retry Logic

**Rate limits** are caps Anthropic places on how many requests you can make per minute and how many tokens you can use per minute. They exist to ensure fair usage across all customers.

If you exceed your limits:
- You'll receive a `RateLimitError` (HTTP 429)
- The correct response is to **wait and retry**, not to spin in a loop immediately

The proper pattern is **exponential backoff**: wait 1 second on the first failure, 2 seconds on the second, 4 seconds on the third, etc. This gives the rate limit time to reset without hammering the server.

```python
# retry_with_backoff.py
import anthropic
import time
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def call_with_retry(messages: list, max_retries: int = 4) -> anthropic.types.Message:
    """Call the API with exponential backoff on rate limit or server errors."""
    for attempt in range(max_retries):
        try:
            return client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=256,
                messages=messages
            )

        except anthropic.RateLimitError:
            if attempt == max_retries - 1:
                raise  # give up after max retries
            wait_seconds = 2 ** attempt  # 1s, 2s, 4s, 8s
            print(f"Rate limited. Waiting {wait_seconds}s before retry "
                  f"(attempt {attempt + 1}/{max_retries})...")
            time.sleep(wait_seconds)

        except anthropic.APIStatusError as e:
            # Retry on server-side errors (5xx); don't retry on client errors (4xx)
            if e.status_code >= 500 and attempt < max_retries - 1:
                wait_seconds = 2 ** attempt
                print(f"Server error {e.status_code}. Retrying in {wait_seconds}s...")
                time.sleep(wait_seconds)
            else:
                raise  # don't retry on 4xx errors or after max retries

    raise RuntimeError("Should not reach here")

response = call_with_retry([{"role": "user", "content": "Hello!"}])
print(response.content[0].text)
```

Your rate limits increase automatically as you use the API more. Check your current limits in the Anthropic Console under **Settings → Limits**.

---

## 1.12 Async API Calls

If you're building a web server (e.g., with FastAPI or aiohttp) or any application where blocking a thread is a problem, use the **async client**. The async client has an identical interface — just `await` the calls instead of calling them directly.

```python
# async_example.py
import asyncio
import anthropic
from dotenv import load_dotenv

load_dotenv()

# Use AsyncAnthropic instead of Anthropic
client = anthropic.AsyncAnthropic()

async def get_response(prompt: str) -> str:
    """Async version of a Claude call — doesn't block the event loop."""
    response = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

async def main():
    # Run multiple queries concurrently — all run at the same time
    results = await asyncio.gather(
        get_response("What is the capital of France?"),
        get_response("What is 15 * 23?"),
        get_response("Name three programming languages."),
    )

    for result in results:
        print(result)
        print("---")

# Run the async main function
asyncio.run(main())
```

**When to use async:**
- Web servers handling multiple simultaneous requests
- CLI tools that make multiple independent API calls
- Any application using Python's `asyncio` framework

**When to use sync:** Simple scripts, notebooks, pipelines that process one thing at a time.

---

## 1.13 Debugging Common Issues

| Problem | Likely Cause | Solution |
|---------|-------------|---------|
| `AuthenticationError` | Missing or wrong API key | Check `ANTHROPIC_API_KEY` env var is set and correct |
| `BadRequestError: "model not found"` | Typo in model name | Use exact model ID from Chapter 7 |
| `"messages: first message must use the user role"` | Conversation starts with assistant | Always start with a `user` message |
| Response is cut off mid-sentence | `max_tokens` too low | Increase `max_tokens`; check `stop_reason == "max_tokens"` |
| Empty `content` list | Very rare; model refused | Check `stop_reason`; see Chapter 5 on safety |
| `APIConnectionError` | No internet / firewall | Check network; try `ping api.anthropic.com` |
| Unexpectedly high bill | Sending too much history | See Chapter 6 on context management |

### Inspecting the Raw Response

When debugging, print the full response object:

```python
import json

response = client.messages.create(...)

# Print everything in human-readable JSON
print(json.dumps(response.model_dump(), indent=2, default=str))
```

---

## Glossary

| Term | Definition |
|------|-----------|
| **API** | Application Programming Interface — a defined way for software to communicate with a service |
| **SDK** | Software Development Kit — a library that makes using an API easier |
| **Token** | The unit of text a model processes; roughly ¾ of a word |
| **Prompt** | The input text you send to the model |
| **Completion** | The model's generated output (also called a "response") |
| **Model** | The AI system (e.g., `claude-sonnet-4-5`) that processes your prompt |
| **Endpoint** | A specific URL your code sends requests to (the SDK handles this for you) |
| **Authentication** | Proving your identity via an API key |
| **Rate limit** | A cap on how many requests you can make per unit of time |
| **Environment variable** | A value stored in the OS, accessible by your code, not in source files |
| **Context window** | The maximum amount of text (in tokens) Claude can see at once |
| **Streaming** | Receiving model output token-by-token as it is generated |
| **Async** | Non-blocking API calls that use Python's `asyncio` framework |
| **Exponential backoff** | A retry strategy that doubles the wait time between retries |

---

## Key Takeaways

- The Anthropic API lets your code communicate with Claude programmatically over HTTP; the SDK handles all the plumbing
- **Never hardcode your API key** — store it in an environment variable loaded from a `.env` file
- Install the SDK with `pip install anthropic` inside a virtual environment
- Every API call requires: `model`, `max_tokens`, and `messages`
- The `messages` list must include all prior conversation turns — Claude has no built-in memory between API calls
- Always check `stop_reason` — a value of `"max_tokens"` means your response was truncated
- Wrap API calls in `try/except` to handle authentication, rate limit, and network errors gracefully
- Use **streaming** (`client.messages.stream()`) for any user-facing interaction — it dramatically improves responsiveness
- Use the **async client** (`AsyncAnthropic`) when building web servers or running multiple calls concurrently
- Implement **exponential backoff** retry logic to handle transient rate limit and server errors
- You pay per token — both input and output — so `max_tokens` is your cost ceiling per call
