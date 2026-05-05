# Kiri Chat

Welcome to **Kiri Chat** — a local, privacy-first documentation assistant powered by Retrieval-Augmented Generation (RAG).

## What is Kiri Chat?

Kiri Chat is a project that combines documentation generation with AI-powered question answering. This project transforms static markdown documentation into an interactive, searchable knowledge base with a conversational chat interface.

**In simple terms:** Kiri Chat is a RAG (Retrieval-Augmented Generation) system that lets you chat with your documentation. Instead of searching through pages manually, you ask questions in natural language and get accurate answers sourced directly from your docs.

## What Does This Project Do?

- **Indexes documentation** — markdown files are processed, chunked by headers, and stored as vector embeddings
- **Understands questions** — uses semantic search to find the most relevant documentation sections for your query
- **Generates answers** — a local LLM creates responses based *only* on the retrieved documentation context
- **Cites sources** — every answer includes links back to the exact documentation sections used

## Technology Stack

Kiri Chat is built with:

- **docfx** — static documentation site generator that builds the HTML site from markdown
- **Qdrant** — high-performance vector database for storing and searching embeddings
- **Ollama** — local LLM and embedding models (no data leaves your machine)
- **FastAPI** — lightweight chat API backend that orchestrates the RAG pipeline
- **Web Components** — `<chat-button>` custom element for embedding the chat widget on any page

## Why Kiri Chat?

Traditional documentation search relies on keyword matching, which often misses the intent behind your question. Kiri Chat uses semantic search to understand *what you mean*, then generates answers grounded in your actual documentation — with source links back to the exact sections used.

## Key Features

- **Local-first** — runs entirely on your machine, no external APIs
- **Source attribution** — every answer links to the documentation sections used
- **Markdown-aware** — responses preserve formatting, code blocks, and lists
- **Embeddable chat widget** — floating `<chat-button>` web component for any page
- **Header-based chunking** — document structure is preserved for better context

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