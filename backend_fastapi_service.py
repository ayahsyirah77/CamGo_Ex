# ==============================================================================
# CamGo Regional Super-App: FastAPI Backend AI Microservice Reference
# ==============================================================================
# Module 1: AI Travel Assistant Chatbot (FastAPI + Google GenAI SDK)
# Module 2: Automated Content Moderation & Smart Tagging Engine
# ==============================================================================

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from google import genai
from google.genai import types

app = FastAPI(title="CamGo Highland AI Microservice", version="2.5.0")

# Initialize Gemini Client
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# ------------------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "en"
    history: Optional[List[dict]] = []

class ChatResponse(BaseModel):
    reply: str
    source: str
    safety_flag: bool

class ModerationRequest(BaseModel):
    title: str
    description: str
    category: Optional[str] = "general"

class ModerationResponse(BaseModel):
    is_approved: bool
    assigned_category: str
    extracted_keywords: List[str]
    safety_flag: bool
    reason: str

# ------------------------------------------------------------------------------
# Module 1: AI Travel Assistant Chat Endpoint
# ------------------------------------------------------------------------------
@app.post("/api/ai/chat", response_model=ChatResponse)
async def ai_travel_chat(req: ChatRequest):
    try:
        system_instruction = (
            "You are CamGo AI, a friendly, expert local Cameron Highlands tour guide and travel assistant. "
            "Provide concise, safe, helpful, and localized guidance on Tanah Rata, Brinchang, Kea Farm, Ringlet, "
            "Kampung Raja, MARDI Agro Technology Park, Mossy Forest, BOH Tea Plantations, steamboat dining, "
            "prayer facilities (Masjid/Surau), and weather conditions."
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=req.message,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
            ),
        )

        reply_text = response.text or "I am here to help you navigate Cameron Highlands safely!"
        
        return ChatResponse(
            reply=reply_text,
            source="gemini-2.5-flash",
            safety_flag=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------------------------------------------------------------------
# Module 2: Automated Content Moderation & Smart Tagging Endpoint
# ------------------------------------------------------------------------------
@app.post("/api/ai/moderate", response_model=ModerationResponse)
async def moderate_content(req: ModerationRequest):
    try:
        prompt = f"""
        Analyze this user submission for CamGo (Cameron Highlands regional super-app):
        Title: "{req.title}"
        Description: "{req.description}"
        Category: "{req.category}"

        Evaluate and return ONLY valid JSON with these exact keys:
        1. "is_approved": boolean (false if spam, profanity, scams, or prohibited commercial items; true otherwise).
        2. "assigned_category": string (refined classification).
        3. "extracted_keywords": list of strings (3 to 6 key tags).
        4. "safety_flag": boolean (true if description mentions urgent hazards, accidents, landslides, or life-safety SOS alerts).
        5. "reason": string (short evaluation rationale).
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            ),
        )

        import json
        result = json.loads(response.text or "{}")

        return ModerationResponse(
            is_approved=result.get("is_approved", True),
            assigned_category=result.get("assigned_category", req.category),
            extracted_keywords=result.get("extracted_keywords", ["highlands", "camgo"]),
            safety_flag=result.get("safety_flag", False),
            reason=result.get("reason", "Passed automated AI moderation.")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
