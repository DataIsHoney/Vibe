# Chapter 1: API Foundations — Your First Steps with the Anthropic API

## What Is an API?

Before diving into Claude, let's establish a foundation. **API** stands for **Application Programming Interface**. Think of it as a menu at a restaurant: you (the developer) don't need to know how the kitchen works — you just read the menu, place an order, and receive a meal. The API is the menu and the ordering system. You send a structured request; you receive a structured response.

The **Anthropic API** is the mechanism by which your code communicates with Claude — Anthropic's family of AI models. Instead of typing into a chat window, you send text requests programmatically and receive Claude's responses in your application.

## What Is Claude? What Is the SDK?

- **Claude**: The AI model itself, trained by Anthropic. It understands and generates text, code, images (on supported models), and more.
- **The API**: The service running on Anthropic's servers that hosts Claude. Your code sends HTTP requests to it.
- **The SDK** (Software Development Kit): A Python or TypeScript library that wraps the raw HTTP API so you don't have to write low-level network code yourself. Think of it as a set of helper functions that handle the plumbing.

**You will almost always use the SDK, not raw HTTP calls.** This guide focuses on the Python SDK.

---

## Step 1: Get Your API Key

An **API key** is a secret credential — like a password — that proves to Anthropic's servers that you are authorized to use the API. Without it, every request will be rejected.

**How to get one:**
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or log in
3. Navigate to **API Keys** in the left sidebar
4. Click **Create Key**, give it a name, and copy the key

> **Warning**: Your API key grants access to your Anthropic account and will be billed to you. Never share it, never commit it to version control (GitHub), and never hardcode it in your source code. If exposed, anyone can use your account at your expense.

### Storing Your API Key Securely

The correct approach is to store your key in an **environment variable** — a value set in your operating system or a local configuration file, not in your code.

**Create a `.env` file** in your project directory:

```
# .env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Add `.env` to your `.gitignore`** so it's never committed:

```
# .gitignore
.env
```

**Load it in Python** using the `python-dotenv` library:

```python
# load_env_example.py
from dotenv import load_dotenv  # pip install python-dotenv
import os

load_dotenv()  # reads .env file and loads variables into environment

api_key = os.environ.get("ANTHROPIC_API_KEY")
print(api_key[:10] + "...")  # print first 10 chars only, never the full key
```

Alternatively, set it directly in your shell before running your script:

```bash
# In your terminal (Linux/Mac)
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"

# In PowerShell (Windows)
$env:ANTHROPIC_API_KEY = "sk-ant-api03-your-key-here"
```

---

## Step 2: Install the Anthropic SDK

A **virtual environment** is an isolated Python environment for your project — it keeps your project's dependencies separate from other projects and the system Python. This is best practice for any Python project.

```bash
# Create a virtual environment named "venv"
python -m venv venv

# Activate it (Linux/Mac)
source venv/bin/activate

# Activate it (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Install the Anthropic SDK inside the virtual environment
pip install anthropic

# Also install python-dotenv for loading .env files
pip install python-dotenv
```

You should see `anthropic` listed when you run `pip list`.

---

## Step 3: Hello World — Your First API Call

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

You should see Claude's explanation printed to your terminal.

---

## Anatomy of a Request

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

| Parameter | Type | What it does |
|-----------|------|-------------|
| `model` | string | Which Claude model to use. See Chapter 7 for the full model list. |
| `max_tokens` | integer | The maximum number of **tokens** Claude may generate in its response. Acts as a cost ceiling. |
| `messages` | list | The conversation history. Each item has a `role` and `content`. |
| `role` | string | Either `"user"` (your input) or `"assistant"` (Claude's prior response). |
| `content` | string or list | The text of the message. Can also be a list for multi-modal content (images). |

### What Is a Token?

A **token** is the unit of text that the model processes. It is roughly:
- **¾ of a word** on average
- ~4 characters of English text

Examples:
- `"Hello"` → 1 token
- `"Hello, how are you?"` → 5 tokens
- `"Anthropic"` → 2 tokens (`Anthrop` + `ic`)

Tokens matter because **you pay per token** — both the tokens you send (input) and the tokens Claude generates (output). See Chapter 8 for cost details.

---

## Anatomy of a Response

The `client.messages.create()` call returns a `Message` object. Here's how to explore it:

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

# The response text lives here:
print(response.content[0].text)        # "Bonjour !"

# response.content is a list of "blocks". For text responses, it's always
# a list with one TextBlock. For tool use responses, it may contain ToolUseBlock.
print(type(response.content[0]))       # <class 'anthropic.types.text_block.TextBlock'>

# Token usage — critical for cost tracking
print(response.usage.input_tokens)     # tokens in your request
print(response.usage.output_tokens)    # tokens in Claude's response

# The model that actually processed the request
print(response.model)                  # e.g., "claude-sonnet-4-5-20250514"

# Why Claude stopped generating
# "end_turn" = natural completion
# "max_tokens" = hit your max_tokens limit
# "stop_sequence" = hit a custom stop sequence
print(response.stop_reason)            # "end_turn"
```

---

## How Conversation History Works

Claude has **no memory between separate API calls**. Each call is stateless — Claude only knows what you include in the `messages` list. To have a multi-turn conversation, you must send the entire history each time.

```python
# multi_turn_conversation.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# We maintain conversation history as a list
conversation_history = []

def chat(user_input):
    # Add the new user message to history
    conversation_history.append({
        "role": "user",
        "content": user_input
    })

    # Send the ENTIRE history to Claude
    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        messages=conversation_history  # all prior messages included
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
print(chat("What is my name?"))  # Claude will answer "Alice" because history is included
```

> **Key insight**: Sending the full history every call means your costs grow as the conversation gets longer. Chapter 6 covers strategies to manage this.

---

## Basic Error Handling

API calls can fail. Always wrap them in error handling:

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
    # Wrong or missing API key
    print("ERROR: Invalid API key. Check your ANTHROPIC_API_KEY environment variable.")

except anthropic.RateLimitError:
    # You've sent too many requests too quickly
    print("ERROR: Rate limit hit. Slow down your requests or implement retry logic.")

except anthropic.APIStatusError as e:
    # Other API errors (server errors, etc.)
    print(f"ERROR: API returned status {e.status_code}: {e.message}")
```

---

## Rate Limits

**Rate limits** are caps Anthropic places on how many requests you can make per minute and how many tokens you can use per minute. They exist to ensure fair usage across all users.

If you exceed your limits:
- You'll receive a `RateLimitError` (HTTP 429)
- The correct response is to **wait and retry**, not to spin in a loop

```python
# retry_with_backoff.py
import anthropic
import time
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def call_with_retry(messages, max_retries=3):
    """Call the API with exponential backoff on rate limit errors."""
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
            wait_seconds = 2 ** attempt  # 1s, 2s, 4s
            print(f"Rate limited. Waiting {wait_seconds}s before retry...")
            time.sleep(wait_seconds)

response = call_with_retry([{"role": "user", "content": "Hello!"}])
print(response.content[0].text)
```

Your rate limits increase automatically as you use the API more. Check your current limits at [console.anthropic.com](https://console.anthropic.com) under **Limits**.

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

---

## Key Takeaways

- The Anthropic API lets your code communicate with Claude programmatically
- **Never hardcode your API key** — use environment variables
- Install the SDK with `pip install anthropic` inside a virtual environment
- Every API call requires: `model`, `max_tokens`, and `messages`
- The `messages` list must include all prior conversation turns — Claude has no built-in memory
- Wrap API calls in `try/except` to handle authentication and rate limit errors gracefully
- You pay per token — both input and output — so `max_tokens` is your cost ceiling
