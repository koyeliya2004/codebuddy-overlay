from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import asyncio
import httpx
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="CodeBuddy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
SELF_URL = os.getenv("RENDER_EXTERNAL_URL", "")

SYSTEM_PROMPT = """
You are CodeBuddy, a senior software engineer and expert debugging assistant.
When given a screenshot, analyze it carefully and identify:
- Visible errors, stack traces, log messages
- Filenames, line numbers, error codes
- Terminal output, failed commands
- TypeScript / Python / JS errors

RESPONSE FORMAT:
**🔍 What I See:**
[Describe exactly what is visible]

**⚠️ Likely Problem:**
[State the most probable cause]

**🛠️ Fix Steps:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**📝 Code Fix:**
```
[Exact code to fix it]
```

**⏯️ Run This:**
```bash
[Terminal command]
```
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

async def keep_alive():
    await asyncio.sleep(30)
    while True:
        try:
            if SELF_URL:
                async with httpx.AsyncClient() as c:
                    await c.get(f"{SELF_URL}/health", timeout=10)
                    print("[keep-alive] ping OK")
        except Exception as e:
            print(f"[keep-alive] failed: {e}")
        await asyncio.sleep(600)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(keep_alive())
    print("CodeBuddy API started successfully!")

@app.get("/")
def root():
    return {"status": "CodeBuddy API is running!", "version": "1.0.0", "endpoints": ["/analyze-screenshot", "/chat", "/health"]}

@app.get("/health")
def health():
    return {"status": "ok", "awake": True}

@app.post("/analyze-screenshot")
async def analyze_screenshot(req: AnalyzeRequest):
    try:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in req.session_history[-6:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{req.screenshot_base64}"}},
                {"type": "text", "text": req.question}
            ]
        })
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=messages,
            max_tokens=1500,
            temperature=0.3
        )
        return {"success": True, "answer": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(req: ChatRequest):
    try:
        messages = [{"role": "system", "content": "You are CodeBuddy, an expert coding assistant. Be concise and helpful."}]
        for msg in req.session_history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": req.message})
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1000,
            temperature=0.4
        )
        return {"success": True, "answer": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
