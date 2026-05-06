import httpx
import re
import tiktoken
import json
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchTextAny

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "docfx-docs")
OLLAMA_URL = os.getenv("OLLAMA_HOST", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-minilm")
MODEL = os.getenv("MODEL", "tinyllama:1.1b")

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
                    "options": {"num_predict": 512, "temperature": 0},
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
                limit=2,
            )

            # 2b. Keyword search against payload text/header

            # We could improve this later by using an LLM to extract better keywords or key phrases, but for now we'll do a simple regex-based extraction and filtering of stop words.
            # Need to keep this lightweight since it's run on every query and we don't want to add latency.

            # Tokenize message into keywords (filter out stop words and short words)
            stop_words = {
                "the",
                "a",
                "an",
                "is",
                "are",
                "was",
                "were",
                "be",
                "been",
                "being",
                "have",
                "has",
                "had",
                "do",
                "does",
                "did",
                "will",
                "would",
                "could",
                "should",
                "may",
                "might",
                "must",
                "shall",
                "can",
                "need",
                "dare",
                "tell",
                "me",
                "about",
                "what",
                "where",
                "when",
                "how",
                "i",
                "you",
                "he",
                "she",
                "it",
                "we",
                "they",
                "my",
                "your",
                "his",
                "her",
                "its",
                "our",
                "their",
                "this",
                "that",
                "these",
                "those",
                "and",
                "or",
                "but",
                "not",
                "if",
                "then",
                "else",
                "for",
                "of",
                "to",
                "in",
                "on",
                "at",
                "by",
                "from",
                "with",
                "about",
            }

            keywords = " ".join(
                [
                    word.lower()
                    for word in re.findall(r"\b\w+\b", msg.message)
                    if word.lower() not in stop_words and len(word) > 2
                ]
            )
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

            # Truncate context to 1024 tokens to reduce attention cost
            truncation = 512
            encoding = tiktoken.get_encoding("cl100k_base")
            context_tokens = encoding.encode(context)
            if len(context_tokens) > truncation:
                context = encoding.decode(context_tokens[:truncation])
                print(
                    f"Truncated context from {len(context_tokens)} to {truncation} tokens"
                )

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
            You are a helpful documentation assistant.

            Use the documentation context to answer the user's question clearly and fully.

            Rules:
            - Answer in your own words.
            - Use only information supported by the context.
            - Give a complete explanation, not just a quote.
            - Prefer 2 to 6 paragraphs when useful.
            - Include concrete details from the documentation.
            - If steps are relevant, use a numbered list.
            - If the answer depends on a specific page or section, mention that.
            - Do not invent details.
            - If the documentation does not contain enough information, say so clearly.
            - If partially relevant information is present, explain what you found and what is missing.
            - When including links to documentation pages, always output final public HTML URLs.
            - Use this base URL for relative documentation links:
            https://hirekiran.com/kiri-chat/docs
            - Convert relative Markdown links to absolute HTML links:
            - `getting-started.md` becomes `https://hirekiran.com/kiri-chat/docs/getting-started.html`
            - `./getting-started.md` becomes `https://hirekiran.com/kiri-chat/docs/getting-started.html`
            - `guides/setup.md` becomes `https://hirekiran.com/kiri-chat/docs/guides/setup.html`
            - Never output links ending in `.md`.
            - Do not change external links that already start with `http://` or `https://`.
            
            === BEGIN CONTEXT ===

            {context}

            === END CONTEXT ===
            """

            # Build unique source links first (needed for streaming response)
            source_links = {}
            for point in points_by_id.values():
                payload = point.payload or {}
                source = payload.get("source")
                doc_url = payload.get("doc_url")
                header = payload.get("header", "Untitled")
                if source and doc_url and source not in source_links:
                    source_links[source] = {"url": doc_url, "header": header}

            # Stream response from Ollama
            async def generate_response():
                try:
                    async with httpx.AsyncClient(timeout=300.0) as stream_client:
                        async with stream_client.stream(
                            "POST",
                            f"{OLLAMA_URL}/api/chat",
                            json={
                                "model": MODEL,
                                "messages": [
                                    {"role": "system", "content": system_prompt},
                                    {"role": "user", "content": msg.message},
                                ],
                                "stream": True,
                                "keep_alive": "30m",
                                "options": {
                                    "temperature": 0.2,
                                    "top_p": 0.9,
                                    "top_k": 40,
                                    "repeat_penalty": 1.08,
                                    "num_predict": 768,
                                    "num_batch": 64,
                                    "num_ctx": 1024,
                                    "seed": 42,
                                },
                            },
                        ) as response:
                            response.raise_for_status()
                            async for line in response.aiter_lines():
                                if line:
                                    try:
                                        chunk = json.loads(line)
                                        if (
                                            "message" in chunk
                                            and "content" in chunk["message"]
                                        ):
                                            # Send as SSE
                                            token_data = json.dumps(
                                                {"token": chunk["message"]["content"]}
                                            )
                                            yield f"data: {token_data}\n\n"
                                        if chunk.get("done", False):
                                            # Send sources at the end
                                            sources_data = json.dumps(
                                                {
                                                    "sources": [
                                                        {
                                                            "url": info["url"],
                                                            "header": info["header"],
                                                            "source": source,
                                                        }
                                                        for source, info in source_links.items()
                                                    ]
                                                }
                                            )
                                            yield f"data: {sources_data}\n\n"
                                            yield "data: [DONE]\n\n"
                                    except json.JSONDecodeError:
                                        pass
                except Exception as e:
                    error_data = json.dumps({"error": str(e)})
                    yield f"data: {error_data}\n\n"
                    yield "data: [DONE]\n\n"

            return StreamingResponse(
                generate_response(), media_type="text/event-stream"
            )

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
