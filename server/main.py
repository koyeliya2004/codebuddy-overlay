from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import base64
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CodeBuddy Overlay API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:3000"), "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """
You are CodeBuddy, a senior software engineer and expert debugging assistant.

When given a screenshot, analyze it carefully and identify:
- Visible errors, stack traces, log messages
- Filenames, line numbers, error codes
- Terminal output, failed commands
- TypeScript / Python / JS errors
- Git conflicts, failed deployments
- Code issues visible in the editor

IMPORTANT RULES:
- Only use what is VISIBLE in the screenshot
- Do NOT invent hidden context
- Be concise but complete
- Always return a structured response

RESPONSE FORMAT (always follow this):
**🔍 What I See:**
[Describe exactly what is visible]

**⚠️ Likely Problem:**
[State the most probable cause]

**🛠️ Fix Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**📝 Code Change:**
```
[Paste exact code fix here if applicable]
```

**⏯️ Run This:**
```bash
[Terminal command to run next]
```

**❓ Need More Info:**
[Any clarifying question if needed]
"""


class Message(BaseModel):
    role: str
    content: str


class AnalyzeRequest(BaseModel):
    screenshot_base64: str
    question: Optional[str] = "What is wrong? What should I do next?"
    session_history: Optional[List[Message]] = []


class ChatRequest(BaseModel):
    message: str
    session_history: Optional[List[Message]] = []


@app.get("/")
def root():
    return {"status": "CodeBuddy Overlay API running ", "version": "1.0.0"}


@app.post("/analyze-screenshot")
async def analyze_screenshot(req: AnalyzeRequest):
    try:
        # Build messages with history
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        # Add session history (text only)
        for msg in req.session_history[-6:]:  # last 6 messages
            messages.append({"role": msg.role, "content": msg.content})

        # Add current screenshot + question
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{req.screenshot_base64}"
                    }
                },
                {
                    "type": "text",
                    "text": req.question
                }
            ]
        })

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=messages,
            max_tokens=1500,
            temperature=0.3
        )

        answer = response.choices[0].message.content

        return {
            "success": True,
            "answer": answer,
            "model": "llama-4-scout",
            "tokens_used": response.usage.total_tokens
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        messages = [
            {"role": "system", "content": "You are CodeBuddy, an expert coding assistant. Be concise, structured, and helpful. Give code fixes and next steps clearly."}
        ]

        for msg in req.session_history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": req.message})

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1000,
            temperature=0.4
        )

        return {
            "success": True,
            "answer": response.choices[0].message.content,
            "model": "llama-3.3-70b"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "groq_key_set": bool(os.getenv("GROQ_API_KEY"))}
