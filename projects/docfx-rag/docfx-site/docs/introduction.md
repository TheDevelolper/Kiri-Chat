# Kiri Chat

Welcome to **Kiri Chat** — a chatbot system that uses your documentation as a knowledge base, powered by Retrieval-Augmented Generation (RAG).

Kiri Chat lets you have natural conversations with an AI assistant about your documentation. It uses a Large Language Model (LLM) to answer questions, but only draws information from the documentation you've indexed — ensuring accurate, contextual responses.

The system is built with:

- **docfx** — static documentation site generator
- **Qdrant** — high-performance vector database for semantic search
- **Ollama** — local LLM and embedding models
- **FastAPI** — lightweight chat API backend

## Why Kiri Chat?

Traditional documentation search relies on keyword matching, which often misses the intent behind your question. Kiri Chat uses semantic search to understand *what you mean*, then generates answers grounded in your actual documentation — with source links back to the exact sections used.

## Key Features

- **Documentation-powered** — answers are generated only from your indexed documentation
- **Source attribution** — every answer links to the documentation sections used
- **Markdown-aware** — responses preserve formatting, code blocks, and lists
- **Embeddable chat widget** — floating `<chat-button>` web component for any page
- **Header-based chunking** — document structure is preserved for better context
- **Local processing** — runs on your machine using Ollama for embeddings and LLM inference

## How It Works

1. **Index** — markdown files are chunked by header, embedded with `nomic-embed-text`, and stored in Qdrant
2. **Search** — user questions are embedded and matched against the vector database
3. **Generate** — the LLM (`gemma:2b`) generates answers using only the retrieved documentation context
4. **Cite** — source links are returned so you can verify or explore further

## Project Overview

```
Kiri Chat
├── docfx-site/          # Documentation site + chat widget
│   ├── docs/            # Markdown documentation
│   ├── chat-button.js   # Embeddable chat web component
│   └── chat-api/        # FastAPI RAG backend
│       ├── main.py      # /chat endpoint
│       └── index_docs.py # Indexing script
├── Qdrant (Docker)      # Vector database
└── Ollama (local)       # Embeddings + LLM
```

Ready to get started? Head over to [Getting Started](getting-started.md) to set up Kiri Chat on your machine.