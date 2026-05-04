from fastapi import FastAPI, HTTPException


from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchTextAny

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "docfx-docs"
OLLAMA_URL = "http://127.0.0.1:11434"
EMBED_MODEL = "nomic-embed-text"
MODEL = "gemma:2b"

app = FastAPI(title="Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    message: str

@app.post("/chat")
async def chat_endpoint(msg: Message):
    try:
        qdrant = QdrantClient(url=QDRANT_URL)

        async with httpx.AsyncClient(timeout=300.0) as client:
            # 1. Generate embedding
            embed_resp = await client.post(
                f"{OLLAMA_URL}/api/embed",
                json={
                    "model": EMBED_MODEL,
                    "input": msg.message,
                },
            )
            embed_resp.raise_for_status()

            embed_data = embed_resp.json()
            query_vector = embed_data["embeddings"][0]

            # 2a. Semantic/vector search
            semantic_result = qdrant.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                limit=5,
            )

            # 2b. Keyword search against payload text/header
            keyword_points, _ = qdrant.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=Filter(
                    should=[
                        FieldCondition(
                            key="text",
                            match=MatchTextAny(text_any=msg.message),
                        ),
                        FieldCondition(
                            key="header",
                            match=MatchTextAny(text_any=msg.message),
                        ),
                    ]
                ),
                limit=5,
                with_payload=True,
                with_vectors=False,
            )

            # 2c. Merge results by point ID
            points_by_id = {}

            for hit in semantic_result.points:
                points_by_id[hit.id] = hit

            for point in keyword_points:
                if point.id not in points_by_id:
                    points_by_id[point.id] = point

            # 2d. Build context
            chunks = []

            for point in points_by_id.values():
                payload = point.payload or {}

                text = payload.get("text")
                header = payload.get("header", "Untitled")
                source = payload.get("source", "unknown source")
                level = payload.get("level", "?")

                if text:
                    chunks.append(
                        f"Source: {source}\n"
                        f"Header: {header}\n"
                        f"Level: {level}\n\n"
                        f"{text}"
                    )

            context = "\n\n---\n\n".join(chunks)
            # 3. Ask Ollama
            system_prompt = (
                "You are a helpful documentation assistant. "
                "Use the documentation context below to answer the user's question. "
                "When the context contains a list, include the full relevant list. "
                "Do not omit prerequisites, commands, or setup steps that appear in the context. "
                "If the context does not contain the answer, say you could not find it in the docs.\n\n"
                f"Documentation context:\n\n{context}"
            )

            response = await client.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": msg.message},
                    ],
                    "stream": False,
                    "options": {
                        "num_predict": 512
                    }
                },
            )
            response.raise_for_status()

            data = response.json()
            return {
    "response": data["message"]["content"],
    "debug": {
        "message": msg.message,
        "semantic_results_count": len(semantic_result.points),
        "keyword_results_count": len(keyword_points),
        "merged_results_count": len(points_by_id),
        "context_length": len(context),
        "results": [
            {
                "id": point.id,
                "score": getattr(point, "score", None),
                "source": (point.payload or {}).get("source"),
                "header": (point.payload or {}).get("header"),
                "level": (point.payload or {}).get("level"),
                "preview": (point.payload or {}).get("text", "")[:300],
            }
            for point in points_by_id.values()
        ],
    },
}

    except httpx.ReadTimeout:
        raise HTTPException(
            status_code=504,
            detail="Ollama took too long to respond. Try again, reduce the retrieved context, or use a smaller/faster model.",
        )

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=e.response.text,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}