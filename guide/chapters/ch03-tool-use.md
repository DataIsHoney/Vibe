# Chapter 3: Tool Use — Giving Claude the Ability to Act

## Why Tool Use Exists

Claude is a language model: it generates text based on patterns learned during training. On its own, it cannot:

- Check today's weather
- Look up a real-time stock price
- Read or write files on your computer
- Query a database
- Send an email or create a calendar event

**Tool use** (also called function calling) solves this. You define a set of "tools" — Python functions in your code — and describe them to Claude. When Claude needs information it doesn't have, it tells you which tool to call and with what arguments. **Your code executes the tool** and reports the result back. Claude then uses the result to answer the user.

**The critical mental model:**
> Claude decides *which* tool to call and *what arguments to use*. Your code *actually runs* the tool. Claude never directly executes anything.

---

## Defining a Tool

A tool is described to Claude as a JSON schema with three required fields:

```python
# tool_definition.py
weather_tool = {
    "name": "get_weather",  # a unique identifier Claude uses to request this tool

    "description": """Get the current weather conditions for a city.
Use this tool when the user asks about current weather, temperature,
or conditions in a specific location.""",
    # ^ Good descriptions are CRITICAL. Claude reads this to decide when to call the tool.
    # Be specific about when to use it and what it returns.

    "input_schema": {
        "type": "object",
        "properties": {
            "city": {
                "type": "string",
                "description": "The city name, e.g. 'London' or 'New York'"
            },
            "units": {
                "type": "string",
                "enum": ["celsius", "fahrenheit"],
                "description": "Temperature units to return"
            }
        },
        "required": ["city"]  # "units" is optional since it's not listed here
    }
}
```

**Why the description matters so much**: Claude uses the description — not the name — to decide whether to call this tool. A vague description means Claude will call the tool at the wrong times or miss opportunities to use it when it should.

---

## The Complete Tool Use Cycle

Here is every step in the tool use flow:

```
1. You:    Send user message + tool definitions to Claude
2. Claude: Returns a tool_use block (NOT a text answer yet)
3. You:    See which tool Claude wants, extract the arguments
4. You:    Execute the tool with those arguments (your code runs this)
5. You:    Send the tool result back to Claude in a new message
6. Claude: Uses the result to generate the final text answer
```

Let's implement this complete cycle:

```python
# complete_tool_use.py
import anthropic
import json
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# ─── Step 0: Define our tools ───────────────────────────────────────────────

tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a city. Use when user asks about weather conditions, temperature, or forecast.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {
                    "type": "string",
                    "description": "City name, e.g. 'Paris' or 'Tokyo'"
                }
            },
            "required": ["city"]
        }
    }
]

# ─── Step 0b: Our actual tool implementation ─────────────────────────────────
# This is regular Python code — Claude never sees this function directly.

def get_weather(city: str) -> dict:
    """Mock weather function. In production, call a real weather API."""
    # Simulated weather data
    weather_data = {
        "London": {"temp_c": 14, "condition": "Partly cloudy", "humidity": 72},
        "Tokyo": {"temp_c": 28, "condition": "Sunny", "humidity": 55},
        "New York": {"temp_c": 22, "condition": "Clear", "humidity": 45},
    }
    # Default for unknown cities
    data = weather_data.get(city, {"temp_c": 20, "condition": "Unknown", "humidity": 60})
    return {"city": city, **data}

# ─── Step 1: Send the user's message + tool definitions ─────────────────────

user_message = "What's the weather like in London today?"

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=tools,           # <-- pass our tool definitions here
    messages=[
        {"role": "user", "content": user_message}
    ]
)

print(f"Stop reason: {response.stop_reason}")
# If stop_reason == "tool_use", Claude wants to call a tool
# If stop_reason == "end_turn", Claude answered directly without tools

# ─── Step 2: Check if Claude wants to use a tool ────────────────────────────

if response.stop_reason == "tool_use":
    # Find the tool_use block in the response
    tool_use_block = next(
        block for block in response.content
        if block.type == "tool_use"
    )

    tool_name = tool_use_block.name    # e.g., "get_weather"
    tool_input = tool_use_block.input  # e.g., {"city": "London"}
    tool_use_id = tool_use_block.id    # unique ID we must echo back

    print(f"Claude wants to call: {tool_name}")
    print(f"With arguments: {tool_input}")

    # ─── Step 3 & 4: Execute the tool ───────────────────────────────────────
    # Validate input before running! (see Security section below)
    if tool_name == "get_weather":
        tool_result = get_weather(tool_input["city"])
    else:
        tool_result = {"error": f"Unknown tool: {tool_name}"}

    print(f"Tool returned: {tool_result}")

    # ─── Step 5: Send the result back to Claude ──────────────────────────────
    # We must send:
    # 1. Claude's full response (including the tool_use block)
    # 2. A new "user" message containing the tool result
    final_response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        tools=tools,
        messages=[
            # Original user message
            {"role": "user", "content": user_message},
            # Claude's response (which contained the tool_use block)
            {"role": "assistant", "content": response.content},
            # Our tool result
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_use_id,  # must match the tool_use block's ID
                        "content": json.dumps(tool_result)  # result as a string
                    }
                ]
            }
        ]
    )

    # ─── Step 6: Claude gives the final answer ───────────────────────────────
    print("\nClaude's final answer:")
    print(final_response.content[0].text)

else:
    # Claude answered without needing a tool
    print(final_response.content[0].text)
```

---

## Handling Multiple Tools

You can define multiple tools in one request. Claude will choose which one(s) to call:

```python
# multiple_tools.py
import anthropic
import json
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

tools = [
    {
        "name": "get_weather",
        "description": "Get current weather for a city.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"}
            },
            "required": ["city"]
        }
    },
    {
        "name": "get_time",
        "description": "Get the current local time in a city.",
        "input_schema": {
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"}
            },
            "required": ["city"]
        }
    }
]

# Mock implementations
def get_weather(city): return {"city": city, "temp_c": 18, "condition": "Cloudy"}
def get_time(city): return {"city": city, "local_time": "14:32", "timezone": "GMT+1"}

def run_tool(name, inputs):
    """Dispatch to the right function based on tool name."""
    if name == "get_weather":
        return get_weather(inputs["city"])
    elif name == "get_time":
        return get_time(inputs["city"])
    return {"error": "Unknown tool"}

# This question may require BOTH tools
response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather and local time in Paris?"}]
)
```

---

## Parallel Tool Calls

Claude may request multiple tools at the same time (parallel tool use). The response will contain multiple `tool_use` blocks. Process them all before sending results back:

```python
# parallel_tool_calls.py
import anthropic
import json
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

# (Using same tools and mock functions from above)

def handle_tool_use_response(client, tools, messages, response, run_tool_fn):
    """
    Handle a response that may contain one or more tool_use blocks.
    Returns the final text response.
    """
    if response.stop_reason != "tool_use":
        return response.content[0].text  # No tools needed

    # Collect ALL tool_use blocks (there may be several for parallel calls)
    tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

    # Execute all tools and collect results
    tool_results = []
    for block in tool_use_blocks:
        print(f"Executing tool: {block.name}({block.input})")
        result = run_tool_fn(block.name, block.input)
        tool_results.append({
            "type": "tool_result",
            "tool_use_id": block.id,          # must match the tool_use block's ID
            "content": json.dumps(result)
        })

    # Send all results back in a single message
    updated_messages = messages + [
        {"role": "assistant", "content": response.content},
        {"role": "user", "content": tool_results}
    ]

    final = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=1024,
        tools=tools,
        messages=updated_messages
    )

    return final.content[0].text
```

---

## The `tool_choice` Parameter

You can control whether Claude uses tools, must use tools, or must use a specific tool:

```python
# tool_choice.py
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

tools = [{"name": "get_weather", "description": "Get weather.", "input_schema": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]}}]

# Default: Claude decides whether to use a tool
auto = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    tools=tools,
    tool_choice={"type": "auto"},    # Claude chooses (this is the default)
    messages=[{"role": "user", "content": "What's 2 + 2?"}]
    # Claude will answer directly — no tool needed for math
)

# Force Claude to use ANY available tool
any_tool = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    tools=tools,
    tool_choice={"type": "any"},    # Claude MUST call one of the tools
    messages=[{"role": "user", "content": "What's 2 + 2?"}]
    # Claude will call get_weather even though it doesn't make sense
)

# Force Claude to use a SPECIFIC tool
specific = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=512,
    tools=tools,
    tool_choice={"type": "tool", "name": "get_weather"},  # must call get_weather
    messages=[{"role": "user", "content": "Tell me about London."}]
)
```

**When to use `tool_choice`**:
- `"auto"` — almost always (let Claude decide)
- `"any"` — when you want to guarantee Claude uses your pipeline rather than answering from memory
- `"tool"` — when you need a specific function called (e.g., forced structured data extraction)

---

## Handling Tool Errors

When your tool fails (API is down, invalid input, etc.), send back an error result instead of crashing:

```python
# tool_error_handling.py
import anthropic
import json
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

def safe_get_weather(city: str):
    """Simulate a tool that sometimes fails."""
    if city == "InvalidCity":
        raise ValueError(f"City '{city}' not found in weather database")
    return {"city": city, "temp_c": 20, "condition": "Sunny"}

def execute_tool_safely(tool_name, tool_input, tool_use_id):
    """Run a tool and return either a result or an error, never raise."""
    try:
        if tool_name == "get_weather":
            result = safe_get_weather(tool_input["city"])
            return {
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": json.dumps(result)
            }
    except Exception as e:
        # Send the error back to Claude so it can explain the problem to the user
        return {
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "content": json.dumps({"error": str(e)}),
            "is_error": True   # flags this as an error result
        }
```

When Claude receives an `is_error: True` result, it will typically explain the problem to the user gracefully instead of fabricating an answer.

---

## Security: Always Validate Tool Inputs

**Never blindly execute a tool with whatever arguments Claude provides.** In systems where users control the input, a malicious user can craft messages that try to get Claude to call your tools with dangerous arguments.

This is called **prompt injection** — an attack where malicious content in user input or external data tries to hijack Claude's instructions.

```python
# secure_tool_execution.py
import os
import re

def safe_read_file(filename: str) -> str:
    """
    INSECURE version (never do this):
    return open(filename).read()
    # A user could pass filename="../../etc/passwd" and read system files!
    """

    # ─── SECURE version ─────────────────────────────────────────────────────

    # 1. Allowlist: only accept specific file patterns
    allowed_pattern = r'^[a-zA-Z0-9_\-]+\.txt$'
    if not re.match(allowed_pattern, filename):
        raise ValueError(f"Invalid filename: {filename}. Only .txt files with alphanumeric names allowed.")

    # 2. Restrict to a specific directory
    safe_dir = "/home/app/user_files"
    safe_path = os.path.join(safe_dir, filename)

    # 3. Verify the final path is still inside the safe directory (path traversal protection)
    if not os.path.abspath(safe_path).startswith(os.path.abspath(safe_dir)):
        raise ValueError("Path traversal attempt detected")

    # 4. Check the file exists
    if not os.path.exists(safe_path):
        raise ValueError(f"File '{filename}' not found")

    return open(safe_path).read()
```

**Security rules for tool use:**
1. Always validate the type and format of tool arguments
2. Never use tool arguments to construct file paths, SQL queries, or shell commands without sanitization
3. Apply the principle of least privilege — tools should only be able to do exactly what they need to
4. For high-stakes actions (deleting data, sending emails, making purchases), require human confirmation

---

## When NOT to Use Tools

Don't add tools for everything. Tools add complexity and latency. Only use tools when:

- Claude needs **real-time or live data** it can't know from training (weather, stock prices, current time)
- Claude needs to **take an action** (write a file, send a message, query a database)
- Claude needs **your private data** it has no other way to access

For simple question-answering, summarization, writing, or math — tools are unnecessary overhead.

---

## Key Takeaways

- Tool use lets Claude request actions from your code — Claude decides, your code executes
- Define tools with a `name`, `description`, and `input_schema` — good descriptions are critical
- The tool use cycle: send request → Claude returns `tool_use` block → you execute → send `tool_result` → Claude answers
- Handle parallel tool calls by processing all `tool_use` blocks in the response before replying
- Use `tool_choice` to control whether Claude must use tools, may use tools, or must use a specific tool
- Always send back `is_error: True` results instead of crashing — Claude will handle errors gracefully
- **Always validate tool inputs** before executing to prevent prompt injection attacks
- Only use tools when Claude needs live data or needs to take real-world actions
