import httpx
import re

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchTextAny

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "docfx-docs"
OLLAMA_URL = "http://127.0.0.1:11434"
EMBED_MODEL = "all-minilm"
MODEL = "tinyllama:1.1b"

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
async def chat_endpoint(request: Request, msg: Message):
    try:
        qdrant = QdrantClient(url=QDRANT_URL)

        async with httpx.AsyncClient(timeout=300.0) as client:
            # 1. Generate embedding
            embed_resp = await client.post(
                f"{OLLAMA_URL}/api/embed",

                json={
                "options": {
                    "num_predict": 512,
                    "temperature": 0
                },
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

            # We could improve this later by using an LLM to extract better keywords or key phrases, but for now we'll do a simple regex-based extraction and filtering of stop words.
            # Need to keep this lightweight since it's run on every query and we don't want to add latency.

            # Tokenize message into keywords (filter out stop words and short words)
            stop_words = {"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
                         "have", "has", "had", "do", "does", "did", "will", "would", "could",
                         "should", "may", "might", "must", "shall", "can", "need", "dare",
                         "tell", "me", "about", "what", "where", "when", "why", "how",
                         "i", "you", "he", "she", "it", "we", "they", "my", "your", "his",
                         "her", "its", "our", "their", "this", "that", "these", "those",
                         "and", "or", "but", "not", "if", "then", "else", "for", "of", "to",
                         "in", "on", "at", "by", "from", "with", "about"}
            
            keywords = " ".join([word.lower() for word in re.findall(r'\b\w+\b', msg.message) 
                       if word.lower() not in stop_words and len(word) > 2])
            print(f"Extracted keywords: {keywords}")
            keyword_points, _ = qdrant.scroll(
                collection_name=COLLECTION_NAME,
                scroll_filter=Filter(
                    should=[
                        FieldCondition(
                            key="text",
                            match=MatchTextAny(text_any=keywords),
                        ),
                        FieldCondition(
                            key="header",
                            match=MatchTextAny(text_any=keywords),
                        ),
                    ]
                ),
                limit=2,
                with_payload=True,
                with_vectors=False,
            )

            # 2c. Merge results by point ID (keyword first to prioritize correct doc_urls)
            points_by_id = {}

            # First add the strong keyword results
            for point in keyword_points[:2]:
                points_by_id[point.id] = point

            # Only add semantic results if keyword search found nothing
            if not points_by_id:
                for hit in semantic_result.points[:5]:
                    points_by_id[hit.id] = hit
        
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

            if not context:
                return {
                    "response": "I couldn't find anything relevant in the documentation.",
                    "debug": {
                        "message": msg.message,
                        "semantic_results_count": len(semantic_result.points),
                        "keyword_results_count": len(keyword_points),
                    },
                }
            # 3. Ask Ollama
            system_prompt = f"""
            You are a documentation extraction system.

            You MUST follow these rules:

            - ONLY use exact information from the documentation context
            - DO NOT paraphrase project names
            - DO NOT rename anything
            - DO NOT summarize unless the user explicitly asks
            - DO NOT combine separate sentences into new wording
            - Prefer copying exact sentences from the context
            - If a project name appears in the context, reproduce it EXACTLY
            - Never change spelling
            - Never infer missing information
            - Never add explanatory text

            If the answer is not explicitly present in the context, reply exactly:

            "I could not find that information in the documentation."

            === BEGIN CONTEXT ===

            {context}

            === END CONTEXT ===
            """

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
                        "temperature": 0,
                        "top_p": 0.1,
                        "top_k": 10,
                        "repeat_penalty": 1.15,
                        "num_predict": 256,
                        "seed": 42
                    }
                },
            )
            response.raise_for_status()

            data = response.json()
     
            # Build unique source links
            source_links = {}
            for point in points_by_id.values():
                payload = point.payload or {}
                source = payload.get("source")
                doc_url = payload.get("doc_url")
                header = payload.get("header", "Untitled")
                if source and doc_url and source not in source_links:
                    source_links[source] = {"url": doc_url, "header": header}

            return {
    "response": data["message"]["content"],
    "sources": [
        {"url": info["url"], "header": info["header"], "source": source}
        for source, info in source_links.items()
    ],
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
                "doc_url": (point.payload or {}).get("doc_url"),
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