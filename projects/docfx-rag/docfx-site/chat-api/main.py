from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

app = FastAPI(title="Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(msg: Message):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://127.0.0.1:11434/api/chat",
            json={
                "model": "gemma:2b",
                "messages": [{"role": "user", "content": msg.message}],
                "stream": False
            }
        )
        response.raise_for_status()
        data = response.json()
        return {"response": data["message"]["content"]}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
